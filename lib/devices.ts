// Per-device server state for signed-out iOS callers (spec §5.3/§7).
// Devices have no Firebase Auth identity, so the Admin SDK owns these
// docs and firestore.rules denies all client access. Semantics mirror
// lib/quota.ts (same limits, same messages, same UTC date anchoring).
import { getAdminDb } from "@/lib/admin-firestore";
import { GENERATION_LIMITS, today, type PlanKind, type QuotaResult } from "@/lib/quota";

export interface DeviceEntitlement {
  plan: "individual" | "family";
  productField: string; // subscriptions field name, e.g. "family_yearly"
  productId: string;
  transactionId: string;
  originalTransactionId?: string; // budget key (item 28), stable across renewals
  expiresAt: string; // ISO
  renewalDate?: string; // ISO
  verifiedAt: string; // ISO — cache window anchors here (spec §5.4)
}

export interface DeviceDoc {
  freeUsed?: boolean;
  used?: number;
  date?: string;
  recentSets?: string[];
  chatUsed?: number;
  chatDate?: string;
  chatTotal?: number;
  scanUsed?: number;
  scanDate?: string;
  entitlement?: DeviceEntitlement | null;
  linkedUid?: string;
}

const DEVICE_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

export function isValidDeviceId(deviceId: string): boolean {
  return DEVICE_ID_RE.test(deviceId);
}

export async function readDevice(deviceId: string): Promise<DeviceDoc> {
  const db = await getAdminDb();
  const snap = await db.collection("devices").doc(deviceId).get();
  return (snap.data() as DeviceDoc) ?? {};
}

async function patchDevice(
  deviceId: string,
  build: (doc: DeviceDoc) => DeviceDoc
): Promise<boolean> {
  const db = await getAdminDb();
  const ref = db.collection("devices").doc(deviceId);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const next = build((snap.data() as DeviceDoc) ?? {});
      tx.set(ref, { ...next, updatedAt: new Date().toISOString() }, { merge: true });
    });
    return true;
  } catch {
    // runTransaction retries contention internally and REJECTS when it
    // gives up — that rejection is the conflict path the meters report
    // as {ok:false, status:500}.
    return false;
  }
}

/** Mirrors meterGeneration() from lib/quota.ts for device callers.
 *  `setId` dedupes retries (same semantics as quota.ts recentSets) — a
 *  paid device retrying a failed video generation burns one unit, not one
 *  per attempt. */
export async function meterDeviceGeneration(
  deviceId: string,
  plan: PlanKind,
  setId?: string
): Promise<QuotaResult> {
  const doc = await readDevice(deviceId);

  if (setId && doc.date === today() && (doc.recentSets ?? []).includes(setId)) {
    return { ok: true };
  }

  if (plan === "free") {
    if (doc.freeUsed) {
      return { ok: false, status: 429, message: "Your free note has been used. Upgrade to keep generating." };
    }
    const ok = await patchDevice(deviceId, (d) => ({
      date: today(),
      used: (d.date === today() ? d.used ?? 0 : 0) + 1,
      freeUsed: true,
      ...(setId && { recentSets: [setId] }),
    }));
    return ok ? { ok: true } : { ok: false, status: 500, message: "Quota update conflict, try again." };
  }

  const limit = plan === "family" ? GENERATION_LIMITS.family : GENERATION_LIMITS.individual;
  const used = doc.date === today() ? doc.used ?? 0 : 0;
  if (used >= limit) {
    return { ok: false, status: 429, message: `Daily limit reached (${limit} generations per day). Resets at midnight.` };
  }
  const ok = await patchDevice(deviceId, (d) => ({
    date: today(),
    used: (d.date === today() ? d.used ?? 0 : 0) + 1,
    ...(setId && {
      recentSets: [...(d.date === today() ? d.recentSets ?? [] : []), setId].slice(-10),
    }),
  }));
  return ok ? { ok: true } : { ok: false, status: 500, message: "Quota update conflict, try again." };
}

/** Mirrors meterChat() from lib/quota.ts for device callers. Paid keeps
 *  the 100/day ceiling; free devices get 10 lifetime messages (AR
 *  2026-10-29), tracked in chatTotal — never resets, survives reinstalls
 *  with the Keychain UUID. */
export async function meterDeviceChat(
  deviceId: string,
  plan: PlanKind = "free"
): Promise<QuotaResult> {
  const doc = await readDevice(deviceId);

  if (plan === "free") {
    if ((doc.chatTotal ?? 0) >= 10) {
      return { ok: false, status: 429, message: "You've used your free chat messages. Upgrade to keep chatting." };
    }
    const ok = await patchDevice(deviceId, (d) => ({
      chatDate: today(),
      chatUsed: (d.chatDate === today() ? d.chatUsed ?? 0 : 0) + 1,
      chatTotal: (d.chatTotal ?? 0) + 1,
    }));
    return ok ? { ok: true } : { ok: false, status: 500, message: "Quota update conflict, try again." };
  }

  const used = doc.chatDate === today() ? doc.chatUsed ?? 0 : 0;
  if (used >= 100) {
    return { ok: false, status: 429, message: "Daily limit reached. Try again tomorrow." };
  }
  const ok = await patchDevice(deviceId, (d) => ({
    chatDate: today(),
    chatUsed: (d.chatDate === today() ? d.chatUsed ?? 0 : 0) + 1,
  }));
  return ok ? { ok: true } : { ok: false, status: 500, message: "Quota update conflict, try again." };
}

/** Exam Lens scans (AR 2026-10-29): free devices 3/day, entitled 50/day —
 *  the daily limit is the caller's decision, the counter is always the
 *  device's. v1 keys the counter on devices/{deviceId}; when the dollar
 *  budget lands (items 22-28) entitled scans move to the purchaser's
 *  budgetKey — isolated here so that swap touches one function. */
export async function meterDeviceScan(deviceId: string, limit: number): Promise<QuotaResult> {
  const doc = await readDevice(deviceId);
  const used = doc.scanDate === today() ? doc.scanUsed ?? 0 : 0;
  if (used >= limit) {
    return { ok: false, status: 429, message: "Daily scan limit reached. Resets at midnight." };
  }
  const ok = await patchDevice(deviceId, (d) => ({
    scanDate: today(),
    scanUsed: (d.scanDate === today() ? d.scanUsed ?? 0 : 0) + 1,
  }));
  return ok
    ? { ok: true }
    : { ok: false, status: 500, message: "Quota update conflict, try again." };
}

/** 503 busy must not consume a scan (item 42: errors are never metered). */
export async function refundDeviceScan(deviceId: string): Promise<void> {
  await patchDevice(deviceId, (d) => ({
    scanUsed: Math.max(0, (d.scanDate === today() ? d.scanUsed ?? 0 : 0) - 1),
  }));
}

export async function setDeviceEntitlement(
  deviceId: string,
  entitlement: DeviceEntitlement | null
): Promise<void> {
  const db = await getAdminDb();
  await db.collection("devices").doc(deviceId).set(
    { entitlement, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/** One-identity-one-budget (spec §5.5): after linking, neither side has a
 *  second free generation. The account-side write is rollover-aware:
 *  date/used are pinned only when the account's counter is NOT already
 *  today's — a stale yesterday `used` must not throttle today, and today's
 *  real usage must not be reset. */
export async function syncFreeUsedAcrossLink(deviceId: string, uid: string): Promise<void> {
  const db = await getAdminDb();
  const [device, quotaSnap] = await Promise.all([
    readDevice(deviceId),
    db.collection("generationQuota").doc(uid).get(),
  ]);
  const quota = (quotaSnap.data() ?? {}) as { freeUsed?: boolean; date?: string };
  if (device.freeUsed && !quota.freeUsed) {
    const isToday = quota.date === today();
    await db.collection("generationQuota").doc(uid).set(
      {
        freeUsed: true,
        ...(!isToday && { date: today(), used: 0 }),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } else if (quota.freeUsed && !device.freeUsed) {
    await patchDevice(deviceId, () => ({ freeUsed: true }));
  }
}
