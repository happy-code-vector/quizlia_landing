# Device Identity — iOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the iOS half of the device-identity spec (`docs/superpowers/specs/2026-10-21-device-identity-sync-design.md` §6): signed-out devices identify by Keychain UUID + App Check + StoreKit receipts, anonymous Firebase auth is deleted, and the server (already live) becomes the sole quota/entitlement authority.

**Architecture:** A `DeviceIDManager` (Keychain UUID) + `QuizliProxyHeaders` helper feed the server's four headers on every `/api/ios/*` call; `EntitlementsManager` posts StoreKit JWS receipts to `/api/ios/entitlements` (replacing the client-side Firestore mirror); `QuizliSyncManager` runs only for real accounts; all `AnonymousAuthManager` references are removed across 8 files.

**Tech Stack:** Swift/UIKit, Firebase iOS SDK (Auth, Firestore, **AppCheck** — new pod), StoreKit 2, existing `KeychainHelper`.

**iOS repo:** `e:\Projects\Arasheed\QuickNote\QuickNote` (branch `main`; synchronized folder groups — new `.swift` files are picked up automatically, no pbxproj edits).

## Global Constraints

- Server contract (live since 2026-10-21, exact header names): `X-Device-ID` (validated `/^[A-Za-z0-9-]{8,64}$/` — a UUID satisfies it), `X-App-Check` (App Check token; server is log-only until the enforcement flip), `X-Storekit-JWS` (ONE signed receipt string), `X-Firebase-Refresh` (only when a Firebase user exists — the server prefers it; leftover anonymous sessions from the old app version keep working through the transition window, so send it for ANY `currentUser`).
- Server quotas in force: free 1 lifetime, individual 5/day, family 15/day, chat 100/day; 429 → paywall behavior already shipped (7fd6dd8) — do not change client 429 handling.
- Product IDs come from `Appconstants.swift`: `isProductFamilyYearlyId`, `isProductYearlyId`, `isProductYearlyDiscountId` = family tier (15/day); `isProductIndividualYearlyId`, `isProductLatestWeeklyId` = individual tier (5/day).
- Server endpoints (hardcoded like the existing ones): `https://quizliai.com/api/ios/entitlements`; generation/chat/onboarding/upload/study-from-video URLs already exist at their call sites.
- No new secrets: App Attest needs no key material; `Appconstants.swift` and `GoogleService-Info.plist` stay gitignored.
- Match existing Swift idioms exactly: emoji `print` logs, completion-handler style (async/await only inside `Task {}`), `static let shared` singletons with `private init()`.
- **Build gate:** this Windows machine cannot compile Swift. Every task's verification = reviewer diff review + grep assertions; Kevin's single Xcode build (Task 7) + the on-device checklist is the compile/runtime gate. `pod install` (Task 2) is Kevin-side.
- Commit style: short `feat:`/`fix:`/`chore:` subjects, trailer `Co-Authored-By: Claude Code <noreply@anthropic.com>` after a blank line.

---

### Task 1: DeviceIDManager — the stable device identity

**Files:**
- Create: `QuickNote/Resource/DeviceIDManager.swift` (iOS repo)

**Interfaces:**
- Consumes: `KeychainHelper.shared` (`QuickNote/Resource/KeychainHelper.swift` — `save(key:value:)` confirmed; `read(key:)` returns an optional string per its use at `ProductionManger.swift:457` — open the file and confirm the exact signature before writing; if `read` takes extra parameters (e.g. a service), adapt the two calls symmetrically).
- Produces (used by Tasks 3, 4): `DeviceIDManager.shared.deviceId: String` — a UUID generated on first access, persisted in the Keychain, stable across reinstalls, never reset on sign-out.

- [ ] **Step 1: Read `QuickNote/Resource/KeychainHelper.swift` fully** — confirm `read`'s exact signature and return type.

- [ ] **Step 2: Write `QuickNote/Resource/DeviceIDManager.swift`**

```swift
//
//  DeviceIDManager.swift
//  QuickNote
//
//  Stable per-device identity for signed-out server calls (spec §6):
//  a UUID generated on first launch, persisted in the Keychain (survives
//  app reinstall on iOS; dies only with the device or "Erase All Content
//  and Settings"). Never reset on sign-out — the device keeps its server
//  quota state (devices/{deviceId}) across accounts.
//

import Foundation

final class DeviceIDManager {

    static let shared = DeviceIDManager()

    private init() {}

    private let key = "quizlia.device.id"

    /// Stable device UUID — created on first access, then reused forever.
    var deviceId: String {
        if let existing = KeychainHelper.shared.read(key: key), !existing.isEmpty {
            return existing
        }
        let fresh = UUID().uuidString
        KeychainHelper.shared.save(key: key, value: fresh)
        return fresh
    }
}
```

- [ ] **Step 3: Verify by inspection**

The file must contain exactly the class above (adapted only if Step 1 revealed a different `read` signature). Grep check — Run: `git -C "e:/Projects/Arasheed/QuickNote/QuickNote" grep -n "quizlia.device.id" -- "*.swift"` → Expected: exactly one hit (the new file).

- [ ] **Step 4: Commit**

```bash
cd "e:/Projects/Arasheed/QuickNote/QuickNote"
git add QuickNote/Resource/DeviceIDManager.swift
git commit -m "feat: DeviceIDManager — Keychain-persisted device UUID"
```

(append a blank line + `Co-Authored-By: Claude Code <noreply@anthropic.com>` to every commit in this plan)

---

### Task 2: App Check — pod + activation at launch

**Files:**
- Modify: `Podfile` (iOS repo)
- Modify: `QuickNote/AppDelegate/AppDelegate.swift:1-25`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces (used by Task 4): an initialized App Check provider factory — `AppCheck.appCheck().token(...)` (in `QuizliProxyHeaders`) works from launch onward.

- [ ] **Step 1: Add the pod**

In the `Podfile`, after `pod 'FirebaseFirestore'`:

```ruby
  pod 'FirebaseAppCheck'
```

- [ ] **Step 2: Activate in AppDelegate**

`QuickNote/AppDelegate/AppDelegate.swift` — add the import next to the other Firebase imports (line 3-4 area):

```swift
import FirebaseAppCheck
```

Inside `didFinishLaunchingWithOptions`, immediately AFTER `FirebaseApp.configure()` + its print lines and BEFORE `QuizliSyncManager.shared.start()`:

```swift
        // App Check (spec §5.3/§6): every /api/ios/* call carries an App
        // Attest token. The server is log-only until the enforcement flip,
        // so a failed attestation never blocks the user today. Simulators
        // can't do App Attest — use the debug provider there (Kevin
        // registers the printed debug token in the Firebase console once).
        #if targetEnvironment(simulator)
        AppCheck.setProviderFactory(AppCheckDebugProviderFactory())
        #else
        AppCheck.setProviderFactory(AppAttestProviderFactory())
        #endif
```

- [ ] **Step 3: Verify**

Grep check — Run: `git -C "e:/Projects/Arasheed/QuickNote/QuickNote" grep -n "setProviderFactory" -- "*.swift"` → exactly one hit (AppDelegate). The `QuizliSyncManager.shared.start()` call stays where it is (Task 5 changes its INSIDES only).

- [ ] **Step 4: Commit**

```bash
git add Podfile QuickNote/AppDelegate/AppDelegate.swift
git commit -m "feat: App Check activation — App Attest (debug provider on simulator)"
```

- [ ] **Step 5: Kevin-side (note in report, not blocking):** run `pod install` in Xcode/the repo before the Task 7 build.

---

### Task 3: EntitlementsManager — receipt intake replacing the client mirror

**Files:**
- Create: `QuickNote/Resource/EntitlementsManager.swift` (iOS repo)
- Modify: `QuickNote/Resource/ProductionManger.swift` (the entitlements-mirror call inside/after `RefreshUserPurchases`, ~line 255 — find the exact call with: `git grep -n "recordEntitlements" -- "*.swift"`)
- Modify: `QuickNote/AppDelegate/AppDelegate.swift` (launch hook)
- Modify (delete the mirror): `QuickNote/Resource/QuizliSyncManager.swift:808-842` — the `// MARK: - Purchase mirror` section including `recordEntitlements()` and `mirrorField(forProduct:)`

**Interfaces:**
- Consumes: Task 1 `DeviceIDManager.shared.deviceId`; `AppCheck.appCheck()` (Task 2); `Transaction.currentEntitlements` (StoreKit 2); `Appconstants` product IDs.
- Produces (used by Tasks 4, 5, 7): `EntitlementsManager.shared.bestReceipt() -> String` (may be empty — header omitted) and `EntitlementsManager.shared.postEntitlements()` (fire-and-forget).

- [ ] **Step 1: Write `QuickNote/Resource/EntitlementsManager.swift`**

```swift
//
//  EntitlementsManager.swift
//  QuickNote
//
//  Receipt intake (spec §5.5): collects StoreKit 2 signed transactions
//  (JWS strings) and posts them to /api/ios/entitlements, which verifies
//  them against Apple's root cert server-side and merges the entitlement
//  (device cache + account merge + one-budget link). Replaces the old
//  client-side Firestore subscription mirror — the server is now the only
//  writer. The best receipt is cached locally so generation calls attach
//  it as X-Storekit-JWS without touching StoreKit on every request.
//

import Foundation
import StoreKit
import FirebaseAuth
import FirebaseAppCheck

final class EntitlementsManager {

    static let shared = EntitlementsManager()

    private init() {}

    private let url = URL(string: "https://quizliai.com/api/ios/entitlements")!
    private let cacheKey = "quizlia.bestReceipt"

    /// Best (highest-tier, then longest-lived) verified receipt from the
    /// last collect — attached to proxy calls as X-Storekit-JWS.
    /// Empty string when the device has no active entitlement.
    func bestReceipt() -> String {
        return UserDefaults.standard.string(forKey: cacheKey) ?? ""
    }

    /// Collects current StoreKit entitlements and posts them to the
    /// server. Fire-and-forget; safe to call repeatedly. Called on launch,
    /// after purchases, and from Restore Purchases.
    func postEntitlements() {
        Task { [weak self] in
            guard let self = self else { return }
            var best: (jws: String, rank: Int, expiry: Date)? = nil

            for await result in Transaction.currentEntitlements {
                guard case .verified(let transaction) = result,
                      transaction.revocationDate == nil else { continue }
                guard transaction.expirationDate.map({ $0 > Date() }) ?? true else { continue }

                let jws = transaction.jwsRepresentation
                guard !jws.isEmpty else { continue }

                // Family tier outranks individual (15/day vs 5/day); then
                // the longest expiry wins. Same ranking idea the server
                // applies to a receipt list.
                let rank = Self.isFamilyProduct(transaction.productID) ? 2 : 1
                let expiry = transaction.expirationDate ?? .distantFuture

                if best == nil || rank > best!.rank || (rank == best!.rank && expiry > best!.expiry) {
                    best = (jws, rank, expiry)
                }
            }

            guard let best = best else {
                // No active entitlement — clear the cache so signed-out
                // generation runs on the free tier, not a stale receipt.
                UserDefaults.standard.set("", forKey: self.cacheKey)
                print("ℹ️ [entitlements] no active entitlements")
                return
            }
            UserDefaults.standard.set(best.jws, forKey: self.cacheKey)
            self.post(jws: best.jws)
        }
    }

    private static func isFamilyProduct(_ productId: String) -> Bool {
        return productId == Appconstants.isProductFamilyYearlyId
            || productId == Appconstants.isProductYearlyId
            || productId == Appconstants.isProductYearlyDiscountId
    }

    private func post(jws: String) {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["jws": [jws]])

        // Same header set as every other proxy call, assembled inline
        // because QuizliProxyHeaders (Task 4) may not exist yet at the
        // moment this file is written; Task 4 replaces this block with
        // QuizliProxyHeaders.apply(to:) { ... } verbatim.
        request.setValue(DeviceIDManager.shared.deviceId, forHTTPHeaderField: "X-Device-ID")
        if let user = Auth.auth().currentUser {
            request.setValue(user.refreshToken ?? "", forHTTPHeaderField: "X-Firebase-Refresh")
        }
        AppCheck.appCheck().token(forcingRefresh: false) { token, error in
            if let token = token {
                request.setValue(token.tokenString, forHTTPHeaderField: "X-App-Check")
            } else if let error = error {
                print("⚠️ [appcheck] no token (server log-only): \(error.localizedDescription)")
            }
            URLSession.shared.dataTask(with: request) { data, _, error in
                if let error = error {
                    print("⚠️ [entitlements] post failed: \(error.localizedDescription)")
                    return
                }
                if let data = data,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    print("✅ [entitlements] server plan: \(json["plan"] ?? "?") linked: \(json["linked"] ?? "?")")
                }
            }.resume()
        }
    }
}
```

- [ ] **Step 2: Wire the call sites**

a) `ProductionManger.swift` — find the purchase-mirror call after `RefreshUserPurchases()` (grep `recordEntitlements`): replace `QuizliSyncManager.shared.recordEntitlements()` (or however it reads) with:

```swift
        // Server-authoritative entitlements (spec §5.5): post the signed
        // receipts; the server verifies against Apple and writes Firestore.
        EntitlementsManager.shared.postEntitlements()
```

If the call is `await`-ed or inside a specific branch, keep the surrounding structure — only the one call changes. If grep shows `recordEntitlements` is called from AppDelegate's `initGlobalClasses` or elsewhere TOO, replace every call site the same way.

b) `AppDelegate.swift` — inside `didFinishLaunchingWithOptions`, right after the App Check block from Task 2 (before `QuizliSyncManager.shared.start()`):

```swift
        // Post current StoreKit receipts (launch is one of the three
        // triggers: launch / purchase / Restore Purchases).
        EntitlementsManager.shared.postEntitlements()
```

c) `QuizliSyncManager.swift` — DELETE the whole `// MARK: - Purchase mirror (shared with the web app + server quota)` section (lines ~808-842: `recordEntitlements()` and `private static func mirrorField(forProduct:)`). Nothing calls it after (a).

- [ ] **Step 3: Verify**

Run: `git -C "e:/Projects/Arasheed/QuickNote/QuickNote" grep -n "recordEntitlements\|mirrorField" -- "*.swift"` → Expected: no hits.
Run: `git -C "e:/Projects/Arasheed/QuickNote/QuickNote" grep -n "postEntitlements" -- "*.swift"` → Expected: 3 hits (definition, ProductionManger, AppDelegate).

- [ ] **Step 4: Commit**

```bash
git add QuickNote/Resource/EntitlementsManager.swift QuickNote/Resource/ProductionManger.swift QuickNote/AppDelegate/AppDelegate.swift QuickNote/Resource/QuizliSyncManager.swift
git commit -m "feat: EntitlementsManager — server-side receipt intake replaces Firestore mirror"
```

---

### Task 4: QuizliProxyHeaders + rewire all eight request sites

**Files:**
- Create: `QuickNote/Resource/QuizliProxyHeaders.swift` (iOS repo)
- Modify: `QuickNote/GeminiApi/GeminiApiManger.swift:355, 488, 572, 718, 760, 879`
- Modify: `QuickNote/ViewController/New Onboarding/ScienceOfMasteryVC.swift:~500`
- Modify: `QuickNote/ViewController/Onboarding Study/StudySet.swift:~52-70`

**Interfaces:**
- Consumes: Task 1 `deviceId`, Task 2 App Check, Task 3 `bestReceipt()`, `Auth.auth().currentUser`.
- Produces: `QuizliProxyHeaders.apply(to: URLRequest, then: @escaping (URLRequest) -> Void)` — used again in Task 3's file (replacing its inline block) and available to any future call site.

- [ ] **Step 1: Write `QuickNote/Resource/QuizliProxyHeaders.swift`**

```swift
//
//  QuizliProxyHeaders.swift
//  QuickNote
//
//  The one place every /api/ios/* request gets its identity headers
//  (spec §4/§5.3 — server contract live since 2026-10-21):
//    X-Device-ID        always — Keychain UUID (signed-out identity)
//    X-App-Check        App Check token (fetched async; server log-only)
//    X-Storekit-JWS     best verified receipt when this device is paid
//    X-Firebase-Refresh account token when signed in — the server prefers
//                       it; leftover anonymous sessions from the old app
//                       version keep working through the transition window
//

import Foundation
import FirebaseAuth
import FirebaseAppCheck

enum QuizliProxyHeaders {

    /// Applies all identity headers, then runs `then` with the finished
    /// request (App Check tokens are fetched asynchronously — the request
    /// continues inside the completion).
    static func apply(to request: URLRequest, then: @escaping (URLRequest) -> Void) {
        var request = request
        request.setValue(DeviceIDManager.shared.deviceId, forHTTPHeaderField: "X-Device-ID")

        let jws = EntitlementsManager.shared.bestReceipt()
        if !jws.isEmpty {
            request.setValue(jws, forHTTPHeaderField: "X-Storekit-JWS")
        }

        if let user = Auth.auth().currentUser {
            request.setValue(user.refreshToken ?? "", forHTTPHeaderField: "X-Firebase-Refresh")
        }

        AppCheck.appCheck().token(forcingRefresh: false) { token, error in
            if let token = token {
                request.setValue(token.tokenString, forHTTPHeaderField: "X-App-Check")
            } else if let error = error {
                print("⚠️ [appcheck] no token (server log-only): \(error.localizedDescription)")
            }
            then(request)
        }
    }
}
```

- [ ] **Step 2: Rewire the six GeminiApiManger sites**

Each of the six sites currently reads:

```swift
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Auth.auth().currentUser?.refreshToken ?? "", forHTTPHeaderField: "X-Firebase-Refresh")
        request.httpBody = httpBody
        <REST OF THE FUNCTION: config/session/dataTask/...>
```

Change each to (delete the `X-Firebase-Refresh` line, wrap the remainder in the completion):

```swift
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = httpBody

        QuizliProxyHeaders.apply(to: request) { request in
            <REST OF THE FUNCTION, moved inside unchanged — config/session/
             dataTask/completion, closing braces adjusted so the function
             still ends at the same depth>
        }
```

Do this at lines 355, 488, 572, 718 (the four `baseURL`/`chatURL`/`onboardingURL` generation+chat functions) and at 753-760 (upload) and 870-879 (chat variant). The upload site at 753 builds its request with extra headers (`X-Goog-Upload-Protocol` etc.) — keep every existing header, only the `X-Firebase-Refresh` line goes and the wrap applies the same way.

- [ ] **Step 3: Rewire ScienceOfMasteryVC (~line 500)**

Same pattern: delete the `request.setValue(Auth.auth().currentUser?.refreshToken ?? "", forHTTPHeaderField: "X-Firebase-Refresh")` block, keep `Content-Type`/`timeoutInterval`/`httpBody`, wrap the dataTask tail in `QuizliProxyHeaders.apply(to: request) { request in ... }`.

- [ ] **Step 4: Rewire StudySet.studyFromVideo (~lines 52-70)**

Current shape: `guard let user = Auth.auth().currentUser else { AnonymousAuthManager… retry }` then `user.getIDToken { … request … }`. Replace the whole guard+getIDToken with the device-headers flow — onboarding no longer requires any Firebase user:

```swift
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        QuizliProxyHeaders.apply(to: request) { request in
            <EXISTING dataTask + decode + finish(r) tail, moved inside unchanged>
        }
```

(Build `body` exactly as the current code does inside the getIDToken closure — read the full function first; the JSON payload construction moves above the wrap, unchanged.)

- [ ] **Step 5: Replace EntitlementsManager's inline header block**

In `QuickNote/Resource/EntitlementsManager.swift`, `post(jws:)`'s inline header assembly (marked by the Task 3 comment) becomes:

```swift
        QuizliProxyHeaders.apply(to: request) { request in
            URLSession.shared.dataTask(with: request) { data, _, error in
                <existing body unchanged>
            }.resume()
        }
```

(Delete the now-duplicated DeviceID/refresh/AppCheck lines and the `import FirebaseAuth` / `import FirebaseAppCheck` if nothing else in the file uses them — `StoreKit` and `Foundation` stay.)

- [ ] **Step 6: Verify**

Run: `git -C "e:/Projects/Arasheed/QuickNote/QuickNote" grep -n "X-Firebase-Refresh" -- "*.swift"` → Expected: exactly ONE hit, inside `QuizliProxyHeaders.swift`.
Run: `git -C "e:/Projects/Arasheed/QuickNote/QuickNote" grep -c "QuizliProxyHeaders.apply" -- "*.swift"` → Expected: 9 (6 Gemini + ScienceOfMastery + StudySet + EntitlementsManager).
Run: `git -C "e:/Projects/Arasheed/QuickNote/QuickNote" grep -n "AnonymousAuthManager" -- "QuickNote/ViewController/Onboarding Study/StudySet.swift"` → Expected: no hits.

- [ ] **Step 7: Commit**

```bash
git add QuickNote/Resource/QuizliProxyHeaders.swift QuickNote/GeminiApi/GeminiApiManger.swift "QuickNote/ViewController/New Onboarding/ScienceOfMasteryVC.swift" "QuickNote/ViewController/Onboarding Study/StudySet.swift" QuickNote/Resource/EntitlementsManager.swift
git commit -m "feat: QuizliProxyHeaders — device+AppCheck+receipt headers on every proxy call"
```

---

### Task 5: QuizliSyncManager — signed-in-only sync

**Files:**
- Modify: `QuickNote/Resource/QuizliSyncManager.swift:44-60` (start), `:986` (sign-out flow), `:908` and `:936` (account-surface branches)
- Modify: `QuickNote/Resource/SignInWithAppleToFirebase/FirebaseAutho.swift:33,41,105`

**Interfaces:**
- Consumes: nothing new.
- Produces: `start()` safe to call at launch AND on sign-in (idempotent no-op while signed out — FirebaseAutho's listener re-invokes it on sign-in).

- [ ] **Step 1: Rework `start()` (lines ~44-60)**

Current shape:

```swift
    func start() {
        AnonymousAuthManager.shared.signInAnonymously { [weak self] success in
            guard let self = self, success else { return }
            self.refreshAdminFlag()
            self.syncProfilesUp()
            self.pullRemoteProfiles()
            self.syncAllDocumentsUp()
            … (whatever else the completion runs — read the full block first)
        }
    }
```

New shape (keep every call the completion made, in the same order):

```swift
    func start() {
        // Device identity model (spec §6): NO Firebase identity while
        // signed out — local SQLite is the source of truth and the server
        // knows this device by X-Device-ID. Sync (and the admin mirror)
        // run only for real accounts; FirebaseAutho's auth listener calls
        // start() again the moment a user signs in.
        guard let user = Auth.auth().currentUser, !user.isAnonymous else {
            print("ℹ️ [sync] signed out — local-only until Settings → Sync your data")
            return
        }
        refreshAdminFlag()
        syncProfilesUp()
        pullRemoteProfiles()
        syncAllDocumentsUp()
        … (the rest of the original completion body, verbatim)
    }
```

(Leftover anonymous users from the old app version are treated as signed-out — their notes stay local until they sign in, matching the spec's transition.)

- [ ] **Step 2: Fix the sign-out flow (~line 986)**

Current: after the local wipe it calls `AnonymousAuthManager.shared.createFreshAnonymousUser { _ in }`. Replace with a plain `try? Auth.auth().signOut()` (if the caller hasn't already signed out — read the surrounding function; Settings' sign-out path also exists, Task 6 fixes it) and delete the createFreshAnonymousUser call + its completion nesting. The surrounding wipe/UserDefaults-clearing lines stay exactly as they are.

- [ ] **Step 3: Fix the account-surface branches (lines ~908 and ~936)**

Both read `if user.isAnonymous {`. Change each to:

```swift
        if Auth.auth().currentUser == nil || Auth.auth().currentUser!.isAnonymous {
```

(read each branch first; the UI it drives — sign-in prompt vs account display — keeps working for genuinely signed-in users; leftover-anonymous now sees the sign-in prompt instead of the upgrade screen, which is the correct transition behavior).

- [ ] **Step 4: FirebaseAutho — logged-in semantics + sign-in hook + email**

a) Line 33 (`self.isLoggedIn = !user.isAnonymous`) and line 41 print: replace with:

```swift
                self.isLoggedIn = user != nil
                print("👤 Signed in: \(user != nil)")
                if user != nil && !user.isAnonymous {
                    // Sign-in (or app relaunch with an account): run the
                    // sync pipeline — start() no-ops while signed out, so
                    // this is safe to fire on every auth event.
                    QuizliSyncManager.shared.start()
                }
```

b) Line 105 (`getUserEmail()`): replace `return AnonymousAuthManager.shared.currentUserEmail()` with:

```swift
        return user?.email ?? "Nil"
```

- [ ] **Step 5: Verify**

Run: `git -C "e:/Projects/Arasheed/QuickNote/QuickNote" grep -n "AnonymousAuthManager" -- "QuickNote/Resource/QuizliSyncManager.swift" "QuickNote/Resource/SignInWithAppleToFirebase/FirebaseAutho.swift"` → Expected: no hits.

- [ ] **Step 6: Commit**

```bash
git add QuickNote/Resource/QuizliSyncManager.swift QuickNote/Resource/SignInWithAppleToFirebase/FirebaseAutho.swift
git commit -m "feat: sync runs for real accounts only — no anonymous identity at launch"
```

---

### Task 6: Remove anonymous auth everywhere else

**Files:**
- Delete: `QuickNote/Resource/SignInWithAppleToFirebase/AnonymousAuthManager.swift`
- Modify: `QuickNote/ViewController/New Onboarding/FounderMessageVC.swift:~138-152`
- Modify: `QuickNote/ViewController/New Onboarding/GoogleSignToFirebase.swift:~16-60`
- Modify: `QuickNote/ViewController/New Onboarding/SignInWithAppleToFirebase.swift:~63-90`
- Modify: `QuickNote/ViewController/New Onboarding/EmailAuthViewController.swift:~200-215`
- Modify: `QuickNote/ViewController/HomeViewController.swift:~226-245`
- Modify: `QuickNote/ViewController/SettingsViewController.swift:~143, ~220-235, ~315-330, ~43-46`

**Interfaces:**
- Consumes: Task 5's FirebaseAutho sign-in hook (sign-in paths need no extra sync calls).
- Produces: zero `AnonymousAuthManager` references repo-wide.

- [ ] **Step 1: FounderMessageVC (~138-152)** — delete the sign-in gate; proceed directly:

```swift
        AppLoaderManager.show()

        // Device identity (spec §6): no account needed onboarding — the
        // server knows this device by X-Device-ID.
        DispatchQueue.main.async {
            AppLoaderManager.dismiss()
            let push = WhoIsItForViewController.newPaymentFlow(
            <existing continuation, unchanged>
        }
```

(Read the full block first; only the `AnonymousAuthManager.shared.signInAnonymously { success in … }` wrapper goes — its success-branch body becomes the direct body.)

- [ ] **Step 2: The three sign-in providers — plain sign-in, no linking**

`GoogleSignToFirebase.swift` (~line 16-60), `SignInWithAppleToFirebase.swift` (~63-90), `EmailAuthViewController.swift` (~200-215): each has an `if let current = Auth.auth().currentUser, current.isAnonymous { current.link(with: credential) { … } }` branch. DELETE the link branch entirely and keep only the plain sign-in path, so each ends as:

```swift
            Auth.auth().signIn(with: credential) { authResult, error in
                if let error = error {
                    completion(.failure(error))
                } else {
                    completion(.success(authResult))
                }
            }
```

(For Google, this collapses the existing signIn fallback into the only path; adjust the comment above the function to "Sign in with Google — accounts sync via Settings; the local device quota carries over by device ID" style. Read each file fully; preserve each caller's completion signature exactly.)

- [ ] **Step 3: HomeViewController recovery fallback (~226-245)** — the `print("❌ No Firebase User Found")` + `AnonymousAuthManager.shared.signInAnonymously` block becomes:

```swift
        // Device identity (spec §6): signed-out is a normal state — no
        // recovery sign-in; the user stays local-only until they choose
        // Settings → Sync your data.
        if Auth.auth().currentUser == nil {
            print("ℹ️ [home] signed out — local-only")
            return
        }
```

(Keep whatever else that listener branch does for existing users.)

- [ ] **Step 4: SettingsViewController — four spots**

a) Line ~143: `UserDatabaseHelper.shared.hasUserAppliedPromo(email: AnonymousAuthManager.shared.currentUserEmail())` → replace with `FirebaseAutho.shared.getUserEmail()` (fixed in Task 5 to return the real email or "Nil").

b) Sign-out block (~220-235): after the wipe lines, `AnonymousAuthManager.shared.createFreshAnonymousUser { … }` is REPLACED by nothing — the block already called `try Auth.auth().signOut()` (verify; if signOut happens inside createFreshAnonymousUser's flow, add `try? Auth.auth().signOut()` explicitly) and then runs its UI refresh directly:

```swift
                        // Signed out — local-only device from here (spec §6).
                        self.checkLogin()
                        <existing UI refresh lines, unchanged>
```

c) Delete-account block (~315-330): after `try await user.delete()`, drop the `createFreshAnonymousUser` wrapper — keep `self.checkLogin()` (+ any existing UI refresh) running directly.

d) Lines ~43-46 (`print("👤 Anonymous…")` + `if user.isAnonymous {`): change to the signed-out check:

```swift
        if Auth.auth().currentUser == nil || Auth.auth().currentUser!.isAnonymous {
```

- [ ] **Step 5: Delete the manager + verify zero references**

```bash
git rm QuickNote/Resource/SignInWithAppleToFirebase/AnonymousAuthManager.swift
```

Run: `git -C "e:/Projects/Arasheed/QuickNote/QuickNote" grep -rn "AnonymousAuthManager\|signInAnonymously\|createFreshAnonymousUser" -- "*.swift"` → Expected: NO hits.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: anonymous auth removed — sign-in is opt-in via Settings"
```

---

### Task 7: Kevin build gate + on-device verification

**Files:** none (verification task — run by Kevin; controller assembles the checklist)

- [ ] **Step 1: Kevin — Xcode build**

`pod install` (Task 2's pod) → build → fix-forward any compile errors with the controller (paste errors into the session; expected trouble spots: closure brace depth in the six wrapped Gemini functions, optional chaining in Settings/Home edits).

- [ ] **Step 2: On-device checklist (sandbox account)**

1. Fresh install, stay signed out → generate a note → succeeds (device free tier); a second generation → 429 paywall (server-counted, `devices/{uuid}` doc appears in Firestore console with `freeUsed: true`).
2. Purchase any sandbox subscription → generation limits lift immediately (individual 5/day or family 15/day) with NO sign-in; `devices/{uuid}.entitlement` populated server-side.
3. Settings → Sync your data → sign in (Apple/Google/email) → notes sync; `users/{uid}.subscriptions` gets the plan field via `/api/ios/entitlements` (server-written — check the Firestore console); the free-note state carried over (no second freebie).
4. Sign out → local wipe → local-only generation works again on the device tier.
5. Second device (or reinstall), signed out → Settings → Restore Purchases → paid limits return from the receipt alone.
6. Simulator run: App Check debug provider prints a debug token on first call → register it once in Firebase console → App Check (quailizy) → Apps → Manage debug tokens.

- [ ] **Step 3: Controller records results** in `.superpowers/sdd/progress.md` (quizlia_landing) — including any fix-forward commits.
