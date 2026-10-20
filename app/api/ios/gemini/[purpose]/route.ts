import { NextRequest, NextResponse } from "next/server";
import { meterGeneration, meterChat } from "@/lib/quota";
import { resolveCaller, exchangeRefreshToken } from "@/lib/token-verify";
import { FREE_TEXT_FORMAT_CONTRACT, JSON_FORMAT_CONTRACT } from "@/lib/format-contract";
import { youtubeVideoId, getVideoDurationSeconds } from "@/lib/transcript";

export const dynamic = "force-dynamic";

// Gemini proxy for the iOS app. The API key stays server-side; the app
// authenticates with its Firebase identity (ID token, or a refresh token
// which is exchanged server-side) and quotas are enforced per account:
//   /api/ios/gemini/generation — the notes pipeline: free = 1 lifetime,
//                              paid (subscription mirror) = 15/day
//   /api/ios/gemini/chat       — note chat + onboarding samples: 100/day
// The model is chosen here, so it can change without an app release.
// No service account: the caller is verified via Google's public certs
// (token-verify) and quotas are written under tamper-proof rules with
// the caller's own token (lib/quota).
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
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: { code: 500, message: "Gemini key not configured" } }, { status: 500 });
  }

  // Bearer ID token, or the app's refresh token (exchanged server-side
  // using only the public web API key).
  const caller = await resolveCaller(
    request.headers.get("authorization") || "",
    request.headers.get("x-firebase-refresh")
  );
  if (!caller) {
    return NextResponse.json({ error: { code: 401, message: "Not authenticated" } }, { status: 401 });
  }

  const { purpose } = await context.params;
  if (!["generation", "chat", "onboarding"].includes(purpose)) {
    return NextResponse.json({ error: { code: 404, message: "Unknown purpose" } }, { status: 404 });
  }

  // The quota write needs the caller's own (verified) token.
  const token = (request.headers.get("authorization") || "").startsWith("Bearer ")
    ? (request.headers.get("authorization") || "").slice(7)
    : await exchangeRefreshToken(request.headers.get("x-firebase-refresh") || "");

  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    console.error("iOS proxy error:", error);
    return NextResponse.json({ error: { code: 500, message: "Proxy failure" } }, { status: 500 });
  }

  // Cost guard (PRD item 3): runs before metering so a rejected video consumes no credit.
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

  const quotaError = await checkQuota(purpose, token || "", caller.uid);
  if (quotaError) return quotaError;

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
