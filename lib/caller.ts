// Caller resolution for /api/ios/* — spec §5.3. Account tokens win; a
// signed-out device authenticates with X-Device-ID (+ App Check token,
// log-only until APP_CHECK_ENFORCE=1) and proves paid status inline via a
// StoreKit JWS receipt in X-Storekit-Jws.
import { NextRequest } from "next/server";
import { resolveCaller, type VerifiedToken } from "@/lib/token-verify";
import { isValidDeviceId, readDevice, type DeviceEntitlement } from "@/lib/devices";
import { verifyStoreKitJws } from "@/lib/storekit-verify";
import { getAdminAppCheck } from "@/lib/admin-firestore";
import type { PlanKind } from "@/lib/quota";

export type DeviceCaller = {
  kind: "device";
  deviceId: string;
  entitlement: DeviceEntitlement | null;
};

export async function resolveAccountCaller(request: NextRequest): Promise<VerifiedToken | null> {
  return resolveCaller(
    request.headers.get("authorization") || "",
    request.headers.get("x-firebase-refresh")
  );
}

/** Log-only until APP_CHECK_ENFORCE=1 (spec §8.3). */
export async function verifyAppCheck(request: NextRequest): Promise<void> {
  const token = request.headers.get("x-app-check");
  if (!token) {
    console.warn("[appcheck] missing token (log-only)");
    return;
  }
  try {
    await getAdminAppCheck().verifyToken(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (process.env.APP_CHECK_ENFORCE === "1") throw err;
    console.warn(`[appcheck] invalid token (log-only): ${message}`);
  }
}

export function devicePlan(entitlement: DeviceEntitlement | null): PlanKind {
  return entitlement ? entitlement.plan : "free";
}

export async function resolveDeviceCaller(request: NextRequest): Promise<DeviceCaller | null> {
  const deviceId = request.headers.get("x-device-id") || "";
  if (!isValidDeviceId(deviceId)) return null;
  const jws = request.headers.get("x-storekit-jws");
  if (jws) return { kind: "device", deviceId, entitlement: verifyStoreKitJws(jws) };
  // No receipt attached: consult the cached entitlement (spec §5.4) —
  // valid while min(expiresAt, verifiedAt + 24h) is in the future.
  const doc = await readDevice(deviceId);
  const cached = doc.entitlement;
  if (
    cached &&
    Date.parse(cached.expiresAt) > Date.now() &&
    Date.now() - Date.parse(cached.verifiedAt) < 24 * 60 * 60 * 1000
  ) {
    return { kind: "device", deviceId, entitlement: cached };
  }
  return { kind: "device", deviceId, entitlement: null };
}
