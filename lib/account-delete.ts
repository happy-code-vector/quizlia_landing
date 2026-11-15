// Delete account (web parity with iOS SettingsViewController.deleteAccount and
// QuizliSyncManager.deleteCloudAccountData on iOS main). Pure helpers only, so
// node:test can cover them; the Firebase calls live in lib/deleteAccount.ts.

import { SUPPORT_EMAIL } from "./support";

/** Subcollections under users/{uid}/profiles/{profileId}. iOS deletes notes;
 *  web also writes folders, and both apps write quizAttempts (firestore.rules),
 *  so the web deletes all three. A client cannot list subcollections, so this
 *  list must grow with firestore.rules. */
export const PROFILE_SUBCOLLECTIONS = ["notes", "folders", "quizAttempts"] as const;

/** Firebase only lets a user delete themselves within 5 minutes of signing in
 *  (auth/requires-recent-login). Ask for sign-in again before deleting any data
 *  once 4 minutes have passed, so a slow cleanup never runs past the window. */
export const RECENT_SIGN_IN_MS = 4 * 60 * 1000;

export function needsRecentSignIn(authTime: string | null | undefined, nowMs: number): boolean {
  if (!authTime) return true;
  const t = Date.parse(authTime);
  if (Number.isNaN(t)) return true;
  return nowMs - t > RECENT_SIGN_IN_MS;
}

export type ReauthMethod = "password" | "google" | "apple" | "unsupported";

/** How the user signs in again: their password if the account has one, else
 *  the first popup provider the web supports. */
export function reauthMethod(providerIds: string[]): ReauthMethod {
  if (providerIds.includes("password")) return "password";
  if (providerIds.includes("google.com")) return "google";
  if (providerIds.includes("apple.com")) return "apple";
  return "unsupported";
}

export interface ProfileDocs {
  profileId: string;
  /** Document ids per subcollection. */
  children: Partial<Record<(typeof PROFILE_SUBCOLLECTIONS)[number], string[]>>;
}

/** Profile ids to clean: those listed in Firestore plus the ones this browser
 *  knows. A profile doc can be missing while its notes exist (Firestore keeps
 *  subcollections of a deleted or never-written parent), and a listing does not
 *  return such a parent. */
export function profileIdsToClean(remoteIds: string[], localIds: (string | number)[]): string[] {
  return [...new Set([...remoteIds, ...localIds.map(String)])].filter(Boolean);
}

/** Every document path to delete, children before parents, the user doc last.
 *  Same scope as iOS (users/{uid} subtree); public study guides in /notes stay,
 *  as on iOS. */
export function accountDeletePaths(uid: string, profiles: ProfileDocs[]): string[] {
  const paths: string[] = [];
  for (const p of profiles) {
    for (const sub of PROFILE_SUBCOLLECTIONS) {
      for (const id of p.children[sub] ?? []) paths.push(`users/${uid}/profiles/${p.profileId}/${sub}/${id}`);
    }
  }
  for (const p of profiles) paths.push(`users/${uid}/profiles/${p.profileId}`);
  paths.push(`users/${uid}`);
  return paths;
}

/** Firestore write batches hold at most 500 writes. */
export function chunk<T>(items: T[], size = 450): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Keys kept when local data is wiped: only the theme choice (next-themes). */
export const KEPT_LOCAL_KEYS = new Set(["theme"]);

/** iOS wipes all local data; the web removes every localStorage key except the theme. */
export function clearLocalAppData(storage: Pick<Storage, "length" | "key" | "removeItem">): number {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k !== null && !KEPT_LOCAL_KEYS.has(k)) keys.push(k);
  }
  for (const k of keys) storage.removeItem(k);
  return keys.length;
}

/** W-7.7 wording for Firebase failures during delete. null = the user closed the popup. */
export function deleteAccountFailure(code: string | undefined): { field?: "password"; message: string } | null {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/popup-blocked":
      return { message: "Your browser blocked the sign-in window. Allow pop-ups for quizliai.com, then try again." };
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return { field: "password", message: "That password is not right. Enter the password for this account" };
    case "auth/user-mismatch":
      return { message: "That sign-in is for a different account. Sign in with the account you are deleting." };
    case "auth/too-many-requests":
      return { message: "Too many attempts. Wait a few minutes, then try again." };
    case "auth/network-request-failed":
    case "unavailable":
      return { message: "QuizliAI can't be reached. Check your connection, then try again." };
    case "permission-denied":
      return { message: "Your notes could not be deleted. Sign out, sign in again, then delete your account." };
    default:
      return { message: `Your account was not deleted. Try again in a minute. If it keeps happening, email ${SUPPORT_EMAIL}.` };
  }
}
