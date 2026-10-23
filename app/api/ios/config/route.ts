import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Release B feature flags for the iOS app. Everything defaults to OFF —
// the endpoint existing is not permission to ship a flag. The client
// caches the last response and falls back to its bundled (off) defaults
// when the endpoint is unreachable, so a dead endpoint never changes app
// behavior.
//
// No App Check here on purpose: the payload is public flag names, and the
// app must be able to fetch flags before its first App Check token warm.
//
// Flip without a deploy: set the env var on Netlify (e.g.
// IOS_FLAG_FREE_NOTE_PAYWALL=1). `defaults` below is the code-level floor
// the env var can only turn on, never off.
const defaults = {
  freeNotePaywall: { enabled: false },
};

export async function GET() {
  return NextResponse.json({
    flags: {
      freeNotePaywall: {
        enabled:
          process.env.IOS_FLAG_FREE_NOTE_PAYWALL === "1" ||
          defaults.freeNotePaywall.enabled,
      },
    },
  });
}
