// Cross-platform generation quota — NO SERVICE ACCOUNT.
//
// The caller's own Firebase ID token authorizes every read AND write via
// Firestore's REST API, under generationQuota rules that make the counter
// tamper-proof: used may only rise by ≤1 per write (or restart on a true
// date rollover anchored to server time), chatUsed likewise, freeUsed may
// only flip on, deletes never. A fully reverse-engineered client can
// therefore read its own budget but cannot reset, decrement, or jump the
// date ahead — the database refuses.
//
// Budgets (identical for web + iOS, from the shared subscription mirror):
//   free → 1 generation, lifetime · individual/weekly → 5/day · family (+legacy) → 15/day
//   super admin (users/{uid}.admin) → unlimited, unmetered
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const today = () => new Date().toISOString().split("T")[0];

type Subs = Record<string, { active?: boolean } | undefined>;
export type PlanKind = "free" | "individual" | "family";

export const GENERATION_LIMITS = { individual: 5, family: 15 } as const;

export function planFromSubscriptions(subs: Subs): PlanKind {
  if (subs.family_yearly?.active) return "family";
  if (subs.yearly?.active || subs.monthly?.active || subs.yearlyOffer?.active) return "family";
  if (subs.individual_yearly?.active || subs.weekly?.active) return "individual";
  return "free";
}

interface QuotaDoc {
  date?: string;
  used?: number;
  chatUsed?: number;
  freeUsed?: boolean;
  recentSets?: string[];
  updateTime?: string;
}

function toValue(v: unknown): unknown {
  if (typeof v === "number") return { integerValue: String(v) };
  if (typeof v === "boolean") return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map((s) => ({ stringValue: s })) } };
  return { stringValue: String(v ?? "") };
}

async function restGet(path: string, token: string): Promise<any | null> {
  const response = await fetch(`${FIRESTORE_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return response.json();
}

function parseDoc(fields: Record<string, any> | undefined, updateTime?: string): QuotaDoc {
  if (!fields) return { updateTime };
  const out: QuotaDoc = { updateTime };
  if (fields.date?.stringValue) out.date = fields.date.stringValue;
  if (fields.used?.integerValue) out.used = parseInt(fields.used.integerValue, 10);
  if (fields.chatUsed?.integerValue) out.chatUsed = parseInt(fields.chatUsed.integerValue, 10);
  if (typeof fields.freeUsed?.booleanValue === "boolean") out.freeUsed = fields.freeUsed.booleanValue;
  if (fields.recentSets?.arrayValue?.values) {
    out.recentSets = fields.recentSets.arrayValue.values.map((v: any) => v.stringValue);
  }
  return out;
}

async function restPatch(
  path: string,
  token: string,
  data: Record<string, unknown>,
  updateTime?: string
): Promise<boolean> {
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const precondition = updateTime ? `&currentDocument.updateTime=${encodeURIComponent(updateTime)}` : "";
  const response = await fetch(`${FIRESTORE_BASE}/${path}?${mask}${precondition}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)])) }),
  });
  return response.ok;
}

async function readUser(token: string, uid: string): Promise<{ plan: PlanKind; admin: boolean }> {
  const user = await restGet(`users/${uid}`, token);
  const subs: any = user?.fields?.subscriptions?.mapValue?.fields ?? {};
  const parsed: Subs = {};
  for (const [key, value] of Object.entries(subs)) {
    parsed[key] = { active: (value as any)?.mapValue?.fields?.active?.booleanValue === true };
  }
  return {
    plan: planFromSubscriptions(parsed),
    admin: user?.fields?.admin?.booleanValue === true,
  };
}

async function getQuota(token: string, uid: string): Promise<QuotaDoc | null> {
  const doc = await restGet(`generationQuota/${uid}`, token);
  return parseDoc(doc?.fields, doc?.updateTime);
}

export type QuotaResult = { ok: true } | { ok: false; status: number; message: string };

/** Optimistic-concurrency write: concurrent callers race on the quota doc
 *  (pre-analysis + main pipeline, web trio); the updateTime precondition
 *  409s the loser. Re-read fresh state and retry once before giving up. */
async function patchWithRetry(
  token: string,
  uid: string,
  buildWrite: (quota: QuotaDoc) => Record<string, unknown>
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const quota = (await getQuota(token, uid)) ?? {};
    const write = await restPatch(`generationQuota/${uid}`, token, buildWrite(quota), quota.updateTime);
    if (write) return true;
  }
  return false;
}

/**
 * Meters one generation. `setId` lets a client that fans one generation
 * into multiple requests (the web's note+flashcards/quiz trio) pay one
 * unit: the first sibling increments, the rest are recognized and free.
 */
export async function meterGeneration(
  token: string,
  uid: string,
  setId?: string
): Promise<QuotaResult> {
  const { plan, admin } = await readUser(token, uid);

  // Super admins generate without limits (and without metering).
  if (admin) return { ok: true };

  let quota = (await getQuota(token, uid)) ?? {};
  let isToday = quota.date === today();

  if (setId && isToday && (quota.recentSets ?? []).includes(setId)) {
    return { ok: true };
  }

  if (plan === "free") {
    if (quota.freeUsed) {
      return { ok: false, status: 429, message: "Your free note has been used. Upgrade to keep generating." };
    }
    const ok = await patchWithRetry(token, uid, (q) => {
      const day = q.date === today();
      return {
        date: today(),
        used: day ? (q.used ?? 0) + 1 : 1,
        freeUsed: true,
        ...(setId && { recentSets: [setId] }),
      };
    });
    return ok ? { ok: true } : { ok: false, status: 500, message: "Quota update conflict, try again." };
  }

  const limit = plan === "family" ? GENERATION_LIMITS.family : GENERATION_LIMITS.individual;
  const used = isToday ? quota.used ?? 0 : 0;
  if (used >= limit) {
    return { ok: false, status: 429, message: `Daily limit reached (${limit} generations per day). Resets at midnight.` };
  }

  const ok = await patchWithRetry(token, uid, (q) => {
    const day = q.date === today();
    return {
      date: today(),
      used: day ? (q.used ?? 0) + 1 : 1,
      ...(setId && { recentSets: [...(day ? q.recentSets ?? [] : []), setId].slice(-10) }),
    };
  });

  return ok ? { ok: true } : { ok: false, status: 500, message: "Quota update conflict, try again." };
}

/** Chat/onboarding bucket: generous daily cap, separate from generations. */
export async function meterChat(token: string, uid: string): Promise<QuotaResult> {
  const { admin } = await readUser(token, uid);

  // Super admins chat without limits.
  if (admin) return { ok: true };

  const quota = (await getQuota(token, uid)) ?? {};
  const isToday = quota.date === today();
  const used = isToday ? quota.chatUsed ?? 0 : 0;
  if (used >= 100) {
    return { ok: false, status: 429, message: "Daily limit reached. Try again tomorrow." };
  }
  const ok = await patchWithRetry(token, uid, (q) => {
    const day = q.date === today();
    return {
      date: today(),
      chatUsed: (day ? q.chatUsed ?? 0 : 0) + 1,
      // The rules' create/update branches validate `used` on every write
      // (tamper-proofing) — carry the current value (0 when starting clean)
      // so a chat-first write on a fresh account passes them.
      used: day ? q.used ?? 0 : 0,
    };
  });
  return ok ? { ok: true } : { ok: false, status: 500, message: "Quota update conflict, try again." };
}
