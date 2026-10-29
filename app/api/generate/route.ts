import { NextRequest, NextResponse } from "next/server";
import { meterGeneration } from "@/lib/quota";
import { resolveCaller } from "@/lib/token-verify";
import { generateCore } from "@/lib/generate-core";
import { youtubeVideoId, getTranscript } from "@/lib/transcript";
import { getCachedStudyPack, putCachedStudyPack } from "@/lib/pack-cache";
import { timingLog } from "@/lib/timing";

export const dynamic = 'force-dynamic';

// generateCore reports failures as a generic {status, message}; the web UI
// keys off route-level error codes. Map the YouTube 422s back to the codes
// this route has always returned (and that /api/ios/study-from-video uses).
// Coupled to the message strings in lib/generate-core.ts.
function youtubeErrorCode(message: string): string {
  if (message.includes("no captions")) return "no_captions";
  return "bad_link";
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
  const requestStartedAt = Date.now();
  try {
    const { type, content, fileData, mimeType, setId } = await request.json();

    // Cost guard (PRD item 3): reject videos over 60 minutes BEFORE
    // metering — a rejected video must not consume a generation credit.
    // The web client prefixes YouTube links with "Analyze the following
    // link: "; generateCore expects a clean URL, so the prefix is
    // stripped here and the stripped URL is what gets passed below.
    const youtubeUrl =
      mimeType === "video/youtube" && content
        ? content.replace("Analyze the following link: ", "").trim()
        : null;

    if (youtubeUrl) {
      const videoId = youtubeVideoId(youtubeUrl);
      if (videoId) {
        // Pre-metering rule: a caption-less video must not burn a credit.
        // (No duration check — cost scales with the transcript, and
        // generateCore caps its length.)
        const preTranscript = await getTranscript(videoId);
        if (!preTranscript) {
          return NextResponse.json(
            { success: false, error: "no_captions", message: "This video has no captions we can read. Try another video or the sample." },
            { status: 422 }
          );
        }
        // Item 9: cached packs serve before metering, no model call —
        // same shape the study_pack branch below returns.
        if (type === "study_pack") {
          const cached = await getCachedStudyPack(videoId);
          if (cached) {
            timingLog("generation", {
              source: "youtube",
              type: "study_pack",
              ok: 1,
              cache: 1,
              videoId,
              totalMs: Date.now() - requestStartedAt,
            });
            return NextResponse.json({
              success: true,
              data: { note: cached.note, flashcards: cached.flashcards ?? [], quizzes: cached.quizzes ?? [] },
            });
          }
        }
      }
    }

    // Server-side quota gate. The web sends one study_pack request per
    // generation; setId still dedupes metering against client re-fires.
    const quotaError = await checkQuota(request, setId);
    if (quotaError) return quotaError;

    if (!type || !content) {
      return NextResponse.json(
        { error: "Missing type or content" },
        { status: 400 }
      );
    }

    // Shared generation core (lib/generate-core.ts): prompt selection,
    // Supadata transcript extraction for YouTube, the Gemini call, and
    // response cleaning all live there. The Gemini-key and invalid-type
    // checks moved into it as well.
    const result = await generateCore({
      type,
      content: youtubeUrl ?? content,
      mimeType,
      fileData,
    });

    if (!result.ok) {
      // YouTube failures map back to this route's error codes
      // (video_too_long / no_captions / bad_link); everything else keeps
      // the message-as-error shape this route has always used.
      if (mimeType === "video/youtube" && result.status === 422) {
        return NextResponse.json(
          {
            success: false,
            error: youtubeErrorCode(result.message),
            message: result.message,
          },
          { status: 422 }
        );
      }

      return NextResponse.json(
        { error: result.message },
        { status: result.status }
      );
    }

    const parsed = result.data;

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
      // Item 9: cache validated YouTube packs for the next caller of the
      // same video. putCachedStudyPack never throws.
      if (mimeType === "video/youtube" && youtubeUrl) {
        const packVideoId = youtubeVideoId(youtubeUrl);
        if (packVideoId) await putCachedStudyPack(packVideoId, { note, flashcards, quizzes });
      }
      return NextResponse.json({
        success: true,
        data: { note, flashcards, quizzes }
      });
    }

    return NextResponse.json({ success: true, data: parsed });
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
