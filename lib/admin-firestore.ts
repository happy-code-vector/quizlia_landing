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
