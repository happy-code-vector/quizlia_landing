import { NextRequest, NextResponse } from "next/server";
import {
  verifyAppCheck,
  appCheckErrorResponse,
  resolveAccountCaller,
  resolveDeviceCaller,
} from "@/lib/caller";
import { bestEntitlement } from "@/lib/storekit-verify";
import { setDeviceEntitlement, syncFreeUsedAcrossLink } from "@/lib/devices";
import { getAdminDb } from "@/lib/admin-firestore";

export const dynamic = "force-dynamic";

// Receipt intake + device↔account linking (spec §5.5).
//   signed-out: verify JWS → cache devices/{deviceId}.entitlement → plan
//   signed-in:  verify JWS → ADMIN-merge users/{uid}.subscriptions
//               (never downgrades; Stripe webhook owns deactivation),
//               set linkedUid, sync the one-budget freeUsed rule.
export async function POST(request: NextRequest) {
  let body: { jws?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 400, message: "Invalid JSON" } }, { status: 400 });
  }
  const receipts = Array.isArray(body.jws) ? body.jws : [];
  if (!receipts.length) {
    return NextResponse.json({ error: { code: 400, message: "Missing jws[]" } }, { status: 400 });
  }

  // (Plan amendment 2026-10-21, from Task 5 review: infra failures —
  // Firestore blips, enforce-mode App Check throws — must surface as the
  // repo's shaped 500, not Next's default body.)
  try {
    await verifyAppCheck(request);
    const entitlement = bestEntitlement(receipts);
    const account = await resolveAccountCaller(request);
    const device = await resolveDeviceCaller(request);

    if (!account && !device) {
      return NextResponse.json({ error: { code: 401, message: "Not authenticated" } }, { status: 401 });
    }

    // 1. Device side: cache whatever was proven (or clear a stale one).
    if (device) {
      await setDeviceEntitlement(device.deviceId, entitlement);
    }

    // 2. Account side: merge upward and record the link.
    if (account) {
      const db = await getAdminDb();
      if (entitlement) {
        await db.collection("users").doc(account.uid).set(
          {
            [`subscriptions.${entitlement.productField}.active`]: true,
            ...(entitlement.renewalDate && {
              [`subscriptions.${entitlement.productField}.renewalDate`]: entitlement.renewalDate,
            }),
          },
          { merge: true }
        );
      }
      if (device) {
        await db.collection("devices").doc(device.deviceId).set(
          { linkedUid: account.uid, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        await syncFreeUsedAcrossLink(device.deviceId, account.uid);
      }
    }

    const plan = entitlement ? entitlement.plan : "free";
    return NextResponse.json({ plan, linked: !!account });
  } catch (error) {
    const appCheck = appCheckErrorResponse(error);
    if (appCheck) return appCheck;
    console.error("Entitlements error:", error);
    return NextResponse.json(
      { error: { code: 500, message: "Entitlement sync failed, try again." } },
      { status: 500 }
    );
  }
}
