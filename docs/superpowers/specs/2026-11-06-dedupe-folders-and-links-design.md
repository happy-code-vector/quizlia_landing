# Dedupe: case-insensitive folder names + link-based generation dedupe

- **Date:** 2026-11-06
- **Status:** Design approved by Kevin (2026-11-06)
- **Repos:** `quizlia_landing` (web client + Netlify server routes), `QuickNote` (iOS app)
- **Feature branch:** to be created from `main` in each repo at implementation time

## Problem

1. **Folders can duplicate by case.** No folder-creation path checks for an
   existing name — `History`, `history`, and `hiSTory` coexist as three folders.
   - iOS: `CreateFolderViewController` (`btnCreateFolder`), `NoteMoreViewController.addFolder`,
     `ListingFolderNoteViewController` all call `DatabaseManager.insertFolder` raw;
     the rename path in `EditFolderViewController` has the same hole.
   - Web: `CreateFolderModal` validates length only; `handleCreateFolder` in
     `app/note/notes/page.tsx` appends unconditionally; `handleRenameFolder` likewise.
2. **Repeat generations from the same link waste AI budget.**
   - Server caches YouTube study packs globally by video ID (`generationCache`,
     key `pack:{videoId}:…`) — but **web-article URLs have no cache**, so the same
     article pasted twice (by anyone) is a full paid generation each time.
   - Neither client checks "you already generated from this link" before firing.
     Even a YouTube cache hit creates a **second copy** of note/flashcards/quiz
     in the user's library.

## Approved decisions

| Decision | Choice |
|---|---|
| Same link pasted again | **Block + open the existing note** (no request fires) |
| Folder name collision | Reject with error message; dialog stays open |
| Server URL pack cache | **Yes** — cross-account budget guard, mirrors video-ID cache |
| Case sensitivity | Folder names: insensitive. YouTube video IDs: **sensitive** (IDs are case-significant) |
| Dedupe scope | Per profile (notes live per profile on both platforms) |
| Server cache scope | Global, like the video pack cache today |

## 1. Folder name dedupe (case-insensitive)

**Rule:** reject a create/rename if any folder in the same profile has the same
name after `trim().lowercased()`. Reserved names count as taken: anything
`general…`-prefixed (the hidden General bucket) and `From Web` (legacy catch-all).

### iOS

- Add `folderExists(profileId:name:excludingFolderId:) -> Bool` to `DatabaseManger`
  — compares `folderName.lowercased()` after trimming.
- Guard three paths: `CreateFolderViewController`, `NoteMoreViewController.addFolder`,
  and rename in `EditFolderViewController`.
  On collision: toast (localized), dialog stays open.
  (Correction 2026-11-06: `ListingFolderNoteViewController` was first listed here —
  its `insertFolder` call is the hidden-General bootstrap and already checks for
  existence, so it needs no guard.)
- **Sync paths untouched** — `QuizliSyncManager`'s merge already compares
  lowercased (lines ~1030, ~1138); `insertFolder` itself stays permissive so
  remote mirroring never breaks.

### Web

- Pass existing folder names into `CreateFolderModal`; it rejects a
  case-insensitive duplicate using its existing inline-error UI (same style as
  the 3–20 length checks). Modal stays open on error.
- Same guard in `handleRenameFolder` (`app/note/notes/page.tsx`).

**Non-goal:** auto-merging folders that already exist as case-variants — user
deletes those manually.

## 2. Link dedupe — client blocks before any request fires

### "Same source" definition (shared by all three code paths)

1. **YouTube:** extract the 11-char video ID (`[A-Za-z0-9_-]{11}`), case-sensitive,
   from any of: `youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`,
   `/live/`, `m.youtube.com` variants; `&t=30s` / `?si=` params ignored.
   If the link looks like YouTube but no ID extracts → treat as *unmatched*
   (never block on a guess).
2. **Web URL:** normalize, then compare for equality:
   - require `http(s)://` (else unmatched)
   - lowercase host; strip leading `www.`; drop default ports (80/443)
   - drop `#fragment`
   - drop tracking params: `utm_*` (prefix), `fbclid`, `gclid`, `igshid`,
     `mc_cid`, `mc_eid`, `ref`, `ref_src`, `ref_url`
   - sort remaining query params (key, then value)
   - strip trailing `/` from the path (unless path is `/`)

A YouTube check runs **first** everywhere; the URL normalizer is only for
non-YouTube links.

### iOS

- At submit time — before `LoaderViewController` fires / before
  `QuicNotesService.generate` is called — compare the pasted link against
  existing documents of the profile (`contentType` `youtube` / `website`;
  their `contentPath` already stores the full raw link).
- On match: localized alert "You already have a note from this" with **Open**
  → dismiss the flow and push the existing note via the established
  `AiResponseViewController` pattern (as `HomeViewController` does).

### Web

- In `useGenerateContent`, same check before the `fetch`: compare against the
  profile's stored items of `sourceType` `youtube`/`url`.
- **Schema addition:** `ContentItem.sourceUrl?: string` (full raw URL) — today
  only `sourceName` exists and it is truncated to 50 chars, so the full link is
  unrecoverable. New items (youtube + url sources) persist `sourceUrl`.
  **Legacy gap:** old items without `sourceUrl` cannot block a re-paste
  (truncated `sourceName` is not a reliable key); accepted as a one-time regen
  possibility for pre-existing notes.
- On match: toast "Already generated — opening your note" and navigate to the
  note's detail view (same destination as clicking it in the notes list).

## 3. Server URL pack cache — the budget saver

Mirrors the existing video pack cache (`lib/pack-cache.ts`,
`generationCache` collection, 7-day TTL, hit counters, never throws):

- **Key:** `packurl:{sha256(normalizedUrl)}:v{STUDY_PACK_PROMPT_VERSION}`
  (hash because Firestore doc IDs cannot contain `/` etc.; version const shared
  with video packs so prompt changes retire both caches together).
- **Read before quota/metering** (same precedence as the video cache — hits are
  free, no credit, no model call):
  - `/api/generate`: after the existing YouTube branch, when `type === "study_pack"`
    and a clean non-YouTube URL extracts from the content (strip the
    `Analyze the following link: ` prefix both platforms send).
  - `/api/ios/gemini/[purpose]`: same, next to the existing `video/youtube`
    pre-check (iOS sends the identical wording — `LoaderViewController.websiteLinkGetoutput`).
- **Write after a successful generation** of a URL-sourced pack.
- **One shared TS module** `lib/url-dedupe.ts` — pure functions
  (`extractYouTubeId`, `normalizeUrlForDedupe`, `urlCacheKey`), no server-only
  imports — used by the web client hook **and** both server routes. iOS gets a
  small equivalent pure helper in Swift (reuse any existing extractor if found).

## Error handling

- Folder collision: localized toast / inline error, dialog stays open. No data written.
- Duplicate link: alert with Open (→ existing note) / dismiss. No request fires.
- URL cache read/write failures never break generation (same fail-open policy
  as `pack-cache.ts`).
- A YouTube URL that fails ID extraction: no block, no URL-cache key — falls
  through to today's behavior.

## Testing

- **Unit (landing, vitest):** `normalizeUrlForDedupe` (scheme/www/tracking-param/
  sort/trailing-slash/case-host cases), `extractYouTubeId` (all URL forms,
  `t=`/`si=` junk, case-sensitivity, non-YouTube input → null),
  `urlCacheKey` (stable, no `/`), folder-name collision helper.
- **Route:** `/api/generate` — URL pack served from cache without metering;
  cache write on miss; YouTube branch unaffected.
- **Web component:** CreateFolderModal rejects `history` when `History` exists
  (modal stays open); rename guard.
- **Web hook:** `useGenerateContent` blocks on stored `sourceUrl` match and
  navigates; fires normally on miss.
- **iOS:** Swift is not compiled on this Windows machine — cover pure helper
  logic with the spec's cases, then verify in Xcode (build + manual: case-dup
  folder toast, dupe YouTube link opens existing note, dupe web link same,
  rename collision). iOS commits follow the AR-OK-before-main rule.

## Non-goals

- Auto-merging existing case-variant folders.
- Dedupe for `pdf` / `image` / `text` sources (no stable external ID).
- Caching iOS single-artifact (flashcards-only / quiz-only) video generations.
- Changing the pre-existing behavior that child-variant packs cache under the
  adult key (consistent read/write today; separate concern).
