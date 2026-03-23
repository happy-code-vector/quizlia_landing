import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const PROMPTS = {
  note: `You are QuicNotes, an AI that extracts study notes from the given content.

TASK:
Analyze the provided content and return a structured summary in JSON format with the following keys:
- title: string (concise title of the content)
- key_findings: array of strings (as many key facts or statistics as possible)
- important_notes: array of strings (all relevant cautions, limitations, or extra details you can find)
- quick_summary: string (a detailed 15–25 sentence overall summary)

RULES:
- Capture all meaningful information, no artificial limits on list sizes.
- Keep language clear and concise.
- No extra commentary or formatting outside of JSON.
- If you cannot access or analyze the content, return: {"error": "content_not_accessible", "message": "Unable to access or analyze the provided content"}

RESPONSE FORMAT (JSON only):
{
  "title": "string",
  "key_findings": ["point 1", "point 2", "..."],
  "important_notes": ["point 1", "point 2", "..."],
  "quick_summary": "string"
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

export async function POST(request: NextRequest) {
  try {
    const { type, content, fileData, mimeType } = await request.json();

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
      parts.push({ text: prompt });
    } else {
      // For non-YouTube content, add prompt first
      const fullPrompt = `${prompt}\n\nCONTENT:\n${content}`;
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
          // Token allocation: 65536 for PDFs and YouTube videos, 16384 for URLs
          maxOutputTokens: (fileData || mimeType === "video/youtube") ? 65536 : 16384,
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
