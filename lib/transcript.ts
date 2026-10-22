// YouTube transcript fetch for the study pipeline (PRD F2).
//
// Native captions only: Supadata first, TranscriptAPI as fallback. No audio
// transcription here; when a video has no captions the caller gets
// `null` and decides what to do (the onboarding shows an honest error).
// Transcripts are cached in memory per server instance by video ID, so the
// onboarding sample video is fetched once per warm instance.

const SUPADATA_API_KEY = process.env.SUPADATA_API_KEY;
const TRANSCRIPTAPI_KEY = process.env.TRANSCRIPTAPI_KEY;

export interface Transcript {
  videoId: string;
  text: string;
  lang?: string;
  source: "supadata" | "transcriptapi";
}

const cache = new Map<string, { value: Transcript; at: number }>();
const CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 200;

/** Extracts the 11-character video ID from any common YouTube URL form. */
export function youtubeVideoId(input: string): string | null {
  const trimmed = (input || "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/")[1];
      return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
    }
    if (host.endsWith("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
    }
  } catch {
    return null;
  }
  return null;
}

async function fromSupadata(videoId: string): Promise<Transcript | null> {
  if (!SUPADATA_API_KEY) return null;
  const res = await fetch(
    `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`,
    { headers: { "x-api-key": SUPADATA_API_KEY } }
  );
  // 206 = no transcript available; 202 = async job (not used here).
  if (res.status !== 200) {
    console.warn(`transcript: supadata ${res.status} for ${videoId}`);
    return null;
  }
  const data = (await res.json()) as { content?: unknown; lang?: string };
  const text = typeof data.content === "string" ? data.content.trim() : "";
  return text ? { videoId, text, lang: data.lang, source: "supadata" } : null;
}

async function fromTranscriptApi(videoId: string): Promise<Transcript | null> {
  if (!TRANSCRIPTAPI_KEY) return null;
  const res = await fetch(
    `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${videoId}&format=text&include_timestamp=false`,
    { headers: { Authorization: `Bearer ${TRANSCRIPTAPI_KEY}` } }
  );
  if (res.status !== 200) {
    console.warn(`transcript: transcriptapi ${res.status} for ${videoId}`);
    return null;
  }
  const data = (await res.json()) as { transcript?: unknown; language?: string };
  const text = typeof data.transcript === "string" ? data.transcript.trim() : "";
  return text ? { videoId, text, lang: data.language, source: "transcriptapi" } : null;
}

/** Returns the video's caption text, or null when it has none. */
export async function getTranscript(videoId: string): Promise<Transcript | null> {
  const hit = cache.get(videoId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  let transcript: Transcript | null = null;
  try {
    transcript = await fromSupadata(videoId);
  } catch (e) {
    console.warn("transcript: supadata error", e);
  }
  if (!transcript) {
    try {
      transcript = await fromTranscriptApi(videoId);
    } catch (e) {
      console.warn("transcript: transcriptapi error", e);
    }
  }
  if (transcript) {
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
    cache.set(videoId, { value: transcript, at: Date.now() });
  }
  return transcript;
}

const durationCache = new Map<string, { value: number | null; at: number; ttl: number }>();
const DURATION_CACHE_MS = 24 * 60 * 60 * 1000;
const DURATION_MISS_CACHE_MS = 5 * 60 * 1000;

/**
 * Video duration in seconds via Supadata metadata, or null when it can't
 * be determined (no key, lookup failure, unknown field). Callers treat
 * null as "cannot check" and proceed — the cap is a cost guard, not a
 * hard security boundary. No direct YouTube fetching (PRD rev 44), and
 * the lookup aborts after 8s (the metadata endpoint routinely takes
 * 2–6s even for popular videos — 3s aborted most lookups in practice).
 * Failed lookups are cached for a few minutes so retries of the same
 * video don't re-pay the wait.
 */
export async function getVideoDurationSeconds(videoId: string): Promise<number | null> {
  if (!SUPADATA_API_KEY) return null;
  const hit = durationCache.get(videoId);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;
  try {
    const res = await fetch(
      `https://api.supadata.ai/v1/metadata?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}`,
      { headers: { "x-api-key": SUPADATA_API_KEY }, signal: AbortSignal.timeout(8000) }
    );
    if (res.status !== 200) {
      console.warn(`duration: supadata ${res.status} for ${videoId}`);
      durationCache.set(videoId, { value: null, at: Date.now(), ttl: DURATION_MISS_CACHE_MS });
      return null;
    }
    const data = (await res.json()) as { media?: { duration?: unknown } };
    const duration = typeof data.media?.duration === "number" ? data.media.duration : null;
    durationCache.set(videoId, {
      value: duration,
      at: Date.now(),
      ttl: duration !== null ? DURATION_CACHE_MS : DURATION_MISS_CACHE_MS,
    });
    return duration;
  } catch (e) {
    console.warn("duration: supadata error", e);
    durationCache.set(videoId, { value: null, at: Date.now(), ttl: DURATION_MISS_CACHE_MS });
    return null;
  }
}
