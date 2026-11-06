# Game Arcade Integration — Design

Date: 2026-11-06 · Status: approved (brainstorm session, same day)
Source: `game site/` folder (AI Studio export, untracked) — 5 self-contained
flashcard study games, already authored with Next.js app-router shims whose
imports (`@/components/games/*`, `@/lib/games/*`) match this repo's aliases.

## Goal

Include the games in quizlia_landing, more capable and attractive than
coconote.app/arcade (2 games, public marketing page). We ship **5 games**
in two surfaces: the logged-in app (real decks from the user's notes) and a
public lead-gen arcade (instant demo play).

**Hard constraint: zero changes to the game components or game logic.**
All new code lives in host pages/wrappers around them. The five components
(`MatchRush`, `MemoryFlip`, `QuizRun`, `TrueFalseSprint`, `AnswerSnake`) are
copied byte-identical.

## Approved decisions

1. **Placement** — in-app hub + public arcade page (both).
2. **Entry points** — sidebar Arcade hub with note picker, plus a Play
   button on each topic page.
3. **Results (v1)** — bridge events used for navigation only; no
   persistence, no quota metering, no Firestore writes.

## What moves where

From `game site/` into the repo (then `game site/` is deleted):

| Source | Destination | State |
|---|---|---|
| `components/games/*.tsx` (5 files) | `components/games/` | byte-identical, never edited |
| `lib/games/types.ts, bridge.ts, sound.ts, deck.ts, theme.css, fixtures/sample-deck.json` | `lib/games/` | untouched — `deck.ts` stays the fixture/demo loader |
| `lib/games/match-rush.test.ts` | `lib/games/` | kept; runnable via tsx |
| `app/note/play/{match,memory,run,snake,truefalse}/page.tsx` | same paths | **rewritten** — these are hosts (glue), not game logic |

**Not copied:** `lucide-react` / `motion` dependencies and all 15 PNGs
(verified unreferenced by the game code), the Vite harness (`src/`,
`index.html`, `vite.config.ts`), express/genai server bits, `.aistudio`,
`metadata.json`, `tsconfig.json`, `package.json`.

No new npm dependencies — the games are plain React 19; the repo has
React 19.3 / Next 16.

## In-app surface (logged in)

- **`/note/play/{match,memory,run,snake,truefalse}`** — rewritten hosts.
  Resolve searchParams (`noteId`, `profileId`, `mock`). With `noteId`:
  load that topic's flashcards (below) and render the game with a real
  deck. Without `noteId` or with `mock=1`: fixture deck via
  `lib/games/deck.ts` (unchanged).
- **`GameHost`** (new `components/games/GameHost.tsx` — ours, not game
  code): full-bleed wrapper that mounts a game and listens for
  `quizli:game` CustomEvents from `lib/games/bridge.ts`:
  - `type: "close"` → `router.back()`
  - `type: "result"` → `console.debug` only (v1)
- **`/note/arcade`** — hub page inside the app layout: QuizliA-branded
  grid of the 5 games (name, short description, vibe), each offering
  "pick a note" (topic picker → `/note/play/{game}?noteId=…&profileId=…`)
  and "try demo" (`/note/play/{game}?mock=1`).
- **Sidebar** — new Arcade item (`sports_esports` icon) after "My Notes".
- **Topic page** (`app/note/topic/[id]`) — a **Play** button beside the
  existing study modes opening a 5-game picker; each entry routes to
  `/note/play/{game}?noteId={topicId}&profileId={profile.id}`.

`/note/play/*` pages inherit the note layout's profile guard
(`currentProfile` in localStorage) — intended: real decks are for signed-in
profiles only.

## Deck data flow (real decks)

Same source the topic page uses — no new server surface:

1. `localStorage.currentProfile` → profile (id)
2. `localStorage.content_{profileId}` → items; first-visit miss triggers
   `loadProfileContent(profile)` cloud pull + reload (existing behavior,
   mirrored from `app/note/topic/[id]/page.tsx`)
3. Items with `sourceId === noteId`; the `type === "flashcards"` item's
   `data.flashcards` is the deck; `sourceName`/`title` is the deck title
4. Map to the game `Deck` shape:
   `{ noteId, profileId, title, cards: flashcards.map((f, i) => ({ id: String(i), term: f.question, definition: f.answer })) }`

Minimum deck size: games need enough cards to play (they already handle
what they get); the host shows a friendly "not enough cards" message if a
topic has fewer than 4 flashcards instead of launching a broken round.

## Public arcade (lead-gen)

- **`/arcade`** — public page (marketing chrome: site header/footer; nav
  gains an **Arcade** link like Coconote's): dark arcade-energy hero with
  the QuizliA bear mascot + controller, headline + subhead in the
  "Games that make studying addictive" direction (final copy at
  implementation), then **5 game cards** (Coconote shows 2) — each card
  links straight to its playable demo. Persistent CTA:
  "Play YOUR notes — free" → signup.
- **`/arcade/{game}`** — public host: the same untouched game components
  on the fixture deck, plus a slim dismissible top banner with the signup
  CTA. No auth, no profile, no writes.

## Bridge contract (v1)

`lib/games/bridge.ts` (unchanged) emits `quizli:game` CustomEvents on web
and routes to `webkit.messageHandlers.quizliGame` when embedded in a
WKWebView. Hosts consume: close → navigate, result → log. The webkit path
is intentionally left live for a future iOS embed (non-goal now).

## Non-goals (v1)

- No edits to game components, `sound.ts`, `theme.css`, or `deck.ts`
- No game-result persistence, analytics, or review-card surfacing
- No quota/metering: games consume zero generations
- No iOS app changes

v2 candidates the bridge already enables: result persistence + streaks,
"review these cards" surfacing on topic pages, iOS WKWebView embed.

## Verification

1. `tsx lib/games/match-rush.test.ts` passes
2. `tsc --noEmit` + `next build` clean
3. Manual e2e on localhost, desktop + mobile viewport:
   - logged-out: `/arcade` loads, all 5 demos playable, CTA → signup
   - logged-in: hub note picker → each game runs on a real topic's deck;
     topic-page Play → same; back/close exits cleanly; demo mode works
   - a topic with < 4 flashcards shows the friendly message
4. Deployed smoke on quizliai.com after merge (public arcade + in-app hub)
