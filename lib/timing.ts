// Item 65: per-phase wall-clock timing as parseable single lines
// (`[timing] <event> k=v k=v`). Netlify function logs carry them; the
// nightly report (item 30) will aggregate p50/p95 per source type from
// this format — keep fields machine-split (space-separated k=v, integers
// already rounded).
export function timingLog(event: string, fields: Record<string, string | number | boolean>): void {
  const parts = Object.entries(fields).map(
    ([k, v]) => `${k}=${typeof v === "number" ? Math.round(v) : v}`
  );
  console.log(`[timing] ${event} ${parts.join(" ")}`);
}
