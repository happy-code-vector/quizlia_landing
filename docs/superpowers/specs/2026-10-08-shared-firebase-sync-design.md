# Shared Firebase Sync — Design Spec

**Status:** Approved 2026-10-08 · Ships as Release C (iOS 1.0.12) + web
**Decisions locked:** single project = `quailizy` · iOS identity = anonymous-first with optional account linking · timing = after Release B ships

## Goal

The iOS app and the quizliai.com web app use one Firebase project, one
identity model, and a shared Firestore schema so profiles and note content
(notes, quizzes, flashcards) sync across devices and platforms.

## Architecture: local-first sync

Each client keeps its current primary store — iOS SQLite, web localStorage —
and syncs to Firestore on write plus a pull on launch. Offline behavior is
unchanged. Conflicts resolve last-write-wins by `updatedAt` (acceptable:
notes are single-writer per profile in practice). Cloud-first was rejected:
it breaks iOS offline use and forces a rewrite of the SQLite pipeline.

## Shared schema (quailizy)

```
users/{uid}                              account: email, createdAt, lastPlatform,
                                         subscription mirror (existing shape), promo fields
users/{uid}/profiles/{pid}               name, avatar, type, createdAt, updatedAt
users/{uid}/profiles/{pid}/notes/{nid}   title, sourceType, sourceRef,
                                         content (JSON: note + quiz + flashcards),
                                         clientOrigin ("ios" | "web"),
                                         createdAt, updatedAt
promoCodes/{code}                        moved from quicknotes-15593 (same shape:
                                         isActive, expirationDate, usersUsed)
```

Security rules: every path under `users/{uid}` requires `request.auth.uid == uid`;
`promoCodes` is admin/service-write, app-read.

## Identity

- **iOS:** Firebase anonymous auth on first launch (existing
  `AnonymousAuthManager`, repointed at quailizy). No onboarding friction.
  Settings gains "Enable Sync" (email / Google / Apple) using Firebase
  **account linking**, which upgrades the same UID — anonymous-era data
  follows the account. Account deletion also added (Apple 5.1.1(v)).
- **Web:** unchanged email/Google auth (already in quailizy).

## Migration (one-time, idempotent, dry-run first)

Script via firebase-admin (`scripts/migrate-to-uid.mjs`):
1. `users/{emailDocId}` → `users/{uid}` for auth users found by email;
   unmigrated email docs remain untouched until claimed.
2. Existing web `notes` collection → re-parent under
   `users/{uid}/profiles/{pid}/notes`.
3. `promoCodes` copy from quicknotes-15593 (export/import JSON).
4. Legacy project quicknotes-15593 becomes read-only; retired after burn-in.

## Non-goals / constraints

- **Subscriptions do NOT sync.** Apple IAP entitlements stay on iOS, Stripe
  on web (Apple guideline constraints). The pricing page already discloses
  "billed separately per platform."
- Chat history sync is optional Phase 3.
- No custom backend, no CRDTs, no real-time co-editing.

## Phasing (inside 1.0.12)

1. iOS auth swap to quailizy + profiles sync + web UID migration
2. Notes/quiz/flashcard two-way content sync
3. Chat history (optional)

## Error handling

- iOS: sync failures set a `pendingSync` flag on the SQLite row; retried on
  next launch/write. No data loss; sync never blocks the UI.
- Web: Firestore writes fail soft — localStorage remains the fallback cache.
- Migration: dry-run mode prints counts; re-runnable; never deletes source
  data in the same run that writes.

## Testing matrix (Mac + browser)

- Same linked account on two iOS devices: note created offline on one
  appears on the other after launch.
- Note created on web appears on iOS and vice versa.
- Anonymous iOS user creates note → enables sync → data persists under the
  upgraded UID; same sign-in on web sees it.
- Promo code redemption works on both platforms (quailizy promoCodes).
- Firestore rules reject cross-UID reads (emulator or console test).
- Account deletion removes users/{uid} subtree and signs out.
