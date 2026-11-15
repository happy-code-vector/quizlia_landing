// Pre-call budget reservation for inline fileData (photo/PDF base64).
//
// The server never parses the file (Gemini reads it inline), so pages can't
// be counted here. Size is the available signal: reserve 560 tokens per
// assumed page at FILE_BYTES_PER_PAGE decoded bytes per page. The flat
// 3,000-token figure this replaces under-reserved a 20-page chapter PDF by
// ~3.7x (20 pages ≈ 11,200 tokens; the app sends 10–15 page chapter scans
// once Exam Lens chapter scanning ships). Rounding is always up — a budget
// pre-check must sit on the worst-case side.

/** Assumed decoded bytes per PDF page. ~50KB covers text pages with light
 *  scans; photo-only pages run larger and simply over-reserve. */
export const FILE_BYTES_PER_PAGE = 50_000;

/** Tokens charged per page (Gemini PDF pricing basis, 2026-11-16 spec). */
export const PAGE_TOKENS = 560;

/** Reserve tokens for an inline file given its base64 length. One page is
 *  the floor; never below it, never rounded down. Decoded size is floored —
 *  base64 padding inflates the length, and a budget pre-check must not round
 *  a boundary file up a page on padding alone. */
export function fileDataEstimateTokens(base64Length: number): number {
  const decodedBytes = Math.floor((Math.max(0, base64Length) * 3) / 4);
  const pages = Math.max(1, Math.ceil(decodedBytes / FILE_BYTES_PER_PAGE));
  return pages * PAGE_TOKENS;
}
