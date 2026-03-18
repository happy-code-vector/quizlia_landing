import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function POST(request: NextRequest) {
  try {
    const { question, context } = await request.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    if (!question || !context) {
      return NextResponse.json(
        { error: "Missing question or context" },
        { status: 400 }
      );
    }

    const fullPrompt = `Document Context:
${context}

User Question:
${question}

Instructions:
- Answer based ONLY on the information provided in the document context above
- Search thoroughly through the context for relevant information, including synonyms and related terms
- If the specific information is not mentioned in the document, respond politely: "I don't see information about [specific topic] in the shared document. Could you check if this information is available in another section or document?"
- For follow-up questions, re-examine the entire context carefully before concluding information is missing
- Be thorough in your search through the context before determining something is not mentioned
- Never make up or assume information not explicitly stated in the context`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      return NextResponse.json(
        { error: "Failed to generate response" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!output) {
      return NextResponse.json(
        { error: "No output from Gemini" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      answer: output.trim()
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
