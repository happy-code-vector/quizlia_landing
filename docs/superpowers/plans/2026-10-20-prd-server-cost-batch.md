# PRD Server Cost Batch (Items 1–3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut web YouTube generation cost ~9x by collapsing the 3-call fan-out into one request, forcing low-res video + low thinking budget, and capping video length at 60 minutes (PRD rev 44, handoff items 1–3).

**Architecture:** All three changes live on the existing Gemini `generateContent` paths: `/api/generate` (web), the client hook `useGenerateContent.ts`, and the iOS proxy `/api/ios/gemini/[purpose]`. Duration lookup goes through Supadata's metadata endpoint (same vendor/key as `lib/transcript.ts`) because the PRD forbids direct YouTube fetching.

**Tech Stack:** Next.js 16 route handlers, Gemini v1beta REST (`generateContent`), Supadata v1 REST, Firebase ID-token auth (existing `lib/quota` + `lib/token-verify`).

## Global Constraints

- PRD rev 44 (locked 2026-10-20): **Gemini 3.1 Flash-Lite is the single launch model** — do not add model selection. Haiku 5.5 is 429/outage fallback only (NOT in this batch).
- PRD rev 44: **no direct YouTube fetching** — video metadata (duration) comes from Supadata only.
- This repo has **no test framework**: verification is `npx eslint <files>` + `npm run build` + manual verification in the signed-in app. Kevin verifies UI by hand.
- AGENTS.md: this Next.js version may differ from what you know — read `node_modules/next/dist/docs/` guides if touching any Next-specific API. (This plan only edits bodies of existing handlers/hooks — no new Next APIs.)
- Every commit message ends with: `Co-Authored-By: Claude Code <noreply@anthropic.com>`
- Token math (PRD-verified): default video ≈ 290 tok/s, low-res ≈ 98 tok/s; a 60-min video at default ≈ 1.08M tokens.
- `setId` metering must stay: one user generation = one metered generation (lib/quota already dedupes by setId).

---

### Task 1: Collapse the 3-call fan-out into one `study_pack` request

**Files:**
- Modify: `app/api/generate/route.ts` (PROMPTS at lines 11–93, response validation at 259–294)
- Modify: `hooks/useGenerateContent.ts` (fan-out at lines 121–164, consumption at 176–227)

**Interfaces:**
- Consumes: existing `checkQuota`, `JSON_FORMAT_CONTRACT`, `PROMPTS.note/flashcard/quiz`.
- Produces: `POST /api/generate` with `type: "study_pack"` returns `{ success: true, data: { note: NoteObject, flashcards: Flashcard[], quizzes: Quiz[] } }` where `note` is the note JSON object (title, quick_summary, key_findings, important_notes, sections), `flashcards`/`quizzes` are arrays (possibly empty). The old single types (`note`, `flashcard`, `quiz`) keep working — the iOS-era contract and any older clients are unaffected.

- [ ] **Step 1: Add the combined prompt to `app/api/generate/route.ts`**

Add after the existing `quiz` entry in `PROMPTS` (line 92, before the closing `};`):

```typescript
  study_pack: `You are QuicNotes, an AI that produces a complete study pack from the given content.

TASK:
Produce all three deliverables in ONE JSON response:
1. Structured study notes (same schema as the "note" task below).
2. Study flashcards — the maximum number of high-quality flashcards possible.
3. Multiple-choice quiz questions — the maximum possible number of high-quality MCQs.

NOTE SCHEMA:
- title: string (concise title of the content)
- quick_summary: string (a 5–8 sentence overall summary)
- key_findings: array of strings (as many key facts or statistics as possible)
- important_notes: array of strings (all relevant cautions, limitations, or extra details you can find)
- sections: array of cheat-sheet sections — the detailed study material, organized topic by topic (3–8 sections, each with a short descriptive title, clear explanatory content, and up to 5 key terms)

FLASHCARD SCHEMA (each): { "question": string (clear, concise; preferably under 20 words), "answer": string (short, precise, factual) }

QUIZ SCHEMA (each): { "question": string (under 25 words), "options": array of 4 distinct strings, "correct_answer": string (must exactly match one option), "explanation": string (1–2 sentences) }

RULES:
- Answers must be based only on the provided content.
- No duplicates or trivial items. Only one correct answer per quiz question.
- Distractors must be plausible but clearly wrong.
- If you cannot access or analyze the content, return: {"error": "content_not_accessible", "message": "Unable to access or analyze the provided content"}

RESPONSE FORMAT (JSON only):
{
  "note": { "title": "string", "quick_summary": "string", "key_findings": ["..."], "important_notes": ["..."], "sections": [ { "title": "section title", "content": "explanatory text", "keyTerms": ["term 1", "term 2"] } ] },
  "flashcards": [ { "question": "string", "answer": "string" } ],
  "quizzes": [ { "question": "string", "options": ["string","string","string","string"], "correct_answer": "string", "explanation": "string" } ]
}`,
```

- [ ] **Step 2: Add `study_pack` response validation in the same file**

In `POST`, after the existing `type === "quiz"` validation block (ends line 294), add — and note the required change in the `maxOutputTokens` line (Step 3):

```typescript
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
        return NextResponse.json({
          success: true,
          data: { note, flashcards, quizzes }
        });
      }
```

- [ ] **Step 3: Raise the output cap for combined responses**

In the same file, change the `generationConfig` (line 212–215) to:

```typescript
        generationConfig: {
          // Token allocation: 65536 for PDFs, YouTube videos and combined
          // study packs; 16384 for single-artifact URL requests
          maxOutputTokens:
            fileData || mimeType === "video/youtube" || type === "study_pack"
              ? 65536
              : 16384,
        },
```

- [ ] **Step 4: Replace the fan-out in `hooks/useGenerateContent.ts`**

Replace lines 115–164 (from the `// Generate all three types in parallel.` comment through the end of the HTTP-error block) with:

```typescript
      // One generation = one request: the server returns the note,
      // flashcards and quiz together (type "study_pack", as iOS already
      // does) so the source — video especially — is ingested once, not
      // three times. setId still meters it as a single generation
      // against the account's cross-platform budget.
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({ ...requestBody, type: "study_pack", setId }),
      });

      const result = await response.json().catch(() => ({ success: false, message: "Failed to parse response" }));

      if (!response.ok) {
        // Quota exhausted server-side (the shared budget may have been
        // spent on another device or the app) — paywall, not an error toast.
        if (response.status === 429) {
          setIsPaywallOpen(true);
          return;
        }
        showToast(result.message || result.error || `Generation failed: HTTP ${response.status}`, "error");
        return;
      }
```

- [ ] **Step 5: Update consumption of the combined response (same file)**

Replace the note/flashcard/quiz consumption blocks (lines 176–227 in the old numbering — the three `// Add notes` / `// Add flashcards` / `// Add quiz` blocks) with:

```typescript
      // Add notes (mandatory artifact)
      const noteData = result.data?.note;
      if (result.success && noteData && !noteData.error && noteData.title) {
        newItems.push({
          id: timestamp,
          title: noteData.title,
          description: `AI-generated notes from ${sourceLabel}`,
          type: "notes",
          createdAt: new Date().toISOString(),
          data: noteData,
          sourceId,
          sourceName,
          sourceType: contentType,
          folderId: targetFolderId,
        });
      } else {
        errors.push(result.message || "Notes generation failed");
      }

      // Add flashcards (optional artifact — empty array degrades to a warning)
      if (result.data?.flashcards?.length > 0) {
        newItems.push({
          id: timestamp + 1,
          title: `Flashcards: ${sourceText.substring(0, 30)}...`,
          description: `${result.data.flashcards.length} flashcards`,
          type: "flashcards",
          createdAt: new Date().toISOString(),
          sourceId,
          sourceName,
          sourceType: contentType,
          data: { flashcards: result.data.flashcards },
          folderId: targetFolderId,
        });
      } else {
        errors.push("Flashcards generation failed");
      }

      // Add quiz (optional artifact)
      if (result.data?.quizzes?.length > 0) {
        newItems.push({
          id: timestamp + 2,
          title: `Quiz: ${sourceText.substring(0, 30)}...`,
          description: `${result.data.quizzes.length} questions`,
          type: "quiz",
          createdAt: new Date().toISOString(),
          sourceId,
          sourceName,
          sourceType: contentType,
          data: { quizzes: result.data.quizzes },
          folderId: targetFolderId,
        });
      } else {
        errors.push("Quiz generation failed");
      }
```

(Downstream code — `newItems.find((i) => i.type === "flashcards")` / `"quiz"` at lines ~253–254, `flashcardItem?.data?.flashcards` / `quizItem?.data?.quizzes` — already reads the `{flashcards}`/`{quizzes}` wrapper shape these items keep, so it needs no change.)

- [ ] **Step 6: Verify**

Run: `npx eslint app/api/generate/route.ts hooks/useGenerateContent.ts && npm run build`
Expected: no new lint findings on the two files, build succeeds.

Manual (Kevin, signed into /note with GEMINI_API_KEY in `.env.local`): generate from a short YouTube video — all three materials appear, one toast, usage counter increments by 1; the server log shows ONE Gemini call.

- [ ] **Step 7: Commit**

```bash
git add app/api/generate/route.ts hooks/useGenerateContent.ts
git commit -m "perf: web generation is one study_pack call, not a 3x fan-out

The video/PDF source is now ingested once per generation instead of
three times. setId metering unchanged: one generation, one unit.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: Low media resolution + low thinking budget on video

**Files:**
- Modify: `app/api/generate/route.ts` (generationConfig, and a new probe constant near the model URL)
- Modify: `app/api/ios/gemini/[purpose]/route.ts` (generationConfig forwarding, lines 78–87)

**Interfaces:**
- Consumes: nothing from Task 1 (independent; both edit the same `generationConfig` block — **apply after Task 1**).
- Produces: shared constant `const VIDEO_GENERATION_EXTRAS` (exported from nothing — each route declares its own inline, see steps) applied to any request containing a YouTube video part.

- [ ] **Step 1: Probe which fields `gemini-3.1-flash-lite:generateContent` accepts**

Run this probe (replace `$KEY` with the GEMINI_API_KEY from `.env.local`; it posts a 10-second video at low resolution with thinking disabled):

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=$KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{ "parts": [
      { "fileData": { "mimeType": "video/mp4", "fileUri": "https://www.youtube.com/watch?v=9bZkp7q19f0" } },
      { "text": "Reply with the single word: ok" }
    ]}],
    "generationConfig": {
      "mediaResolution": "MEDIA_RESOLUTION_LOW",
      "thinkingConfig": { "thinkingBudget": 0 },
      "maxOutputTokens": 2048
    }
  }'
```

Evaluate, in order:
1. HTTP 200 → keep BOTH fields exactly as probed (`thinkingBudget: 0`). Record `usageMetadata.promptTokenCount` — with ~98 tok/s (PRD figure), a 253-second video should show well under 40k tokens. This doubles as PRD item 12's tokens-per-second confirmation for one data point.
2. 400 mentioning `thinkingConfig`/`thinkingBudget` → retry the same curl with `"thinkingConfig": { "thinkingBudget": 512 }`; if still 400, retry with the thinkingConfig field removed entirely.
3. 400 mentioning `mediaResolution` → drop that field (log a console.warn in code where noted below) — the task then ships thinking-only. Report this to Kevin: it changes the expected savings.

Use whichever combination returned 200 in the steps below (default shown: both fields, `thinkingBudget: 0`).

- [ ] **Step 2: Apply to `app/api/generate/route.ts`**

Change the `generationConfig` built in Task 1 to (keep the exact thinkingConfig form confirmed by the probe; if the probe dropped a field, omit it here):

```typescript
        generationConfig: {
          // Token allocation: 65536 for PDFs, YouTube videos and combined
          // study packs; 16384 for single-artifact URL requests
          maxOutputTokens:
            fileData || mimeType === "video/youtube" || type === "study_pack"
              ? 65536
              : 16384,
          // PRD item 2: low-res video (~98 tok/s vs ~290 default) and a
          // minimal thinking budget (thinking tokens bill as output).
          ...(mimeType === "video/youtube" && {
            mediaResolution: "MEDIA_RESOLUTION_LOW",
            thinkingConfig: { thinkingBudget: 0 },
          }),
        },
```

- [ ] **Step 3: Apply to the iOS proxy `app/api/ios/gemini/[purpose]/route.ts`**

Replace the upstream fetch body (lines 80–87) with — the server owns generationConfig for video requests regardless of what the app sent:

```typescript
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
```

(Again: use the probe-confirmed field set; if `mediaResolution` was rejected, keep only `thinkingConfig` in both routes and add `console.warn("gemini: mediaResolution rejected by model; shipping thinking-only")` at the proxy's video branch.)

- [ ] **Step 4: Verify**

Run: `npx eslint "app/api/generate/route.ts" "app/api/ios/gemini/[purpose]/route.ts" && npm run build`
Expected: clean on both files, build succeeds.

Manual (Kevin): one web YouTube generation and (if convenient) one iOS generation — both succeed and the returned notes look normal. If the probe recorded `promptTokenCount`, note it next to PRD item 12's table.

- [ ] **Step 5: Commit**

```bash
git add "app/api/generate/route.ts" "app/api/ios/gemini/[purpose]/route.ts"
git commit -m "perf: low-res video + minimal thinking budget on Gemini video paths

Video drops from ~290 to ~98 tokens/second (PRD item 2); thinking
tokens minimized (they bill as output). Applies to /api/generate and
the iOS proxy, server-side so no app release is needed.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: Cap YouTube videos at 60 minutes, server-side

**Files:**
- Modify: `lib/transcript.ts` (add duration helper after `getTranscript`, ~line 100)
- Modify: `app/api/generate/route.ts` (YouTube branch, lines 171–184)
- Modify: `app/api/ios/gemini/[purpose]/route.ts` (before the upstream fetch)

**Interfaces:**
- Consumes: existing `youtubeVideoId` (exported from `lib/transcript.ts`), Supadata `GET /v1/metadata?url=` → `{ media: { duration: <seconds> } }` with `x-api-key` header (verified against docs 2026-10-20).
- Produces: `export async function getVideoDurationSeconds(videoId: string): Promise<number | null>` — null when the key is unset, the lookup fails, or duration is unknown (callers treat null as "cannot check, proceed"). Error contract: web route → HTTP 422 `{ success: false, error: "video_too_long", message }`; iOS proxy → HTTP 422 `{ error: { code: 422, message } }` (matches the existing study-from-video 422 convention).

- [ ] **Step 1: Add the duration helper to `lib/transcript.ts`**

Append at the end of the file:

```typescript
const durationCache = new Map<string, { value: number; at: number }>();
const DURATION_CACHE_MS = 24 * 60 * 60 * 1000;

/**
 * Video duration in seconds via Supadata metadata, or null when it can't
 * be determined (no key, lookup failure, unknown field). Callers treat
 * null as "cannot check" and proceed — the cap is a cost guard, not a
 * hard security boundary. No direct YouTube fetching (PRD rev 44).
 */
export async function getVideoDurationSeconds(videoId: string): Promise<number | null> {
  if (!SUPADATA_API_KEY) return null;
  const hit = durationCache.get(videoId);
  if (hit && Date.now() - hit.at < DURATION_CACHE_MS) return hit.value;
  try {
    const res = await fetch(
      `https://api.supadata.ai/v1/metadata?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}`,
      { headers: { "x-api-key": SUPADATA_API_KEY } }
    );
    if (res.status !== 200) {
      console.warn(`duration: supadata ${res.status} for ${videoId}`);
      return null;
    }
    const data = (await res.json()) as { media?: { duration?: unknown } };
    const duration = typeof data.media?.duration === "number" ? data.media.duration : null;
    if (duration !== null) {
      durationCache.set(videoId, { value: duration, at: Date.now() });
    }
    return duration;
  } catch (e) {
    console.warn("duration: supadata error", e);
    return null;
  }
}
```

- [ ] **Step 2: Enforce the cap in `app/api/generate/route.ts`**

Add the import at the top (after the existing imports):

```typescript
import { youtubeVideoId, getVideoDurationSeconds } from "@/lib/transcript";
```

Add a constant next to `GEMINI_API_URL` (line 9):

```typescript
// PRD item 3: a 60-minute video at default resolution is ~1.08M tokens;
// longer videos are rejected with a clear error instead of billed.
const MAX_VIDEO_SECONDS = 60 * 60;
```

Inside the YouTube branch (after `const youtubeUrl = ...` at line 174, before `parts.push`):

```typescript
      // Cost guard (PRD item 3): reject videos over 60 minutes before
      // they hit Gemini. Skipped silently when the duration can't be
      // determined (no vendor key / lookup failure).
      const videoId = youtubeVideoId(youtubeUrl);
      if (videoId) {
        const duration = await getVideoDurationSeconds(videoId);
        if (duration !== null && duration > MAX_VIDEO_SECONDS) {
          return NextResponse.json(
            {
              success: false,
              error: "video_too_long",
              message: `That video is ${Math.round(duration / 60)} minutes long — the limit is 60 minutes.`,
            },
            { status: 422 }
          );
        }
      }
```

- [ ] **Step 3: Enforce the cap in the iOS proxy `app/api/ios/gemini/[purpose]/route.ts`**

Add the import at the top:

```typescript
import { youtubeVideoId, getVideoDurationSeconds } from "@/lib/transcript";
```

Add the same `MAX_VIDEO_SECONDS` constant next to `GEMINI_URL` (line 20). Then, after the `isVideoRequest` computation from Task 2 and before the upstream fetch, add:

```typescript
    if (isVideoRequest) {
      // PRD item 3: reject >60-minute videos before they hit Gemini.
      // Checks the first YouTube part found in the request.
      for (const part of contents.flatMap((c: any) => (Array.isArray(c?.parts) ? c.parts : []))) {
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
    }
```

- [ ] **Step 4: Verify**

Run: `npx eslint lib/transcript.ts "app/api/generate/route.ts" "app/api/ios/gemini/[purpose]/route.ts" && npm run build`
Expected: clean, build succeeds.

Manual (Kevin, with `SUPADATA_API_KEY` in `.env.local`): paste a >60-minute YouTube link in /note — expect the clear "limit is 60 minutes" error, no Gemini call in the server log; a short video still generates normally.

- [ ] **Step 5: Commit**

```bash
git add lib/transcript.ts "app/api/generate/route.ts" "app/api/ios/gemini/[purpose]/route.ts"
git commit -m "feat: reject YouTube videos over 60 minutes (PRD item 3)

Duration via Supadata metadata (no direct YouTube fetching). When the
duration can't be determined the check is skipped — cost guard, not a
hard boundary.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Out of scope (tracked in the PRD handoff, separate batches)

- Item 4: Netlify env vars + deploy (AR sets keys; GEMINI_API_KEY his side)
- Item 5: `sourceText`/`sourceKind` on `/api/ios/study-from-video` — next small batch
- Items 6–11: tutor chat route, model routing (incl. flipping the merged f2 route from Haiku-primary to Gemini-primary per PRD rev 44 — **conflicts with today's merged code until then**), caching, study-pack cache, server quotas, kid-safe prompts
- Item 12+: model eval script, AR-blocked items 13/14/18, iOS app items 16–21

## Self-Review Notes

- Spec coverage: PRD items 1, 2, 3 → Tasks 1, 2, 3 respectively. "Keep setId metering" preserved (Task 1 sends setId on the single request). "Clear error" for item 3 = human-readable message on 422.
- Thinking-budget field shape (`thinkingConfig.thinkingBudget` vs the newer `thinkingLevel`) is resolved empirically by Task 2 Step 1 before any code is written — the code steps pin the default and give the fallback rules.
- Type consistency: `study_pack` response shape (`data.note` / `data.flashcards[]` / `data.quizzes[]`) is identical in server (Task 1 Step 2) and client (Step 5); `getVideoDurationSeconds(videoId: string): Promise<number | null>` identical in Task 3 Steps 1–3.
