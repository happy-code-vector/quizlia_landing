import { NextRequest, NextResponse } from "next/server";
import { meterGeneration } from "@/lib/quota";
import { resolveCaller } from "@/lib/token-verify";
import { JSON_FORMAT_CONTRACT } from "@/lib/format-contract";

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

const PROMPTS = {
  note: `You are QuicNotes, an AI that extracts study notes from the given content.

TASK:
Analyze the provided content and return a structured summary in JSON format with the following keys:
- title: string (concise title of the content)
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

// Server-side quota enforcement — shared with the iOS proxy (lib/quota):
// one linked account = one budget everywhere. No service account: the
// caller's token is verified against Google's public certs (token-verify)
// and the counter is written under tamper-proof rules with that same token.
async function checkQuota(request: NextRequest, setId?: string): Promise<Response | null> {
  const caller = await resolveCaller(
    request.headers.get("authorization") || "",
    null
  );
  if (!caller) {
    return NextResponse.json({ error: "Sign in to generate content" }, { status: 401 });
  }

  try {
    const token = (request.headers.get("authorization") || "").slice(7);
    const result = await meterGeneration(token, caller.uid, setId);
    if (result.ok) return null;

    return NextResponse.json(
      { error: result.message, upgrade: true },
      { status: result.status }
    );
  } catch (error) {
    console.error("Quota check failed:", error);
    return NextResponse.json({ error: "Could not verify generation quota" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, content, fileData, mimeType, setId } = await request.json();

    // Server-side quota gate. The web fires note+flashcard+quiz as one
    // generation sharing a setId, so the trio is metered exactly once.
    const quotaError = await checkQuota(request, setId);
    if (quotaError) return quotaError;

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    if (!type || !content) {
      return NextResponse.json(
        { error: "Missing type or content" },
        { status: 400 }
      );
    }

    const prompt = PROMPTS[type as keyof typeof PROMPTS];
    if (!prompt) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Prepare parts for Gemini API
    const parts: any[] = [];

    // Handle YouTube videos using File API (as per Google's video understanding docs)
    if (mimeType === "video/youtube" && content) {
      // For YouTube, we need to extract the video URL and use fileData
      const youtubeUrl = content.replace("Analyze the following link: ", "").trim();

      parts.push({
        fileData: {
          mimeType: "video/mp4", // YouTube videos are treated as video/mp4
          fileUri: youtubeUrl,
        },
      });

      // Add the prompt after the video
      parts.push({ text: `${prompt}\n\n${JSON_FORMAT_CONTRACT}` });
    } else {
      // For non-YouTube content, add prompt first
      const fullPrompt = `${prompt}\n\nCONTENT:\n${content}\n\n${JSON_FORMAT_CONTRACT}`;
      parts.push({ text: fullPrompt });

      // If file data is provided (image or PDF), add it as inline data
      if (fileData) {
        parts.push({
          inlineData: {
            mimeType: mimeType || "application/pdf",
            data: fileData,
          },
        });
      }
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: parts,
          },
        ],
        generationConfig: {
          // Token allocation: 65536 for PDFs, YouTube videos and combined
          // study packs; 16384 for single-artifact URL requests
          maxOutputTokens:
            fileData || mimeType === "video/youtube" || type === "study_pack"
              ? 65536
              : 16384,
          // PRD item 2: low-res video (~98 tok/s vs ~290 default) and a
          // minimal thinking budget (thinking tokens bill as output).
          ...(mimeType === "video/youtube" && {
            mediaResolution: "MEDIA_RESOLUTION_LOW",
            thinkingConfig: { thinkingBudget: 0 },
          }),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      return NextResponse.json(
        { error: "Failed to generate content" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const output =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!output) {
      return NextResponse.json(
        { error: "No output from Gemini" },
        { status: 500 }
      );
    }

    // Clean and parse JSON
    const cleanOutput = cleanJSONString(output);

    try {
      const parsed = JSON.parse(cleanOutput);

      // Check if AI returned an error response
      if (parsed.error) {
        const errorMessage = parsed.message || "Unable to generate content from the provided source";
        console.error("AI returned error:", parsed);
        return NextResponse.json(
          {
            success: false,
            error: parsed.error,
            message: errorMessage
          },
          { status: 400 }
        );
      }

      // Validate that we have actual content based on type
      if (type === "note" && (!parsed.title || !parsed.key_findings || !parsed.quick_summary)) {
        console.error("Invalid note structure:", parsed);
        return NextResponse.json(
          {
            success: false,
            error: "invalid_response",
            message: "AI did not return valid note content"
          },
          { status: 500 }
        );
      }

      if (type === "flashcard" && (!parsed.flashcards || !Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0)) {
        console.error("Invalid flashcard structure:", parsed);
        return NextResponse.json(
          {
            success: false,
            error: "invalid_response",
            message: "AI did not return valid flashcard content"
          },
          { status: 500 }
        );
      }

      if (type === "quiz" && (!parsed.quizzes || !Array.isArray(parsed.quizzes) || parsed.quizzes.length === 0)) {
        console.error("Invalid quiz structure:", parsed);
        return NextResponse.json(
          {
            success: false,
            error: "invalid_response",
            message: "AI did not return valid quiz content"
          },
          { status: 500 }
        );
      }

      if (type === "study_pack") {
        const note = parsed.note;
        const flashcards = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];
        const quizzes = Array.isArray(parsed.quizzes) ? parsed.quizzes : [];
        // The note is the one mandatory artifact; cards/quiz degrade to [].
        if (!note || !note.title || !note.key_findings || !note.quick_summary) {
          console.error("Invalid study_pack note structure:", parsed);
          return NextResponse.json(
            {
              success: false,
              error: "invalid_response",
              message: "AI did not return valid note content"
            },
            { status: 500 }
          );
        }
        return NextResponse.json({
          success: true,
          data: { note, flashcards, quizzes }
        });
      }

      return NextResponse.json({ success: true, data: parsed });
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw output:", output);
      return NextResponse.json(
        {
          success: false,
          error: "parse_error",
          message: "Failed to parse AI response",
          raw: output
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "internal_error",
        message: "Internal server error"
      },
      { status: 500 }
    );
  }
}
