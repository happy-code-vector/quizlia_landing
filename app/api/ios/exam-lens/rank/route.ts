import { NextRequest, NextResponse } from "next/server";
import {
  verifyAppCheck,
  appCheckErrorResponse,
  resolveAccountCaller,
  resolveDeviceCaller,
  devicePlan,
  type DeviceCaller,
} from "@/lib/caller";
import { meterDeviceScan, refundDeviceScan, readDevice, type DeviceDoc } from "@/lib/devices";
import { getAdminDb } from "@/lib/admin-firestore";
import { planFromSubscriptions, today, type PlanKind } from "@/lib/quota";
import {
  normalizeSentences,
  isMostlyNoise,
  cacheKey,
  readCache,
  writeCache,
  rankKeyPoints,
  MIN_SENTENCES,
  type RankInput,
} from "@/lib/exam-lens-rank";
import { isValidDeviceId } from "@/lib/devices";

export const dynamic = "force-dynamic";

// Exam Lens rank route (handoff items 42-47; AR go + quota decisions
// 2026-10-29). The iOS contract is ExamLensRanker.swift: error codes are
// strings ("not_enough_text", "scan_limit", "budget_reached", "busy"),
// preVe1 rides on the 429 scan_limit body, and a 2xx carries
// {keyPoints:[{i,q}], language, cached}.
//
// Quota (AR 2026-10-29): free devices 3 scans/day keyed on
// devices/{deviceId}; trial and paid 50/day. v1 counts both on the device
// (the budgetKey migration lands with items 22-28). preVe1 = true until
// the device (or its linked account) has completed any study set — when
// true the app shows "come back tomorrow" instead of the paywall (VE1
// rule: no paywall before the first value event).
const FREE_SCANS_PER_DAY = 3;
const PAID_SCANS_PER_DAY = 50;

function errorResponse(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { error: { code, message }, ...extra },
    { status }
  );
}

/** UTC-midnight reset, matching the device meters' date anchoring. */
function nextResetAt(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

/** preVe1 (AR 2026-10-29): false once the caller has completed ANY study
 *  set. The server's evidence is metered generation activity — the free
 *  note, paid generations, or a study set made from a scan all pass
 *  through the generation meters. */
async function hasCompletedStudySet(deviceDoc: DeviceDoc, uid: string | null): Promise<boolean> {
  if (deviceDoc.freeUsed || (deviceDoc.used ?? 0) > 0) return true;
  if (!uid) return false;
  try {
    const db = await getAdminDb();
    const snap = await db.collection("generationQuota").doc(uid).get();
    const quota = (snap.data() ?? {}) as { freeUsed?: boolean; used?: number };
    return Boolean(quota.freeUsed) || (quota.used ?? 0) > 0;
  } catch {
    // No quota evidence readable: treat as pre-value-event (no paywall).
    return false;
  }
}

/** Account callers' plan + admin flag from users/{uid} (Admin SDK read —
 *  quota.ts reads it through the caller's token; here the server owns the
 *  whole path, so the server reads it). */
async function accountPlan(uid: string): Promise<{ plan: PlanKind; admin: boolean }> {
  try {
    const db = await getAdminDb();
    const snap = await db.collection("users").doc(uid).get();
    const doc = (snap.data() ?? {}) as {
      subscriptions?: Record<string, { active?: boolean }>;
      admin?: boolean;
    };
    return { plan: planFromSubscriptions(doc.subscriptions ?? {}), admin: Boolean(doc.admin) };
  } catch (err) {
    console.warn("[exam-lens] users read failed, treating as free:", err);
    return { plan: "free", admin: false };
  }
}

export async function POST(request: NextRequest) {
  // Auth exactly as /api/ios/gemini/*: account tokens win, a signed-out
  // device authenticates via X-Device-ID (+ App Check, log-only until
  // APP_CHECK_ENFORCE=1). Every app call site sends X-Device-ID, so the
  // scan counter is always device-keyed.
  try {
    await verifyAppCheck(request);
  } catch (error) {
    const response = appCheckErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const caller = await resolveAccountCaller(request);
  let device: DeviceCaller | null = null;
  if (!caller) {
    device = await resolveDeviceCaller(request);
    if (!device) {
      return errorResponse(401, "unauthenticated", "Not authenticated");
    }
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "bad_request", "Invalid JSON");
  }

  const sentences = normalizeSentences(body?.sentences);
  const language = typeof body?.language === "string" && body.language.trim()
    ? body.language.trim().slice(0, 12)
    : null;
  const profileType: "adult" | "child" = body?.profileType === "child" ? "child" : "adult";
  const pageHash = typeof body?.pageHash === "string" ? body.pageHash.trim().slice(0, 64) : "";
  if (!pageHash) {
    return errorResponse(400, "bad_request", "pageHash required");
  }

  // Validation before any metering (item 42: none of the errors below
  // consume a scan): under 6 usable sentences, or a page that is over 40%
  // digits and symbols (a math worksheet).
  if (sentences.length < MIN_SENTENCES) {
    return errorResponse(422, "not_enough_text", "Not enough readable text on this page. Try scanning a fuller page.");
  }
  if (isMostlyNoise(sentences)) {
    return errorResponse(422, "not_enough_text", "This page looks like numbers and symbols rather than study text.");
  }

  const input: RankInput = { sentences, language, profileType, pageHash };

  // Cache hit: free, unmetered, cached:true (item 45).
  const key = cacheKey(input);
  const hit = readCache(key);
  if (hit) {
    return NextResponse.json({ keyPoints: hit.keyPoints, language: hit.language, cached: true });
  }

  // Quota: free devices 3/day, entitled 50/day (admin unlimited, unmetered).
  // Every app call site sends X-Device-ID (QuizliProxyHeaders); a caller
  // without one cannot be scan-metered, and "" is not a valid doc id.
  const deviceId = device?.deviceId || request.headers.get("x-device-id") || "";
  if (!isValidDeviceId(deviceId)) {
    return errorResponse(400, "bad_request", "Device id required");
  }
  let plan: PlanKind;
  let admin = false;
  if (caller) {
    const resolved = await accountPlan(caller.uid);
    plan = resolved.plan;
    admin = resolved.admin;
  } else if (device) {
    plan = devicePlan(device.entitlement);
  } else {
    plan = "free";
  }
  const limit = admin ? Infinity : plan === "free" ? FREE_SCANS_PER_DAY : PAID_SCANS_PER_DAY;

  if (!admin) {
    const deviceDoc = await readDevice(deviceId);
    const scansToday = deviceDoc.scanDate === today() ? deviceDoc.scanUsed ?? 0 : 0;
    if (scansToday >= limit) {
      const preVe1 = !(await hasCompletedStudySet(deviceDoc, caller?.uid ?? null));
      return errorResponse(429, "scan_limit", "Daily scan limit reached. Resets at midnight.", {
        preVe1,
        resetAt: nextResetAt(),
      });
    }
    const meter = await meterDeviceScan(deviceId, limit);
    if (!meter.ok && meter.status === 500) {
      return errorResponse(503, "busy", "Too many requests right now. Try again in a moment.");
    }
    if (!meter.ok) {
      // Lost a race against the cap: same scan_limit shape as above.
      const preVe1 = !(await hasCompletedStudySet(deviceDoc, caller?.uid ?? null));
      return errorResponse(429, "scan_limit", meter.message, {
        preVe1,
        resetAt: nextResetAt(),
      });
    }
  }

  const outcome = await rankKeyPoints(input);
  if (!outcome.ok) {
    // Errors are never metered (item 42): give the scan back.
    if (!admin) await refundDeviceScan(deviceId);
    if (outcome.status === 422) {
      return errorResponse(422, "not_enough_text", "Not enough usable sentences on this page. Try another page.");
    }
    return errorResponse(503, "busy", "The scanner is busy right now. Try again in a moment.");
  }

  writeCache(key, outcome.keyPoints, language);
  return NextResponse.json({ keyPoints: outcome.keyPoints, language, cached: false });
}
