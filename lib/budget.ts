// Dollar budget core — the 60% margin floor (handoff items 22-25, AR rule
// 2026-10-20): AI cost per paying account may never exceed 40% of its net
// revenue in a billing period. Integer cents everywhere (no float drift).
//
// Enforcement keys on the PURCHASE (originalTransactionId from the StoreKit
// JWS — item 28: "never key a paid budget on the Firebase uid alone").
// Account-path spend is still RECORDED (uid-keyed) so the nightly report
// (item 30) sees true totals; enforcement for accounts turns on when the
// subscription mirror carries originalTransactionId (additive, written by
// /api/ios/entitlements since 2026-10-30).
//
// Period anchoring (v1 approximation of AR's "per 30-day/7-day period"):
// calendar month for annual plans, ISO week for weekly. Deterministic and
// server-computable without per-user anchors.
import { getAdminDb } from "@/lib/admin-firestore";

// Per-1M-token prices (AR, verified 2026-10-20): [input, cached-input, output]
export const MODEL_PRICES = {
  "gemini-3.1-flash-lite": [0.25, 0.025, 1.5],
  "claude-haiku-5-5": [0.1, 0.01, 0.5],
} as const;
export type MeteredModel = keyof typeof MODEL_PRICES;

// Budget table (item 23, AR's own figures, weekly corrected to $7.99):
// cents per period. Trial is TOTAL (no period).
export const BUDGETS = {
  individual: { cents: 142, kind: "month" },
  family: { cents: 283, kind: "month" },
  weekly: { cents: 272, kind: "week" },
} as const;
export type BudgetPlan = keyof typeof BUDGETS;

export function costCents(
  model: MeteredModel,
  inTokens: number,
  cachedTokens: number,
  outTokens: number
): number {
  const [pin, pcached, pout] = MODEL_PRICES[model];
  return Math.ceil(
    ((inTokens - Math.min(cachedTokens, inTokens)) * pin +
      Math.min(cachedTokens, inTokens) * pcached +
      outTokens * pout) *
      1000000 /* tokens→1M scale, dollars→cents */
      / 1e6
  );
}

/** Worst-case pre-call estimate (item 24): counted input + max_output at
 *  the output price. */
export function estimateCents(model: MeteredModel, estInputTokens: number, maxOutputTokens: number): number {
  const [, , pout] = MODEL_PRICES[model];
  return Math.ceil((estInputTokens * MODEL_PRICES[model][0] + maxOutputTokens * pout) * 1000000 / 1e6);
}

// ---- period ids and reset dates (UTC, like every date in this codebase)

export function periodIdFor(plan: BudgetPlan, at = new Date()): string {
  const kind = BUDGETS[plan].kind;
  if (kind === "week") {
    const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
    const day = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - day);
    return `W${d.toISOString().slice(0, 10)}`;
  }
  return at.toISOString().slice(0, 7); // "2026-10"
}

export function periodResetAt(plan: BudgetPlan, at = new Date()): string {
  const kind = BUDGETS[plan].kind;
  if (kind === "week") {
    const d = new Date(at);
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() + (7 - day));
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1)).toISOString();
}

export function todayUTC(at = new Date()): string {
  return at.toISOString().slice(0, 10);
}

/** Item 25: daily allowance = 2 x (period budget / days in period). */
export function dailyAllowanceCents(plan: BudgetPlan, at = new Date()): number {
  const kind = BUDGETS[plan].kind;
  const days = kind === "week" ? 7 : new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0)).getUTCDate();
  return Math.ceil((2 * BUDGETS[plan].cents) / days);
}

// ---- Firestore doc: usage/{budgetKey} { periods: { [periodId]: {
//        spentCents, byModel: { [model]: { calls, inTokens, outTokens, cents } },
//        days: { [date]: spentCents } } }, updatedAt }

export interface SpendUsage {
  periodSpentCents?: number;
  daySpentCents?: number;
}

async function readSpend(budgetKey: string, periodId: string, day: string): Promise<SpendUsage> {
  try {
    const db = await getAdminDb();
    const snap = await db.collection("usage").doc(budgetKey).get();
    const doc = (snap.data() ?? {}) as { periods?: Record<string, SpendUsage & { days?: Record<string, number> }> };
    const period = doc.periods?.[periodId];
    return {
      periodSpentCents: period?.periodSpentCents ?? 0,
      daySpentCents: period?.days?.[day] ?? 0,
    };
  } catch (err) {
    console.warn(`[budget] read failed for ${budgetKey.slice(0, 24)}:`, err);
    // A metering failure must never block generation (fail-open on reads).
    return { periodSpentCents: 0, daySpentCents: 0 };
  }
}

export type BudgetCheck =
  | { ok: true }
  | { ok: false; kind: "period" | "daily"; resetAt: string; message: string };

/** Pre-call check (items 24 + 25): worst-case estimate against the period
 *  budget and today's pacing allowance. */
export async function checkBudget(
  budgetKey: string,
  plan: BudgetPlan,
  estCents: number
): Promise<BudgetCheck> {
  const periodId = periodIdFor(plan);
  const { periodSpentCents = 0, daySpentCents = 0 } = await readSpend(budgetKey, periodId, todayUTC());
  if (periodSpentCents + estCents > BUDGETS[plan].cents) {
    return {
      ok: false,
      kind: "period",
      resetAt: periodResetAt(plan),
      message: "You've reached this period's study limit. It resets on " + periodResetAt(plan).slice(0, 10) + ".",
    };
  }
  if (daySpentCents + estCents > dailyAllowanceCents(plan)) {
    const reset = new Date();
    reset.setUTCHours(24, 0, 0, 0);
    return {
      ok: false,
      kind: "daily",
      resetAt: reset.toISOString(),
      message: "Daily study limit reached. It resets at midnight.",
    };
  }
  return { ok: true };
}

/** Records real usage (item 22) — transactional increment; never throws
 *  into the request path. */
export async function recordSpend(
  budgetKey: string,
  plan: BudgetPlan,
  model: MeteredModel,
  inTokens: number,
  cachedTokens: number,
  outTokens: number
): Promise<void> {
  const cents = costCents(model, inTokens, cachedTokens, outTokens);
  if (cents <= 0) return;
  const periodId = periodIdFor(plan);
  const day = todayUTC();
  try {
    const db = await getAdminDb();
    const ref = db.collection("usage").doc(budgetKey);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const doc = (snap.data() ?? {}) as {
        periods?: Record<string, { spentCents?: number; byModel?: Record<string, { calls?: number; inTokens?: number; outTokens?: number; cents?: number }>; days?: Record<string, number> }>;
      };
      const period = doc.periods?.[periodId] ?? {};
      const byModel = { ...(period.byModel ?? {}) };
      const m = byModel[model] ?? {};
      byModel[model] = {
        calls: (m.calls ?? 0) + 1,
        inTokens: (m.inTokens ?? 0) + inTokens,
        outTokens: (m.outTokens ?? 0) + outTokens,
        cents: (m.cents ?? 0) + cents,
      };
      const days = { ...(period.days ?? {}) };
      days[day] = (days[day] ?? 0) + cents;
      tx.set(
        ref,
        {
          updatedAt: new Date().toISOString(),
          [`periods.${periodId}`]: {
            spentCents: (period.spentCents ?? 0) + cents,
            byModel,
            days,
          },
        },
        { merge: true }
      );
    });
  } catch (err) {
    console.warn(`[budget] record failed for ${budgetKey.slice(0, 24)}:`, err);
  }
}

/** Purchase-backed budget key for a verified entitlement (item 28). */
export function budgetKeyFor(entitlement: { originalTransactionId?: string; transactionId: string }): string {
  return `otxn:${entitlement.originalTransactionId || entitlement.transactionId}`;
}
