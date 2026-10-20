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
  expiresAt: string; // ISO
  renewalDate?: string; // ISO
  verifiedAt: string; // ISO — cache window anchors here (spec §5.4)
}

export interface DeviceDoc {
  freeUsed?: boolean;
  used?: number;
  date?: string;
  chatUsed?: number;
  chatDate?: string;
  entitlement?: DeviceEntitlement | null;
  linkedUid?: string;
}

const DEVICE_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

export function isValidDeviceId(deviceId: string): boolean {
  return DEVICE_ID_RE.test(deviceId);
}

export async function readDevice(deviceId: string): Promise<DeviceDoc> {
  const snap = await getAdminDb().collection("devices").doc(deviceId).get();
  return (snap.data() as DeviceDoc) ?? {};
}

async function patchDevice(
  deviceId: string,
  build: (doc: DeviceDoc) => DeviceDoc
): Promise<boolean> {
  const ref = getAdminDb().collection("devices").doc(deviceId);
  try {
    await getAdminDb().runTransaction(async (tx) => {
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

/** Mirrors meterGeneration() from lib/quota.ts for device callers. */
export async function meterDeviceGeneration(
  deviceId: string,
  plan: PlanKind
): Promise<QuotaResult> {
  const doc = await readDevice(deviceId);

  if (plan === "free") {
    if (doc.freeUsed) {
      return { ok: false, status: 429, message: "Your free note has been used. Upgrade to keep generating." };
    }
    const ok = await patchDevice(deviceId, (d) => ({
      date: today(),
      used: (d.date === today() ? d.used ?? 0 : 0) + 1,
      freeUsed: true,
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
  }));
  return ok ? { ok: true } : { ok: false, status: 500, message: "Quota update conflict, try again." };
}

/** Mirrors meterChat() from lib/quota.ts for device callers (100/day). */
export async function meterDeviceChat(deviceId: string): Promise<QuotaResult> {
  const doc = await readDevice(deviceId);
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

export async function setDeviceEntitlement(
  deviceId: string,
  entitlement: DeviceEntitlement | null
): Promise<void> {
  await getAdminDb().collection("devices").doc(deviceId).set(
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
  const [device, quotaSnap] = await Promise.all([
    readDevice(deviceId),
    getAdminDb().collection("generationQuota").doc(uid).get(),
  ]);
  const quota = (quotaSnap.data() ?? {}) as { freeUsed?: boolean; date?: string };
  if (device.freeUsed && !quota.freeUsed) {
    const isToday = quota.date === today();
    await getAdminDb().collection("generationQuota").doc(uid).set(
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
