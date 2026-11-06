# Game Arcade Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include the 5 games from `game site/` into quizlia_landing as an in-app Arcade (real decks from user notes) plus a public lead-gen `/arcade` page — with ZERO edits to the game components.

**Architecture:** Copy the game modules byte-identical into `components/games/` + `lib/games/`, then build host code around them: a deck resolver (localStorage content store → game `Deck`), a `GameHost` event wrapper, `/note/play/*` + `/note/arcade` in-app pages, a topic-page Play picker, and public `/arcade` + `/arcade/[game]` demo pages.

**Tech Stack:** Next 16 App Router, React 19, Tailwind, existing localStorage content store (`content_{profileId}`), node:test for unit tests.

## Global Constraints

- **Zero changes to game code**: `components/games/{MatchRush,MemoryFlip,QuizRun,TrueFalseSprint,AnswerSnake}.tsx` and `lib/games/{types,bridge,sound,deck,theme.css,fixtures/}` are copied byte-identical and never edited. All new code lives in NEW files (hosts, wrappers, pages).
- **No new npm dependencies.** `lucide-react`, `motion`, and the PNGs from `game site/` are unreferenced — do not copy them.
- **No server writes / no quota metering** for games in v1.
- Bridge behavior note (deviation from spec, discovered in planning): `lib/games/bridge.ts` `closeGame()` already calls `window.history.back()` on web — the host must NOT navigate on `close` (would go back twice). Hosts only LOG `result` events.
- Games self-guard tiny decks (`deck.cards.length < 4` → internal "empty" phase). Hosts always render the game with whatever deck they resolved; no host-side minimum-card check.
- Repo: `e:\Projects\Arasheed\QuickNote\quizlia_landing` (all paths below are relative to it). Commit style: `feat|fix|refactor: ...` + `Co-Authored-By: Claude Code <noreply@anthropic.com>` trailer.

---

### Task 1: Move the game modules into the repo

**Files:**
- Create: `components/games/MatchRush.tsx`, `MemoryFlip.tsx`, `QuizRun.tsx`, `TrueFalseSprint.tsx`, `AnswerSnake.tsx` (byte-identical copies)
- Create: `lib/games/types.ts`, `bridge.ts`, `sound.ts`, `deck.ts`, `theme.css`, `match-rush.test.ts`, `fixtures/sample-deck.json` (byte-identical copies)
- Delete: `game site/` (after copies verify)

**Interfaces:**
- Produces (for later tasks): default-exported game components each taking `{ deck: StudyDeck }`; `loadDeck(noteId?, profileId?, mock?)` from `@/lib/games/deck`; `StudyDeck`/`Flashcard` types from `@/lib/games/types`; CSS vars from `@/lib/games/theme.css` (`--game-bg`, `--game-text`, …).

- [ ] **Step 1: Copy the game code (games, libs, fixture — nothing else)**

```powershell
Set-Location "e:\Projects\Arasheed\QuickNote\quizlia_landing"
New-Item -ItemType Directory -Force components\games, lib\games\fixtures | Out-Null
Copy-Item "game site\components\games\*.tsx" components\games\
Copy-Item "game site\lib\games\types.ts","game site\lib\games\bridge.ts","game site\lib\games\sound.ts","game site\lib\games\deck.ts","game site\lib\games\theme.css","game site\lib\games\match-rush.test.ts" lib\games\
Copy-Item "game site\lib\games\fixtures\sample-deck.json" lib\games\fixtures\
```

Do NOT copy: `app/` shims (rewritten in Task 3), `src/`, `index.html`, `vite.config.ts`, `package.json`, `tsconfig.json`, `metadata.json`, `.aistudio/`, PNGs.

- [ ] **Step 2: Verify the copies are byte-identical and the unit test passes**

```powershell
git status --short   # the new files appear untracked
npx -y tsx --test lib/games/match-rush.test.ts
```

Expected: `pass 2, fail 0` (node:test summary). If `tsx` can't run, `npx -y tsx lib/games/match-rush.test.ts` (older tsx runs node:test inline).

- [ ] **Step 3: Typecheck**

```powershell
node node_modules\typescript\bin\tsc --noEmit
```

Expected: exit 0 (game files are self-contained TS).

- [ ] **Step 4: Remove the source folder and commit**

```powershell
Remove-Item -Recurse -Force "game site"
git add components/games lib/games
git commit -m "feat: copy game modules in byte-identical (5 games + libs)"
```

---

### Task 2: Arcade registry + deck builder (TDD)

**Files:**
- Create: `lib/arcade.ts`
- Test: `lib/arcade.test.ts`

**Interfaces:**
- Consumes: `StudyDeck` from `@/lib/games/types`.
- Produces (used by Tasks 3–6):
  - `type GameSlug = "match" | "memory" | "run" | "snake" | "truefalse"`
  - `const GAMES: { slug: GameSlug; name: string; tagline: string; icon: string; accent: string }[]`
  - `type ContentItem = { sourceId: string; sourceName?: string; title?: string; type: string; data?: { flashcards?: { question: string; answer: string }[] } & Record<string, unknown> }`
  - `buildDeckFromContent(noteId: string, profileId: string, items: ContentItem[]): StudyDeck`
  - `topicsWithFlashcards(items: ContentItem[]): { id: string; title: string }[]`

- [ ] **Step 1: Write the failing test**

```ts
// lib/arcade.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildDeckFromContent, topicsWithFlashcards, GAMES, type ContentItem } from "./arcade";

const items: ContentItem[] = [
  { sourceId: "t1", sourceName: "Photosynthesis", type: "notes", data: { title: "Photosynthesis" } },
  { sourceId: "t1", type: "flashcards", data: { flashcards: [
    { question: "Q1", answer: "A1" },
    { question: "Q2", answer: "A2" },
    { question: "Q3", answer: "A3" },
    { question: "Q4", answer: "A4" },
  ] } },
  { sourceId: "t2", sourceName: "No-cards note", type: "notes" },
  { sourceId: "t3", title: "Fallback title", type: "flashcards", data: { flashcards: [{ question: "Q", answer: "A" }] } },
];

test("buildDeckFromContent maps flashcards to a game deck", () => {
  const deck = buildDeckFromContent("t1", "7", items);
  assert.equal(deck.noteId, "t1");
  assert.equal(deck.profileId, "7");
  assert.equal(deck.title, "Photosynthesis");
  assert.equal(deck.cards.length, 4);
  assert.deepEqual(deck.cards[0], { id: "t1-0", term: "Q1", definition: "A1" });
});

test("buildDeckFromContent with no flashcards item yields an empty deck (game shows its own empty state)", () => {
  const deck = buildDeckFromContent("t2", "7", items);
  assert.equal(deck.cards.length, 0);
  assert.equal(deck.title, "No-cards note");
});

test("topicsWithFlashcards lists only topics that have cards, preferring sourceName", () => {
  const topics = topicsWithFlashcards(items);
  assert.deepEqual(topics, [
    { id: "t1", title: "Photosynthesis" },
    { id: "t3", title: "Fallback title" },
  ]);
});

test("registry exposes all five games with unique slugs", () => {
  assert.equal(GAMES.length, 5);
  assert.equal(new Set(GAMES.map((g) => g.slug)).size, 5);
});
```

- [ ] **Step 2: Run it and verify it fails**

```powershell
npx -y tsx --test lib/arcade.test.ts
```

Expected: FAIL — cannot resolve `./arcade`.

- [ ] **Step 3: Implement `lib/arcade.ts`**

```ts
import type { StudyDeck } from "@/lib/games/types";

export type GameSlug = "match" | "memory" | "run" | "snake" | "truefalse";

export const GAMES: {
  slug: GameSlug;
  name: string;
  tagline: string;
  icon: string;
  accent: string; // tailwind gradient classes for the card
}[] = [
  { slug: "match", name: "Match Rush", tagline: "Pair each term with its definition before the round timer runs out.", icon: "🎲", accent: "from-purple-600 to-fuchsia-500" },
  { slug: "memory", name: "Memory Flip", tagline: "Flip tiles, remember positions, and clear every pair.", icon: "🃏", accent: "from-sky-500 to-indigo-500" },
  { slug: "run", name: "Quiz Run", tagline: "A nonstop quiz sprint through your deck — one card at a time.", icon: "🏃", accent: "from-emerald-500 to-teal-500" },
  { slug: "snake", name: "Answer Snake", tagline: "Steer the snake into the correct answer and keep growing.", icon: "🐍", accent: "from-lime-500 to-green-600" },
  { slug: "truefalse", name: "True or False", tagline: "Snap judgments, statement by statement. How fast can you go?", icon: "⚡", accent: "from-amber-500 to-orange-500" },
];

export function isGameSlug(v: string): v is GameSlug {
  return GAMES.some((g) => g.slug === v);
}

export type ContentItem = {
  sourceId: string;
  sourceName?: string;
  title?: string;
  type: string;
  data?: { flashcards?: { question: string; answer: string }[] } & Record<string, unknown>;
};

/** Maps a topic's stored flashcards (same store the topic page reads) to
 *  the game Deck shape. Topics without a flashcards item produce an empty
 *  deck — games render their own "not enough cards" state. */
export function buildDeckFromContent(
  noteId: string,
  profileId: string,
  items: ContentItem[]
): StudyDeck {
  const topicItems = items.filter((i) => i.sourceId === noteId);
  const flashItem = topicItems.find(
    (i) => i.type === "flashcards" && Array.isArray(i.data?.flashcards)
  );
  const cards = (flashItem?.data?.flashcards ?? []).map((f, i) => ({
    id: `${noteId}-${i}`,
    term: f.question,
    definition: f.answer,
  }));
  const title = topicItems[0]?.sourceName || topicItems[0]?.title || "Your note";
  return { noteId, profileId, title, cards };
}

/** Topics (notes) that have at least one flashcard — the "pick a note" list. */
export function topicsWithFlashcards(items: ContentItem[]): { id: string; title: string }[] {
  const byId = new Map<string, { title: string; has: boolean }>();
  for (const i of items) {
    const cur = byId.get(i.sourceId) ?? { title: i.sourceName || i.title || "Untitled", has: false };
    if (i.sourceName) cur.title = i.sourceName;
    else if (i.title) cur.title = i.title;
    if (i.type === "flashcards" && (i.data?.flashcards?.length ?? 0) > 0) cur.has = true;
    byId.set(i.sourceId, cur);
  }
  return [...byId.entries()].filter(([, v]) => v.has).map(([id, v]) => ({ id, title: v.title }));
}
```

- [ ] **Step 4: Run the test — PASS**

```powershell
npx -y tsx --test lib/arcade.test.ts
```

Expected: `pass 4, fail 0`.

- [ ] **Step 5: Commit**

```powershell
git add lib/arcade.ts lib/arcade.test.ts
git commit -m "feat: arcade registry + content-to-deck mapper with tests"
```

---

### Task 3: GameHost wrapper, deck hook, and the five /note/play pages

**Files:**
- Create: `components/games/GameHost.tsx` (ours — the only new file inside the games dir)
- Create: `hooks/use-arcade-deck.ts`
- Create: `app/note/play/match/page.tsx`, `app/note/play/memory/page.tsx`, `app/note/play/run/page.tsx`, `app/note/play/snake/page.tsx`, `app/note/play/truefalse/page.tsx` (replaces the shim copies — written fresh)

**Interfaces:**
- Consumes: `loadDeck` from `@/lib/games/deck`, `buildDeckFromContent`/`ContentItem` from `@/lib/arcade`, `loadProfileContent` from `@/lib/notesSync`, game components from `@/components/games/*`.
- Produces: `<GameHost>{children}</GameHost>` (themed backdrop + `quizli:game` result logging); `useArcadeDeck(noteId?, profileId?, mock?) → { deck: StudyDeck | null }`; routes `/note/play/{slug}?noteId=…&profileId=…[&mock=1]`.

- [ ] **Step 1: Write `components/games/GameHost.tsx`**

```tsx
"use client";
// HOST code (ours), not game logic. The bridge's closeGame() already calls
// window.history.back() on web, so we deliberately do NOT navigate on the
// "close" event — navigating here would go back twice.
import { useEffect, type ReactNode } from "react";
import "@/lib/games/theme.css";

export function GameHost({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onGameEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type?: string; payload?: unknown };
      if (detail?.type === "result") {
        console.debug("[arcade] game result", detail.payload);
      }
    };
    window.addEventListener("quizli:game", onGameEvent);
    return () => window.removeEventListener("quizli:game", onGameEvent);
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--game-bg)] text-[var(--game-text)]">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Write `hooks/use-arcade-deck.ts`**

```ts
"use client";
import { useEffect, useState } from "react";
import { loadDeck } from "@/lib/games/deck";
import { buildDeckFromContent, type ContentItem } from "@/lib/arcade";
import { loadProfileContent } from "@/lib/notesSync";
import type { StudyDeck } from "@/lib/games/types";

/** Resolves the deck for a play page: real topic flashcards when noteId is
 *  present (same localStorage store the topic page reads, same first-visit
 *  cloud-pull + reload behavior), fixture deck otherwise (mock/demo). */
export function useArcadeDeck(
  noteId?: string,
  profileId?: string,
  mock?: string
): { deck: StudyDeck | null } {
  const [deck, setDeck] = useState<StudyDeck | null>(null);

  useEffect(() => {
    if (mock === "1" || !noteId) {
      setDeck(loadDeck(noteId, profileId, mock));
      return;
    }
    const currentProfile = localStorage.getItem("currentProfile");
    if (!currentProfile) {
      setDeck(loadDeck(noteId, profileId, mock));
      return;
    }
    const profileData = JSON.parse(currentProfile);
    const pid = profileId ?? String(profileData.id);
    const stored = localStorage.getItem(`content_${pid}`);
    if (!stored) {
      // First visit on this device: pull the cloud copy, then reload so
      // the deck includes it (mirrors app/note/topic/[id] behavior).
      loadProfileContent(profileData).then((cloud) => {
        if (cloud) window.location.reload();
        else setDeck(loadDeck(noteId, pid, mock));
      });
      return;
    }
    try {
      const items: ContentItem[] = JSON.parse(stored);
      setDeck(buildDeckFromContent(noteId, pid, items));
    } catch {
      setDeck(loadDeck(noteId, pid, mock));
    }
  }, [noteId, profileId, mock]);

  return { deck };
}
```

- [ ] **Step 3: Write the five play pages**

Each page is identical except the imported game component and the JSX element. Create all five:

```tsx
// app/note/play/match/page.tsx
"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GameHost } from "@/components/games/GameHost";
import { useArcadeDeck } from "@/hooks/use-arcade-deck";
import MatchRush from "@/components/games/MatchRush";

function Play() {
  const params = useSearchParams();
  const { deck } = useArcadeDeck(
    params.get("noteId") ?? undefined,
    params.get("profileId") ?? undefined,
    params.get("mock") ?? undefined
  );
  if (!deck) {
    return <div className="flex min-h-dvh items-center justify-center opacity-75">Loading deck…</div>;
  }
  return <MatchRush deck={deck} />;
}

export default function MatchPlayPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--game-bg)]" />}>
      <GameHost>
        <Play />
      </GameHost>
    </Suspense>
  );
}
```

For the other four, same file with these two lines changed:

| File | import | element |
|---|---|---|
| `app/note/play/memory/page.tsx` | `import MemoryFlip from "@/components/games/MemoryFlip";` | `<MemoryFlip deck={deck} />` |
| `app/note/play/run/page.tsx` | `import QuizRun from "@/components/games/QuizRun";` | `<QuizRun deck={deck} />` |
| `app/note/play/snake/page.tsx` | `import AnswerSnake from "@/components/games/AnswerSnake";` | `<AnswerSnake deck={deck} />` |
| `app/note/play/truefalse/page.tsx` | `import TrueFalseSprint from "@/components/games/TrueFalseSprint";` | `<TrueFalseSprint deck={deck} />` |

(Component function names: `MemoryPlayPage`, `RunPlayPage`, `SnakePlayPage`, `TrueFalsePlayPage`.)

- [ ] **Step 4: Manual check on the dev server**

```powershell
npm run dev
# in a browser: http://localhost:3000/note/play/match?mock=1
#   expect: the Match Rush ready screen on the game theme background.
# repeat for /note/play/memory?mock=1, run, snake, truefalse
```

- [ ] **Step 5: Typecheck and commit**

```powershell
node node_modules\typescript\bin\tsc --noEmit
git add components/games/GameHost.tsx hooks/use-arcade-deck.ts app/note/play
git commit -m "feat: game hosts — deck hook + /note/play pages for all five games"
```

---

### Task 4: In-app Arcade hub + sidebar entry

**Files:**
- Create: `app/note/arcade/page.tsx`
- Modify: `components/app/Sidebar.tsx:50-51` (navItems array)

**Interfaces:**
- Consumes: `GAMES`, `topicsWithFlashcards`, `ContentItem` from `@/lib/arcade`; routes from Task 3.
- Produces: route `/note/arcade` (hub); sidebar link labeled "Arcade".

- [ ] **Step 1: Write the hub page**

```tsx
// app/note/arcade/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/app/Sidebar";
import { GAMES, topicsWithFlashcards, type ContentItem, type GameSlug } from "@/lib/arcade";

export default function ArcadePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);
  const [pickerFor, setPickerFor] = useState<GameSlug | null>(null);

  useEffect(() => {
    const currentProfile = localStorage.getItem("currentProfile");
    if (!currentProfile) return;
    const profileData = JSON.parse(currentProfile);
    setProfileId(String(profileData.id));
    const stored = localStorage.getItem(`content_${profileData.id}`);
    if (!stored) return;
    try {
      setTopics(topicsWithFlashcards(JSON.parse(stored)));
    } catch {
      // leave the list empty — demo links still work
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-10">
          <div className="mx-auto max-w-5xl">
            <header className="mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Arcade
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Turn your notes into games. Five ways to drill the same deck.
              </p>
            </header>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {GAMES.map((game) => (
                <div
                  key={game.slug}
                  className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${game.accent} text-2xl`}>
                    {game.icon}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{game.name}</h2>
                  <p className="mt-1 flex-1 text-sm text-gray-600 dark:text-gray-400">{game.tagline}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => setPickerFor(game.slug)}
                      className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      Pick a note
                    </button>
                    <Link
                      href={`/note/play/${game.slug}?mock=1`}
                      className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Demo
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {pickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPickerFor(null)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              Play {GAMES.find((g) => g.slug === pickerFor)?.name} with…
            </h3>
            {topics.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No notes with flashcards yet — generate a note first, or try the demo.
              </p>
            ) : (
              <ul className="space-y-2">
                {topics.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/note/play/${pickerFor}?noteId=${encodeURIComponent(t.id)}&profileId=${profileId ?? ""}`}
                      className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:border-purple-400 hover:bg-purple-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-purple-900/20"
                    >
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the sidebar item**

In `components/app/Sidebar.tsx`, the navItems array (line ~50) becomes:

```ts
    { href: "/note", icon: "home", label: "Dashboard", fill: true },
    { href: "/note/notes", icon: "description", label: "My Notes" },
    { href: "/note/arcade", icon: "sports_esports", label: "Arcade" },
```

- [ ] **Step 3: Manual check**

```powershell
npm run dev
# signed in with a profile: http://localhost:3000/note/arcade
#   expect: 5 cards; Demo launches the game; "Pick a note" lists topics with flashcards.
```

- [ ] **Step 4: Typecheck and commit**

```powershell
node node_modules\typescript\bin\tsc --noEmit
git add app/note/arcade components/app/Sidebar.tsx
git commit -m "feat: in-app arcade hub + sidebar entry"
```

---

### Task 5: Topic-page Play button + game picker

**Files:**
- Create: `components/app/GamePicker.tsx`
- Modify: `app/note/topic/[id]/page.tsx` (flashcards tab header, ~line 690-701)

**Interfaces:**
- Consumes: `GAMES` from `@/lib/arcade`.
- Produces: `<GamePicker noteId={string} profileId={number} onClose={() => void} />` popover.

- [ ] **Step 1: Write the picker component**

```tsx
// components/app/GamePicker.tsx
"use client";
import Link from "next/link";
import { GAMES } from "@/lib/arcade";

export function GamePicker({
  noteId,
  profileId,
  onClose,
}: {
  noteId: string;
  profileId: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Play this note</h3>
        <ul className="space-y-2">
          {GAMES.map((game) => (
            <li key={game.slug}>
              <Link
                href={`/note/play/${game.slug}?noteId=${encodeURIComponent(noteId)}&profileId=${profileId}`}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:border-purple-400 hover:bg-purple-50 dark:border-gray-700 dark:hover:bg-purple-900/20"
              >
                <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${game.accent} text-lg`}>
                  {game.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">{game.name}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{game.tagline}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the Play button to the topic page**

In `app/note/topic/[id]/page.tsx`:

Add imports near the other component imports (after the `QuizStudyMode` import if present, else near `FlashcardStudyMode`):

```tsx
import { GamePicker } from "@/components/app/GamePicker";
```

Add state next to `studyMode` (line ~37):

```tsx
  const [playOpen, setPlayOpen] = useState(false);
```

Replace the flashcards-tab header block (lines ~691-701):

```tsx
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {topic.flashcards.length} Flashcards
                  </h2>
                  <button
                    onClick={() => setStudyMode("flashcards")}
                    className="btn-primary flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">school</span>
                    Study Mode
                  </button>
                </div>
```

with:

```tsx
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {topic.flashcards.length} Flashcards
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPlayOpen(true)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <span className="material-symbols-outlined">sports_esports</span>
                      Play
                    </button>
                    <button
                      onClick={() => setStudyMode("flashcards")}
                      className="btn-primary flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">school</span>
                      Study Mode
                    </button>
                  </div>
                </div>
```

Render the picker just before the component's closing return — next to the other overlays, right after the `studyMode === "quiz"` block (~line 444):

```tsx
  {playOpen && profile && (
    <GamePicker noteId={topicId} profileId={profile.id} onClose={() => setPlayOpen(false)} />
  )}
```

- [ ] **Step 3: Manual check**

```powershell
npm run dev
# open a topic that has flashcards → Flashcards tab → Play → pick a game
#   expect: game runs with THAT topic's cards; the game's back/close returns to the topic page.
```

- [ ] **Step 4: Typecheck and commit**

```powershell
node node_modules\typescript\bin\tsc --noEmit
git add components/app/GamePicker.tsx "app/note/topic/[id]/page.tsx"
git commit -m "feat: per-note Play button with 5-game picker on topic pages"
```

---

### Task 6: Public arcade page, demo routes, marketing nav link

**Files:**
- Create: `app/arcade/page.tsx`
- Create: `app/arcade/[game]/page.tsx`
- Modify: `components/site-header.tsx:5-10` (links array)

**Interfaces:**
- Consumes: `GAMES`, `isGameSlug` from `@/lib/arcade`; `loadDeck` from `@/lib/games/deck`; `SiteHeader`/`SiteFooter` from `@/components/site-header` / `site-footer`; game components; `GameHost`.
- Produces: public routes `/arcade` and `/arcade/{game}` (demo deck + signup CTA).

- [ ] **Step 1: Write the public hub page**

```tsx
// app/arcade/page.tsx
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GAMES } from "@/lib/arcade";

export const metadata = {
  title: "Arcade — QuizliAI",
  description: "Five arcade games built from your notes. Play a demo instantly — no signup.",
};

export default function ArcadePage() {
  return (
    <div className="min-h-screen bg-[#0d0a1a] text-white">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-5 pb-24 md:px-10">
        <section className="flex flex-col items-center pb-16 pt-10 text-center">
          <Image
            src="/mascot/quizliai_mascot_celebrate.webp"
            alt="QuizliAI mascot celebrating"
            width={180}
            height={180}
            priority
            className="mb-6"
          />
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Games that make studying{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              addictive
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/70">
            QuizliAI turns your notes into five arcade games. Try any of them right now on a
            sample deck — no signup, no install.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/arcade/match"
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
            >
              Play now
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-xl border border-white/30 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Play YOUR notes — free
            </Link>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => (
            <Link
              key={game.slug}
              href={`/arcade/${game.slug}`}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/30 hover:bg-white/10"
            >
              <div className={`mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${game.accent} text-3xl`}>
                {game.icon}
              </div>
              <h2 className="text-xl font-bold">{game.name}</h2>
              <p className="mt-1 flex-1 text-sm text-white/70">{game.tagline}</p>
              <span className="mt-4 text-sm font-semibold text-purple-300 group-hover:text-purple-200">
                Play demo →
              </span>
            </Link>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 2: Write the public demo page**

Single client component — reads the segment with `useParams()`, validates the slug, renders the demo deck + dismissible signup banner inside `GameHost`:

```tsx
// app/arcade/[game]/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { GAMES, isGameSlug } from "@/lib/arcade";
import { loadDeck } from "@/lib/games/deck";
import { GameHost } from "@/components/games/GameHost";
import MatchRush from "@/components/games/MatchRush";
import MemoryFlip from "@/components/games/MemoryFlip";
import QuizRun from "@/components/games/QuizRun";
import AnswerSnake from "@/components/games/AnswerSnake";
import TrueFalseSprint from "@/components/games/TrueFalseSprint";

export default function ArcadeGamePage() {
  const params = useParams();
  const slug = String(params?.game ?? "");
  if (!isGameSlug(slug)) notFound();

  const [bannerHidden, setBannerHidden] = useState(false);
  const game = GAMES.find((g) => g.slug === slug)!;
  const deck = loadDeck(undefined, undefined, "1");
  const Game =
    slug === "match" ? MatchRush
    : slug === "memory" ? MemoryFlip
    : slug === "run" ? QuizRun
    : slug === "snake" ? AnswerSnake
    : TrueFalseSprint;

  return (
    <GameHost>
      {!bannerHidden && (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0d0a1a]/90 px-4 py-2.5 text-white backdrop-blur">
          <p className="text-xs sm:text-sm">
            Playing the <strong>{game.name}</strong> demo deck —{" "}
            <Link href="/auth/signup" className="font-semibold text-purple-300 underline">
              play YOUR notes free
            </Link>
          </p>
          <button
            onClick={() => setBannerHidden(true)}
            aria-label="Dismiss"
            className="rounded-lg px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      <Game deck={deck} />
    </GameHost>
  );
}
```

- [ ] **Step 3: Add the nav link**

In `components/site-header.tsx`, the links array (lines 5-10) becomes:

```ts
const links = [
  { href: "/arcade", label: "Arcade" },
  { href: "#demo", label: "Try it" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
  { href: "#about", label: "About" },
]
```

- [ ] **Step 4: Manual check (logged-out browser window)**

```powershell
npm run dev
# logged out: http://localhost:3000/arcade — hero + 5 cards + header nav link
# click each card → demo runs on the fixture deck; banner CTA → /auth/signup; ✕ dismisses
# bad slug http://localhost:3000/arcade/nope → 404
```

- [ ] **Step 5: Typecheck and commit**

```powershell
node node_modules\typescript\bin\tsc --noEmit
git add app/arcade components/site-header.tsx
git commit -m "feat: public arcade page + per-game demo routes + nav link"
```

---

### Task 7: Full verification + ship

**Files:** none new (verification + push)

- [ ] **Step 1: Unit tests + typecheck + production build**

```powershell
npx -y tsx --test lib/arcade.test.ts lib/games/match-rush.test.ts
node node_modules\typescript\bin\tsc --noEmit
npm run build
```

Expected: tests pass; tsc exit 0; build succeeds.

- [ ] **Step 2: Manual e2e checklist (dev server, desktop + a phone-width window)**

- Logged-out: `/arcade` loads, all 5 demos playable, signup CTA works, `#demo` etc. anchors on the landing page still work with the new nav link present
- Logged-in: sidebar Arcade item → hub; "Pick a note" lists only topics with flashcards; every game runs on a real deck; per-topic Play → same; game close returns to the previous page (single back)
- A topic with 0 flashcards: Play button still works — the game shows its own "not enough cards" screen
- Mobile width: hub grid stacks; games fill the viewport

- [ ] **Step 3: Push (auto-deploys) and smoke the live site**

```powershell
git push origin main
```

Then on quizliai.com: `/arcade` loads + one demo plays; `/note/arcade` requires profile (redirects logged-out users) as designed.

- [ ] **Step 4: Commit any fixes found during verification, push again if needed**
