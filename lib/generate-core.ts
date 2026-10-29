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

export interface GenerateInput {
  type: GenerateType;
  content: string;          // text, or YouTube URL when mimeType is video/youtube
  mimeType?: string;        // "video/youtube" for YouTube; else text/image/pdf
  fileData?: string;        // base64 inline data (image/PDF)
}

export type GenerateResult =
  | { ok: true; data: any }
  | { ok: false; status: number; message: string; code?: string };

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
Generate the maximum number of high-quality flashcards possible from the content.
- No word count or time limit restrictions.
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
Generate the maximum possible number of high-quality MCQs from the content.
- Cover all important concepts with diverse, non-overlapping questions.

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
2. Study flashcards — the maximum number of high-quality flashcards possible.
3. Multiple-choice quiz questions — the maximum possible number of high-quality MCQs.

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

export async function generateCore(input: GenerateInput): Promise<GenerateResult> {
  if (!GEMINI_API_KEY) {
    return { ok: false, status: 500, message: "Gemini API key not configured" };
  }

  const prompt = PROMPTS[input.type];
  if (!prompt) {
    return { ok: false, status: 400, message: `Invalid type: ${input.type}` };
  }

  const parts: any[] = [];

  if (input.mimeType === "video/youtube" && input.content) {
    // YouTube: extract transcript text (Supadata → TranscriptAPI), send
    // TEXT to Gemini — not the video fileUri. ~500x cheaper.
    const videoId = youtubeVideoId(input.content);
    if (!videoId) {
      return { ok: false, status: 422, message: "Invalid YouTube link", code: "bad_link" };
    }

    const transcript = await getTranscript(videoId);
    if (!transcript) {
      return {
        ok: false,
        status: 422,
        message: "This video has no captions we can read. Try another video or the sample.",
        code: "no_captions",
      };
    }

    parts.push({
      text: `${prompt}\n\nCONTENT (video transcript):\n${transcript.text.slice(0, MAX_TRANSCRIPT_CHARS)}\n\n${JSON_FORMAT_CONTRACT}`,
    });
  } else {
    // Non-YouTube: prompt first, content second, optional inline file data
    const fullPrompt = `${prompt}\n\nCONTENT:\n${input.content}\n\n${JSON_FORMAT_CONTRACT}`;
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

  if (!response.ok) {
    const error = await response.text();
    console.error("generateCore: Gemini error:", error.slice(0, 200));
    return { ok: false, status: 500, message: "Failed to generate content" };
  }

  const data = await response.json();
  const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!output) {
    return { ok: false, status: 500, message: "No output from model" };
  }

  // Try to parse as JSON (note/flashcard/quiz/study_pack all return JSON)
  const cleaned = cleanJSONString(output);
  try {
    const parsed = JSON.parse(cleaned);
    return { ok: true, data: parsed };
  } catch {
    // Some responses may be plain text — return as-is
    return { ok: true, data: { text: cleaned } };
  }
}
