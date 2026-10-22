# Unified Generation Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the web generation logic into a shared server-side core, rewire the iOS routes as thin auth wrappers around it, and switch YouTube from expensive Gemini video tokens to cheap Supadata text transcripts.

**Architecture:** `lib/generate-core.ts` owns prompts, Supadata transcript extraction, Gemini calls, and response formatting. Both `/api/generate` (web auth) and `/api/ios/gemini/[purpose]` (App Check + device-ID auth) call the same function. iOS sends `{type, content, mimeType}` instead of a full Gemini request body.

**Tech Stack:** Next.js 16 route handlers, Gemini API (server-side key), Supadata/TranscriptAPI (existing `lib/transcript.ts`), existing quota/auth modules.

**Spec:** `docs/superpowers/specs/2026-10-22-unified-generation-design.md`

## Global Constraints

- **No new npm packages** — everything uses existing dependencies.
- **Existing web behavior unchanged** — `/api/generate` and `/api/chat` accept the same request shape, return the same response shape; the web UI must not notice the refactor.
- **YouTube switch**: `mimeType === "video/youtube"` content extracts a transcript via `lib/transcript.ts` (`getTranscript(videoId)`) and sends **text** to Gemini — never a `fileUri`. Keep the 60-min duration check (`getVideoDurationSeconds`).
- **Model**: `gemini-3.1-flash-lite` (same as current, server-side key only).
- **Format contracts**: `JSON_FORMAT_CONTRACT` for structured output, `FREE_TEXT_FORMAT_CONTRACT` for chat — from `lib/format-contract.ts`.
- **No test framework** — verification is `npm run build` + curl against `npm run dev` (Git Bash, port 3000).
- **iOS auth pattern** (already live from device-identity): `verifyAppCheck` → `resolveAccountCaller` → `resolveDeviceCaller` → meter device quota.
- **Migration**: iOS routes accept BOTH request shapes during transition — new `{type, content, mimeType}` routed to `generateCore()`, old full-Gemini-body forwarded as today (detect by presence of `contents` array).
- **Commits**: short `feat:`/`fix:` subjects + `Co-Authored-By: Claude Code <noreply@anthropic.com>` trailer.

---

### Task 1: `lib/generate-core.ts` — the shared generation function

**Files:**
- Create: `lib/generate-core.ts`

**Interfaces:**
- Consumes: `lib/format-contract.ts` (`JSON_FORMAT_CONTRACT`), `lib/transcript.ts` (`youtubeVideoId`, `getTranscript`, `getVideoDurationSeconds`).
- Produces (used by Tasks 2, 3): `generateCore(input: GenerateInput): Promise<GenerateResult>` and `GenerateInput` / `GenerateResult` types.

- [ ] **Step 1: Read the full existing route** — `app/api/generate/route.ts` contains the `PROMPTS` object, the Gemini call, and `cleanJSONString`. Everything in the new file comes from there (moved verbatim except the YouTube path).

- [ ] **Step 2: Write `lib/generate-core.ts`**

```ts
// Shared generation core — the ONE place prompts live, transcripts are
// extracted, Gemini is called, and responses are formatted. Both the web
// route (/api/generate) and the iOS route (/api/ios/gemini/[purpose])
// call generateCore(); each applies its own auth before calling.
//
// YouTube content uses Supadata text transcripts (~2K tokens) instead of
// Gemini video tokens (~1M/hour) — the /api/ios/study-from-video route
// proved this approach works.

import { JSON_FORMAT_CONTRACT } from "@/lib/format-contract";
import { youtubeVideoId, getTranscript, getVideoDurationSeconds } from "@/lib/transcript";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

// PRD item 3: reject videos longer than 60 minutes with a clear error.
const MAX_VIDEO_SECONDS = 60 * 60;

export type GenerateType = "note" | "flashcard" | "quiz" | "study_pack";

export interface GenerateInput {
  type: GenerateType;
  content: string;          // text, or YouTube URL when mimeType is video/youtube
  mimeType?: string;        // "video/youtube" for YouTube; else text/image/pdf
  fileData?: string;        // base64 inline data (image/PDF)
}

export type GenerateResult =
  | { ok: true; data: any }
  | { ok: false; status: number; message: string };

// PROMPTS — moved verbatim from /api/generate/route.ts. Each prompt ends
// with its RESPONSE FORMAT (JSON only) schema; the JSON_FORMAT_CONTRACT is
// appended at call time (not baked into the prompt text).
const PROMPTS: Record<GenerateType, string> = {
  note: `...`,       // ← copy the full prompt text from /api/generate/route.ts PROMPTS.note
  flashcard: `...`,  // ← copy from route.ts PROMPTS.flashcard
  quiz: `...`,       // ← copy from route.ts PROMPTS.quiz
  study_pack: `...`, // ← copy from route.ts PROMPTS.study_pack
};

// cleanJSONString — moved verbatim from /api/generate/route.ts.
function cleanJSONString(jsonString: string): string {
  // ← copy the full function body from /api/generate/route.ts
}

export async function generateCore(input: GenerateInput): Promise<GenerateResult> {
  if (!GEMINI_API_KEY) {
    return { ok: false, status: 500, message: "Gemini API key not configured" };
  }

  const prompt = PROMPTS[input.type];
  if (!prompt) {
    return { ok: false, status: 400, message: `Invalid type: ${input.type}` };
  }

  const parts: any[] = [];

  if (input.mimeType === "video/youtube" && input.content) {
    // YouTube: extract transcript text (Supadata → TranscriptAPI), send
    // TEXT to Gemini — not the video fileUri. ~500x cheaper.
    const videoId = youtubeVideoId(input.content);
    if (!videoId) {
      return { ok: false, status: 422, message: "Invalid YouTube link" };
    }

    const duration = await getVideoDurationSeconds(input.content);
    if (duration && duration > MAX_VIDEO_SECONDS) {
      const mins = Math.round(duration / 60);
      return {
        ok: false,
        status: 422,
        message: `This video is ${mins} minutes long. Videos over 60 minutes are not supported.`,
      };
    }

    const transcript = await getTranscript(videoId);
    if (!transcript) {
      return {
        ok: false,
        status: 422,
        message: "This video has no captions we can read. Try another video or the sample.",
      };
    }

    parts.push({
      text: `${prompt}\n\nCONTENT (video transcript):\n${transcript.text}\n\n${JSON_FORMAT_CONTRACT}`,
    });
  } else {
    // Non-YouTube: prompt first, content second, optional inline file data
    const fullPrompt = `${prompt}\n\nCONTENT:\n${input.content}\n\n${JSON_FORMAT_CONTRACT}`;
    parts.push({ text: fullPrompt });

    if (input.fileData) {
      parts.push({
        inlineData: {
          mimeType: input.mimeType || "application/pdf",
          data: input.fileData,
        },
      });
    }
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        maxOutputTokens: input.fileData || input.mimeType === "video/youtube" ? 65536 : 16384,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("generateCore: Gemini error:", error.slice(0, 200));
    return { ok: false, status: 500, message: "Failed to generate content" };
  }

  const data = await response.json();
  const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!output) {
    return { ok: false, status: 500, message: "No output from model" };
  }

  // Try to parse as JSON (note/flashcard/quiz/study_pack all return JSON)
  const cleaned = cleanJSONString(output);
  try {
    const parsed = JSON.parse(cleaned);
    return { ok: true, data: parsed };
  } catch {
    // Some responses may be plain text — return as-is
    return { ok: true, data: { text: cleaned } };
  }
}
```

**Critical**: the `PROMPTS` entries and `cleanJSONString` body must be copied **byte-for-byte** from `app/api/generate/route.ts`. Read that file, find the `const PROMPTS = { ... }` block and the `function cleanJSONString(...)` block, and paste them into this file. The ONLY change is YouTube: the `fileUri` push is replaced by the transcript extraction block above.

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add lib/generate-core.ts
git commit -m "feat: generate-core — shared generation function with Supadata YouTube transcripts"
```

---

### Task 2: Rewire `/api/generate` (web route)

**Files:**
- Modify: `app/api/generate/route.ts`

**Interfaces:**
- Consumes: `generateCore` + `GenerateInput` from Task 1.
- Produces: unchanged web API (same request/response shapes).

- [ ] **Step 1: Replace the POST handler body**

The route becomes: web auth → quota → `generateCore()`. Keep the existing `checkQuota` helper (it calls `meterGeneration`). The new POST:

```ts
import { NextRequest, NextResponse } from "next/server";
import { meterGeneration } from "@/lib/quota";
import { resolveCaller } from "@/lib/token-verify";
import { generateCore, type GenerateInput } from "@/lib/generate-core";

export const dynamic = "force-dynamic";

async function checkQuota(request: NextRequest, setId?: string): Promise<Response | null> {
  // ← keep the existing checkQuota function body from the current file
}

export async function POST(request: NextRequest) {
  try {
    // Web auth (unchanged)
    const caller = await resolveCaller(
      request.headers.get("authorization") || "",
      null
    );
    if (!caller) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { type, content, mimeType, fileData, setId } = body;

    if (!type || !content) {
      return NextResponse.json({ error: "Missing type or content" }, { status: 400 });
    }

    // Quota (unchanged)
    const quotaError = await checkQuota(request, setId);
    if (quotaError) return quotaError;

    // Shared generation core
    const result = await generateCore({ type, content, mimeType, fileData });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Delete** from the route: the `PROMPTS` object (now in generate-core), `cleanJSONString` (now in generate-core), the `GEMINI_API_KEY`/`GEMINI_API_URL` constants, the `MAX_VIDEO_SECONDS` constant, and the YouTube `fileUri` handling — all replaced by `generateCore()`.

- [ ] **Step 2: Verify compile + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both pass.

- [ ] **Step 3: Verify web generation still works** — `npm run dev` background, then:

```bash
curl -s -X POST localhost:3000/api/generate \
  -H "content-type: application/json" \
  -d '{"type":"note","content":"Photosynthesis is the process by which plants convert sunlight into chemical energy."}' \
  | head -c 300
```

Expected: JSON with `title` and `sections` (not an error). (Requires a valid auth token for the quota check — if 401, that's correct behavior confirming the route is alive.)

- [ ] **Step 4: Commit**

```bash
git add app/api/generate/route.ts
git commit -m "feat: /api/generate now uses generateCore"
```

---

### Task 3: Rewire `/api/ios/gemini/[purpose]` — new shape + iOS auth

**Files:**
- Modify: `app/api/ios/gemini/[purpose]/route.ts`

**Interfaces:**
- Consumes: `generateCore` from Task 1; `verifyAppCheck`, `resolveAccountCaller`, `resolveDeviceCaller`, `devicePlan` from `lib/caller.ts`; `meterDeviceGeneration`, `meterDeviceChat` from `lib/devices.ts`; existing account quota from `lib/quota.ts`.
- Produces: iOS route accepts BOTH request shapes (new `{type, content, mimeType}` → generateCore; old full-Gemini-body → forwarded as today).

- [ ] **Step 1: Add new-shape detection + generateCore call**

In the existing POST handler, after auth + quota metering, add:

```ts
    // New unified shape: {type, content, mimeType} → generateCore()
    // Old shape: full Gemini body (has "contents" array) → forward as today
    if (body.type && body.content && !body.contents) {
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
      return NextResponse.json(result.data);
    }

    // Old shape (existing app versions): forward the full Gemini body as today
    // ... existing proxyToGemini(request, purpose) call stays ...
```

Add the import: `import { generateCore } from "@/lib/generate-core";`

- [ ] **Step 2: Verify both shapes work**

```bash
# New shape → generateCore (text note)
curl -s -X POST localhost:3000/api/ios/gemini/generation \
  -H "content-type: application/json" \
  -H "x-device-id: $(uuidgen | tr 'A-Z' 'a-z')" \
  -d '{"type":"note","content":"The mitochondria is the powerhouse of the cell."}' \
  | head -c 300
# Expected: JSON with title/sections (or 429 if free tier used)

# Old shape (existing app versions) → still forwarded
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/ios/gemini/generation \
  -H "content-type: application/json" \
  -H "x-device-id: $(uuidgen | tr 'A-Z' 'a-z')" \
  -d '{"contents":[{"parts":[{"text":"hello"}]}]}'
# Expected: 400 (Gemini rejects empty-ish input, but NOT 500 — the proxy works)
```

- [ ] **Step 3: Commit**

```bash
git add app/api/ios/gemini/[purpose]/route.ts
git commit -m "feat: iOS generation route accepts unified shape (type/content/mimeType) → generateCore"
```

---

### Task 4: Extract chat into `lib/chat-core.ts` + rewire both routes

**Files:**
- Create: `lib/chat-core.ts`
- Modify: `app/api/chat/route.ts`
- Modify: `app/api/ios/gemini/[purpose]/route.ts` (chat purpose)

**Interfaces:**
- Consumes: `FREE_TEXT_FORMAT_CONTRACT` from `lib/format-contract.ts`.
- Produces: `chatCore(question: string, context: string): Promise<ChatResult>`.

- [ ] **Step 1: Write `lib/chat-core.ts`**

```ts
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
```

- [ ] **Step 2: Rewire `/api/chat`**

```ts
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
```

- [ ] **Step 3: iOS chat route** — in `app/api/ios/gemini/[purpose]/route.ts`, purpose `"chat"` or `"onboarding"` with the new shape `{question, context}` calls `chatCore()`:

```ts
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
```

- [ ] **Step 4: Verify + commit**

Run: `npm run build` (exit 0). Then commit:

```bash
git add lib/chat-core.ts app/api/chat/route.ts app/api/ios/gemini/[purpose]/route.ts
git commit -m "feat: shared chat-core — both web and iOS chat use server-side prompt"
```

---

### Task 5: iOS `GeminiApiManger` — send `{type, content, mimeType}`

**Files:**
- Modify: `QuickNote/GeminiApi/GeminiApiManger.swift` (iOS repo `e:\Projects\Arasheed\QuickNote\QuickNote`)

**Interfaces:**
- Consumes: Task 3's new endpoint shape (`{type, content, mimeType}` → formatted JSON response).
- Produces: `QuicNotesService.shared.generate(type:content:mimeType:completion:)` used by the app's UI code.

- [ ] **Step 1: Add the unified generate function**

Add to `QuicNotesService`:

```swift
    // Unified generation (2026-10-22): sends {type, content, mimeType} to
    // the server, which owns the prompt, extracts YouTube transcripts via
    // Supadata, calls Gemini, and returns formatted JSON. The server-side
    // prompts are identical to the web app's.
    func generate(
        type: String,
        content: String,
        mimeType: String = "text/plain",
        completion: @escaping (Result<[String: Any], Error>) -> Void
    ) {
        let body: [String: Any] = [
            "type": type,
            "content": content,
            "mimeType": mimeType,
        ]
        guard let httpBody = try? JSONSerialization.data(withJSONObject: body) else {
            completion(.failure(NSError(domain: "InvalidRequest", code: -1)))
            return
        }
        guard let url = URL(string: "https://quizliai.com/api/ios/gemini/generation") else {
            completion(.failure(NSError(domain: "InvalidURL", code: -1)))
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = httpBody

        QuizliProxyHeaders.apply(to: request) { request in
            self.session.dataTask(with: request) { data, _, error in
                if let error = error {
                    completion(.failure(error))
                    return
                }
                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    completion(.failure(NSError(domain: "InvalidResponse", code: -1)))
                    return
                }
                completion(.success(json))
            }.resume()
        }
    }
```

- [ ] **Step 2: Update callers (LoaderViewController etc.) to use `generate()`**

Each content-type function in `LoaderViewController` switches from building a full Gemini prompt + calling `sendMultiPromptRequest`/`analyzeYouTubeVideo` to calling `generate()`:

- `youtubeLinkGetoutput()` → `generate(type: "study_pack", content: link, mimeType: "video/youtube")`
- `imageGetoutput()` → `generate(type: "study_pack", content: "", mimeType: "image/jpeg", fileData: base64)` — NOTE: this needs the `fileData` parameter added to `generate()`:
  ```swift
  func generate(type: String, content: String, mimeType: String = "text/plain",
                fileData: String? = nil, completion: ...)
  // body gains: if let fileData = fileData { body["fileData"] = fileData }
  ```
- `typedTextGetoutput()` → `generate(type: "study_pack", content: text)`
- `documentGetoutput()` → `generate(type: "study_pack", content: "", mimeType: docMime, fileData: base64)`
- `websiteLinkGetoutput()` → `generate(type: "study_pack", content: url)`

The response is the same formatted JSON (note/quiz/flashcard structure) — decode it with the existing `MultiPromptResponse` model (but note: the web schema has different field names; see Step 3).

- [ ] **Step 3: Align the response decode with the web schema**

The web `/api/generate` returns the note schema directly: `{title, quick_summary, key_findings, important_notes, sections}` — NOT the iOS `MultiPromptResponse` shape (`{caption, note, quiz, flashcard, chat}`). The iOS decode needs a small mapping:

```swift
struct WebNoteResponse: Codable {
    let title: String?
    let quick_summary: String?
    let key_findings: [String]?
    let important_notes: [String]?
    let sections: [WebSection]?
}

struct WebSection: Codable {
    let title: String?
    let content: String?
    let keyTerms: [String]?
}
```

And the `study_pack` type returns all three (notes + flashcards + quiz) in one JSON — same shape as the web UI consumes. iOS maps this to its local models.

- [ ] **Step 4: Verify** (grep — no compiler on this machine)

Run: `git grep -c "QuicNotesPrompts" -- "*.swift"` → expected: 0 (after Task 6 deletes the file). For now: only references from `GeminiApiManger.swift` remain (deleted in Task 6).

- [ ] **Step 5: Commit**

```bash
git add QuickNote/GeminiApi/GeminiApiManger.swift QuickNote/ViewController/LoaderViewController.swift
git commit -m "feat: iOS sends {type, content, mimeType} to unified generation endpoint"
```

---

### Task 6: Delete `QuicNotesPrompts.swift` + dead prompt code

**Files:**
- Delete: `QuickNote/GeminiApi/QuicNotesPrompts.swift`
- Modify: `QuickNote/GeminiApi/GeminiApiManger.swift` (remove old prompt references)

- [ ] **Step 1: Grep for remaining references**

Run: `git grep -n "QuicNotesPrompts\|createCaptionForPrompt\|createNoteForPrompt\|createQuizForPrompt\|createFlashCardForPrompt\|createChatForPrompt" -- "*.swift"`

- [ ] **Step 2: Remove each reference** — the old `sendMultiPromptRequest`, `analyzeYouTubeVideo`, and `sendChatRequest` functions that build prompts client-side get deleted (replaced by `generate()` from Task 5). Keep the `session` property and `QuizliProxyHeaders` wiring.

- [ ] **Step 3: Delete the prompts file**

```bash
git rm QuickNote/GeminiApi/QuicNotesPrompts.swift
```

- [ ] **Step 4: Verify zero references**

Run: `git grep -rn "QuicNotesPrompts" -- "*.swift"` → expected: no hits.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: QuicNotesPrompts deleted — server owns all prompts"
```

---

### Task 7: Kevin build gate + end-to-end verification

- [ ] **Step 1: Kevin — Xcode build** (`pod install` if needed, build, fix-forward any compile errors with the controller)

- [ ] **Step 2: On-device/sim verification checklist**

1. Typed text note → works, same output quality as web
2. YouTube note → works via Supadata transcript (no 60-min limit, no video-token cost)
3. Photo note → works (base64 inline)
4. Chat about a note → works
5. Web app → unchanged behavior (same endpoint, same output)
6. Console filter `generateCore` or the note title appears in Xcode

- [ ] **Step 3: Controller records results in ledger**
