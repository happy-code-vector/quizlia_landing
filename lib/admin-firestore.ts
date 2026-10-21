// Server-only Firebase Admin access (Netlify functions + local scripts).
// Credential resolution order:
//   1. FIREBASE_SERVICE_ACCOUNT_B64  — base64 of the service-account JSON
//      (Netlify env vars are single-line; see .env.example for the
//      PowerShell one-liner that produces it)
//   2. FIREBASE_SERVICE_ACCOUNT      — raw JSON string (script convention)
//   3. firebase-service-account.json — local dev file (gitignored)
// Never import this from client code; it stays inside app/api + lib/server.
//
// firebase-admin is loaded LAZILY via dynamic import(): both Turbopack
// (hashed registry ids) and webpack (dynamic-import externals) failed to
// resolve the package at module-load inside Netlify's function runtime —
// empty-body 500s on every /api/ios/* route (2026-10-21). Lazy loading
// moves that failure into the request path, where route-level catch blocks
// can surface the real error message to clients.
import { readFileSync } from "fs";
import type { App as AdminApp } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";
import type { AppCheck } from "firebase-admin/app-check";
import type { Auth } from "firebase-admin/auth";

type AdminBundle = {
  app: AdminApp;
  db: Firestore;
  appCheck: AppCheck;
  auth: Auth;
};

let initPromise: Promise<AdminBundle> | null = null;

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

async function loadAdmin(): Promise<AdminBundle> {
  const [appMod, firestoreMod, appCheckMod, authMod] = await Promise.all([
    import("firebase-admin/app"),
    import("firebase-admin/firestore"),
    import("firebase-admin/app-check"),
    import("firebase-admin/auth"),
  ]);
  const existing = appMod.getApps();
  const app = existing.length
    ? existing[0]
    : appMod.initializeApp({ credential: appMod.cert(resolveServiceAccount() as any) });
  return {
    app,
    db: firestoreMod.getFirestore(app),
    appCheck: appCheckMod.getAppCheck(app),
    auth: authMod.getAuth(app),
  };
}

/** Lazily-initialized Admin bundle — all getters await the same single init. */
export function getAdminBundle(): Promise<AdminBundle> {
  initPromise ??= loadAdmin();
  return initPromise;
}

export async function getAdminDb(): Promise<Firestore> {
  return (await getAdminBundle()).db;
}

export async function getAdminAppCheck(): Promise<AppCheck> {
  return (await getAdminBundle()).appCheck;
}

export async function getAdminAuth(): Promise<Auth> {
  return (await getAdminBundle()).auth;
}
