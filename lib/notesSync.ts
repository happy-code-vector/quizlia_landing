// User-note cloud sync (shared schema with the iOS app).
//
// Web keeps localStorage (`content_${profileId}`) as the immediate cache and
// write-through mirrors the profile's whole content blob to
// `users/{uid}/profiles/{pid}/notes/userContent` — a single consolidated doc
// per profile, last-write-wins by `updatedAt`. The iOS app mirrors its
// per-document rows into sibling docs under the same `notes` collection.
// Public study guides (top-level `notes` collection) are unrelated.
import { db, auth, isFirebaseConfigured } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { currentUserDocId } from "./firebaseSubscription";

export function localContentKey(profileId: number | string): string {
  return `content_${profileId}`;
}

// localStorage + cloud write-through. Never throws to the caller — cloud
// failures log and leave the local copy intact (retried on next write).
export async function persistProfileContent(
  profile: { id: number | string; email?: string },
  content: unknown
): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem(localContentKey(profile.id), JSON.stringify(content));
  }

  if (!isFirebaseConfigured() || !db || !auth?.currentUser) return;

  try {
    const uid = auth.currentUser.uid;
    const ref = doc(db, "users", uid, "profiles", String(profile.id), "notes", "userContent");
    await setDoc(ref, {
      clientOrigin: "web",
      updatedAt: new Date().toISOString(),
      content: JSON.stringify(content),
    });
  } catch (error) {
    console.warn("Cloud sync write failed (kept locally):", error);
  }
}

// localStorage first; if empty, pull the profile's cloud doc (e.g. data
// created on another device or on iOS). Returns null when nothing exists.
export async function loadProfileContent(
  profile: { id: number | string; email?: string }
): Promise<any | null> {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem(localContentKey(profile.id));
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        // fall through to cloud
      }
    }
  }

  if (!isFirebaseConfigured() || !db || !auth?.currentUser) return null;

  try {
    const uid = auth.currentUser.uid;
    const ref = doc(db, "users", uid, "profiles", String(profile.id), "notes", "userContent");
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const raw = snap.data().content;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof window !== "undefined") {
      localStorage.setItem(localContentKey(profile.id), JSON.stringify(parsed));
    }
    return parsed ?? null;
  } catch (error) {
    console.warn("Cloud sync read failed:", error);
    return null;
  }
}

// Legacy-path fetch used only during the migration window: reads the old
// email-keyed doc so data created before the UID migration isn't lost.
export async function loadLegacyProfileContent(
  profile: { id: number | string; email?: string }
): Promise<any | null> {
  if (!isFirebaseConfigured() || !db) return null;
  const legacyId = currentUserDocId(profile.email || "unknown@legacy");
  if (legacyId === auth?.currentUser?.uid) return null; // not a legacy path

  try {
    const ref = doc(db, "users", legacyId, "profiles", String(profile.id), "notes", "userContent");
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const raw = snap.data().content;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}
