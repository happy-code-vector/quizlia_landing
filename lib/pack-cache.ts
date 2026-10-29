// Server-side generation cache (items 9, 45): Firestore-backed so a pack
// or rank result generated on one Netlify instance serves every instance
// and every user — the in-memory Maps in transcript.ts/exam-lens-rank.ts
// only cover one warm lambda. Server-written via the Admin SDK (rules
// default-deny unmatched paths; firestore.rules also blocks the
// collection explicitly), no PII inside: keys are video/page hashes,
// values are model output.
//
// Cached results are served BEFORE metering in the routes and never touch
// a model, so they cost the caller nothing (item 34 Tier 4: "cached study
// packs are served at no cost"; same rule as scan cache hits, item 47).
import { getAdminDb } from "@/lib/admin-firestore";
import { STUDY_PACK_PROMPT_VERSION } from "@/lib/generate-core";

const COLLECTION = "generationCache";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CacheEntry<T> {
  key: string;
  value: T;
}

function docRef(key: string) {
  // Keys arrive pre-scoped ("pack:<videoId>:<variant>:v<n>",
  // "exam-lens:<pageHash>:<profileType>:<language>") — sanitize for a doc id.
  return getAdminDb().then((db) =>
    db.collection(COLLECTION).doc(key.replace(/[^A-Za-z0-9:_-]/g, "_").slice(0, 500))
  );
}

/** Returns the cached value, or null on miss/stale/error — a cache
 *  problem must never fail or slow a generation. Counts a hit and lazily
 *  deletes stale entries. */
export async function readServerCache<T>(key: string): Promise<T | null> {
  try {
    const ref = await docRef(key);
    const snap = await ref.get();
    const doc = snap.data() as { value?: T; createdAt?: string; hits?: number } | undefined;
    if (!doc?.value) return null;
    const age = Date.now() - Date.parse(doc.createdAt || "");
    if (!(age >= 0 && age < TTL_MS)) {
      void ref.delete().catch(() => {});
      return null;
    }
    void ref.update({ hits: (doc.hits ?? 0) + 1, lastHitAt: new Date().toISOString() }).catch(() => {});
    return doc.value;
  } catch (err) {
    console.warn(`[server-cache] read failed for ${key.slice(0, 40)}:`, err);
    return null;
  }
}

/** Fire-and-forget semantics: errors are logged, never thrown. */
export async function writeServerCache<T>(key: string, value: T): Promise<void> {
  try {
    const ref = await docRef(key);
    await ref.set(
      { value, hits: 0, createdAt: new Date().toISOString() },
      { merge: false }
    );
  } catch (err) {
    console.warn(`[server-cache] write failed for ${key.slice(0, 40)}:`, err);
  }
}

// ---- study packs (item 9): key by video id + prompt variant, adult and
// child separate; the prompt version retires entries when prompts change.
export function studyPackKey(videoId: string, variant: "adult" | "child" = "adult"): string {
  return `pack:${videoId}:${variant}:v${STUDY_PACK_PROMPT_VERSION}`;
}

export async function getCachedStudyPack(
  videoId: string,
  variant: "adult" | "child" = "adult"
): Promise<any | null> {
  return readServerCache(studyPackKey(videoId, variant));
}

export async function putCachedStudyPack(
  videoId: string,
  data: any,
  variant: "adult" | "child" = "adult"
): Promise<void> {
  await writeServerCache(studyPackKey(videoId, variant), data);
}
