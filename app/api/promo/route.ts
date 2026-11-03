import { NextRequest, NextResponse } from "next/server";
import { resolveCaller } from "@/lib/token-verify";
import { getAdminDb } from "@/lib/admin-firestore";

export const dynamic = 'force-dynamic';

// Server-side promo redemption. The Firestore rules lock the promo grant
// fields (freePlanActive & co.) to Admin-SDK-only writes — a client writing
// its own grant was one devtools edit away from a free Pro month. Same
// validation semantics as the old client path (lib/firebaseSubscription
// applyPromoCode): code doc exists, isActive, unexpired, one redemption
// per user in usersUsed. Admin SDK bypasses rules, so the grant sticks.
// Caller resolution accepts the web's Bearer ID token or the iOS proxy's
// X-Firebase-Refresh header (same as every /api/ios route).
export async function POST(request: NextRequest) {
  const caller = await resolveCaller(
    request.headers.get("authorization") || "",
    request.headers.get("x-firebase-refresh")
  );
  if (!caller) {
    return NextResponse.json({ success: false, reason: "not_signed_in", message: "Sign in to redeem a promo code." });
  }

  const body = await request.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ success: false, reason: "empty", message: "Enter a promo code." });
  }

  try {
    const db = await getAdminDb();

    // Validate the code document first (same rules as the iOS app).
    const codeRef = db.collection("promoCodes").doc(code);
    const codeSnap = await codeRef.get();
    if (!codeSnap.exists) {
      return NextResponse.json({ success: false, reason: "invalid", message: "Invalid promo code." });
    }
    const data = codeSnap.data() ?? {};
    if (data.isActive !== true) {
      return NextResponse.json({ success: false, reason: "inactive", message: "This promo code is no longer active." });
    }
    const expiration = typeof data.expirationDate === "string" ? new Date(data.expirationDate) : null;
    if (!expiration || expiration < new Date()) {
      return NextResponse.json({ success: false, reason: "expired", message: "This promo code has expired." });
    }
    const usersUsed: string[] = Array.isArray(data.usersUsed) ? data.usersUsed : [];
    if (usersUsed.includes(caller.uid)) {
      return NextResponse.json({ success: false, reason: "already_used", message: "You have already used this promo code." });
    }

    // Grant one free month. getFirebaseSubscription reads freePlanActive +
    // freePlanExpiresAt (both Timestamp and ISO-string shapes parse there).
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    // Mark the code used BEFORE granting — the atomic append makes a
    // double redemption across tabs/devices impossible, and a user who saw
    // "applied" always has the grant (order chosen deliberately: a crash
    // between the two burns the code but never grants silently twice).
    await codeRef.update({ usersUsed: [...usersUsed, caller.uid] });
    await db.collection("users").doc(caller.uid).set(
      {
        promoApplied: code,
        promoAppliedAt: now.toISOString(),
        promoExpiresAt: expiryDate.toISOString(),
        freePlanActive: true,
        freePlanExpiresAt: expiryDate.toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, reason: "ok", message: "Promo code applied! You have 1 month of Pro access." });
  } catch (error: any) {
    console.error("Promo redemption error:", error?.message ?? error);
    return NextResponse.json({ success: false, reason: "error", message: "Failed to apply promo code" });
  }
}
