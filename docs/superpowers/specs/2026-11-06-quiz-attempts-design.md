# Quiz attempts (shared iOS and web schema)

Date: 2026-11-06. Owner: AR. Status: built on branches `feature/quiz-attempts` (web) and
`feature/quiz-attempts-reset` (iOS).

## Why
Quiz scores were never stored. PRD F4 says quiz scores are stored per profile, and the parent
dashboard (backlog 39) needs a per-child record of what was studied and how it went. The iOS
"take a breath" reset screen (vet 2026-10-24) also needs completion data per arm; the app has no
analytics SDK, so the attempt record carries that too.

## Path
`users/{uid}/profiles/{pid}/quizAttempts/{attemptId}`

- `pid` is the same profile doc id the notes use (iOS: the profile identity map; web: `String(profile.id)`).
- `attemptId` is `{clientOrigin}_{uuid}`, minted by the client, so a retry overwrites instead of duplicating.

## Fields
| Field | Type | Notes |
|---|---|---|
| `id` | string | Same as the doc id. |
| `noteId` | string | The note doc id under `notes/` (iOS stable `ios_{UUID}` id, web `sourceId`). |
| `noteTitle` | string | Copied at write time, so the record reads alone if the note is renamed or deleted. |
| `status` | `"inProgress"` or `"finished"` | iOS writes `inProgress` at the first answer and `finished` at the end; web writes `finished` only. A doc left `inProgress` is an abandoned quiz. |
| `correct` | int | Right answers so far (final when finished). |
| `total` | int | Questions in the quiz, 1 to 100. |
| `answered` | int | Questions answered so far. |
| `durationSec` | int | Seconds from the first question to the last answer. |
| `answers` | array of `{ i: int, correct: bool }` | One entry per answered question, in order. No answer text (child profiles store no child-created content). |
| `startedAt` | ISO string | |
| `finishedAt` | ISO string or null | |
| `clientOrigin` | `"ios"` or `"web"` | |
| `reset` | map, optional | iOS only: `{ arm: "on" or "off", shown: bool, skipped: bool }` for the breathing reset test. |
| `updatedAt` | ISO string | Same convention as notes. |
| `deleted` | bool, optional | Tombstone; readers skip it. |

Rules: owner-only read and write; on create, `total` is an int from 1 to 100, `correct` an int from
0 to `total`, `clientOrigin` is `ios` or `web`. Deploy `firestore.rules` with the Firebase CLI before
either client ships: without the new match block every write is denied (Firestore default-denies).

## Readers
- Parent dashboard (not built): per profile, finished attempts in the last 7 days, newest first.
- Breathing reset kill check (21 days after release): completion rate of attempts with a 3-miss
  streak, `reset.arm` on vs off. Abandoned = still `inProgress` 24 h after `startedAt`.

## Not in scope
Per-answer text, analytics SDKs, server routes (both clients write with the Firebase client SDK,
like notes and profiles), syncing attempts down into the iOS SQLite store.
