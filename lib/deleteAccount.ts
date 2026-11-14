// Delete account, Firebase side. Mirrors iOS main: SettingsViewController.deleteAccount
// wipes local data, QuizliSyncManager.deleteCloudAccountData removes the
// users/{uid} subtree, then user.delete(). Differences on purpose:
// - Recent sign-in is checked BEFORE any data is deleted, so an account is never
//   left signed up with its notes gone (iOS deletes first and can hit
//   auth/requires-recent-login after the cloud data is already gone).
// - The cloud cleanup is awaited before user.delete(); iOS fires it without
//   waiting, so the deletes can race the account removal and be denied by rules.
// - folders and quizAttempts are deleted too (iOS deletes notes only).
// Public study guides in /notes stay, as on iOS. generationQuota/{uid} stays:
// rules forbid client deletes of the quota counter.
import {
  EmailAuthProvider, GoogleAuthProvider, OAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup,
  type User,
} from "firebase/auth";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  PROFILE_SUBCOLLECTIONS, accountDeletePaths, chunk, clearLocalAppData, deleteAccountFailure, needsRecentSignIn,
  profileIdsToClean, reauthMethod, type ProfileDocs, type ReauthMethod,
} from "./account-delete";

export type DeleteAccountResult =
  | { status: "done" }
  | { status: "reauth"; method: ReauthMethod }
  | { status: "error"; message: string; field?: "password" }
  | { status: "cancelled" };

export interface DeleteAccountInput {
  /** Password for the re-sign-in step (password accounts). */
  password?: string;
  /** Run the provider popup for the re-sign-in step (Google or Apple accounts). */
  popup?: boolean;
  /** Profile ids this browser knows, so notes under a missing profile doc are found too. */
  localProfileIds: (string | number)[];
}

function codeOf(error: unknown): string | undefined {
  return typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : undefined;
}

function failure(error: unknown): DeleteAccountResult {
  const f = deleteAccountFailure(codeOf(error));
  return f ? { status: "error", ...f } : { status: "cancelled" };
}

async function reauthenticate(user: User, method: ReauthMethod, input: DeleteAccountInput): Promise<void> {
  if (method === "password") {
    const credential = EmailAuthProvider.credential(user.email ?? "", input.password ?? "");
    await reauthenticateWithCredential(user, credential);
    return;
  }
  const provider = method === "google" ? new GoogleAuthProvider() : new OAuthProvider("apple.com");
  if (method === "google" && user.email) (provider as GoogleAuthProvider).setCustomParameters({ login_hint: user.email });
  await reauthenticateWithPopup(user, provider);
}

async function collectPaths(uid: string, localProfileIds: (string | number)[]): Promise<string[]> {
  if (!db) throw Object.assign(new Error("Firestore unavailable"), { code: "unavailable" });
  const firestore = db;
  const listed = await getDocs(collection(firestore, "users", uid, "profiles"));
  const ids = profileIdsToClean(listed.docs.map((d) => d.id), localProfileIds);
  const profiles: ProfileDocs[] = await Promise.all(
    ids.map(async (profileId) => {
      const children: ProfileDocs["children"] = {};
      await Promise.all(
        PROFILE_SUBCOLLECTIONS.map(async (sub) => {
          const snap = await getDocs(collection(firestore, "users", uid, "profiles", profileId, sub));
          children[sub] = snap.docs.map((d) => d.id);
        }),
      );
      return { profileId, children };
    }),
  );
  return accountDeletePaths(uid, profiles);
}

async function deletePaths(paths: string[]): Promise<void> {
  if (!db) return;
  const firestore = db;
  for (const part of chunk(paths)) {
    const batch = writeBatch(firestore);
    for (const p of part) batch.delete(doc(firestore, p));
    await batch.commit();
  }
}

/** Removes the users/{uid} subtree. A second pass catches notes a sync wrote while the first ran. */
export async function deleteCloudAccountData(uid: string, localProfileIds: (string | number)[]): Promise<void> {
  await deletePaths(await collectPaths(uid, localProfileIds));
  const again = await collectPaths(uid, localProfileIds);
  // Paths with 6 segments are subcollection docs: users/{uid}/profiles/{p}/{sub}/{id}.
  if (again.some((p) => p.split("/").length === 6)) await deletePaths(again);
}

/**
 * One call per user action. Returns "reauth" when Firebase needs a recent sign-in;
 * the dialog then asks for it and calls again with the password or popup flag.
 */
export async function deleteAccount(input: DeleteAccountInput): Promise<DeleteAccountResult> {
  const user = auth?.currentUser;
  if (!user) return { status: "error", message: "You are signed out. Sign in, then delete your account." };
  const method = reauthMethod(user.providerData.map((p) => p.providerId));

  try {
    if (input.password !== undefined || input.popup) {
      await reauthenticate(user, method, input);
    } else {
      const token = await user.getIdTokenResult(true);
      if (needsRecentSignIn(token.authTime, Date.now())) {
        if (method === "unsupported") {
          return { status: "error", message: "Sign out, sign in again, then delete your account." };
        }
        return { status: "reauth", method };
      }
    }
  } catch (error) {
    return failure(error);
  }

  try {
    await deleteCloudAccountData(user.uid, input.localProfileIds);
  } catch (error) {
    return failure(error);
  }

  try {
    await user.delete();
  } catch (error) {
    // The cloud data is already gone; signing in again and confirming finishes the job.
    if (codeOf(error) === "auth/requires-recent-login") return { status: "reauth", method };
    return failure(error);
  }

  if (typeof window !== "undefined") clearLocalAppData(window.localStorage);
  return { status: "done" };
}
