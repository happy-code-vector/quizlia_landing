# Unified Generation Pipeline — design

Date: 2026-10-22 · Status: approved in brainstorming, pending spec review
Repos: `quizlia_landing` (web/server), `Quizliai-iOS` (app)
Firebase: `quailizy`

## 1. Problem

iOS and web use **different generation pipelines** for the same content:

- **Web** (`/api/generate`): server-side prompts, Gemini call, format contract,
  quota enforcement. YouTube URLs sent as `fileUri` to Gemini (expensive video
  tokens, ~1M/hour; 60-min limit).
- **iOS** (`/api/ios/gemini/*`): client-side prompt construction in Swift
  (`QuicNotesPrompts.swift` + `GeminiApiManger`), full Gemini request body
  forwarded to server (server is a dumb pipe). YouTube URLs sent as `file_uri`
  (same expensive approach).
- **Onboarding study** (`/api/ios/study-from-video`): the ONLY route already
  doing it right — Supadata transcript extraction, server-side prompt, format
  contract, Claude Haiku generation.

Consequences:
- iOS/web output quality differs (different prompts for the same content)
- Prompt improvements require an app release on iOS
- YouTube generation costs ~500x more than transcript-based (video vs text tokens)
- Schema bugs (the `chat` field requirement) happen because the schema is
  defined client-side on iOS and can drift from what the server produces
- The 60-minute video limit and `thinkingConfig`/`mediaResolution` ladder
  exist only because of the video-token approach

## 2. Goal

One generation pipeline, two auth wrappers:

```text
                     ┌─ /api/generate (web auth) ──────┐
                     │                                  ▼
iOS sends input ─────┤                          lib/generate-core.ts
{type, content,      │                                  │
 mimeType}           ├─ /api/ios/gemini/* ────────┐    │
                     │  (App Check + device ID) ──┘    │
                     │                                  ▼
                     │                    ┌── prompt selection (PROMPTS)
                     │                    ├── YouTube: Supadata transcript
                     │                    ├── Gemini call
                     │                    └── response cleaning + contract
                     │                                  │
                     ◄───────── formatted JSON ─────────┘
```

Both platforms send `{type, content, mimeType}` and receive the same
formatted JSON. The server owns prompts, transcript extraction, model
selection, and response formatting.

## 3. Server changes (quizlia_landing)

### 3.1 `lib/generate-core.ts` (new)

Extracted from `/api/generate/route.ts`. One function:

```ts
interface GenerateInput {
  type: "note" | "flashcard" | "quiz" | "study_pack";
  content: string;        // text content, or YouTube URL
  mimeType?: string;      // "video/youtube" for YouTube, else text
}

async function generateCore(input: GenerateInput): Promise<{
  ok: true; data: any;
} | {
  ok: false; status: number; message: string;
}>
```

Internally:
1. If `mimeType === "video/youtube"`: extract transcript via Supadata
   (reuse `lib/transcript.ts` — the same code `/api/ios/study-from-video`
   uses). Reject >60-min videos with a clear error (duration check via
   the existing `getVideoDurationSeconds`).
2. Select the server-side prompt from the `PROMPTS` object (note,
   flashcard, quiz — moved from `/api/generate`).
3. Build the Gemini request: prompt + content (transcript text or raw
   content) + `JSON_FORMAT_CONTRACT`.
4. Call Gemini (model: `gemini-3.1-flash-lite`, same as current).
5. Clean and return the response (`cleanJSONString` from the current route).

### 3.2 Rewire `/api/generate` (web route)

The existing POST handler becomes:
1. Web auth (unchanged: `resolveCaller` from `token-verify`)
2. Quota check (unchanged: `meterGeneration` from `lib/quota`)
3. Call `generateCore(input)` from the request body
4. Return the result

The web UI's request shape (`{type, content, mimeType}`) is already what
`generateCore` accepts — zero web-client changes.

### 3.3 Rewire `/api/ios/gemini/generation`

The iOS route becomes a thin auth wrapper:
1. iOS auth: `verifyAppCheck` + `resolveAccountCaller` → `resolveDeviceCaller`
   (already exists from the device-identity work)
2. Device quota: `meterDeviceGeneration` / `meterDeviceChat` (already exists)
3. Call `generateCore(input)` — the request body changes from a full Gemini
   API body to `{type, content, mimeType}`
4. Return the formatted JSON

### 3.4 Same pattern for chat

Extract `/api/chat` (90 lines) into `lib/chat-core.ts`:
- Server-side chat prompt + `FREE_TEXT_FORMAT_CONTRACT`
- Gemini call
- Both `/api/chat` (web auth) and `/api/ios/gemini/chat` (iOS auth) call it

### 3.5 Deprecate `/api/ios/gemini/onboarding`

The onboarding route forwards iOS-built prompts to Gemini. After
unification, onboarding samples use the same `generateCore` (type: note).
Keep the route during transition; remove it when the iOS app stops
calling it.

## 4. iOS changes (Quizliai-iOS)

### 4.1 `GeminiApiManger` simplification

Current: builds full Gemini request body (prompt + contents +
generationConfig), sends to `/api/ios/gemini/*`.

New: sends just `{type, content, mimeType}`:
- `type`: "note" | "flashcard" | "quiz" (the task)
- `content`: the text/image-data/YouTube-URL
- `mimeType`: "video/youtube" for YouTube, "text/plain" for text,
  "image/jpeg" for photos

All seven request-building functions in GeminiApiManger collapse into
one `generate(type:content:mimeType:completion:)` function.

### 4.2 Delete `QuicNotesPrompts.swift`

Server owns all prompts. This file (~340 lines) goes away entirely.

### 4.3 Delete client-side Gemini response parsing

Current: parses raw Gemini API response (`candidates[0].content.parts[0].text`)
and then tries to decode the JSON inside it.

New: server returns clean formatted JSON — iOS decodes the response body
directly into the existing model types (`MultiPromptResponse` or the web
note format).

### 4.4 What stays unchanged on iOS

- `QuizliProxyHeaders` (device-ID + App Check headers) — unchanged
- `EntitlementsManager` (receipt posting) — unchanged
- `DailyGenerationLimiter` — unchanged (client-side gate; server enforces too)
- All UI (LoaderViewController, note display, quiz/flashcard rendering) —
  they receive the same JSON shape, just from the server instead of from
  client-side Gemini parsing
- Upload proxy (`/api/ios/upload`) — stays as-is for large file uploads
  (images/PDFs sent as inline data or uploaded, not YouTube)

## 5. YouTube cost impact

| | Current (video tokens) | New (Supadata transcripts) |
|---|---|---|
| 10-min video | ~170K tokens (~$0.17) | ~2K tokens (~$0.002) + Supadata call |
| 60-min video | ~1M tokens (~$1.00) | ~12K tokens (~$0.012) + Supadata call |
| >60-min video | ❌ rejected | ✅ works (transcript has no limit) |
| Visual content in notes | ✅ (Gemini sees the video) | ❌ (spoken content only) |

Visual content tradeoff accepted (Kevin's decision): study notes from
YouTube videos reference spoken content, which is the primary use case.
Visual-heavy content (diagrams, charts) is better served by the photo/PDF
input paths.

## 6. Migration

The `/api/ios/gemini/*` routes keep BOTH request shapes during transition:
- Old shape (full Gemini body from existing app versions): forwarded as today
- New shape (`{type, content, mimeType}`): routed to `generateCore()`

Detection: if the body has a `contents` array, it's old-shape; if it has
`type` + `content`, it's new-shape. Old shape is removed after the rebuilt
app ships.

## 7. What this eliminates

- `QuicNotesPrompts.swift` (~340 lines of client-side prompts)
- `GeminiApiManger` prompt construction (~200 lines across 7 functions)
- The 60-minute video limit (transcripts have no limit)
- `thinkingConfig`/`mediaResolution` ladder complexity in the server
- Prompt drift between iOS and web
- The `chat`-field-missing bug class (schema defined once, server-side)
- App release required for prompt improvements
- ~500x cost reduction for YouTube generation
