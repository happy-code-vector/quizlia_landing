# Shared Firebase Sync — Implementation Plan

> Spec: `docs/superpowers/specs/2026-10-08-shared-firebase-sync-design.md`
> Web branch: `feature/shared-firebase-sync` (deployable when ready) · iOS branch: `release/1.0.12`

## Global constraints

- Single project `quailizy`. iOS still can't be compiled on Windows — match
  existing idioms exactly; Mac build is the verification step.
- The top-level `notes` collection is PUBLIC study-guide content — never
  migrate or user-scope it. User notes live ONLY under `users/{uid}/…`.
- Subscriptions do not sync (per-store entitlements stay).
- Nothing deploys until the user says so: web work goes on a branch because
  Netlify auto-deploys `main`.

## Task 1 — Web: security rules (uid-scoped)

`firestore.rules`: users subtree readable/writable only by its owner
(`request.auth.uid == userId`); promoCodes read-only for clients
(admin SDK writes bypass rules).

## Task 2 — Web: UID-keyed profile + subscription paths

`lib/firebaseProfiles.ts` + `lib/firebaseSubscription.ts`: replace
`emailToDocId(email)` doc keys with the signed-in user's `auth.uid`
(fallback to email path when unauthenticated). Same data shapes otherwise.

## Task 3 — Web: user-notes cloud sync (write-through)

New `lib/notesSync.ts`:
- `persistProfileContent(profile, content)` — writes localStorage (existing
  key `content_${id}`) AND `users/{uid}/profiles/{pid}/notes/userContent`
  (single consolidated doc per profile, LWW by `updatedAt`). Fire-and-forget
  with failure log.
- `loadProfileContent(profile)` — localStorage first; cloud fetch merges
  when local is empty.
Wire into the 3 pages' `setItem/getItem(content_…)` sites
(app/note/page.tsx, app/note/notes/page.tsx, app/note/topic/[id]/page.tsx).

## Task 4 — Web: migration script

`scripts/migrate-to-uid.mjs` (firebase-admin, devDependency already present):
- `--dry-run` (default ON) prints planned copies; `--apply` writes.
- For each auth user with email: copy `users/{emailDocId}` → `users/{uid}`
  and `users/{emailDocId}/profiles/*` → `users/{uid}/profiles/*`; source
  docs untouched (deleted only in a separate later `--prune` run).
- `--export-promocodes` dumps quicknotes-15593 `promoCodes` to JSON for
  import into quailizy via `scripts/seed-study-guides.ts`-style admin write.

## Task 5 — iOS: project swap + setup doc

Branch `release/1.0.12`. `docs/quailizy-firebase-setup.md` instructs
downloading the quailizy `GoogleService-Info.plist` from the Firebase
console and replacing `QuickNote/GoogleService-Info.plist` (this file
cannot be generated from code). Promo collection name is unchanged.

## Task 6 — iOS: SyncManager

New `QuickNote/Resource/SyncManager.swift`:
- `configure()`: anonymous auth on launch (reuses `AnonymousAuthManager`).
- `syncProfilesUp()`: upserts `DatabaseManager.shared.fetchProfiles()` rows.
- `syncDocumentUp(folderId:title:contentType:note:flashcard:quiz:chat:createdAt:profileId:)`:
  upserts to `users/{uid}/profiles/{pid}/notes/{docId}` with
  `clientOrigin: "ios"`, LWW `updatedAt`; failures queue the doc ID in
  UserDefaults (`pendingSyncDocIds`) and retry on next launch.
- `pullOnce(profileId:)`: reads remote notes with `updatedAt` newer than
  last-pull timestamp and inserts missing ones via DatabaseManager.
- Hooks: called from `DatabaseManager.insertDocument`, `saveAIResponse`,
  `updateDocumentTitle`, `deleteProfile` (delete remote subtree).

## Task 7 — iOS: Settings rows (Enable Sync + Delete Account)

`SettingsViewController`: extend the existing row-action switch with a
"Sync your data" case (UIAlertController: Link Google / Link Email /
status) using `Auth.auth().currentUser.link(with:)` on the anonymous user,
and a "Delete Account" case that deletes `users/{uid}` subtree + signs out
(Apple 5.1.1(v) compliance).

## Task 8 — Verification checklist (Mac + browser)

Per spec testing matrix; plus typecheck/build green on web before any
merge to main.
