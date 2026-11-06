# Dedupe Folders & Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Case-insensitive folder-name uniqueness on iOS and web, plus link-based generation dedupe — clients open the existing note instead of re-generating, and the server caches web-URL study packs like it already caches YouTube videos.

**Architecture:** One pure TS module (`lib/url-dedupe.ts`) defines "same link" for the web client and both server routes; `lib/pack-cache.ts` turns a link into a `generationCache` Firestore key. iOS mirrors the two pure helpers as `SourceLinkMatcher` inside `DatabaseManger.swift` (no new files — pbxproj is hand-edited otherwise) and checks dupes at the two `CreateNoteViewController` seams where the Loader is presented.

**Tech Stack:** Next 16 App Router (web + Netlify functions), node:test via `npx -y tsx --test`, Firestore Admin SDK, Swift/UIKit iOS app (CocoaPods).

**Spec:** `docs/superpowers/specs/2026-11-06-dedupe-folders-and-links-design.md`

## Global Constraints

- Two repos, run git per repo: landing = `e:\Projects\Arasheed\QuickNote\quizlia_landing`, iOS = `e:\Projects\Arasheed\QuickNote\QuickNote`.
- Landing `main` **auto-deploys to production** (Netlify) on every commit — every commit must typecheck (`npx tsc --noEmit`) and keep tests green.
- Tests are `node:test` + `assert/strict`, colocated `lib/*.test.ts`, run `npx -y tsx --test <file>` (repo convention, no vitest/jest installed).
- `lib/url-dedupe.ts` must stay browser-bundleable: NO `node:*` imports, NO `@/lib/admin-firestore` import. Server-only hashing lives in `lib/pack-cache.ts`.
- YouTube video IDs are compared **case-sensitive**; folder names **case-insensitive** (`trim().lowercased()`).
- Swift is NEVER compiled on this Windows machine — iOS tasks are review-verified only; Task 12 is the Xcode checklist. iOS work goes on branch `feature/dedupe-folders-links`, **never pushed** (AR's OK required before touching iOS origin/main).
- Reserved folder names count as taken: any `general…`-prefixed name and `From Web` (both platforms compare against the full stored list).
- All commit messages end with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.

---

### Task 1: `lib/url-dedupe.ts` — pure link matching (TDD)

**Files:**
- Create: `lib/url-dedupe.ts`
- Test: `lib/url-dedupe.test.ts`

**Interfaces:**
- Produces (used by Tasks 3, 4, 6): `extractYouTubeId(input: string): string | null`, `normalizeUrlForDedupe(input: string): string | null`

- [ ] **Step 1: Write the failing test**

Create `lib/url-dedupe.test.ts`:

```ts
// lib/url-dedupe.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { extractYouTubeId, normalizeUrlForDedupe } from "./url-dedupe";

test("extractYouTubeId handles every common URL form", () => {
  const id = "dQw4w9WgXcQ";
  assert.equal(extractYouTubeId(`https://www.youtube.com/watch?v=${id}`), id);
  assert.equal(extractYouTubeId(`https://youtu.be/${id}`), id);
  assert.equal(extractYouTubeId(`https://www.youtube.com/shorts/${id}`), id);
  assert.equal(extractYouTubeId(`https://www.youtube.com/embed/${id}`), id);
  assert.equal(extractYouTubeId(`https://www.youtube.com/live/${id}`), id);
  assert.equal(extractYouTubeId(`https://m.youtube.com/watch?v=${id}&t=30s`), id);
  assert.equal(extractYouTubeId(`https://youtu.be/${id}?si=abc123`), id);
  assert.equal(extractYouTubeId(id), id); // bare id
});

test("extractYouTubeId is case-sensitive and rejects non-YouTube input", () => {
  // ids are case-significant: a case change is a different (non-)match
  assert.equal(extractYouTubeId("https://youtu.be/dqw4w9wgxcq"), null);
  assert.equal(extractYouTubeId("https://example.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(extractYouTubeId("not a link"), null);
  assert.equal(extractYouTubeId(""), null);
  assert.equal(extractYouTubeId("ftp://youtu.be/dQw4w9WgXcQ"), null);
});

test("normalizeUrlForDedupe ignores scheme, www, trailing slash, fragment, param order", () => {
  const a = normalizeUrlForDedupe("https://www.example.com/articles/photosynthesis/");
  const b = normalizeUrlForDedupe("http://example.com/articles/photosynthesis#section-2");
  assert.equal(a, b);
  assert.equal(a, "https://example.com/articles/photosynthesis");

  const c = normalizeUrlForDedupe("https://example.com/?b=2&a=1");
  const d = normalizeUrlForDedupe("https://example.com/?a=1&b=2");
  assert.equal(c, d);
});

test("normalizeUrlForDedupe strips tracking params but keeps meaningful ones", () => {
  const a = normalizeUrlForDedupe("https://example.com/page?utm_source=x&id=5&fbclid=zz&gclid=yy");
  const b = normalizeUrlForDedupe("https://example.com/page?id=5");
  assert.equal(a, b);
  assert.equal(a, "https://example.com/page?id=5");
});

test("normalizeUrlForDedupe lowercases host and rejects non-URLs", () => {
  assert.equal(normalizeUrlForDedupe("https://EXAMPLE.com/A/B"), "https://example.com/A/B");
  assert.equal(normalizeUrlForDedupe("example.com/no-scheme"), null);
  assert.equal(normalizeUrlForDedupe("Analyze the following link: hi"), null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd e:\Projects\Arasheed\QuickNote\quizlia_landing; npx -y tsx --test lib/url-dedupe.test.ts`
Expected: FAIL — cannot resolve `./url-dedupe`.

- [ ] **Step 3: Write the implementation**

Create `lib/url-dedupe.ts`:

```ts
// "Same link" rules for generation dedupe (spec 2026-11-06), shared by the
// web client hook (useGenerateContent) and the server routes. Pure
// functions only — this file is imported from a "use client" bundle, so no
// node:* / admin-SDK imports. Mirrors SourceLinkMatcher in the iOS app
// (QuickNote/Database/DatabaseManger.swift); keep the two in sync.

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Extract an 11-char YouTube video id from a bare URL or raw id.
 *  Case-sensitive by design (YouTube ids are case-significant). Same URL
 *  forms as lib/transcript.ts's server-side youtubeVideoId. */
export function extractYouTubeId(input: string): string | null {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  if (YT_ID.test(trimmed)) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/")[1] || "";
    return YT_ID.test(id) ? id : null;
  }
  if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    const v = url.searchParams.get("v");
    if (v && YT_ID.test(v)) return v;
    const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  }
  return null;
}

const TRACKING_KEYS = new Set([
  "fbclid", "gclid", "igshid", "mc_cid", "mc_eid",
  "ref", "ref_src", "ref_url",
]);

/** Canonical form of a non-YouTube web URL for the client-side "already
 *  generated" check and the server's packurl cache key: lowercase host,
 *  no www., no default port, no #fragment, tracking params dropped,
 *  remaining params sorted, trailing "/" dropped. null when the input is
 *  not an http(s) URL — callers then treat the link as unmatched. */
export function normalizeUrlForDedupe(input: string): string | null {
  const trimmed = (input || "").trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const defaultPort = (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443");
  const port = url.port && !defaultPort ? `:${url.port}` : "";
  const path = url.pathname.replace(/\/+$/, "");
  const kept = [...url.searchParams.entries()]
    .filter(([k]) => !k.toLowerCase().startsWith("utm_") && !TRACKING_KEYS.has(k.toLowerCase()))
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1));
  const search = kept.length ? `?${new URLSearchParams(kept).toString()}` : "";
  return `${url.protocol}//${host}${port}${path}${search}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx -y tsx --test lib/url-dedupe.test.ts`
Expected: `pass 5, fail 0`.

- [ ] **Step 5: Commit (spec correction rides along)**

```powershell
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing add lib/url-dedupe.ts lib/url-dedupe.test.ts docs/superpowers/specs/2026-11-06-dedupe-folders-and-links-design.md
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing commit -m @'
feat: pure link-matching helpers (url-dedupe) + spec ListingFolder correction

extractYouTubeId + normalizeUrlForDedupe define "same link" for the dedupe
feature; spec amended: ListingFolderNoteViewController is the self-checked
General bootstrap, not a user folder path.

Co-Authored-By: Claude Code <noreply@anthropic.com>
'@
```

---

### Task 2: `lib/pack-cache.ts` — link → cache key

**Files:**
- Modify: `lib/pack-cache.ts` (append after `putCachedStudyPack`, line ~85)

**Interfaces:**
- Consumes: `extractYouTubeId`, `normalizeUrlForDedupe` from `@/lib/url-dedupe` (Task 1)
- Produces (used by Tasks 3, 4): `studyPackLinkKey(link: string): string | null`, `getCachedStudyPackForLink(link: string): Promise<any | null>`, `putCachedStudyPackForLink(link: string, data: any): Promise<void>`

No unit test: the file imports the Admin SDK (`@/lib/admin-firestore`), which `node:test` cannot load. The key builder is 8 lines over the Task-1-tested pure functions; behavior is covered by the route wiring and the final build.

- [ ] **Step 1: Add the helpers**

In `lib/pack-cache.ts`, extend the import at the top and append the new block at the bottom:

```ts
import { createHash } from "node:crypto";
import { extractYouTubeId, normalizeUrlForDedupe } from "@/lib/url-dedupe";
```

```ts
// ---- link-keyed packs (dedupe spec 2026-11-06): a study pack sourced from
// any link — YouTube id (maps onto the video keys above, so both ingestion
// shapes share one entry) or a normalized web URL (hashed: Firestore doc
// ids cannot contain "/"). null for non-link text — callers skip caching.
export function studyPackLinkKey(link: string): string | null {
  const videoId = extractYouTubeId(link);
  if (videoId) return studyPackKey(videoId);
  const norm = normalizeUrlForDedupe(link);
  if (!norm) return null;
  const hash = createHash("sha256").update(norm).digest("hex").slice(0, 32);
  return `packurl:${hash}:v${STUDY_PACK_PROMPT_VERSION}`;
}

export async function getCachedStudyPackForLink(link: string): Promise<any | null> {
  const key = studyPackLinkKey(link);
  return key ? readServerCache(key) : null;
}

export async function putCachedStudyPackForLink(link: string, data: any): Promise<void> {
  const key = studyPackLinkKey(link);
  if (key) await writeServerCache(key, data);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd e:\Projects\Arasheed\QuickNote\quizlia_landing; npx tsc --noEmit`
Expected: no errors (if `tsc` is missing use `npx -p typescript tsc --noEmit`).

- [ ] **Step 3: Commit**

```powershell
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing add lib/pack-cache.ts
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing commit -m @'
feat: link-keyed study-pack cache keys (packurl:{sha256}:v{n})

YouTube links map onto the existing pack:{videoId} keys; web URLs hash to
Firestore-safe packurl keys. Non-link text returns null (no cache write).

Co-Authored-By: Claude Code <noreply@anthropic.com>
'@
```

---

### Task 3: `/api/generate` — URL cache read (free, pre-quota) + unified write

**Files:**
- Modify: `app/api/generate/route.ts` (import line 6; insert read after the `if (youtubeUrl) {...}` block ending line 100; replace the write block at lines 247-252)

**Interfaces:**
- Consumes: `getCachedStudyPackForLink`, `putCachedStudyPackForLink` (Task 2)

- [ ] **Step 1: Swap the import (line 6)**

```ts
import { getCachedStudyPack, getCachedStudyPackForLink, putCachedStudyPackForLink } from "@/lib/pack-cache";
```

(`getCachedStudyPack` stays — the video read branch at line 74 still uses it; only `putCachedStudyPack` drops out, replaced by the ForLink write below. `youtubeVideoId` from `@/lib/transcript` stays — still used at line 68.)

- [ ] **Step 2: Insert the cache read** — between the `if (youtubeUrl) {...}` block (ends line 100) and `// Server-side quota gate` (line 103):

```ts
    // URL pack cache (dedupe spec §3): same precedence as the video cache
    // above — a hit is free (no quota, no budget, no model call). Covers
    // the web app's "url" tab (content arrives as "Analyze the following
    // link: <url>", no mimeType); a YouTube link pasted there maps onto the
    // video keys via studyPackLinkKey.
    if (type === "study_pack" && !youtubeUrl && typeof content === "string") {
      const stripped = content.replace(/^Analyze the following link:\s*/i, "").trim();
      const cached = await getCachedStudyPackForLink(stripped);
      if (cached) {
        timingLog("generation", {
          source: "url",
          type: "study_pack",
          ok: 1,
          cache: 1,
          totalMs: Date.now() - requestStartedAt,
        });
        return NextResponse.json({
          success: true,
          data: { note: cached.note, flashcards: cached.flashcards ?? [], quizzes: cached.quizzes ?? [] },
        });
      }
    }
```

- [ ] **Step 3: Replace the write block** (lines 247-252, inside `if (type === "study_pack")` after note validation) — old:

```ts
      // Item 9: cache validated YouTube packs for the next caller of the
      // same video. putCachedStudyPack never throws.
      if (mimeType === "video/youtube" && youtubeUrl) {
        const packVideoId = youtubeVideoId(youtubeUrl);
        if (packVideoId) await putCachedStudyPack(packVideoId, { note, flashcards, quizzes });
      }
```

new:

```ts
      // Item 9 + dedupe spec §3: cache validated packs for the next caller
      // of the same link — video id or normalized URL. No-ops for non-link
      // text (studyPackLinkKey returns null). Never throws.
      const linkSource =
        youtubeUrl ??
        (typeof content === "string"
          ? content.replace(/^Analyze the following link:\s*/i, "").trim()
          : "");
      if (linkSource) await putCachedStudyPackForLink(linkSource, { note, flashcards, quizzes });
```

- [ ] **Step 4: Typecheck + tests**

Run: `npx tsc --noEmit; npx -y tsx --test lib/url-dedupe.test.ts`
Expected: no type errors; tests still pass.

- [ ] **Step 5: Commit**

```powershell
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing add app/api/generate/route.ts
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing commit -m @'
feat: /api/generate serves URL packs from cache before metering

Web-article study packs now hit the generationCache before quota/budget
(free, like video packs); the write side keys any link source (video id or
normalized URL) through studyPackLinkKey.

Co-Authored-By: Claude Code <noreply@anthropic.com>
'@
```

---

### Task 4: `/api/ios/gemini/[purpose]` — URL cache read + unified write

**Files:**
- Modify: `app/api/ios/gemini/[purpose]/route.ts` (import line 17; insert read between line 180 `}` and line 182 `if (device) {`; replace write block lines 317-322)

**Interfaces:**
- Consumes: `getCachedStudyPackForLink`, `putCachedStudyPackForLink` (Task 2)

iOS website links arrive as `{type:"study_pack", content:"Analyze the following link: <url>", mimeType:"text/plain"}` (`LoaderViewController.websiteLinkGetoutput`); YouTube as `{content: <bare link>, mimeType:"video/youtube"}`.

- [ ] **Step 1: Extend the import (line 17)**

```ts
import { getCachedStudyPack, getCachedStudyPackForLink, putCachedStudyPackForLink } from "@/lib/pack-cache";
```

(`getCachedStudyPack` stays — the video read branch at line 149 still uses it. `putCachedStudyPack` drops out: the write block below replaces its only call site. `youtubeVideoId` from `@/lib/transcript` stays — lines 102 and 136 still use it.)

- [ ] **Step 2: Insert the cache read** — after the `if (isNewShape && body.mimeType === "video/youtube" ...)` block closes (line 180), before `if (device) {` (line 182):

```ts
  // URL pack cache (dedupe spec §3): iOS website links are text/plain
  // "Analyze the following link: <url>" — serve them from the cache like
  // video packs, before any metering (free hit). A YouTube link in that
  // shape maps onto the video keys via studyPackLinkKey.
  if (
    isNewShape &&
    body.type === "study_pack" &&
    body.mimeType !== "video/youtube" &&
    typeof body.content === "string"
  ) {
    const stripped = body.content.replace(/^Analyze the following link:\s*/i, "").trim();
    const cached = await getCachedStudyPackForLink(stripped);
    if (cached) {
      timingLog("generation", {
        source: "url",
        type: "study_pack",
        ok: 1,
        cache: 1,
        totalMs: Date.now() - requestStartedAt,
      });
      return NextResponse.json(cached);
    }
  }
```

- [ ] **Step 3: Replace the write block** (lines 317-322) — old:

```ts
    // Item 9: cache fresh YouTube study packs (validated shape only) for
    // the next caller of the same video. putCachedStudyPack never throws.
    if (body.type === "study_pack" && body.mimeType === "video/youtube" && result.data?.note) {
      const packVideoId = youtubeVideoId(body.content);
      if (packVideoId) await putCachedStudyPack(packVideoId, result.data);
    }
```

new:

```ts
    // Item 9 + dedupe spec §3: cache fresh study packs (validated shape
    // only) for the next caller of the same link — video id or normalized
    // URL. No-ops for non-link text. Never throws.
    if (body.type === "study_pack" && result.data?.note && typeof body.content === "string") {
      const linkSource = body.content.replace(/^Analyze the following link:\s*/i, "").trim();
      if (linkSource) await putCachedStudyPackForLink(linkSource, result.data);
    }
```

- [ ] **Step 4: Typecheck + tests**

Run: `npx tsc --noEmit; npx -y tsx --test lib/url-dedupe.test.ts`
Expected: no type errors; tests pass. (If `youtubeVideoId`/`putCachedStudyPack` imports become unused, remove them from their import lines — lint is the gate.)

- [ ] **Step 5: Commit**

```powershell
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing add "app/api/ios/gemini/[purpose]/route.ts"
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing commit -m @'
feat: iOS generation route serves URL packs from cache before metering

Website-link study packs (text/plain "Analyze the following link:") hit
generationCache before device/account metering; writes key any link source
through studyPackLinkKey, same as /api/generate.

Co-Authored-By: Claude Code <noreply@anthropic.com>
'@
```

---

### Task 5: Web folder dedupe — CreateFolderModal + RenameModal + page wiring

**Files:**
- Modify: `components/app/CreateFolderModal.tsx` (props + check)
- Modify: `components/app/RenameModal.tsx` (props + error state)
- Modify: `app/note/notes/page.tsx` (pass names, lines ~537-548)

**Interfaces:**
- Produces: `CreateFolderModal` gains `existingNames?: string[]`; `RenameModal` gains `conflictNames?: string[]` (only the folder instance passes it)

- [ ] **Step 1: CreateFolderModal — add the duplicate check**

In `CreateFolderModal.tsx`, extend the props interface and destructure:

```tsx
interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (folderName: string, folderIcon: string) => void;
  /** Existing folder names — a case-insensitive match blocks creation (spec 2026-11-06). */
  existingNames?: string[];
}

export function CreateFolderModal({ isOpen, onClose, onCreateFolder, existingNames }: CreateFolderModalProps) {
```

In `handleCreate`, after the 20-char check and before `onCreateFolder(...)`:

```tsx
    // Spec 2026-11-06: folder names are case-insensitively unique
    // ("History" == "history" == "hiSTory"); reserved names (General…)
    // arrive through this same list.
    if (existingNames?.some((n) => n.trim().toLowerCase() === trimmedName.toLowerCase())) {
      setError("A folder with this name already exists");
      return;
    }
```

(Error UI already exists — `setError` renders inline at line 99; `handleCreate` only resets/closes on success, so the modal correctly stays open.)

- [ ] **Step 2: RenameModal — conflict check with self-exclusion**

In `RenameModal.tsx`, extend props, add error state, guard the submit:

```tsx
interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newTitle: string) => void;
  currentTitle: string;
  itemType: string;
  /** Case-insensitive names that block the rename (folders only). The
   *  current title itself is excluded — renaming to a case-variant of
   *  yourself is a harmless no-op (spec 2026-11-06). */
  conflictNames?: string[];
}

export function RenameModal({ isOpen, onClose, onRename, currentTitle, itemType, conflictNames }: RenameModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState("");
```

Replace `handleSubmit`:

```tsx
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = title.trim();
    if (!next || next === currentTitle) {
      onClose();
      return;
    }
    const collides = conflictNames?.some(
      (n) => n.trim().toLowerCase() !== currentTitle.trim().toLowerCase() &&
        n.trim().toLowerCase() === next.toLowerCase()
    );
    if (collides) {
      setError("A folder with this name already exists");
      return;
    }
    onRename(next);
    onClose();
  };
```

Reset error when the input changes (`onChange={(e) => { setTitle(e.target.value); setError(""); }}`) and when `isOpen` flips (in the existing `useEffect`, add `setError("")`). Render under the input (copy the CreateFolderModal error markup):

```tsx
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
```

- [ ] **Step 3: Wire the page** (`app/note/notes/page.tsx`)

`<CreateFolderModal>` (~line 537): add

```tsx
            existingNames={folders.map((f) => f.name)}
```

Folder `<RenameModal>` (~lines 543-548, the one with `itemType="folder"`): add

```tsx
            conflictNames={folders.map((f) => f.name)}
```

(The topic RenameModal at ~549 stays unchanged.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```powershell
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing add components/app/CreateFolderModal.tsx components/app/RenameModal.tsx app/note/notes/page.tsx
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing commit -m @'
feat: web folder create/rename reject case-insensitive duplicates

CreateFolderModal and the folder RenameModal compare against existing names
case-insensitively and keep the modal open with an inline error.

Co-Authored-By: Claude Code <noreply@anthropic.com>
'@
```

---

### Task 6: Web link dedupe — `ContentItem.sourceUrl` + pre-fire check in the hook

**Files:**
- Modify: `lib/types.ts` (ContentItem, line ~147)
- Modify: `hooks/useGenerateContent.ts` (import + helper + pre-check + persist sourceUrl)

**Interfaces:**
- Consumes: `extractYouTubeId`, `normalizeUrlForDedupe` (Task 1)
- Produces: `ContentItem.sourceUrl?: string` — full raw source URL on youtube/url items (consumed by this hook's own dupe scan; legacy items without it simply never match)

- [ ] **Step 1: Add the field** — in `lib/types.ts` `ContentItem`, after `sourceType?: string;`:

```ts
  sourceType?: string;
  /** Full untruncated source URL for youtube/url items (dedupe spec
   *  2026-11-06) — sourceName is display-cut to 50 chars and cannot be
   *  used for matching. */
  sourceUrl?: string;
```

- [ ] **Step 2: Hook — helper + pre-check + persistence**

In `useGenerateContent.ts`, add the import and module-level helper (above the hook):

```ts
import { extractYouTubeId, normalizeUrlForDedupe } from "@/lib/url-dedupe";
```

```ts
/** Dedupe (spec §2): an item this profile already generated from the same
 *  video (any link form) or the same normalized URL. Legacy items without
 *  sourceUrl never match. */
function findExistingSourceItem(profileId: number | string, rawLink: string): ContentItem | null {
  if (typeof window === "undefined") return null;
  let stored: ContentItem[] = [];
  try {
    stored = JSON.parse(localStorage.getItem(`content_${profileId}`) || "[]");
  } catch {
    return null;
  }
  const ytId = extractYouTubeId(rawLink);
  const norm = normalizeUrlForDedupe(rawLink);
  if (!ytId && !norm) return null;
  const matches = (item: ContentItem): boolean => {
    if (!item.sourceUrl) return false;
    if (ytId) return extractYouTubeId(item.sourceUrl) === ytId;
    return normalizeUrlForDedupe(item.sourceUrl) === norm;
  };
  return stored.find(matches) ?? null;
}
```

In `generateContent`, immediately after `if (!profile) return;` (line 40) — **before** the quota check, so opening an existing note can never hit the paywall:

```ts
    // Dedupe (spec §2): a link this profile already generated from never
    // fires a request — open the existing note instead.
    if ((contentType === "youtube" || contentType === "url") && contentInput.trim()) {
      const existing = findExistingSourceItem(profile.id, contentInput.trim());
      if (existing) {
        showToast("Already generated — opening your note", "info");
        router.push(`/note/topic/${existing.sourceId ?? `legacy_${existing.id}`}`);
        return;
      }
    }
```

In each of the three `newItems.push({...})` blocks (note/flashcards/quiz), persist the full URL — add after `sourceType: contentType,`:

```ts
          ...(contentType === "youtube" || contentType === "url"
            ? { sourceUrl: contentInput.trim() }
            : {}),
```

- [ ] **Step 3: Typecheck + tests**

Run: `npx tsc --noEmit; npx -y tsx --test lib/url-dedupe.test.ts`
Expected: no type errors; tests pass.

- [ ] **Step 4: Commit**

```powershell
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing add lib/types.ts hooks/useGenerateContent.ts
git -C e:\Projects\Arasheed\QuickNote\quizlia_landing commit -m @'
feat: web generation blocks duplicate links and opens the existing note

useGenerateContent checks the profile's stored items (by video id or
normalized URL) before firing; ContentItem gains sourceUrl with the full
raw link so future re-pastes can match (legacy items lack it by design).

Co-Authored-By: Claude Code <noreply@anthropic.com>
'@
```

---

### Task 7: Landing full verification

**Files:** none (verification only)

- [ ] **Step 1: All tests**

Run: `npx -y tsx --test lib/url-dedupe.test.ts lib/arcade.test.ts lib/games/match-rush.test.ts`
Expected: all pass (arcade/match-rush are the pre-existing suites — confirm no regression).

- [ ] **Step 2: Lint + typecheck + production build**

Run: `npm run lint; npx tsc --noEmit; npm run build`
Expected: lint clean, no type errors, build succeeds. (This build is what Netlify deploys — main already carries Tasks 1-6 via auto-deploy.)

- [ ] **Step 3: Live smoke (post-deploy)**

Wait ~2 min for the Netlify auto-deploy, then generate twice from the same web URL on https://www.quizliai.com (any signed-in profile): the second generate should return in ~1-2 s and the Netlify function log line should read `cache=1` with `source: "url"`. If the log stream is unavailable (no CLI token on this machine), verify by response time alone; a miss is ~11-18 s.

---

### Task 8: iOS — `SourceLinkMatcher` + `folderExists` + `findExistingNote` in DatabaseManger

**Files:**
- Modify: `QuickNote/Database/DatabaseManger.swift` (folder section after `fetchFolders`, ~line 244; new extension at file end, after the `saveAIResponse` extension)

**Interfaces:**
- Produces (used by Tasks 9, 10): `folderExists(profileId:name:excludingFolderId:) -> Bool`, `findExistingNote(profileId:link:) -> DocumentModel?`, `SourceLinkMatcher.youtubeId(from:) -> String?`, `SourceLinkMatcher.normalizeUrl(_:) -> String?`

⚠️ Repo switch: all remaining tasks run in `e:\Projects\Arasheed\QuickNote\QuickNote`.

- [ ] **Step 1: Create the iOS feature branch**

```powershell
git -C e:\Projects\Arasheed\QuickNote\QuickNote checkout -b feature/dedupe-folders-links
```

(Never push — AR's OK is required before iOS origin/main changes.)

- [ ] **Step 2: Add `folderExists`** — in `DatabaseManger.swift`, after `fetchFolders(forProfileId:)` (ends line 244):

```swift
    // MARK: - Folder name dedupe (spec 2026-11-06)
    /// Case-insensitive collision check: "History" == "history" == "hiSTory".
    /// The hidden General bucket and legacy "From Web" arrive through the
    /// same folder list, so reserved names are blocked too.
    /// `excludingFolderId` lets the rename path allow a no-op case-variant
    /// of the folder's own name.
    func folderExists(profileId: Int, name: String, excludingFolderId: Int? = nil) -> Bool {
        let key = name.trimmingCharacters(in: .whitespaces).lowercased()
        guard !key.isEmpty else { return false }
        return fetchFolders(forProfileId: profileId).contains {
            $0.id != excludingFolderId &&
            $0.folderName.trimmingCharacters(in: .whitespaces).lowercased() == key
        }
    }
```

- [ ] **Step 3: Add link matching + dupe lookup** — new extension at the end of `DatabaseManger.swift`:

```swift
// MARK: - Source link matching (dedupe spec 2026-11-06)
/// Pure link parsing for the duplicate-generation check — mirrors
/// lib/url-dedupe.ts on web/server so a link matches across platforms.
/// YouTube ids are case-SENSITIVE (platform rule); folder names are the
/// case-insensitive thing (see folderExists above).
enum SourceLinkMatcher {
    private static let ytIdRegex = "^[A-Za-z0-9_-]{11}$"

    private static func isYtId(_ s: String) -> Bool {
        s.range(of: ytIdRegex, options: .regularExpression) != nil
    }

    /// 11-char video id from any common form: bare id, watch?v=, youtu.be,
    /// /shorts/ /embed/ /live/ /v/, m.youtube.com; t=/si= junk ignored.
    static func youtubeId(from link: String) -> String? {
        let trimmed = link.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        if isYtId(trimmed) { return trimmed }
        guard let url = URL(string: trimmed),
              let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https",
              let host = url.host?.lowercased() else { return nil }
        let bare = host.hasPrefix("www.") || host.hasPrefix("m.")
            ? String(host.split(separator: ".", maxSplits: 1, omittingEmptySubsequences: false)[1...].joined(separator: "."))
            : host
        if bare == "youtu.be" {
            let seg = url.path.split(separator: "/").first.map(String.init) ?? ""
            return isYtId(seg) ? seg : nil
        }
        if bare == "youtube.com" || bare.hasSuffix(".youtube.com") {
            let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
            if let v = items.first(where: { $0.name == "v" })?.value, isYtId(v) { return v }
            let segs = url.path.split(separator: "/").map(String.init)
            if segs.count >= 2, ["shorts", "embed", "live", "v"].contains(segs[0]), isYtId(segs[1]) {
                return segs[1]
            }
        }
        return nil
    }

    /// Canonical non-YouTube web URL: lowercase host, no www., no default
    /// port, no #fragment, tracking params dropped, remaining params sorted
    /// (decoded join — both sides of every comparison go through this same
    /// function), trailing "/" dropped. nil when not an http(s) URL.
    static func normalizeUrl(_ link: String) -> String? {
        let trimmed = link.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let comps = URLComponents(string: trimmed),
              let scheme = comps.scheme?.lowercased(), scheme == "http" || scheme == "https",
              let rawHost = comps.host?.lowercased() else { return nil }
        var host = rawHost.hasPrefix("www.") ? String(rawHost.dropFirst(4)) : rawHost
        if let port = comps.port,
           !((scheme == "http" && port == 80) || (scheme == "https" && port == 443)) {
            host += ":\(port)"
        }
        var path = comps.path
        while path.count > 1 && path.hasSuffix("/") { path.removeLast() }
        if path == "/" { path = "" }
        let tracking: Set<String> = ["fbclid", "gclid", "igshid", "mc_cid", "mc_eid",
                                     "ref", "ref_src", "ref_url"]
        let kept = (comps.queryItems ?? [])
            .filter { !$0.name.lowercased().hasPrefix("utm_") && !tracking.contains($0.name.lowercased()) }
            .map { ($0.name, $0.value ?? "") }
            .sorted { $0.0 == $1.0 ? $0.1 < $1.1 : $0.0 < $1.0 }
        var out = "\(scheme)://\(host)\(path)"
        if !kept.isEmpty {
            out += "?" + kept.map { "\($0.0)=\($0.1)" }.joined(separator: "&")
        }
        return out
    }
}

extension DatabaseManager {
    /// Dupe check (spec §2): an existing note generated from the same
    /// YouTube video (any link form) or the same normalized web URL.
    /// YouTube/website notes store the full raw link in contentPath.
    func findExistingNote(profileId: Int, link: String) -> DocumentModel? {
        let docs = fetchDocuments(profileId: profileId)
        if let ytId = SourceLinkMatcher.youtubeId(from: link) {
            return docs.first {
                $0.contentType.lowercased() == "youtube" &&
                SourceLinkMatcher.youtubeId(from: $0.contentPath) == ytId
            }
        }
        if let norm = SourceLinkMatcher.normalizeUrl(link) {
            return docs.first {
                $0.contentType.lowercased() == "website" &&
                SourceLinkMatcher.normalizeUrl($0.contentPath) == norm
            }
        }
        return nil
    }
}
```

- [ ] **Step 4: Commit** (review-verified only — no compiler on this machine)

```powershell
git -C e:\Projects\Arasheed\QuickNote\QuickNote add QuickNote/Database/DatabaseManger.swift
git -C e:\Projects\Arasheed\QuickNote\QuickNote commit -m @'
feat: folderExists + SourceLinkMatcher + findExistingNote (dedupe spec)

Case-insensitive folder collision check (self-exclusion for rename), pure
YouTube-id/URL normalization mirroring lib/url-dedupe.ts, and a per-profile
lookup of an existing note generated from the same link.

Co-Authored-By: Claude Code <noreply@anthropic.com>
'@
```

---

### Task 9: iOS — folder guards on the three creation/rename paths

**Files:**
- Modify: `QuickNote/ViewController/CreateFolderViewController.swift` (~line 108, before `insertFolder`)
- Modify: `QuickNote/ViewController/NoteMoreViewController.swift` (~line 167, inside the Add action)
- Modify: `QuickNote/ViewController/EditFolderViewController.swift` (~line 66, before `if let folderId`)

**Interfaces:**
- Consumes: `DatabaseManager.folderExists(profileId:name:excludingFolderId:)` (Task 8), localized key `kFolderNameExists` (added in Task 11 — same PR, order within it is free)

- [ ] **Step 1: CreateFolderViewController** — after the `profileId`/`createdAt` definitions (line ~109), before `insertFolder`:

```swift
        // Spec 2026-11-06: folder names are case-insensitively unique
        // ("History" == "history" == "hiSTory")
        if DatabaseManager.shared.folderExists(profileId: profileId, name: folderName) {
            self.view.makeToast("kFolderNameExists".localized(), duration: 2.0, position: .bottom)
            return
        }
```

- [ ] **Step 2: NoteMoreViewController.addFolder** — inside the Add action (line ~167), after the non-empty guard:

```swift
            if let folderName = alert.textFields?.first?.text, !folderName.isEmpty {
                // Spec 2026-11-06: case-insensitive duplicate folder names
                if DatabaseManager.shared.folderExists(profileId: Appconstants.isSelectedProfileIndexPersistent, name: folderName) {
                    self.view.makeToast("kFolderNameExists".localized(), duration: 2.0, position: .bottom)
                    return
                }
                let success = DatabaseManager.shared.insertFolder(
```

- [ ] **Step 3: EditFolderViewController rename** — in `btnEditFolder`'s save action, after the length checks (line ~65), before `if let folderId = self.FolderId`:

```swift
            // Spec 2026-11-06: reject case-insensitive collisions with OTHER
            // folders (own case-variant is a harmless no-op rename)
            if DatabaseManager.shared.folderExists(profileId: Appconstants.isSelectedProfileIndexPersistent,
                                                   name: folderName,
                                                   excludingFolderId: self.FolderId) {
                self.view.makeToast("kFolderNameExists".localized(), duration: 2.0, position: .bottom)
                return
            }
```

- [ ] **Step 4: Commit**

```powershell
git -C e:\Projects\Arasheed\QuickNote\QuickNote add QuickNote/ViewController/CreateFolderViewController.swift QuickNote/ViewController/NoteMoreViewController.swift QuickNote/ViewController/EditFolderViewController.swift
git -C e:\Projects\Arasheed\QuickNote\QuickNote commit -m @'
feat: folder create/rename paths reject case-insensitive duplicates

Toast + dialog stays open on collision; rename allows a case-variant of the
folder's own name via excludingFolderId.

Co-Authored-By: Claude Code <noreply@anthropic.com>
'@
```

---

### Task 10: iOS — dupe-open at the two CreateNoteViewController seams

**Files:**
- Modify: `QuickNote/ViewController/CreateNoteViewController.swift` (new extension; guard in `select(source:)` isCompleted ~line 84; guard in `runShared(_:)` `.url` case ~line 625)

**Interfaces:**
- Consumes: `DatabaseManager.findExistingNote(profileId:link:)` (Task 8), keys `kAlreadyGeneratedTitle`/`kAlreadyGeneratedMsg`/`kOpen` (Task 11)

The two seams are the only places a link becomes a generation: `select(source:)`'s `PasteYoutubeViewController.isCompleted` (YouTube tile 0 and web tile 3), and `runShared` (share extension). `AiResponseViewController`'s back button pops, so it must be **pushed** on the presenting navigation stack, not presented — capture `presentingViewController` before dismissing self.

- [ ] **Step 1: Add the helper extension** (end of `CreateNoteViewController.swift`, next to the existing `runShared` extension):

```swift
// MARK: - Duplicate link guard (dedupe spec 2026-11-06)
extension CreateNoteViewController {
    /// The profile's existing note for this exact video/URL, if any.
    func duplicateNote(for link: String) -> DocumentModel? {
        DatabaseManager.shared.findExistingNote(
            profileId: Appconstants.isSelectedProfileIndexPersistent,
            link: link
        )
    }

    /// Block + open existing (approved decision): no loader, no request,
    /// no quota consumption. AiResponseViewController must be pushed (its
    /// back button pops), so dismiss this flow first and push on the
    /// presenter's navigation stack.
    func openExistingNote(_ document: DocumentModel) {
        showalertWithTitleAndMessage(
            title: "kAlreadyGeneratedTitle".localized(),
            message: "kAlreadyGeneratedMsg".localized(),
            options: "kOpen".localized(),
            alertStyle: .alert,
            sender: self.view
        ) { [weak self] _ in
            guard let self = self else { return }
            let push = self.storyboard?.instantiateViewController(
                withIdentifier: "AiResponseViewController") as! AiResponseViewController
            push.Currentdocument = document
            let presenter = self.presentingViewController
            self.dismiss(animated: false) {
                presenter?.navigationController?.pushViewController(push, animated: true)
            }
        }
    }
}
```

- [ ] **Step 2: Guard seam 1** — in `select(source:)`, first lines of `isPresent.isCompleted = { getLink in` (line ~84), before the Loader instantiation:

```swift
                isPresent.isCompleted = { getLink in
                    // Spec 2026-11-06: never regenerate from a link this
                    // profile already has a note for — open the existing one.
                    if let existing = self.duplicateNote(for: getLink) {
                        self.openExistingNote(existing)
                        return
                    }
                    let isPresent = self.storyboard?.instantiateViewController(withIdentifier: "LoaderViewController")as!LoaderViewController
```

- [ ] **Step 3: Guard seam 2** — in `runShared(_:)`, `.url` case (line ~625):

```swift
        case .url:
            // Spec 2026-11-06: share-extension links get the same dupe guard
            if let existing = duplicateNote(for: item.value) {
                openExistingNote(existing)
                return
            }
            loader.isSelecteMode = ShareInbox.isYouTube(item.value) ? .youtubeLink : .websiteLink
            loader.isYoutubeLink = item.value
```

- [ ] **Step 4: Commit**

```powershell
git -C e:\Projects\Arasheed\QuickNote\QuickNote add QuickNote/ViewController/CreateNoteViewController.swift
git -C e:\Projects\Arasheed\QuickNote\QuickNote commit -m @'
feat: duplicate YouTube/URL links open the existing note instead of regenerating

Both link seams (paste sheet + share extension) check findExistingNote
before presenting the Loader; on a hit an alert offers Open, which pushes
AiResponseViewController on the presenting nav stack.

Co-Authored-By: Claude Code <noreply@anthropic.com>
'@
```

---

### Task 11: iOS — localized strings (7 languages)

**Files:**
- Modify: `QuickNote/en.lproj/Localizable.strings`, and the same block in `ru`, `zh-Hans`, `ja`, `pt-BR`, `es`, `fr` `.lproj/Localizable.strings`

**Interfaces:**
- Produces keys consumed by Tasks 9-10: `kFolderNameExists`, `kAlreadyGeneratedTitle`, `kAlreadyGeneratedMsg`, `kOpen`

- [ ] **Step 1: Add the four keys to each of the 7 files** (keep surrounding alphabetical/section order; format `"key" = "value";`)

| key | en | ru | zh-Hans | ja | pt-BR | es | fr |
|---|---|---|---|---|---|---|---|
| `kFolderNameExists` | A folder with this name already exists | Папка с таким названием уже существует | 已存在同名文件夹 | 同じ名前のフォルダーが既に存在します | Já existe uma pasta com esse nome | Ya existe una carpeta con ese nombre | Un dossier avec ce nom existe déjà |
| `kAlreadyGeneratedTitle` | Already generated | Уже сгенерировано | 已生成过 | 既に生成済み | Já gerado | Ya generado | Déjà généré |
| `kAlreadyGeneratedMsg` | You already have a note from this link. | У вас уже есть заметка по этой ссылке. | 您已有来自此链接的笔记。 | このリンクのノートは既にあります。 | Você já tem uma nota deste link. | Ya tienes una nota de este enlace. | Vous avez déjà une note de ce lien. |
| `kOpen` | Open | Открыть | 打开 | 開く | Abrir | Abrir | Ouvrir |

```powershell
# en.lproj/Localizable.strings (append near the other folder keys, e.g. after kFolderNameMust3)
"kFolderNameExists" = "A folder with this name already exists";
"kAlreadyGeneratedTitle" = "Already generated";
"kAlreadyGeneratedMsg" = "You already have a note from this link.";
"kOpen" = "Open";
```

(Repeat per language with the table's value column; the files are UTF-8 — preserve encoding and BOM state on save.)

- [ ] **Step 2: Commit**

```powershell
git -C e:\Projects\Arasheed\QuickNote\QuickNote add QuickNote/*.lproj/Localizable.strings
git -C e:\Projects\Arasheed\QuickNote\QuickNote commit -m @'
feat: localized strings for folder-dupe and link-dupe alerts (7 languages)

kFolderNameExists, kAlreadyGeneratedTitle, kAlreadyGeneratedMsg, kOpen.

Co-Authored-By: Claude Code <noreply@anthropic.com>
'@
```

---

### Task 12: Xcode verification checklist (human gate — Swift cannot compile on this machine)

**Files:** none (verification + handoff)

- [ ] **Step 1: Build** — open `QuickNote.xcworkspace` in Xcode on the Mac, build for iOS simulator. Fix any compile errors on `feature/dedupe-folders-links` (all changes from Tasks 8-11).

- [ ] **Step 2: Manual test script** (simulator, any profile):

1. Create folder "History" → try to create "history" → toast `A folder with this name already exists`, sheet stays open; "hiSTory" also blocked.
2. Rename "Science" → "HISTORY" → blocked; rename "History" → "HISTORY" → allowed (self case-variant).
3. Generate from a YouTube link → paste the same video as `youtu.be/<id>` → alert "Already generated" → Open → the existing note opens; no loader, no quota decrement.
4. Same with a website URL, second paste with `?utm_source=test` appended → still opens the existing note.
5. A link only generated under ANOTHER profile still generates (per-profile scope).
6. Web app (quizliai.com): duplicate folder names blocked in create + rename modals; re-pasting a generated URL/YouTube link shows the toast and navigates to `/note/topic/<id>`.

- [ ] **Step 3: AR handoff** — iOS branch `feature/dedupe-folders-links` stays local until AR approves the merge to origin/main (standing rule). Landing work is already live via auto-deploy from Tasks 1-7.

---

## Self-Review (done at plan time)

- **Spec coverage:** §1 folder dedupe → Tasks 5, 8, 9 (+ ListingFolder correction folded into Task 1's commit); §2 client block+open → Tasks 6, 10; §3 server URL cache → Tasks 2, 3, 4; testing §Testing → Tasks 1, 7, 12; non-goals untouched. ✅
- **Placeholders:** none — every step carries complete code or an exact command. ✅
- **Type consistency:** `folderExists(profileId:name:excludingFolderId:)` used identically in Tasks 8→9; `findExistingNote(profileId:link:)` 8→10; `studyPackLinkKey`/`getCachedStudyPackForLink`/`putCachedStudyPackForLink` 2→3/4; `extractYouTubeId`/`normalizeUrlForDedupe` 1→2/6; `existingNames` 5→page; `sourceUrl` 6 (types + hook). ✅
