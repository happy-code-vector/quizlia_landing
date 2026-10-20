import { NextRequest, NextResponse } from "next/server";
import { verifyAppCheck, resolveAccountCaller, resolveDeviceCaller } from "@/lib/caller";

export const dynamic = "force-dynamic";

// File-upload proxy for the iOS app (large PDFs etc. destined for the
// Gemini File API). Raw body is streamed through with the caller's
// Content-Type; the API key stays server-side. Same auth as the generate
// proxy. NOTE: platform function payloads cap around 6MB — phone-sized
// documents are fine; anything larger should be split before upload.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UPLOAD_URL = "https://generativelanguage.googleapis.com/upload/v1beta/files";

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: { code: 500, message: "Gemini key not configured" } }, { status: 500 });
  }

  // Account tokens win; signed-out devices fall through to the device path.
  await verifyAppCheck(request);
  const caller = await resolveAccountCaller(request);
  if (!caller) {
    const device = await resolveDeviceCaller(request);
    if (!device) {
      return NextResponse.json({ error: { code: 401, message: "Not authenticated" } }, { status: 401 });
    }
  }

  try {
    const body = await request.arrayBuffer();

    const upstream = await fetch(`${UPLOAD_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/octet-stream",
        "X-Goog-Upload-Protocol": request.headers.get("x-goog-upload-protocol") || "raw",
      },
      body: Buffer.from(body),
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("iOS upload proxy error:", error);
    return NextResponse.json({ error: { code: 500, message: "Proxy failure" } }, { status: 500 });
  }
}
