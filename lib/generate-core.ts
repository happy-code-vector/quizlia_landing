// Shared generation core — the ONE place prompts live, transcripts are
// extracted, Gemini is called, and responses are formatted. Both the web
// route (/api/generate) and the iOS route (/api/ios/gemini/[purpose])
// call generateCore(); each applies its own auth before calling.
//
// YouTube content uses Supadata text transcripts (~2K tokens) instead of
// Gemini video tokens (~1M/hour) — the /api/ios/study-from-video route
// proved this approach works.

import { JSON_FORMAT_CONTRACT } from "@/lib/format-contract";
import { youtubeVideoId, getTranscript } from "@/lib/transcript";
import { timingLog } from "@/lib/timing";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

// Transcript-size guard: cost scales with words spoken, not video minutes
// (the old >60-min duration check was a cost guard from the era of sending
// video to Gemini — ~1M tokens/hour; transcripts made cost linear in text).
// ~120K chars ≈ a very long lecture; beyond it the transcript is
// truncated, matching /api/ios/study-from-video.
const MAX_TRANSCRIPT_CHARS = 120_000;

export type GenerateType = "note" | "flashcard" | "quiz" | "study_pack";

// Study-pack cache version (item 9). Bump when ANY prompt or output cap
// changes — it keys lib/pack-cache entries, so a bump retires every
// cached pack built with the old prompt instead of serving it.
// v2: section 6 question-count bands replace "maximum possible".
export const STUDY_PACK_PROMPT_VERSION = 2;

// Section 6 (locked by AR 2026-10-21): card/question counts scale with
// source length, no flat cap. The server computes the band wherever it
// can measure — transcript words for YouTube (~150 words per spoken
// minute), content words for text; a single photo is band 0 by
// definition. PDFs self-select from the same table in the prompt (the
// model sees the page count; the server does not parse PDFs).
const BANDS = [
  { cards: "5 to 8", questions: "3 to 5" }, // <3 min / 1 photo / <300 words
  { cards: "8 to 15", questions: "5 to 8" }, // 3-10 min / 1-3 pages
  { cards: "15 to 25", questions: "8 to 12" }, // 10-30 min / 4-15 pages
  { cards: "25 to 40", questions: "12 to 20" }, // >30 min / >15 pages
] as const;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** 0-3 when the band is measurable, -1 when the prompt must carry the
 *  whole table (PDF) for the model to self-select. */
export function bandForSource(words: number, kind: "text" | "youtube" | "photo" | "pdf"): number {
  if (kind === "photo") return 0;
  if (kind === "pdf") return -1;
  if (kind === "youtube") {
    if (words < 450) return 0; // ~3 spoken minutes
    if (words < 1500) return 1; // ~10 minutes
    if (words < 4500) return 2; // ~30 minutes
    return 3;
  }
  if (words < 300) return 0;
  if (words < 1000) return 1;
  if (words < 3500) return 2;
  return 3;
}

/** Fills {CARDS}/{QUESTIONS} in a prompt template with the band's counts
 *  (or the full table for PDFs). */
function withBandTargets(prompt: string, band: number): string {
  const cards =
    band >= 0
      ? `${BANDS[band].cards} flashcards`
      : "flashcards scaled to the source length (single page or short text: 5 to 8; 1-3 pages: 8 to 15; 4-15 pages: 15 to 25; over 15 pages: 25 to 40)";
  const questions =
    band >= 0
      ? `${BANDS[band].questions} multiple-choice questions`
      : "multiple-choice questions scaled to the source length (single page or short text: 3 to 5; 1-3 pages: 5 to 8; 4-15 pages: 8 to 12; over 15 pages: 12 to 20)";
  return prompt.replace("{CARDS}", cards).replace("{QUESTIONS}", questions);
}

export interface GenerateInput {
  type: GenerateType;
  content: string;          // text, or YouTube URL when mimeType is video/youtube
  mimeType?: string;        // "video/youtube" for YouTube; else text/image/pdf
  fileData?: string;        // base64 inline data (image/PDF)
}

export type GenerateResult =
  | { ok: true; data: any; usage?: { inTokens: number; cachedTokens: number; outTokens: number } }
  | { ok: false; status: number; message: string; code?: string };

// Item 65: source type for the timing lines — youtube (transcript path),
// photo/pdf (inline fileData), or plain text.
function sourceTypeOf(input: GenerateInput): "youtube" | "photo" | "pdf" | "text" {
  if (input.mimeType === "video/youtube") return "youtube";
  if (input.fileData) return (input.mimeType || "").startsWith("image/") ? "photo" : "pdf";
  return "text";
}

// PROMPTS — moved verbatim from /api/generate/route.ts. Each prompt ends
// with its RESPONSE FORMAT (JSON only) schema; the JSON_FORMAT_CONTRACT is
// appended at call time (not baked into the prompt text).
const PROMPTS: Record<GenerateType, string> = {
  note: `You are QuicNotes, an AI that extracts study notes from the given content.

TASK:
Analyze the provided content and return a structured summary in JSON format with the following keys:
- title: string (concise title of the content)
- category: string (the single best-fit subject area from exactly: history, biology, literature, math, science, or community if none fit)
- difficulty: string ("easy", "medium", or "hard" — estimated from how advanced the material is)
- quick_summary: string (a 5–8 sentence overall summary)
- key_findings: array of strings (as many key facts or statistics as possible)
- important_notes: array of strings (all relevant cautions, limitations, or extra details you can find)
- sections: array of cheat-sheet sections — the detailed study material, organized topic by topic (3–8 sections, each with a short descriptive title, clear explanatory content, and up to 5 key terms)

RULES:
- Capture all meaningful information, no artificial limits on list sizes.
- The sections are the main body of the notes: cover the whole source, one topic per section.
- Keep language clear and concise.
- No extra commentary or formatting outside of JSON.
- If you cannot access or analyze the content, return: {"error": "content_not_accessible", "message": "Unable to access or analyze the provided content"}

RESPONSE FORMAT (JSON only):
{
  "title": "string",
  "category": "history",
  "difficulty": "medium",
  "quick_summary": "string",
  "key_findings": ["point 1", "point 2", "..."],
  "important_notes": ["point 1", "point 2", "..."],
  "sections": [
    { "title": "section title", "content": "explanatory text", "keyTerms": ["term 1", "term 2"] }
  ]
}`,

  flashcard: `You are QuicNotes, an AI that generates study flashcards from the provided content.

TASK:
Generate {CARDS} from the content — high quality, no filler.
- Each flashcard should cover a unique and important concept.

Each flashcard must include:
- question: string (clear, concise; preferably under 20 words)
- answer: string (short, precise, factual)

RULES:
- No duplicate or trivial flashcards.
- Answers must be based only on the provided content.
- The assistant must return only valid JSON matching the schema below.
- If you cannot access or analyze the content, return: {"error": "content_not_accessible", "message": "Unable to access or analyze the provided content"}

RESPONSE FORMAT (JSON only):
{
  "flashcards": [
    { "question": "string", "answer": "string" }
  ]
}`,

  quiz: `You are QuicNotes, an AI that generates multiple-choice quiz questions from the given content.

TASK:
Generate {QUESTIONS} from the content — high quality, no filler.
- Cover the important concepts with diverse, non-overlapping questions.

Each quiz must have:
- question: string (under 25 words)
- options: array of 4 distinct strings
- correct_answer: string (must exactly match one option)
- explanation: string (1–2 sentences)

RULES:
- Only one correct answer per question.
- Distractors must be plausible but clearly wrong.
- No duplicates.
- If you cannot access or analyze the content, return: {"error": "content_not_accessible", "message": "Unable to access or analyze the provided content"}

RESPONSE FORMAT (JSON only):
{
  "quizzes": [
    {
      "question": "string",
      "options": ["string","string","string","string"],
      "correct_answer": "string",
      "explanation": "string"
    }
  ]
}`,

  study_pack: `You are QuicNotes, an AI that produces a complete study pack from the given content.

TASK:
Produce all three deliverables in ONE JSON response:
1. Structured study notes (same schema as the "note" task below).
2. Study flashcards — {CARDS}, high quality, no filler.
3. Multiple-choice quiz questions — {QUESTIONS}, high quality, no filler.

NOTE SCHEMA:
- title: string (concise title of the content)
- quick_summary: string (a 5–8 sentence overall summary)
- key_findings: array of strings (as many key facts or statistics as possible)
- important_notes: array of strings (all relevant cautions, limitations, or extra details you can find)
- sections: array of cheat-sheet sections — the detailed study material, organized topic by topic (3–8 sections, each with a short descriptive title, clear explanatory content, and up to 5 key terms)

FLASHCARD SCHEMA (each): { "question": string (clear, concise; preferably under 20 words), "answer": string (short, precise, factual) }

QUIZ SCHEMA (each): { "question": string (under 25 words), "options": array of 4 distinct strings, "correct_answer": string (must exactly match one option), "explanation": string (1–2 sentences) }

RULES:
- Answers must be based only on the provided content.
- No duplicates or trivial items. Only one correct answer per quiz question.
- Distractors must be plausible but clearly wrong.
- If you cannot access or analyze the content, return: {"error": "content_not_accessible", "message": "Unable to access or analyze the provided content"}

RESPONSE FORMAT (JSON only):
{
  "note": { "title": "string", "quick_summary": "string", "key_findings": ["..."], "important_notes": ["..."], "sections": [ { "title": "section title", "content": "explanatory text", "keyTerms": ["term 1", "term 2"] } ] },
  "flashcards": [ { "question": "string", "answer": "string" } ],
  "quizzes": [ { "question": "string", "options": ["string","string","string","string"], "correct_answer": "string", "explanation": "string" } ]
}`,
};

// cleanJSONString — moved verbatim from /api/generate/route.ts.
function cleanJSONString(jsonString: string): string {
  let str = jsonString.trim();

  // Remove markdown fences
  if (str.startsWith("```json")) {
    str = str.substring(7);
  } else if (str.startsWith("```")) {
    str = str.substring(3);
  }

  if (str.endsWith("```")) {
    str = str.substring(0, str.length - 3);
  }

  return str.trim();
}

// ---- streaming study packs (item 62) and Tier-2 failover (item 34) ----

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/** One Gemini call for a single-artifact prompt (streamed-pack parts). */
async function geminiText(prompt: string, maxOutputTokens: number) {
  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/** Tier 2 (item 34): Haiku 5.5, text-only sources, 16K output (4000
 *  truncates a banded pack — eval finding 2026-10-30). Same JSON
 *  contract; the caller parses identically. */
async function haikuText(prompt: string, maxOutputTokens = 16384) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: maxOutputTokens,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`haiku ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content || []).filter((c) => c.type === "text").map((c) => c.text || "").join("");
}

/** geminiText with one Haiku retry on a capacity failure (429/5xx/
 *  timeout). Text sources only — Tier 2 carries no inline file data. */
export async function textWithFailover(prompt: string, maxOutputTokens: number): Promise<string> {
  try {
    return await geminiText(prompt, maxOutputTokens);
  } catch (err) {
    const msg = String(err);
    if (!/gemini (429|5\d\d)/.test(msg) && !/timeout|fetch failed/i.test(msg)) throw err;
    console.warn(`generateCore: tier-2 failover (${msg.slice(0, 40)})`);
    return await haikuText(prompt);
  }
}

function parseJsonLoose(text: string): any {
  let s = text.trim();
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

export interface StreamedPart {
  part: "note" | "flashcards" | "quizzes" | "done";
  data?: any;
}

/** Item 62: emits note, then flashcards, then quizzes, then done — the
 *  app opens the note after roughly a third of the wait. One request,
 *  one meter entry (the route meters before calling); the combined pack
 *  is returned for the item-9 cache so a dropped connection still pays
 *  off for the next caller of the same source. */
export async function streamStudyPack(
  sourceText: string,
  band: number
): Promise<{ parts: StreamedPart[]; pack: any }> {
  const cards =
    band >= 0
      ? `${BANDS[band].cards} flashcards`
      : "flashcards scaled to the source length (single page or short text: 5 to 8; 1-3 pages: 8 to 15; 4-15 pages: 15 to 25; over 15 pages: 25 to 40)";
  const questions =
    band >= 0
      ? `${BANDS[band].questions} multiple-choice questions`
      : "multiple-choice questions scaled to the source length (single page or short text: 3 to 5; 1-3 pages: 5 to 8; 4-15 pages: 8 to 12; over 15 pages: 12 to 20)";
  const parts: StreamedPart[] = [];

  const note = parseJsonLoose(
    await textWithFailover(`${PROMPTS.note}\n\nCONTENT:\n${sourceText}\n\n${JSON_FORMAT_CONTRACT}`, 16384)
  );
  parts.push({ part: "note", data: note });
  const flashcards =
    parseJsonLoose(
      await textWithFailover(
        `${PROMPTS.flashcard.replace("{CARDS}", cards)}\n\nCONTENT:\n${sourceText}\n\n${JSON_FORMAT_CONTRACT}`,
        16384
      )
    )?.flashcards ?? [];
  parts.push({ part: "flashcards", data: flashcards });
  const quizzes =
    parseJsonLoose(
      await textWithFailover(
        `${PROMPTS.quiz.replace("{QUESTIONS}", questions)}\n\nCONTENT:\n${sourceText}\n\n${JSON_FORMAT_CONTRACT}`,
        16384
      )
    )?.quizzes ?? [];
  parts.push({ part: "quizzes", data: quizzes });
  parts.push({ part: "done" });
  return { parts, pack: { note, flashcards, quizzes } };
}

export async function generateCore(input: GenerateInput): Promise<GenerateResult> {
  if (!GEMINI_API_KEY) {
    return { ok: false, status: 500, message: "Gemini API key not configured" };
  }

  const prompt = PROMPTS[input.type];
  if (!prompt) {
    return { ok: false, status: 400, message: `Invalid type: ${input.type}` };
  }

  const parts: any[] = [];

  // Item 65: transcript fetch / model call / total, per source type. The
  // transcript phase is usually a warm cache hit here — the routes'
  // pre-metering check paid the real fetch (logged by getTranscript).
  const startedAt = Date.now();
  const source = sourceTypeOf(input);
  let transcriptMs = 0;
  let videoId: string | null = null;

  if (input.mimeType === "video/youtube" && input.content) {
    // YouTube: extract transcript text (Supadata → TranscriptAPI), send
    // TEXT to Gemini — not the video fileUri. ~500x cheaper.
    videoId = youtubeVideoId(input.content);
    if (!videoId) {
      return { ok: false, status: 422, message: "Invalid YouTube link", code: "bad_link" };
    }

    const transcriptStartedAt = Date.now();
    const transcript = await getTranscript(videoId);
    transcriptMs = Date.now() - transcriptStartedAt;
    if (!transcript) {
      timingLog("generation", {
        source,
        type: input.type,
        ok: 0,
        error: "no_captions",
        transcriptMs,
        totalMs: Date.now() - startedAt,
      });
      return {
        ok: false,
        status: 422,
        message: "This video has no captions we can read. Try another video or the sample.",
        code: "no_captions",
      };
    }

    parts.push({
      text: `${withBandTargets(prompt, bandForSource(countWords(transcript.text.slice(0, MAX_TRANSCRIPT_CHARS)), "youtube"))}\n\nCONTENT (video transcript):\n${transcript.text.slice(0, MAX_TRANSCRIPT_CHARS)}\n\n${JSON_FORMAT_CONTRACT}`,
    });
  } else {
    // Non-YouTube: prompt first, content second, optional inline file data
    const band = input.fileData
      ? bandForSource(0, (input.mimeType || "").startsWith("image/") ? "photo" : "pdf")
      : bandForSource(countWords(input.content || ""), "text");
    const fullPrompt = `${withBandTargets(prompt, band)}\n\nCONTENT:\n${input.content}\n\n${JSON_FORMAT_CONTRACT}`;
    parts.push({ text: fullPrompt });

    if (input.fileData) {
      parts.push({
        inlineData: {
          mimeType: input.mimeType || "application/pdf",
          data: input.fileData,
        },
      });
    }
  }

  const modelStartedAt = Date.now();
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        // Token allocation: 65536 for PDFs, YouTube videos and combined
        // study packs; 16384 for single-artifact URL requests
        maxOutputTokens:
          input.fileData || input.mimeType === "video/youtube" || input.type === "study_pack"
            ? 65536
            : 16384,
      },
    }),
  });
  const modelMs = Date.now() - modelStartedAt;

  if (!response.ok) {
    const error = await response.text();
    console.error("generateCore: Gemini error:", error.slice(0, 200));
    timingLog("generation", {
      source,
      type: input.type,
      ok: 0,
      error: "model",
      http: response.status,
      ...(source === "youtube" ? { transcriptMs } : {}),
      modelMs,
      totalMs: Date.now() - startedAt,
    });
    return { ok: false, status: 500, message: "Failed to generate content" };
  }

  const data = await response.json();
  const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Token counts (item 65 + the item 26 sizing pass): prompt vs output vs
  // thinking. thoughtsTokenCount is the direct "is thinking on" signal.
  const usage = data.usageMetadata ?? {};
  timingLog("generation", {
    source,
    type: input.type,
    ok: 1,
    ...(source === "youtube" && videoId ? { transcriptMs, videoId } : {}),
    modelMs,
    totalMs: Date.now() - startedAt,
    promptTokens: usage.promptTokenCount ?? 0,
    outputTokens: usage.candidatesTokenCount ?? 0,
    thoughtTokens: usage.thoughtsTokenCount ?? 0,
  });

  if (!output) {
    return { ok: false, status: 500, message: "No output from model" };
  }

  // Try to parse as JSON (note/flashcard/quiz/study_pack all return JSON)
  const cleaned = cleanJSONString(output);
  try {
    const parsed = JSON.parse(cleaned);
    return {
      ok: true,
      data: parsed,
      usage: {
        inTokens: usage.promptTokenCount ?? 0,
        cachedTokens: 0,
        outTokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0),
      },
    };
  } catch {
    // Some responses may be plain text — return as-is
    return { ok: true, data: { text: cleaned } };
  }
}
