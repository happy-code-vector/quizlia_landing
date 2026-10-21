# Device identity & server-authoritative entitlements — design

Date: 2026-10-21 · Status: approved in brainstorming, pending spec review
Repos: `quizlia_landing` (web + Netlify backend), `Quizliai-iOS` (full rebuild in progress)
Firebase: `quailizy` (accounts, notes, quota, subscriptions)

## 1. Problem

The iOS app signs every user in to Firebase **anonymously** at launch. That anonymous
UID exists for one reason: Firestore requires a token to write, so the app mints a fake
"user" to get one. Consequences:

1. **Abuse**: the Netlify proxies accept any refresh token and never check the provider,
   so each scripted anonymous UID gets its own free AI-generation budget
   (`generationQuota/{uid}` — free = 1 lifetime, paid = 5–15/day, chat = 100/day).
2. **Account hygiene**: every install creates a permanent Auth user + Firestore docs,
   even for users who never sign in.
3. **False sense of sync**: anonymous users' notes up-sync under an UID they can never
   reach from another device.
4. **Spoofable entitlements**: the app writes `users/{uid}.subscriptions.*.active = true`
   **about itself** with its own token (iOS `QuizliSyncManager.recordEntitlements`,
   web post-checkout mirror). Any user with their own token can claim "paid".

## 2. Goals

- No anonymous Firebase Auth users, ever. A signed-out device is a **device ID**, not a user.
- Kevin's entitlement model:

| Situation                                | Status                                   |
| ---------------------------------------- | ---------------------------------------- |
| Fresh device, no email, no IAP           | free limits, notes stay local SQLite     |
| IAP succeeds on device (no email)        | **device is paid** — no sign-in demanded |
| That device later links an email         | **that account becomes paid**            |
| Fresh device links an already-paid email | **that device is paid**                  |
| Email linked but not subscribed          | free limits                              |

- Paid status must be **server-verified** (StoreKit receipt / Stripe), never self-declared.
- Sync = real accounts only; sign-in lives in Settings → "Sync your data".
- One identity ⇒ one budget (no double freebies across device↔account link).

## Non-goals

- Changing quota numbers or the plan lineup (kept: free 1 lifetime, individual 5/day,
  family 15/day, chat 100/day separate, super-admin unlimited).
- Changing the notes sync protocol for signed-in users (direct app→Firestore,
  uid-scoped rules, local SQLite stays source of truth).
- Backward compatibility beyond a transition window — the app is being completely
  rebuilt; old versions age out.

## 3. Decisions (from brainstorming)

- Anonymous auth: **removed** from the rebuild.
- "Real unique id per device" = **Keychain UUID** (identity) + **App Check / App Attest**
  (proof the device is real). Apple offers no hardware ID; this pair is the practical
  equivalent.
- Netlify backend gets a **Firebase service account** (Kevin already has the JSON).
  Single-line env var via base64. It is the ONLY new secret.
- Per-device server state lives in **Firestore** `devices/{deviceId}` (not Netlify
  Blobs — same ~$0 cost, but one store, one console, portable for acquisition).
- `users/{uid}.subscriptions` becomes **server-write-only** (included in scope).
- App Check: **verify-only (log)** in this release; enforce on Firestore the next release.
- StoreKit 2 JWS receipts verified **offline** (x5c chain to Apple root) — no Apple
  API key needed.

## 4. Architecture

```text
SIGNED-OUT DEVICE (new)
  app ──► /api/ios/*  headers:  X-Device-ID        (Keychain UUID)
                             +  X-App-Check        (App Attest token)
                             +  X-StoreKit-JWS     (signed receipt, if purchased)
         server: 1) verify App Check (admin SDK; log-only phase)
                 2) verify JWS offline if present → device plan
                 3) read/write devices/{deviceId} via ADMIN SDK
                    free: 1 lifetime · paid: 5 or 15/day · chat 100/day

SIGNED-IN ACCOUNT (iOS + web — mostly unchanged)
  notes sync  app ──► Firestore directly (user token, uid rules)
  generation  app ──► /api/ios/*  account token verified as today (token-verify)
                              plan from users/{uid}.subscriptions (now server-written)
                              quota via user's own token (tamper-proof rules, unchanged)

LINK DEVICE ↔ EMAIL
  POST /api/ios/entitlements with account token + JWS:
  server verifies JWS once → ADMIN writes subscriptions into users/{uid}
  → paid propagates both directions; Restore re-attaches to current device
```

## 5. Server design (Netlify, quizlia_landing)

### 5.1 New env var

```text
FIREBASE_SERVICE_ACCOUNT_B64   # base64 of the service-account JSON, single line
```

Create with PowerShell, paste into Netlify → Site settings → Environment variables:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\quailizy-firebase-adminsdk-xxxxx.json"))
```

Decode at runtime:

```ts
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64!, "base64").toString("utf8")
);
```

`.env.example` gains the variable with these instructions as comments.

### 5.2 Admin SDK module (`lib/admin-firestore.ts`, new)

`initializeApp` with `credential.cert(serviceAccount)`; exports the admin `db` and
`appCheck()`. Used by: `/api/ios/*` routes (device path), `/api/ios/entitlements`,
Stripe webhook. Existing user-token paths (token-verify, quota.ts REST) are untouched.

### 5.3 Caller resolution in `/api/ios/*` routes

Priority: `X-Firebase-ID-Token` / `X-Firebase-Refresh` (signed-in, existing flow —
also keeps old app versions working during the transition) → else `X-Device-ID`
(device path). App Check token (`X-App-Check`) verified on every call via
`admin.appCheck().verifyToken()`; during the log-only phase a failure is logged and
the request proceeds; at enforcement phase it 403s.

Plan resolution:

- Account caller: `users/{uid}.subscriptions` (server-written) — unchanged logic.
- Device caller: verified JWS in `X-StoreKit-JWS`, cross-checked against the cached
  `devices/{deviceId}.entitlement` (see 5.4). No JWS → free.

Metering:

- Account caller: existing `lib/quota.ts` machinery (user token, tamper-proof rules).
- Device caller: admin reads/writes `devices/{deviceId}` counters (server time for
  date rollover, same semantics as quota.ts):
  - free: `freeUsed` boolean, 1 lifetime;
  - paid (valid JWS): `genUsed`/`genDate` vs 5 or 15 by product;
  - chat: `chatUsed`/`chatDate`, 100/day.

### 5.4 JWS verification (`lib/storekit-verify.ts`, new)

StoreKit 2 signed transaction (JWS). Offline verification:

1. Validate x5c certificate chain against the embedded Apple Root CA (the root cert
   is committed; no network, no Apple API key).
2. Check payload: `bundleId == "com.test.QuickNote"`, productId in the known set,
   `expiresDate > now`, `revocationDate == null`.
3. On success, cache into `devices/{deviceId}.entitlement`
   (`{ plan, productId, transactionId, expires, verifiedAt }`) and reuse without
   re-verification while `min(expires, verifiedAt+24h)` is in the future; the app
   re-presents the JWS each request anyway.

Accepted risk: offline verification cannot see a revocation that happens between
expiries; bounded by the 24h cache + subscription expiry. The on-device StoreKit
`revocationDate` check (already in `recordEntitlements`) stops the app sending
revoked receipts.

### 5.5 Entitlements endpoint (`/api/ios/entitlements`, new)

POST body: `{ jws: string | string[] }`; headers as in 5.3.

- Signed-out: verifies each JWS, writes the best active entitlement to
  `devices/{deviceId}.entitlement`. Returns resolved plan.
- Signed-in (account token): verifies JWS, then **admin-merges** into
  `users/{uid}.subscriptions.<field>.active/renewalDate` using the existing field map
  (`family_yearly`, `individual_yearly`, `weekly`, `yearly`, `yearlyOffer` — same as
  `mirrorField(forProduct:)`). Merge never downgrades: it only sets `active=true` /
  extends `renewalDate`; it never unsets other plans (Stripe webhook owns deactivation).
- Link bookkeeping: sets `devices/{deviceId}.linkedUid`; enforces the **one-identity-
  one-budget rule** symmetrically: the server sets the account's `freeUsed` if the
  device already spent its free generation (and vice versa), so linking never grants
  a second freebie in either direction.
- iOS calls this on launch, on `Transaction.updates`, and from Restore Purchases.

### 5.6 Stripe subscriptions become server-written

- `app/api/stripe/checkout/route.ts`: metadata gains `uid` (the route must verify the
  caller's Firebase ID token to learn it — Authorization header, verified with the
  existing public-certs verifier; today the route trusts the body, this closes that too).
- `app/api/stripe/webhook/route.ts`: on `checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted` → signature-verified
  (already is) → resolve `uid` from session/subscription metadata → **admin-write**
  `users/{uid}.subscriptions.<plan>.active/renewalDate` (trial dates respected, same
  field names as today).
- Web client (`lib/firebaseSubscription.ts`): all subscription **writes removed**;
  reads stay (rules below deny writes only). The success page refreshes by reading.

### 5.7 Firestore rules (`firestore.rules`)

- `match /devices/{id}`: `allow read, write: if false` (Admin SDK bypasses rules).
- `users/{uid}`: client create/update stays allowed for profile fields but **must not
  touch `subscriptions` or `admin`** — enforce with
  `request.resource.data.diff(resource.data).affectedKeys().hasOnly([<profile field list>])`
  on update, and forbid `subscriptions`/`admin` keys in creates. Exact field list
  derived from the current rules during implementation.
- `generationQuota/{uid}`: unchanged (existing tamper-proof increment-only rules).

### 5.8 App Check (web)

- Register the web app for App Check with **reCAPTCHA Enterprise** (Google Cloud "Fraud Defense" — classic v3 keys are deprecated) in the Firebase console
  (site key setup is a console step, documented in the plan).
- `lib/firebase.ts` initializes App Check; Firestore traffic from the site carries
  tokens. Enforcement stays OFF this release (log-only), flipped in console after
  monitoring shows clean traffic.

## 6. iOS design (rebuild)

- **`DeviceIDManager` (new)**: UUID generated once, stored in Keychain
  (`kSecClassGenericPassword`, service `com.quizlia.device`). Keychain survives app
  reinstall on iOS — the ID is stable across reinstalls and dies only with the device
  (or "Erase All Content and Settings"). Never reset on logout.
- **`AnonymousAuthManager` deleted**; `AppDelegate` starts no Firebase Auth. No
  Firebase call happens while signed out.
- **App Check**: Firebase App Check SDK with `AppAttestProvider` (App Attest needs
  iOS 14+; `DeviceCheckProvider` fallback if the rebuild targets older). Token goes
  in `X-App-Check` on every `/api/ios/*` call. Likewise the current JWS receipt rides
  along in `X-StoreKit-JWS` on every `/api/ios/*` call while purchased — generation
  requests authorize from it directly; `/api/ios/entitlements` exists for link/merge
  and refresh.
- **Sign-in** (Settings → "Sync your data", existing `SignInViewController`):
  Apple/Google/email — a plain sign-in/link (no anonymous base to upgrade anymore;
  credential-already-in-use fallback stays). On success the existing adopt/merge
  logic pushes local SQLite notes under the account UID.
- **`QuizliSyncManager`**: `start()` gated on signed-in state; `recordEntitlements()`
  client-side mirror **removed** (replaced by posting JWS to `/api/ios/entitlements`).
- **Paywall UX**: local StoreKit checks remain the fast path for UI; the server stays
  the authority via 429 → paywall (behavior already shipped, commit 7fd6dd8).
  A signed-out user who purchased never sees a sign-in demand — the JWS proves paid.

## 7. Data model summary

```text
devices/{deviceId}                     users/{uid}                    generationQuota/{uid}
  freeUsed: bool                         email, name, profile…          used, chatUsed, date,
  chatUsed, chatDate                     subscriptions.<field>.{        freeUsed, recentSets…
  genUsed, genDate                         active, renewalDate}          (unchanged, client-token
  entitlement {plan, productId,           admin: bool                     tamper-proof writes)
    transactionId, expires,             (subscriptions + admin →
    verifiedAt}                          server-write-only)
  linkedUid, updatedAt
(admin-write-only, rules deny clients)
```

## 8. Cutover & cleanup

1. **Transition window** (new web/server code live, rebuild not yet released):
   routes accept both the account-token path and the device path; anonymous provider
   stays enabled in the quailizy console (old app versions still depend on it).
2. **Cutover** (rebuild on the App Store, old versions aged out):
   - disable the Anonymous provider in quailizy;
   - remove the `X-Firebase-Refresh`-for-anonymous tolerance from routes (signed-in
     refresh tokens remain valid);
   - run the cleanup script (Node, run locally with the service account JSON):
     list anonymous Auth users, for each inactive > 30 days delete `users/{uid}`,
     `generationQuota/{uid}`, note/folder docs under the UID, then the Auth user.
     Repeatable; dry-run mode prints what it would delete.
3. **App Check enforcement flip** (one release after verify-only): enable enforcement
   for Firestore in the console after checking the App Check metrics dashboard.

## 9. Security properties & accepted risks

Fixed by this design:

- Scripted anonymous-UID farming → no anonymous users exist; device path requires a
  valid App Check token (once enforced) and free tier is 1 lifetime per device.
- Self-declared "paid" → subscriptions server-write-only; iOS unlimited-adjacent
  privileges require a receipt the server just verified.
- Unauthenticated Stripe checkout route trusting the body → caller ID token verified.

Remaining, accepted:

- Sharing one device's Keychain UUID requires extracting it from a jailed device —
  same trust level as today's anonymous refresh token, so no regression.
- Offline JWS verification has the revocation window noted in 5.4.
- During the App Check log-only phase the device path is not yet hardened; it firms
  up when enforcement flips (§8.3).

## 10. Verification

Per project workflow (no test framework; `tsc` + eslint + build only; Kevin
hand-verifies UI; iOS is built by Kevin on a Mac):

- Web/server: `npm run build` clean; curl scripts for each route covering the auth
  matrix (device free/paid/chat, account free/paid, link merge, freeUsed carry-over,
  Stripe webhook signature + writes).
- Manual checklist: signed-out generation ×2 (1 free then paywall), purchase →
  unlimited-per-plan signed-out, sign-in → notes appear, link → account paid,
  Restore on second device, web checkout → webhook writes → quota lifts.
- Rules: attempted client write to `subscriptions` rejected; `devices` doc
  unreadable from a client.
