import { NextRequest, NextResponse } from "next/server";
import { chatCore } from "@/lib/chat-core";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { question, context } = await request.json();
    const result = await chatCore(question, context);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }
    return NextResponse.json({ success: true, answer: result.answer });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
