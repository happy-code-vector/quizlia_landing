import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-firestore";
import { BUDGETS, periodIdFor, type BudgetPlan } from "@/lib/budget";

export const dynamic = "force-dynamic";

// Item 30: nightly margin report. GET, protected by CRON_SECRET
// (Authorization: Bearer ...) — any scheduler can call it (Netlify
// scheduled function, cron-job.org, AR's box). Aggregates usage/* for the
// CURRENT periods, writes reports/nightly/{date} to Firestore, and posts
// to #quizliai when SLACK_WEBHOOK_URL is set. Net revenue/margin per plan
// needs AR's revenue data — until then the report shows cost vs budget
// (the enforced floor) and flags any key over 30% of its budget (AR's
// per-account alert line).
//
//   curl -H "Authorization: Bearer $CRON_SECRET" https://quizliai.com/api/cron/nightly-report

interface UsageDoc {
  plan?: BudgetPlan;
  periods?: Record<string, { spentCents?: number; byModel?: Record<string, { calls?: number; cents?: number; inTokens?: number; outTokens?: number }> }>;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: 401, message: "Not authorized" } }, { status: 401 });
  }

  const db = await getAdminDb();
  const snap = await db.collection("usage").limit(500).get();

  const periodIds = new Set<string>();
  for (const plan of Object.keys(BUDGETS) as BudgetPlan[]) periodIds.add(periodIdFor(plan));

  const rows: { key: string; plan: BudgetPlan | null; cents: number }[] = [];
  const byModel: Record<string, { calls: number; cents: number }> = {};
  let totalCents = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as UsageDoc;
    let cents = 0;
    for (const [pid, period] of Object.entries(data.periods ?? {})) {
      // Only the live periods — stale months don't matter to tonight.
      if (!periodIds.has(pid)) continue;
      cents += period.spentCents ?? 0;
      for (const [model, m] of Object.entries(period.byModel ?? {})) {
        byModel[model] ??= { calls: 0, cents: 0 };
        byModel[model].calls += m.calls ?? 0;
        byModel[model].cents += m.cents ?? 0;
      }
    }
    if (cents > 0) rows.push({ key: doc.id, plan: data.plan ?? null, cents });
    totalCents += cents;
  }
  rows.sort((a, b) => b.cents - a.cents);

  const mask = (key: string) => (key.length > 10 ? key.slice(0, 5) + "…" + key.slice(-5) : key);
  const lines = [
    `# QuizliA nightly margin report — ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Total model spend (current periods): **${money(totalCents)}** across ${rows.length} budget keys.`,
    "",
    "## By model",
    ...Object.entries(byModel).map(([m, v]) => `- ${m}: ${v.calls} calls, ${money(v.cents)}`),
    "",
    "## Top 10 keys by cost",
    ...rows.slice(0, 10).map((r) => {
      const pct = r.plan ? Math.round((r.cents / BUDGETS[r.plan].cents) * 100) : null;
      return `- ${mask(r.key)} (${r.plan ?? "unknown"}): ${money(r.cents)}${pct != null ? ` — ${pct}% of budget` : ""}${pct != null && pct >= 30 ? " ⚠️" : ""}`;
    }),
    "",
    "## Alerts (>= 30% of budget, item 30)",
    ...(rows.filter((r) => r.plan && r.cents >= BUDGETS[r.plan!].cents * 0.3).length
      ? rows
          .filter((r) => r.plan && r.cents >= BUDGETS[r.plan!].cents * 0.3)
          .map((r) => `- ⚠️ ${mask(r.key)} (${r.plan}) at ${money(r.cents)} / ${money(BUDGETS[r.plan!].cents)}`)
      : ["- none"]),
    "",
    "Net revenue and margin per plan need AR's revenue export (item 30);",
    "until then the enforced budget floor is the reference. Keys older than",
    "this report's periods are ignored.",
  ];
  const markdown = lines.join("\n");

  const date = new Date().toISOString().slice(0, 10);
  await db.collection("reports").doc(`nightly-${date}`).set(
    { markdown, totalCents, generatedAt: new Date().toISOString() },
    { merge: true }
  );

  const webhook = process.env.SLACK_WEBHOOK_URL;
  let delivered = "stored";
  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "```" + markdown + "```" }),
    }).catch(() => null);
    delivered = res && res.ok ? "stored+slack" : "stored (slack failed)";
  }

  return NextResponse.json({ ok: true, delivered, totalCents, keys: rows.length });
}
