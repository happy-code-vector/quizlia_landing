// "Same link" rules for generation dedupe (spec 2026-11-06), shared by the
// web client hook (useGenerateContent) and the server routes. Pure
// functions only — this file is imported from a "use client" bundle, so no
// node:* / admin-SDK imports. Mirrors SourceLinkMatcher in the iOS app
// (QuickNote/Database/DatabaseManger.swift); keep the two in sync.

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Extract an 11-char YouTube video id from a bare URL or raw id.
 *  Case-sensitive by design (YouTube ids are case-significant). Same URL
 *  forms as lib/transcript.ts's server-side youtubeVideoId. */
export function extractYouTubeId(input: string): string | null {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  if (YT_ID.test(trimmed)) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/")[1] || "";
    return YT_ID.test(id) ? id : null;
  }
  if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    const v = url.searchParams.get("v");
    if (v && YT_ID.test(v)) return v;
    const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  }
  return null;
}

const TRACKING_KEYS = new Set([
  "fbclid", "gclid", "igshid", "mc_cid", "mc_eid",
  "ref", "ref_src", "ref_url",
]);

/** Canonical form of a non-YouTube web URL for the client-side "already
 *  generated" check and the server's packurl cache key: lowercase host,
 *  no www., no default port, no #fragment, tracking params dropped,
 *  remaining params sorted, trailing "/" dropped; the canonical form always
 *  uses "https://" (scheme-insensitive: http and https dedupe equal). null
 *  when the input is
 *  not an http(s) URL — callers then treat the link as unmatched. */
export function normalizeUrlForDedupe(input: string): string | null {
  const trimmed = (input || "").trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const defaultPort = (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443");
  const port = url.port && !defaultPort ? `:${url.port}` : "";
  const path = url.pathname.replace(/\/+$/, "");
  const kept = [...url.searchParams.entries()]
    .filter(([k]) => !k.toLowerCase().startsWith("utm_") && !TRACKING_KEYS.has(k.toLowerCase()))
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1));
  const search = kept.length ? `?${new URLSearchParams(kept).toString()}` : "";
  return `https://${host}${port}${path}${search}`;
}
