import { NextRequest, NextResponse } from "next/server";
import { meterGeneration, meterChat } from "@/lib/quota";
import { exchangeRefreshToken } from "@/lib/token-verify";
import {
  verifyAppCheck,
  appCheckErrorResponse,
  resolveAccountCaller,
  resolveDeviceCaller,
  devicePlan,
  type DeviceCaller,
} from "@/lib/caller";
import { meterDeviceGeneration, meterDeviceChat } from "@/lib/devices";
import { generateCore } from "@/lib/generate-core";
import { chatCore } from "@/lib/chat-core";
import { FREE_TEXT_FORMAT_CONTRACT, JSON_FORMAT_CONTRACT } from "@/lib/format-contract";
import { youtubeVideoId, getVideoDurationSeconds, getTranscript } from "@/lib/transcript";
import { getCachedStudyPack, putCachedStudyPack } from "@/lib/pack-cache";
import { timingLog } from "@/lib/timing";

export const dynamic = "force-dynamic";

// Gemini proxy for the iOS app. The API key stays server-side; the app
// authenticates with its Firebase identity (ID token, or a refresh token
// which is exchanged server-side) and quotas are enforced per account —
// or, signed out, as a device: X-Device-ID (+ App Check token, log-only
// until APP_CHECK_ENFORCE=1) with an inline StoreKit JWS receipt, quotas
// enforced per device (lib/caller, lib/devices):
//   /api/ios/gemini/generation — the notes pipeline: free = 1 lifetime,
//                              paid (subscription mirror) = 15/day
//   /api/ios/gemini/chat       — note chat + onboarding samples: 100/day
// The model is chosen here, so it can change without an app release.
// No service account for accounts: the caller is verified via Google's
// public certs (token-verify) and quotas are written under tamper-proof
// rules with the caller's own token (lib/quota); device meters are
// Admin-SDK writes (lib/devices).
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

// PRD item 3: a 60-minute video at default resolution is ~1.08M tokens;
// longer videos are rejected with a clear error instead of billed.
const MAX_VIDEO_SECONDS = 60 * 60;

async function checkQuota(purpose: string, token: string, uid: string): Promise<Response | null> {
  // Shared budget with the web app (lib/quota): same doc, same units,
  // same plan limits — one linked account, one budget. Chat/onboarding
  // uses a separate generous bucket so it never eats generations.
  const result = purpose === "generation"
    ? await meterGeneration(token, uid)
    : await meterChat(token, uid);

  if (result.ok) return null;
  return NextResponse.json(
    { error: { code: result.status, message: result.message } },
    { status: result.status }
  );
}

export async function POST(request: NextRequest, context: { params: Promise<{ purpose: string }> }) {
  const requestStartedAt = Date.now();
  const { purpose } = await context.params;
  if (!["generation", "chat", "onboarding"].includes(purpose)) {
    return NextResponse.json({ error: { code: 404, message: "Unknown purpose" } }, { status: 404 });
  }

  // Account tokens win; signed-out devices fall through to the device path.
  try {
    await verifyAppCheck(request);
  } catch (error) {
    const response = appCheckErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const caller = await resolveAccountCaller(request);
  let device: DeviceCaller | null = null;
  if (!caller) {
    device = await resolveDeviceCaller(request);
    if (!device) {
      return NextResponse.json({ error: { code: 401, message: "Not authenticated" } }, { status: 401 });
    }
  }

  // Parse and validate BEFORE any metering, for both caller paths: a
  // rejected request (malformed body, over-long video) burns no credit —
  // not the account budget, not the device's one lifetime free note.
  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    console.error("iOS proxy error:", error);
    return NextResponse.json({ error: { code: 500, message: "Proxy failure" } }, { status: 500 });
  }

  // Cost guard (PRD item 3): reject over-long videos with a clear error
  // instead of sending ~1M tokens upstream.
  for (const part of (Array.isArray(body?.contents) ? body.contents : []).flatMap((c: any) =>
    Array.isArray(c?.parts) ? c.parts : []
  )) {
    const uri: string = part?.file_data?.file_uri || part?.fileData?.fileUri || "";
    if (typeof uri === "string" && /youtu\.be|youtube\.com/i.test(uri)) {
      const videoId = youtubeVideoId(uri);
      if (videoId) {
        const duration = await getVideoDurationSeconds(videoId);
        if (duration !== null && duration > MAX_VIDEO_SECONDS) {
          return NextResponse.json(
            {
              error: {
                code: 422,
                message: `That video is ${Math.round(duration / 60)} minutes long — the limit is 60 minutes.`,
              },
            },
            { status: 422 }
          );
        }
      }
      break;
    }
  }

  // New unified shape: {type, content, mimeType} → generateCore()
  // Old shape: full Gemini body (has "contents" array) → forward as today
  // Generation-purpose ONLY: the chat/onboarding purposes meter in the
  // 100/day chat bucket — routing a study_pack through them would bypass
  // generation metering (final-review Important #1).
  const isNewShape = purpose === "generation" && Boolean(body.type && body.content && !body.contents);

  // Pre-metering YouTube validation: a caption-less or over-60-min
  // video must not burn a credit (same guard as /api/generate 65e568d).
  if (isNewShape && body.mimeType === "video/youtube" && body.content) {
    const preVideoId = youtubeVideoId(body.content);
    if (!preVideoId) {
      return NextResponse.json(
        { error: { code: 422, message: "Invalid YouTube link" } },
        { status: 422 }
      );
    }

    // Item 9: a cached pack serves FIRST — before the transcript fetch,
    // before any metering, no model call (item 34 Tier 4: cached packs are
    // free). A hit needs no transcript: the video had captions when the
    // pack was generated and cached.
    if (body.type === "study_pack") {
      const cached = await getCachedStudyPack(preVideoId);
      if (cached) {
        timingLog("generation", {
          source: "youtube",
          type: "study_pack",
          ok: 1,
          cache: 1,
          videoId: preVideoId,
          totalMs: Date.now() - requestStartedAt,
        });
        return NextResponse.json(cached);
      }
    }

    // New-shape cost guard is the transcript itself (generateCore caps its
    // length) — no duration lookup here. The old-shape loop above keeps its
    // duration check: those bodies can carry real video URIs.
    const preTranscript = await getTranscript(preVideoId);
    if (!preTranscript) {
      return NextResponse.json(
        {
          error: {
            code: 422,
            message: "This video has no captions we can read. Try another video or the sample.",
          },
        },
        { status: 422 }
      );
    }
  }

  if (device) {
    const plan = devicePlan(device.entitlement);
    const meter = purpose === "generation"
      ? await meterDeviceGeneration(device.deviceId, plan)
      : await meterDeviceChat(device.deviceId, plan);
    if (!meter.ok) {
      return NextResponse.json(
        { error: { code: meter.status, message: meter.message } },
        { status: meter.status }
      );
    }
  } else if (caller) {
    // The quota write needs the caller's own (verified) token.
    const token = (request.headers.get("authorization") || "").startsWith("Bearer ")
      ? (request.headers.get("authorization") || "").slice(7)
      : await exchangeRefreshToken(request.headers.get("x-firebase-refresh") || "");

    const quotaError = await checkQuota(purpose, token || "", caller.uid);
    if (quotaError) return quotaError;
  }

  if (isNewShape) {
    const result = await generateCore({
      type: body.type,
      content: body.content,
      mimeType: body.mimeType,
      fileData: body.fileData,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.status, message: result.message } },
        { status: result.status }
      );
    }
    // Item 9: cache fresh YouTube study packs (validated shape only) for
    // the next caller of the same video. putCachedStudyPack never throws.
    if (body.type === "study_pack" && body.mimeType === "video/youtube" && result.data?.note) {
      const packVideoId = youtubeVideoId(body.content);
      if (packVideoId) await putCachedStudyPack(packVideoId, result.data);
    }
    return NextResponse.json(result.data);
  }

  // Chat with new shape: {question, context} → chatCore()
  if (body.question && body.context && !body.contents) {
    const result = await chatCore(body.question, body.context);
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.status, message: result.message } },
        { status: result.status }
      );
    }
    return NextResponse.json({ success: true, answer: result.answer });
  }

  return await proxyToGemini(purpose, body);
}

// Everything after validation and quota pass: append the format contract
// to the already-parsed body and stream it to Gemini with the server-side
// key. Shared by account and device callers.
async function proxyToGemini(purpose: string, body: any): Promise<Response> {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: { code: 500, message: "Gemini key not configured" } }, { status: 500 });
  }

  try {
    // Append the format contract as the LAST text part so it takes
    // precedence over prompt text older app versions still send.
    const contract = purpose === "chat" ? FREE_TEXT_FORMAT_CONTRACT : JSON_FORMAT_CONTRACT;
    const contents = Array.isArray(body.contents) ? [...body.contents] : [];
    if (contents[0] && Array.isArray(contents[0].parts)) {
      contents[0] = { ...contents[0], parts: [...contents[0].parts, { text: contract }] };
    } else {
      console.warn("iOS proxy: no parts array to append the format contract to");
    }

    // Forward only what the Gemini REST API accepts; the model is fixed
    // server-side so it can change without an app release.
    // Video requests (any part with a YouTube file URI) get low-res media
    // and a minimal thinking budget server-side (PRD item 2) — overriding
    // whatever the app version sent.
    const isVideoRequest = contents.some(
      (c: any) =>
        Array.isArray(c?.parts) &&
        c.parts.some((p: any) => {
          const uri = p?.file_data?.file_uri || p?.fileData?.fileUri || "";
          return typeof uri === "string" && /youtu\.be|youtube\.com/i.test(uri);
        })
    );

    const upstream = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: isVideoRequest
          ? {
              ...body.generationConfig,
              mediaResolution: "MEDIA_RESOLUTION_LOW",
              thinkingConfig: { thinkingBudget: 0 },
            }
          : body.generationConfig,
      }),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      console.error("iOS proxy upstream error:", upstream.status, text);
    }
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("iOS proxy error:", error);
    return NextResponse.json({ error: { code: 500, message: "Proxy failure" } }, { status: 500 });
  }
}
