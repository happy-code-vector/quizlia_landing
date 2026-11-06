import { NextRequest, NextResponse } from "next/server";
import { chatCore } from "@/lib/chat-core";
import { meterChat } from "@/lib/quota";
import { resolveCaller } from "@/lib/token-verify";

export const dynamic = "force-dynamic";

// Size caps (cost guard). The web client sends the whole note as context on
// every turn, so an uncapped body is an uncapped model bill. ~60K chars is
// roughly 15K tokens, the same source ceiling tutorCore uses for iOS.
const MAX_QUESTION_CHARS = 2_000;
const MAX_CONTEXT_CHARS = 60_000;

// Web note chat. Same rules as /api/ios/gemini/chat: a verified Firebase ID
// token is required, and every message is metered in the shared chat bucket
// (lib/quota meterChat: free = 10 lifetime, paid = 100/day), so one linked
// account has one chat budget across web and iOS.
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const caller = await resolveCaller(authHeader, null);
    if (!caller) {
      return NextResponse.json({ error: "Sign in to chat", code: "auth_required" }, { status: 401 });
    }

    let body: { question?: unknown; context?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const context = typeof body.context === "string" ? body.context : "";
    if (!question || !context) {
      return NextResponse.json({ error: "Missing question or context" }, { status: 400 });
    }
    if (question.length > MAX_QUESTION_CHARS || context.length > MAX_CONTEXT_CHARS) {
      return NextResponse.json({ error: "Message or note is too long for chat" }, { status: 413 });
    }

    // Meter before the model call; a rejected message costs nothing.
    let quota;
    try {
      quota = await meterChat(authHeader.slice(7), caller.uid);
    } catch (error) {
      console.error("Chat quota check failed:", error);
      return NextResponse.json({ error: "Could not verify chat quota" }, { status: 500 });
    }
    if (!quota.ok) {
      return NextResponse.json({ error: quota.message, upgrade: quota.status === 429 }, { status: quota.status });
    }

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
