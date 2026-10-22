// Shared chat core — the server-side chat prompt + Gemini call. Both the
// web route (/api/chat) and the iOS route call chatCore(); each applies
// its own auth.

import { FREE_TEXT_FORMAT_CONTRACT } from "@/lib/format-contract";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

export type ChatResult =
  | { ok: true; answer: string }
  | { ok: false; status: number; message: string };

export async function chatCore(question: string, context: string): Promise<ChatResult> {
  if (!GEMINI_API_KEY) {
    return { ok: false, status: 500, message: "Gemini API key not configured" };
  }
  if (!question || !context) {
    return { ok: false, status: 400, message: "Missing question or context" };
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
- Never make up or assume information not explicitly stated in the context

${FREE_TEXT_FORMAT_CONTRACT}`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { maxOutputTokens: 2048 },
    }),
  });

  if (!response.ok) {
    return { ok: false, status: 500, message: "Failed to generate response" };
  }

  const data = await response.json();
  const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!output) {
    return { ok: false, status: 500, message: "No output from model" };
  }

  return { ok: true, answer: output.trim() };
}
