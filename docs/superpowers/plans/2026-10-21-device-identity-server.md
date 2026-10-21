# Device Identity & Server-Authoritative Entitlements — Server Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the quizlia_landing (Netlify) half of the 2026-10-21 spec: signed-out iOS devices authorize via device ID + App Check + StoreKit receipts (no anonymous Firebase auth), and subscriptions become server-write-only.

**Architecture:** Device state lives in a new Firestore `devices/{deviceId}` collection written by the Admin SDK; the three `/api/ios/*` proxies gain a device-caller path alongside the existing account-token path; StoreKit JWS receipts are verified offline against Apple's root cert; Stripe checkout/webhook carry and write verified subscription state.

**Tech Stack:** Next.js 16 route handlers, firebase-admin 14 (already in package.json — NO new npm dependencies), node:crypto for JWS x5c verification, Stripe SDK.

**Spec:** `docs/superpowers/specs/2026-10-21-device-identity-sync-design.md`

## Global Constraints

- Spec quotas verbatim: free = **1 lifetime** generation; individual = **5/day**; family = **15/day**; chat = **100/day**; admin = unlimited. Error copy verbatim from `lib/quota.ts`: `"Your free note has been used. Upgrade to keep generating."`, `` `Daily limit reached (${limit} generations per day). Resets at midnight.` ``, `"Daily limit reached. Try again tomorrow."`, `"Quota update conflict, try again."`
- Plan→tier mapping (must match `planFromSubscriptions` in `lib/quota.ts`): `family_yearly`, `yearly`, `monthly`, `yearlyOffer` → family; `individual_yearly`, `weekly` → individual.
- NO new npm packages. `firebase-admin@14.5.0` and `@google-cloud/firestore@9.3.1` are already dependencies.
- No test framework exists in this repo — verification per task is `npm run lint` + `npm run build` + curl against `npm run dev` (Git Bash syntax; server on `http://localhost:3000`). Kevin hand-verifies UI in the browser.
- Per `AGENTS.md`: this Next.js version has breaking changes — before writing route code, read the relevant guide in `node_modules/next/dist/docs/`. Existing route handlers in `app/api/**` are the source of truth for handler signatures (`export async function POST(request: NextRequest, context: { params: Promise<...> })`).
- This repo **auto-deploys to Netlify from `main`** — commit only completed tasks; a task that adds a required env var must note the Netlify variable in its commit message.
- The service account JSON is a secret. It is never committed (`.gitignore:37 *.json` already covers it); it enters as `FIREBASE_SERVICE_ACCOUNT_B64` on Netlify, or `firebase-service-account.json` / `FIREBASE_SERVICE_ACCOUNT` locally (same convention as `scripts/migrate-to-uid.mjs`).
- App Check is **log-only** in this release: failures warn and the request proceeds. Enforcement constant: `APP_CHECK_ENFORCE=1` flips it (do not set on Netlify yet).
- Bundle id for receipt checks: `com.test.QuickNote`.

---

### Task 1: Admin SDK bootstrap module

**Files:**
- Create: `lib/admin-firestore.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Tasks 2, 4, 5, 8, 11): `getAdminApp(): FirebaseApp`, `getAdminDb(): Firestore`, `getAdminAppCheck(): appCheck.AppCheck`, `getAdminAuth(): auth.Auth`. All throw a clear error only when actually called without credentials (importing the module must never crash a build).

- [ ] **Step 1: Write `lib/admin-firestore.ts`**

Follows the credential-resolution convention of `scripts/migrate-to-uid.mjs` (env JSON → local file), adding the base64 form for Netlify's single-line env vars.

```ts
// Server-only Firebase Admin access (Netlify functions + local scripts).
// Credential resolution order:
//   1. FIREBASE_SERVICE_ACCOUNT_B64  — base64 of the service-account JSON
//      (Netlify env vars are single-line; see .env.example for the
//      PowerShell one-liner that produces it)
//   2. FIREBASE_SERVICE_ACCOUNT      — raw JSON string (script convention)
//   3. firebase-service-account.json — local dev file (gitignored)
// Never import this from client code; it stays inside app/api + lib/server.
import { readFileSync } from "fs";
import { initializeApp, getApps, cert, App as AdminApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAppCheck, AppCheck } from "firebase-admin/app-check";
import { getAuth, Auth } from "firebase-admin/auth";

let cachedApp: AdminApp | undefined;

function resolveServiceAccount(): Record<string, unknown> {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf8"));
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  try {
    return JSON.parse(readFileSync("firebase-service-account.json", "utf8"));
  } catch {
    throw new Error(
      "Admin credentials missing: set FIREBASE_SERVICE_ACCOUNT_B64 (Netlify) " +
        "or provide firebase-service-account.json (local dev)."
    );
  }
}

/** Lazily-initialized Admin app singleton (credentials resolved on first use). */
export function getAdminApp(): AdminApp {
  if (!cachedApp) {
    const existing = getApps();
    cachedApp = existing.length
      ? existing[0]
      : initializeApp({ credential: cert(resolveServiceAccount() as any) });
  }
  return cachedApp;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAppCheck(): AppCheck {
  return getAppCheck(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
```

- [ ] **Step 2: Append the env documentation to `.env.example`**

```text
# Firebase Admin (server-only; used by /api/ios/* device path, entitlements,
# Stripe webhook, scripts). Base64 keeps it single-line for Netlify:
#   [Convert]::ToBase64String([IO.File]::ReadAllBytes("firebase-service-account.json"))
FIREBASE_SERVICE_ACCOUNT_B64=

# App Check enforcement flip (log-only until the acquirer signs off; leave unset)
APP_CHECK_ENFORCE=

# Web App Check provider site key (Firebase console → App Check → Apps → reCAPTCHA v3)
NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY=
```

- [ ] **Step 3: Verify compile**

Run: `npm run lint && npm run build`
Expected: both pass, no new warnings referencing `lib/admin-firestore.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/admin-firestore.ts .env.example
git commit -m "feat: admin SDK bootstrap with B64/env/file credential resolution"
```

---

### Task 2: `devices/{deviceId}` data layer

**Files:**
- Create: `lib/devices.ts`
- Modify: `lib/quota.ts` (export `today`)

**Interfaces:**
- Consumes: `getAdminDb` (Task 1), `QuotaResult`, `PlanKind` from `lib/quota.ts`.
- Produces (used by Tasks 4, 5): `DeviceDoc`, `readDevice(deviceId)`, `meterDeviceGeneration(deviceId, plan)`, `meterDeviceChat(deviceId)`, `setDeviceEntitlement(deviceId, entitlement)`, `syncFreeUsedAcrossLink(deviceId, uid)`.

- [ ] **Step 1: Export `today` from quota.ts**

In `lib/quota.ts` change:

```ts
const today = () => new Date().toISOString().split("T")[0];
```

to:

```ts
export const today = () => new Date().toISOString().split("T")[0];
```

- [ ] **Step 2: Write `lib/devices.ts`**

Admin-SDK mirror of `lib/quota.ts` semantics for signed-out devices (free = 1 lifetime, individual = 5/day, family = 15/day, chat = 100/day — verbatim copy from Global Constraints; server-anchored UTC dates like quota.ts).

```ts
// Per-device server state for signed-out iOS callers (spec §5.3/§7).
// Devices have no Firebase Auth identity, so the Admin SDK owns these
// docs and firestore.rules denies all client access. Semantics mirror
// lib/quota.ts (same limits, same messages, same UTC date anchoring).
import { getAdminDb } from "@/lib/admin-firestore";
import { GENERATION_LIMITS, today, type PlanKind, type QuotaResult } from "@/lib/quota";

export interface DeviceEntitlement {
  plan: "individual" | "family";
  productField: string; // subscriptions field name, e.g. "family_yearly"
  productId: string;
  transactionId: string;
  expiresAt: string; // ISO
  renewalDate?: string; // ISO
  verifiedAt: string; // ISO — cache window anchors here (spec §5.4)
}

export interface DeviceDoc {
  freeUsed?: boolean;
  used?: number;
  date?: string;
  recentSets?: string[];
  chatUsed?: number;
  chatDate?: string;
  entitlement?: DeviceEntitlement | null;
  linkedUid?: string;
}

const DEVICE_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

export function isValidDeviceId(deviceId: string): boolean {
  return DEVICE_ID_RE.test(deviceId);
}

export async function readDevice(deviceId: string): Promise<DeviceDoc> {
  const snap = await getAdminDb().collection("devices").doc(deviceId).get();
  return (snap.data() as DeviceDoc) ?? {};
}

async function patchDevice(
  deviceId: string,
  build: (doc: DeviceDoc) => DeviceDoc
): Promise<boolean> {
  const ref = getAdminDb().collection("devices").doc(deviceId);
  try {
    await getAdminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const next = build((snap.data() as DeviceDoc) ?? {});
      tx.set(ref, { ...next, updatedAt: new Date().toISOString() }, { merge: true });
    });
    return true;
  } catch {
    // runTransaction retries contention internally and REJECTS when it
    // gives up — that rejection is the conflict path the meters report
    // as {ok:false, status:500}. (Plan amendment 2026-10-21: the original
    // returned the transaction's callback value, which was always true.)
    return false;
  }
}

/** Mirrors meterGeneration() from lib/quota.ts for device callers.
 *  `setId` dedupes retries (same semantics as quota.ts recentSets) — a
 *  paid device retrying a failed video generation burns one unit, not one
 *  per attempt. (Plan amendment 2026-10-21, from Task 4 review.) */
export async function meterDeviceGeneration(
  deviceId: string,
  plan: PlanKind,
  setId?: string
): Promise<QuotaResult> {
  const doc = await readDevice(deviceId);

  if (setId && doc.date === today() && (doc.recentSets ?? []).includes(setId)) {
    return { ok: true };
  }

  if (plan === "free") {
    if (doc.freeUsed) {
      return { ok: false, status: 429, message: "Your free note has been used. Upgrade to keep generating." };
    }
    const ok = await patchDevice(deviceId, (d) => ({
      date: today(),
      used: (d.date === today() ? d.used ?? 0 : 0) + 1,
      freeUsed: true,
      ...(setId && { recentSets: [setId] }),
    }));
    return ok ? { ok: true } : { ok: false, status: 500, message: "Quota update conflict, try again." };
  }

  const limit = plan === "family" ? GENERATION_LIMITS.family : GENERATION_LIMITS.individual;
  const used = doc.date === today() ? doc.used ?? 0 : 0;
  if (used >= limit) {
    return { ok: false, status: 429, message: `Daily limit reached (${limit} generations per day). Resets at midnight.` };
  }
  const ok = await patchDevice(deviceId, (d) => ({
    date: today(),
    used: (d.date === today() ? d.used ?? 0 : 0) + 1,
    ...(setId && {
      recentSets: [...(d.date === today() ? d.recentSets ?? [] : []), setId].slice(-10),
    }),
  }));
  return ok ? { ok: true } : { ok: false, status: 500, message: "Quota update conflict, try again." };
}

/** Mirrors meterChat() from lib/quota.ts for device callers (100/day). */
export async function meterDeviceChat(deviceId: string): Promise<QuotaResult> {
  const doc = await readDevice(deviceId);
  const used = doc.chatDate === today() ? doc.chatUsed ?? 0 : 0;
  if (used >= 100) {
    return { ok: false, status: 429, message: "Daily limit reached. Try again tomorrow." };
  }
  const ok = await patchDevice(deviceId, (d) => ({
    chatDate: today(),
    chatUsed: (d.chatDate === today() ? d.chatUsed ?? 0 : 0) + 1,
  }));
  return ok ? { ok: true } : { ok: false, status: 500, message: "Quota update conflict, try again." };
}

export async function setDeviceEntitlement(
  deviceId: string,
  entitlement: DeviceEntitlement | null
): Promise<void> {
  await getAdminDb().collection("devices").doc(deviceId).set(
    { entitlement, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/** One-identity-one-budget (spec §5.5): after linking, neither side has a
 *  second free generation. The account-side write is rollover-aware
 *  (plan amendment 2026-10-21): date/used are pinned only when the
 *  account's counter is NOT already today's — a stale yesterday `used`
 *  must not throttle today, and today's real usage must not be reset. */
export async function syncFreeUsedAcrossLink(deviceId: string, uid: string): Promise<void> {
  const [device, quotaSnap] = await Promise.all([
    readDevice(deviceId),
    getAdminDb().collection("generationQuota").doc(uid).get(),
  ]);
  const quota = (quotaSnap.data() ?? {}) as { freeUsed?: boolean; date?: string };
  if (device.freeUsed && !quota.freeUsed) {
    const isToday = quota.date === today();
    await getAdminDb().collection("generationQuota").doc(uid).set(
      {
        freeUsed: true,
        ...(!isToday && { date: today(), used: 0 }),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } else if (quota.freeUsed && !device.freeUsed) {
    await patchDevice(deviceId, () => ({ freeUsed: true }));
  }
}
```

- [ ] **Step 3: Verify compile**

Run: `npm run lint && npm run build`
Expected: pass. (Runtime behavior is exercised end-to-end in Task 4's curl matrix.)

- [ ] **Step 4: Commit**

```bash
git add lib/devices.ts lib/quota.ts
git commit -m "feat: devices collection data layer mirroring quota semantics"
```

---

### Task 3: StoreKit 2 JWS offline verifier

**Files:**
- Create: `lib/certs/AppleRootCA-G3.pem` (downloaded, not hand-written)
- Create: `lib/storekit-products.ts`
- Create: `lib/storekit-verify.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (used by Tasks 4, 5): `type StoreKitEntitlement = DeviceEntitlement` (re-exported from `lib/devices.ts`), `verifyStoreKitJws(jws: string): StoreKitEntitlement | null`, `bestEntitlement(jwsList: string[]): StoreKitEntitlement | null`.

- [ ] **Step 1: Download Apple's root certificate**

Run (Git Bash) — note: Apple's exact URL extension has shifted between `.crt`/`.cer`; grab the Apple Root CA - G3 file from https://www.apple.com/certificateauthority/ and convert if needed:

```bash
curl -L "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer" -o /tmp/AppleRootCA-G3.cer
openssl x509 -inform DER -in /tmp/AppleRootCA-G3.cer -outform PEM -out "lib/certs/AppleRootCA-G3.pem"
openssl x509 -in "lib/certs/AppleRootCA-G3.pem" -noout -subject
```

Expected subject output contains `CN=Apple Root CA - G3`. Create `lib/certs/` first if needed (`mkdir -p lib/certs`). If `openssl` is unavailable, use PowerShell:

```powershell
Invoke-WebRequest "https://www.apple.com/certificateauthority/AppleRootCA-G3.crt" -OutFile "$env:TEMP\AppleRootCA-G3.crt"
certutil -decode "$env:TEMP\AppleRootCA-G3.crt" "lib\certs\AppleRootCA-G3.pem"
```

`certutil -decode` on a DER cert yields PEM only if the file carries PEM headers — verify the file starts with `-----BEGIN CERTIFICATE-----`; otherwise convert with `openssl` as above.

- [ ] **Step 2: Write `lib/storekit-products.ts`**

The five live product IDs live in the gitignored `Appconstants.swift` (`isProductFamilyYearlyId`, `isProductIndividualYearlyId`, `isProductLatestWeeklyId`, `isProductYearlyId`, `isProductYearlyDiscountId`) and in App Store Connect → QuizliAI → Subscriptions. Copy the exact strings into this map — an unknown productId makes every receipt verify as `null` (fail closed), which the Task 4 curl matrix will catch immediately.

```ts
// StoreKit product IDs → subscriptions field + plan tier.
// ⚠ Values MUST match Appconstants.swift (isProduct*Id) and
// planFromSubscriptions in lib/quota.ts. They are gitignored on the iOS
// side, so they are mirrored here explicitly.
export const PRODUCT_FIELD_BY_ID: Record<string, { field: string; plan: "individual" | "family" }> = {
  // isProductFamilyYearlyId:
  "REPLACE_FAMILY_YEARLY": { field: "family_yearly", plan: "family" },
  // isProductYearlyId (legacy annual):
  "REPLACE_YEARLY": { field: "yearly", plan: "family" },
  // isProductYearlyDiscountId:
  "REPLACE_YEARLY_OFFER": { field: "yearlyOffer", plan: "family" },
  // isProductIndividualYearlyId:
  "REPLACE_INDIVIDUAL_YEARLY": { field: "individual_yearly", plan: "individual" },
  // isProductLatestWeeklyId:
  "REPLACE_WEEKLY": { field: "weekly", plan: "individual" },
};
```

Replace each `REPLACE_*` value with the real product ID string before committing.

- [ ] **Step 3: Write `lib/storekit-verify.ts`**

```ts
// Offline StoreKit 2 signed-transaction (JWS) verification — spec §5.4.
// Chain: leaf cert ← intermediate ← Apple Root CA - G3 (embedded PEM).
// Signature: ES256 over `${header}.${payload}` with the leaf's public key.
// No network, no Apple API key; fail closed (null) on ANY anomaly.
import { createVerify, X509Certificate } from "node:crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { PRODUCT_FIELD_BY_ID } from "@/lib/storekit-products";
import type { DeviceEntitlement } from "@/lib/devices";

const APPLE_ROOT_CA_G3 = readFileSync(join(process.cwd(), "lib/certs/AppleRootCA-G3.pem"), "utf8");
const EXPECTED_BUNDLE_ID = "com.test.QuickNote";

interface JwsHeader {
  alg: string;
  x5c: string[];
}

interface TransactionPayload {
  bundleId: string;
  productId: string;
  transactionId: string;
  expiresDate: number; // ms since epoch
  revocationDate?: number | null;
  signedDate: number;
}

function b64urlToBuffer(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function certFromPemB64(pemB64: string): X509Certificate {
  return new X509Certificate(`-----BEGIN CERTIFICATE-----\n${pemB64}\n-----END CERTIFICATE-----`);
}

/** true iff `child` is directly signed by `parent`. */
function signedBy(child: X509Certificate, parent: X509Certificate): boolean {
  return child.verify(parent.publicKey);
}

/** true iff the leaf's signature over the signing input is valid. */
function signatureValid(signingInput: string, signature: Buffer, leaf: X509Certificate): boolean {
  const verify = createVerify("SHA256");
  verify.update(signingInput);
  // JWS ES256 signatures are raw r||s (RFC 7518 / IEEE P1363), NOT DER.
  // (Plan amendment 2026-10-21: original said "der", which rejects every
  // genuine StoreKit receipt — probe-verified by the Task 3 implementer.)
  return verify.verify({ key: leaf.publicKey, dsaEncoding: "ieee-p1363" }, signature);
}

export function verifyStoreKitJws(jws: string): DeviceEntitlement | null {
  try {
    const [h, p, s] = jws.split(".");
    if (!h || !p || !s) return null;

    const header: JwsHeader = JSON.parse(b64urlToBuffer(h).toString("utf8"));
    if (header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length < 2) return null;

    const certs = header.x5c.map(certFromPemB64);
    const leaf = certs[0];
    const root = new X509Certificate(APPLE_ROOT_CA_G3);

    // Chain walk (plan amendment 2026-10-21: the original indexed
    // x5c[len-2] as "intermediate", which under Apple's actual
    // [leaf, intermediate, root] shape tested the intermediate against
    // ITSELF — rejecting every genuine receipt; probe-confirmed with a
    // synthetic chain). Walk consecutive pairs — each cert must be signed
    // by the next — then anchor the trailing cert at the embedded root.
    for (let i = 0; i < certs.length - 1; i++) {
      if (!signedBy(certs[i], certs[i + 1])) return null;
    }
    const last = certs[certs.length - 1];
    // raw-DER comparison — @types/node@20 lacks X509Certificate#equals;
    // Node's runtime equals() itself compares this.raw, so identical.
    if (!last.raw.equals(root.raw) && !signedBy(last, root)) return null;

    if (!signatureValid(`${h}.${p}`, b64urlToBuffer(s), leaf)) return null;

    const payload: TransactionPayload = JSON.parse(b64urlToBuffer(p).toString("utf8"));
    if (payload.bundleId !== EXPECTED_BUNDLE_ID) return null;
    if (payload.revocationDate != null) return null;
    if (payload.expiresDate <= Date.now()) return null;

    const mapped = PRODUCT_FIELD_BY_ID[payload.productId];
    if (!mapped) return null;

    return {
      plan: mapped.plan,
      productField: mapped.field,
      productId: payload.productId,
      transactionId: String(payload.transactionId),
      expiresAt: new Date(payload.expiresDate).toISOString(),
      renewalDate: new Date(payload.expiresDate).toISOString(),
      verifiedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Best (family > individual, then longest expiry) of a receipt list. */
export function bestEntitlement(jwsList: string[]): DeviceEntitlement | null {
  const verified = jwsList
    .map((jws) => verifyStoreKitJws(jws))
    .filter((e): e is DeviceEntitlement => e !== null);
  if (!verified.length) return null;
  verified.sort((a, b) =>
    a.plan !== b.plan
      ? a.plan === "family" ? -1 : 1
      : b.expiresAt.localeCompare(a.expiresAt)
  );
  return verified[0];
}
```

- [ ] **Step 4: Verify compile + fail-closed behavior**

Run: `npm run lint && npm run build`
Expected: pass.

Run a quick fail-closed smoke (Git Bash; expects `null` for garbage):

```bash
node -e "const ts=require('child_process').execSync; console.log('compile-only check done')"
```

(Real receipts cannot be minted on Windows — full verification happens in Task 4's curl matrix with a receipt Kevin exports from a device, and against StoreKit sandbox during iOS testing.)

- [ ] **Step 5: Commit**

The repo's `.gitignore` has a stock `*.pem` rule — add a scoped exception (end of `.gitignore`, so future cert refreshes stage normally) and force-add this first PEM past the stock rule:

```text
# Apple root CA (public cert) used by lib/storekit-verify.ts — not a secret
!lib/certs/*.pem
```

```bash
git add -f lib/certs/AppleRootCA-G3.pem
git add lib/storekit-products.ts lib/storekit-verify.ts .gitignore
git commit -m "feat: offline StoreKit 2 JWS verification (x5c chain to Apple root)"
```

> Deployment watch-item (handled in Task 13): the PEM is read via
> `process.cwd()` at module load — verify Netlify's function bundle
> includes it (Next output file tracing); if not, add the file to
> `outputFileTracingIncludes` for the `/api/ios/*` routes in
> `next.config.js` (check `node_modules/next/dist/docs/` for this Next
> version's exact key).

---

### Task 4: Device-caller path in the three iOS proxies

**Files:**
- Create: `lib/caller.ts`
- Modify: `app/api/ios/gemini/[purpose]/route.ts`
- Modify: `app/api/ios/study-from-video/route.ts`
- Modify: `app/api/ios/upload/route.ts`

**Interfaces:**
- Consumes: `resolveCaller`, `exchangeRefreshToken`, `verifyIdToken` from `lib/token-verify.ts`; `isValidDeviceId`, `meterDeviceGeneration`, `meterDeviceChat`, `readDevice` from `lib/devices.ts`; `verifyStoreKitJws` from `lib/storekit-verify.ts`; `getAdminAppCheck` from `lib/admin-firestore.ts`.
- Produces (used by Task 5): `DeviceCaller = { kind: "device"; deviceId: string; entitlement: DeviceEntitlement | null }`, `resolveAccountCaller(request): Promise<VerifiedToken | null>`, `resolveDeviceCaller(request): Promise<DeviceCaller | null>`, `devicePlan(entitlement): PlanKind`.

- [ ] **Step 1: Write `lib/caller.ts`**

```ts
// Caller resolution for /api/ios/* — spec §5.3. Account tokens win; a
// signed-out device authenticates with X-Device-ID (+ App Check token,
// log-only until APP_CHECK_ENFORCE=1) and proves paid status inline via a
// StoreKit JWS receipt in X-Storekit-Jws.
import { NextRequest } from "next/server";
import { resolveCaller, type VerifiedToken } from "@/lib/token-verify";
import { isValidDeviceId, readDevice, type DeviceEntitlement } from "@/lib/devices";
import { verifyStoreKitJws } from "@/lib/storekit-verify";
import { getAdminAppCheck } from "@/lib/admin-firestore";
import type { PlanKind } from "@/lib/quota";

export type DeviceCaller = {
  kind: "device";
  deviceId: string;
  entitlement: DeviceEntitlement | null;
};

export async function resolveAccountCaller(request: NextRequest): Promise<VerifiedToken | null> {
  return resolveCaller(
    request.headers.get("authorization") || "",
    request.headers.get("x-firebase-refresh")
  );
}

/** Log-only until APP_CHECK_ENFORCE=1 (spec §8.3). */
export async function verifyAppCheck(request: NextRequest): Promise<void> {
  const token = request.headers.get("x-app-check");
  if (!token) {
    console.warn("[appcheck] missing token (log-only)");
    return;
  }
  try {
    await getAdminAppCheck().verifyToken(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (process.env.APP_CHECK_ENFORCE === "1") throw err;
    console.warn(`[appcheck] invalid token (log-only): ${message}`);
  }
}

export function devicePlan(entitlement: DeviceEntitlement | null): PlanKind {
  return entitlement ? entitlement.plan : "free";
}

export async function resolveDeviceCaller(request: NextRequest): Promise<DeviceCaller | null> {
  const deviceId = request.headers.get("x-device-id") || "";
  if (!isValidDeviceId(deviceId)) return null;
  const jws = request.headers.get("x-storekit-jws");
  if (jws) return { kind: "device", deviceId, entitlement: verifyStoreKitJws(jws) };
  // No receipt attached: consult the cached entitlement (spec §5.4) —
  // valid while min(expiresAt, verifiedAt + 24h) is in the future.
  const doc = await readDevice(deviceId);
  const cached = doc.entitlement;
  if (
    cached &&
    Date.parse(cached.expiresAt) > Date.now() &&
    Date.now() - Date.parse(cached.verifiedAt) < 24 * 60 * 60 * 1000
  ) {
    return { kind: "device", deviceId, entitlement: cached };
  }
  return { kind: "device", deviceId, entitlement: null };
}
```

- [ ] **Step 2: Rework `app/api/ios/gemini/[purpose]/route.ts`**

Replace the caller/quota section. Old block (verbatim from the file):

```ts
  const caller = await resolveCaller(
    request.headers.get("authorization") || "",
    request.headers.get("x-firebase-refresh")
  );
  if (!caller) {
    return NextResponse.json({ error: { code: 401, message: "Not authenticated" } }, { status: 401 });
  }
```

New block:

```ts
  // Account tokens win; signed-out devices fall through to the device path.
  await verifyAppCheck(request);
  const caller = await resolveAccountCaller(request);
  if (!caller) {
    const device = await resolveDeviceCaller(request);
    if (!device) {
      return NextResponse.json({ error: { code: 401, message: "Not authenticated" } }, { status: 401 });
    }
    const plan = devicePlan(device.entitlement);
    const meter = purpose === "generation"
      ? await meterDeviceGeneration(device.deviceId, plan)
      : await meterDeviceChat(device.deviceId);
    if (!meter.ok) {
      return NextResponse.json(
        { error: { code: meter.status, message: meter.message } },
        { status: meter.status }
      );
    }
    return await proxyToGemini(request, purpose); // step 3 extracts this
  }
```

Then extract the existing fetch-to-Gemini tail of the POST handler into:

```ts
// Everything after quota passes: read the JSON body and stream it to
// Gemini with the server-side key. Shared by account and device callers.
async function proxyToGemini(request: NextRequest, purpose: string): Promise<Response> {
  // …move the existing body-parse + fetch(GEMINI_URL …) + response
  // mapping code here unchanged…
}
```

(Read the current tail of the file first; move it verbatim — only its entry conditions change. The account path continues through the existing `checkQuota(purpose, token, caller.uid)` gate and then calls `proxyToGemini` too. Update the header comment's auth description to mention the device path.)

Imports to add at the top:

```ts
import { verifyAppCheck, resolveAccountCaller, resolveDeviceCaller, devicePlan } from "@/lib/caller";
import { meterDeviceGeneration, meterDeviceChat } from "@/lib/devices";
```

(`resolveCaller`/`exchangeRefreshToken` stay imported only where still used.)

- [ ] **Step 3: Apply the same pattern to `app/api/ios/study-from-video/route.ts`**

It has the identical `resolveCaller(...)` block (around lines 130–151). Replace it the same way: `verifyAppCheck` → account caller → device caller fallback → meter via `meterDeviceGeneration` (this route generates notes, so it consumes the generation bucket — check its current metering call and keep whichever bucket it uses today: if it calls `meterGeneration`, use `meterDeviceGeneration`; if none, only gate on auth). Keep its transcript/generation logic untouched.

- [ ] **Step 4: Apply auth-only version to `app/api/ios/upload/route.ts`**

Upload has no quota metering — only the caller gate changes:

```ts
  await verifyAppCheck(request);
  const caller = await resolveAccountCaller(request);
  if (!caller) {
    const device = await resolveDeviceCaller(request);
    if (!device) {
      return NextResponse.json({ error: { code: 401, message: "Not authenticated" } }, { status: 401 });
    }
  }
```

- [ ] **Step 5: Build and run the curl matrix**

Run: `npm run lint && npm run build` — expected: pass.
Run: `npm run dev` (background), then in Git Bash (generate `uuidgen` output once and reuse it as `$DID`):

```bash
DID=$(uuidgen | tr 'A-Z' 'a-z')

# 1. No credentials → 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/ios/gemini/chat \
  -H "content-type: application/json" -d '{"messages":[]}'
# Expected: 401

# 2. Device chat meters first, then proxies (body shape doesn't matter for
#    the quota assertions — metering runs before the body is used)
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/ios/gemini/chat \
  -H "content-type: application/json" -H "x-device-id: $DID" -d '{}'
# Expected: 200 with a valid GEMINI_API_KEY; any 4xx/500 from the upstream
# call is fine — what matters is that devices/{$DID}.chatUsed became 1.

# 3. Device generation ×2 — the second call is the deterministic assertion
#    (free = 1 lifetime). Metering runs before body handling, so `-d '{}'` works.
curl -s -w "\n%{http_code}\n" -X POST localhost:3000/api/ios/gemini/generation \
  -H "content-type: application/json" -H "x-device-id: $DID" -d '{}'
# Expected: first call → any status (quota passed), then the second identical
# call → 429 with "Your free note has been used. Upgrade to keep generating."

# 4. Bad device id → 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/ios/gemini/chat \
  -H "content-type: application/json" -H "x-device-id: ../etc" -d '{}'
# Expected: 401
```

Then verify in the Firestore console that `devices/{$DID}` exists with `freeUsed: true` and `chatUsed ≥ 1`. (If `.env.local` lacks `GEMINI_API_KEY`, steps 2–3 return the route's 500 "Gemini key not configured" — quota metering happens before that, so the doc still appears; treat 500-with-doc-created as pass for quota logic.)

- [ ] **Step 6: Commit**

```bash
git add lib/caller.ts app/api/ios/gemini/[purpose]/route.ts app/api/ios/study-from-video/route.ts app/api/ios/upload/route.ts
git commit -m "feat: device-caller path (X-Device-ID + App Check + JWS) in iOS proxies"
```

---

### Task 5: `/api/ios/entitlements` endpoint

**Files:**
- Create: `app/api/ios/entitlements/route.ts`

**Interfaces:**
- Consumes: `lib/caller.ts` (Task 4), `bestEntitlement` (Task 3), `setDeviceEntitlement`, `syncFreeUsedAcrossLink` (Task 2), `getAdminDb` (Task 1).
- Produces: POST `{ jws: string[] }` → `{ plan: "free"|"individual"|"family", linked: boolean }`; writes `devices/{deviceId}.entitlement`, `devices/{deviceId}.linkedUid`, and merges `users/{uid}.subscriptions.<field>`.

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAppCheck, resolveAccountCaller, resolveDeviceCaller } from "@/lib/caller";
import { bestEntitlement } from "@/lib/storekit-verify";
import { setDeviceEntitlement, syncFreeUsedAcrossLink } from "@/lib/devices";
import { getAdminDb } from "@/lib/admin-firestore";

export const dynamic = "force-dynamic";

// Receipt intake + device↔account linking (spec §5.5).
//   signed-out: verify JWS → cache devices/{deviceId}.entitlement → plan
//   signed-in:  verify JWS → ADMIN-merge users/{uid}.subscriptions
//               (never downgrades; Stripe webhook owns deactivation),
//               set linkedUid, sync the one-budget freeUsed rule.
export async function POST(request: NextRequest) {
  let body: { jws?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 400, message: "Invalid JSON" } }, { status: 400 });
  }
  const receipts = Array.isArray(body.jws) ? body.jws : [];
  if (!receipts.length) {
    return NextResponse.json({ error: { code: 400, message: "Missing jws[]" } }, { status: 400 });
  }

  // (Plan amendment 2026-10-21, from Task 5 review: infra failures —
  // Firestore blips, enforce-mode App Check throws — must surface as the
  // repo's shaped 500, not Next's default body.)
  try {
    await verifyAppCheck(request);
    const entitlement = bestEntitlement(receipts);
    const account = await resolveAccountCaller(request);
    const device = await resolveDeviceCaller(request);

    if (!account && !device) {
      return NextResponse.json({ error: { code: 401, message: "Not authenticated" } }, { status: 401 });
    }

    // 1. Device side: cache whatever was proven (or clear a stale one).
    if (device) {
      await setDeviceEntitlement(device.deviceId, entitlement);
    }

    // 2. Account side: merge upward and record the link.
    if (account) {
      if (entitlement) {
        await getAdminDb().collection("users").doc(account.uid).set(
          {
            [`subscriptions.${entitlement.productField}.active`]: true,
            ...(entitlement.renewalDate && {
              [`subscriptions.${entitlement.productField}.renewalDate`]: entitlement.renewalDate,
            }),
          },
          { merge: true }
        );
      }
      if (device) {
        await getAdminDb().collection("devices").doc(device.deviceId).set(
          { linkedUid: account.uid, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        await syncFreeUsedAcrossLink(device.deviceId, account.uid);
      }
    }

    const plan = entitlement ? entitlement.plan : "free";
    return NextResponse.json({ plan, linked: !!account });
  } catch (error) {
    console.error("Entitlements error:", error);
    return NextResponse.json(
      { error: { code: 500, message: "Entitlement sync failed, try again." } },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify with curl**

```bash
DID=$(uuidgen | tr 'A-Z' 'a-z')

# missing body → 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/ios/entitlements \
  -H "content-type: application/json" -H "x-device-id: $DID" -d '{}'
# Expected: 400

# device with garbage receipt → 200 {plan:"free"} (fail closed), doc created
curl -s -X POST localhost:3000/api/ios/entitlements \
  -H "content-type: application/json" -H "x-device-id: $DID" \
  -d '{"jws":["garbage.receipt.here"]}'
# Expected: {"plan":"free","linked":false}
```

Firestore console: `devices/{$DID}` has `entitlement: null`. A real receipt test runs on-device during iOS integration (sandbox receipt from Settings → Restore Purchases).

- [ ] **Step 3: Commit**

```bash
git add app/api/ios/entitlements/route.ts
git commit -m "feat: /api/ios/entitlements — receipt intake + device-account link merge"
```

---

### Task 6: Firestore rules — device collections deny-all

> ⚠️ **Ordering decision (deviation from spec §5.7 is timing-only):** the
> `subscriptions` server-write-only lockdown is **NOT deployed in this task**.
> The live App Store build (1.0.12) still mirrors entitlements from the client
> (`QuizliSyncManager.recordEntitlements` writes `subscriptions.*` with the
> user's token). Locking the rules now would silently drop paying users'
> mirrors server-side. The lockdown deploys at cutover — Task 12 — after the
> rebuilt app ships. The end state matches the spec exactly.

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: none.
- Produces: `devices/*` and `stripeSubscriptions/*` deny-all rules (deployed via Firebase console paste — this repo has no firebase.json; the file is the source of truth).

- [ ] **Step 1: Add the device collections inside `match /databases/{database}/documents`**

Place directly above the `match /users/{userId}` block:

```text
    // Device-keyed server state for signed-out iOS callers (spec §7).
    // Written/read only by the Admin SDK (Netlify); clients never touch it.
    match /devices/{deviceId} {
      allow read, write: if false;
    }

    // Stripe subscription → uid mapping used by the webhook (Task 8).
    match /stripeSubscriptions/{subscriptionId} {
      allow read, write: if false;
    }
```

- [ ] **Step 2: Deploy and regression-test**

Rules deploy by paste: Firebase console (quailizy) → Firestore → Rules → paste `firestore.rules` → Publish.
Regression on `localhost:3000` (still running Task 4's server):

```bash
# account flows still pass (web signed-in note flow — Kevin verifies in browser)
# device flows unaffected (Admin SDK bypasses rules)
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/ios/gemini/chat \
  -H "content-type: application/json" -H "x-device-id: $(uuidgen | tr 'A-Z' 'a-z')" -d '{"messages":[]}'
# Expected: 200 (or 500 if no GEMINI_API_KEY) — NOT 401
```

Kevin hand-verifies in the browser: sign in on `/note`, notes list loads, profile saves (client writes to `users/{uid}` non-subscription fields still allowed).

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: rules — devices/stripeSubscriptions collections deny-all"
```

---

### Task 7: Stripe checkout — authenticated caller + uid metadata

**Files:**
- Modify: `app/api/stripe/checkout/route.ts`
- Modify: `app/note/pricing/page.tsx:35` area
- Modify: `components/app/PaywallModal.tsx:24` area

**Interfaces:**
- Consumes: `verifyIdToken` from `lib/token-verify.ts`.
- Produces: checkout sessions whose `metadata.uid` is a VERIFIED uid; client sends `Authorization: Bearer <idToken>`.

- [ ] **Step 1: Verify the caller in the checkout route**

After `const { priceId, profileId, planId } = await request.json();` and inside the non-demo branch (after `const stripe = new Stripe(stripeSecretKey);`), add:

```ts
    // Real checkout requires a verified signed-in user — the webhook
    // writes subscriptions for this uid later (spec §5.6).
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const caller = idToken ? await verifyIdToken(idToken) : null;
    if (!caller) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
```

Add to the import block: `import { verifyIdToken } from "@/lib/token-verify";`
And extend the session metadata:

```ts
      metadata: {
        uid: caller.uid,
        profileId: String(profileId),
        planId,
      },
```

Demo mode (no Stripe keys) stays exactly as-is — no auth there.

- [ ] **Step 2: Send the ID token from both checkout callers**

In `app/note/pricing/page.tsx` and `components/app/PaywallModal.tsx`, the fetch to `/api/stripe/checkout` gains a header. Read each file first; the change:

```ts
import { auth } from "@/lib/firebase";
// …inside the handler, before fetch:
const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
const response = await fetch("/api/stripe/checkout", {
  // …existing method/body unchanged…
  headers: {
    "content-type": "application/json",
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
  },
});
```

Both files already import from `@/lib/firebase` or can — match each file's existing import style.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build` — pass. `npm run dev`:

```bash
# unauthenticated real checkout → 401 (set STRIPE_SECRET_KEY in .env.local first)
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/stripe/checkout \
  -H "content-type: application/json" \
  -d '{"priceId":"price_test","profileId":"1","planId":"individual_yearly"}'
# Expected: 401
```

Kevin hand-verifies in browser: pricing page still opens Stripe Checkout when signed in; success page still lands.

- [ ] **Step 4: Commit**

```bash
git add app/api/stripe/checkout/route.ts app/note/pricing/page.tsx components/app/PaywallModal.tsx
git commit -m "feat: checkout requires verified caller; uid rides session metadata"
```

---

### Task 8: Stripe webhook writes subscriptions

**Files:**
- Modify: `app/api/stripe/webhook/route.ts`

**Interfaces:**
- Consumes: `getAdminDb` (Task 1); checkout `metadata.uid`/`metadata.planId` (Task 7).
- Produces: `users/{uid}.subscriptions.<planId>.{active, renewalDate}` written server-side; `stripeSubscriptions/{subscriptionId} = { uid, planId }` mapping for lifecycle events.

- [ ] **Step 1: Implement the event handlers**

Add imports:

```ts
import { getAdminDb } from "@/lib/admin-firestore";
```

Replace the `switch (event.type)` block:

```ts
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.uid;
        const planId = session.metadata?.planId;
        if (!uid || !planId || !session.subscription) {
          console.error("Webhook: session missing uid/planId/subscription", session.id);
          break;
        }
        // Map subscription → uid so lifecycle events resolve the account.
        await getAdminDb().collection("stripeSubscriptions").doc(String(session.subscription)).set(
          { uid, planId, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        await writeSubscription(String(session.subscription), uid, planId, true);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const mapping = await getAdminDb()
          .collection("stripeSubscriptions")
          .doc(subscription.id)
          .get();
        const { uid, planId } = mapping.data() ?? {};
        if (!uid || !planId) {
          console.log("Webhook: no mapping for subscription", subscription.id);
          break;
        }
        const active =
          event.type === "customer.subscription.updated" &&
          (subscription.status === "active" || subscription.status === "trialing");
        await writeSubscription(subscription.id, uid, planId, active);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment failed:", invoice.id);
        break;
      }
      default:
        console.log("Unhandled event type:", event.type);
    }
```

And add above `POST`:

```ts
// Server-authoritative subscription write (spec §5.6) — the ONLY writer
// besides /api/ios/entitlements; clients lost write access in Task 6.
async function writeSubscription(
  subscriptionId: string,
  uid: string,
  planId: string,
  active: boolean
): Promise<void> {
  const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await getAdminDb().collection("users").doc(uid).set(
    {
      [`subscriptions.${planId}.active`]: active,
      ...(active && { [`subscriptions.${planId}.renewalDate`]: renewalDate }),
    },
    { merge: true }
  );
  console.log(`Subscription ${subscriptionId} → users/${uid}.${planId}.active=${active}`);
}
```

(`renewalDate` here is the mirror of today's client-side placeholder — the web UI treats it as display-only; refining it to the true period end from `subscription.current_period_end` is a follow-up, noted in the task list below.)

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build` — pass. End-to-end webhook delivery needs Stripe: Kevin runs `stripe listen --forward-to localhost:3000/api/stripe/webhook` (Stripe CLI) and completes a test checkout; expected log lines: `Subscription sub_… → users/{uid}.individual_yearly.active=true` and the field visible in the Firestore console.

- [ ] **Step 3: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat: Stripe webhook becomes the server-side subscription writer"
```

---

### Task 9: Web client stops writing subscriptions

**Files:**
- Modify: `app/note/subscription/success/page.tsx:39` area
- Modify: `lib/firebaseSubscription.ts` (writes become demo-only)

**Interfaces:**
- Consumes: `getFirebaseSubscription`/`syncSubscriptionFromFirebase` (reads, unchanged).
- Produces: production subscriptions come from the webhook; the demo-mode path keeps working without Stripe.

- [ ] **Step 1: Rework the success page**

Read `app/note/subscription/success/page.tsx` fully first. Replace the `saveSubscriptionToFirebase(...)` call site so that:

- If `session_id` starts with `demo_` (demo mode has no webhook): keep the existing local `saveSubscriptionToFirebase(email, ...)` call exactly as today.
- Otherwise: poll `syncSubscriptionFromFirebase(...)` up to 5 times, 2s apart, until `subscriptions` reflects the plan (the webhook may land a few seconds after redirect); show the existing success UI either way.

```ts
// production: webhook already wrote Firestore — poll the read path
if (!sessionId.startsWith("demo_")) {
  for (let i = 0; i < 5; i++) {
    await syncSubscriptionFromFirebase(email, profileId);
    const sub = await getFirebaseSubscription(email);
    if (sub && Object.values(sub.subscriptions ?? {}).some((s) => s.active)) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
} else {
  await saveSubscriptionToFirebase(email, parseInt(profileId), subscription);
}
```

(Adapt variable names to what the file actually uses — `sessionId`/`subscription`/`profileId` per its current code.)

- [ ] **Step 2: Leave the write helpers in place, documented**

`lib/firebaseSubscription.ts` keeps `saveSubscriptionToFirebase`/`updateFirebaseSubscription` implemented — the demo-mode success path still calls them, and Task 12's cutover lockdown is what makes production writes impossible. Add this comment above `updateFirebaseSubscription`:

```ts
// NOTE (2026-10-21): production subscriptions are server-written (Stripe
// webhook + /api/ios/entitlements via Admin SDK). These client writes are
// demo-mode only until the cutover rules lockdown (see plan Task 12).
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build` — pass. Kevin hand-verifies in browser: demo checkout (`npx next dev` without Stripe keys) still shows the success state; a real test checkout (Task 8's `stripe listen`) lifts the quota after the webhook lands.

- [ ] **Step 4: Commit**

```bash
git add app/note/subscription/success/page.tsx lib/firebaseSubscription.ts
git commit -m "feat: success page reads webhook-written subscriptions; writes demo-only"
```

---

### Task 10: App Check on the web app (log-only)

**Files:**
- Modify: `lib/firebase.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` (added to `.env.example` in Task 1).
- Produces: web Firestore/Auth traffic carries App Check tokens; enforcement stays OFF in the Firebase console.

- [ ] **Step 1: Console setup (Kevin, manual)**

Firebase console (quailizy) → App Check → Apps → the web app → Register with **reCAPTCHA v3** (create the site key in the reCAPTCHA admin using `quizliai.com` + `localhost`) → copy the site key into `.env.local` as `NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` (and later Netlify). Do NOT enable enforcement for Firestore yet.

- [ ] **Step 2: Initialize App Check in `lib/firebase.ts`**

Add to the imports:

```ts
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
```

Inside the `if (typeof window !== "undefined" && isFirebaseConfigured())` success path, after `auth = getAuth(app);`:

```ts
    // App Check (spec §5.8): tokens mint for every Firestore call; the
    // console keeps enforcement OFF (log-only) until traffic looks clean.
    if (process.env.NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY) {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (error) {
        console.warn("⚠️ App Check initialization failed:", error);
      }
    }
```

(Keep this inside the existing try/catch structure of the file; in local dev also set `window.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before the `initializeAppCheck` call — the console then prints a debug token to register in the Firebase console for localhost testing.)

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build` — pass. Kevin hand-verifies in browser (with the site key set): DevTools console shows no App Check errors; App Check → Metrics in the Firebase console starts showing requests from the web app.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase.ts
git commit -m "feat: web App Check (reCAPTCHA v3) — log-only rollout"
```

---

### Task 11: Anonymous-user cleanup script

**Files:**
- Create: `scripts/cleanup-anonymous-users.mjs`

**Interfaces:**
- Consumes: `firebase-admin` (dep), same credential resolution as `scripts/migrate-to-uid.mjs`.
- Produces: repeatable dry-run/apply cleanup of orphaned anonymous identities (run ONLY after the rebuild ships and the anonymous provider is disabled — spec §8.2).

- [ ] **Step 1: Write the script**

Model on `scripts/migrate-to-uid.mjs` (same header comment style, same credential resolution, `--apply` flag, dry-run default):

```js
// Post-cutover cleanup (spec §8.2): deletes anonymous Firebase identities
// inactive for 30+ days — users/{uid} (+subcollections via recursiveDelete),
// generationQuota/{uid}, then the Auth user.
// Run AFTER the rebuilt app ships and the Anonymous provider is disabled.
//
// Usage:
//   node scripts/cleanup-anonymous-users.mjs            # dry-run
//   node scripts/cleanup-anonymous-users.mjs --apply
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const INACTIVE_DAYS = 30;

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : JSON.parse(readFileSync("firebase-service-account.json", "utf8"));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  let page;
  const victims = [];
  do {
    const result = await auth.listUsers(1000, page);
    for (const user of result.users) {
      const anonymous = user.providerData.length === 0;
      const lastMs = user.metadata.lastSignInTime
        ? new Date(user.metadata.lastSignInTime).getTime()
        : 0;
      const inactive = Date.now() - lastMs > INACTIVE_DAYS * 24 * 60 * 60 * 1000;
      if (anonymous && inactive) victims.push(user);
    }
    page = result.pageToken;
  } while (page);

  console.log(`Anonymous users inactive ${INACTIVE_DAYS}+ days: ${victims.length}`);
  for (const user of victims) {
    console.log(`${APPLY ? "DELETING" : "would delete"} ${user.uid} (last seen ${user.metadata.lastSignInTime ?? "never"})`);
    if (!APPLY) continue;
    await db.recursiveDelete(db.collection("users").doc(user.uid));
    await db.collection("generationQuota").doc(user.uid).delete();
    await auth.deleteUser(user.uid);
  }
  console.log(APPLY ? "Done." : "Dry run — re-run with --apply to delete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify (dry-run only)**

Run: `node scripts/cleanup-anonymous-users.mjs`
Expected: prints a count and a `would delete …` line per stale anonymous user; nothing is deleted.

- [ ] **Step 3: Commit**

```bash
git add scripts/cleanup-anonymous-users.mjs
git commit -m "feat: anonymous-user cleanup script (dry-run default, --apply)"
```

---

### Task 12: CUTOVER-DEFERRED — subscriptions server-write-only lockdown

> ⚠️ **Do NOT execute this task during the initial rollout.** Preconditions:
> the rebuilt iOS app is on the App Store, old versions have aged out
> (their `recordEntitlements` client writes are gone), and the Stripe
> webhook (Task 8) has been observed writing subscriptions in production.
> Until then, deploying this lock silently breaks the live app's entitlement
> mirror — paying users would drop to free-tier quotas.

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: none.
- Produces: `users/{uid}.subscriptions` frozen against client writes (spec §5.7 end state).

- [ ] **Step 1: Guard `subscriptions` on the users block**

The current update rule only freezes `admin`. Extend both branches (map equality is deep in CEL — an untouched `subscriptions` passes a merge write; any change to it fails):

```text
      allow create: if request.auth != null && request.auth.uid == userId
                    && request.resource.data.get('admin', false) == false
                    && request.resource.data.get('subscriptions', {}).size() == 0;
      allow update: if request.auth != null && request.auth.uid == userId
                    && request.resource.data.get('admin', false)
                       == resource.data.get('admin', false)
                    && request.resource.data.get('subscriptions', {})
                       == resource.data.get('subscriptions', {});
```

Keep the surrounding comments and add: `// subscriptions joined the admin-flag freeze at cutover: server-write-only (webhook + /api/ios/entitlements via Admin SDK).`

- [ ] **Step 2: Deploy and verify**

Firebase console (quailizy) → Firestore → Rules → paste the updated `firestore.rules` → Publish. Verify:

- A signed-in web session can still edit profile fields (browser hand-check).
- The webhook still lifts quotas after a test checkout (Admin SDK bypasses rules).
- An attempt by any client SDK to write `subscriptions.*` now fails (spot-check via console logs or a temporary debug snippet — optional).

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: cutover — subscriptions server-write-only in Firestore rules"
```

---

### Task 13: Deploy checklist + production smoke matrix

**Files:**
- Modify: `.env.example` (final pass — confirm Task 1 entries + any stragglers)

- [ ] **Step 1: Netlify environment (Kevin, manual)**

Netlify → quizliai.com → Site settings → Environment variables:

```text
FIREBASE_SERVICE_ACCOUNT_B64   ← [Convert]::ToBase64String([IO.File]::ReadAllBytes("…\firebase-service-account.json"))
NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY   ← reCAPTCHA site key
APP_CHECK_ENFORCE              ← (leave UNSET — log-only)
```

Trigger a deploy (push to main or manual). Watch the deploy log for a clean build.

- [ ] **Step 2: Production smoke (Git Bash against https://quizliai.com)**

```bash
BASE=https://quizliai.com
DID=$(uuidgen | tr 'A-Z' 'a-z')
curl -s -o /dev/null -w "%{http_code}\n" -X POST $BASE/api/ios/entitlements \
  -H "content-type: application/json" -H "x-device-id: $DID" -d '{"jws":["x.y.z"]}'
# Expected: 200 {"plan":"free","linked":false}
# NOTE: this 200 ALSO proves the Apple-root PEM shipped in the Netlify
# function bundle — lib/storekit-verify reads it at module load, so a
# missing file makes every /api/ios/* import throw and 500. If it 500s
# here, add lib/certs/** to outputFileTracingIncludes (Task 3 note).
curl -s -o /dev/null -w "%{http_code}\n" -X POST $BASE/api/stripe/checkout \
  -H "content-type: application/json" -d '{"priceId":"x","profileId":"1","planId":"weekly"}'
# Expected: 401
```

Firestore console: `devices/{$DID}` exists with `entitlement: null`.

- [ ] **Step 3: Record the follow-up items (NOT in this plan's scope)**

1. Webhook `renewalDate` refinement from `subscription.current_period_end`.
2. iOS plan (separate document): DeviceIDManager, AnonymousAuthManager deletion, App Attest init, JWS attach, entitlements calls.
3. Cutover: disable Anonymous provider + execute Task 12's rules lockdown + run the cleanup script — only after the rebuild ships and old versions age out.
4. App Check enforcement flip (console) one release later.

- [ ] **Step 4: Commit any .env.example touch-ups**

```bash
git add .env.example
git commit -m "chore: env documentation final pass for device identity rollout"
```
