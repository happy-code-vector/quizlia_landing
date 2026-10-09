// User-note cloud sync (shared schema with the iOS app).
//
// Web keeps localStorage (`content_${profileId}`) as the immediate cache and
// write-through mirrors the profile's whole content blob to
// `users/{uid}/profiles/{pid}/notes/userContent` — a single consolidated doc
// per profile, last-write-wins by `updatedAt`. The iOS app mirrors its
// per-document rows into sibling docs under the same `notes` collection.
// Public study guides (top-level `notes` collection) are unrelated.
import { db, auth, isFirebaseConfigured } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
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
// created on another device or on iOS), then merge any iOS-written
// per-document notes. Returns null when nothing exists.
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
    let parsed: any = null;
    if (snap.exists()) {
      const raw = snap.data().content;
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && typeof window !== "undefined") {
        localStorage.setItem(localContentKey(profile.id), JSON.stringify(parsed));
      }
    }

    // Merge notes synced from the iOS app (ios_* docs).
    const merged = await mergeIOSNotesIntoContent(profile);
    if (merged) {
      const stored = localStorage.getItem(localContentKey(profile.id));
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // return parsed below
        }
      }
    }

    return parsed ?? null;
  } catch (error) {
    console.warn("Cloud sync read failed:", error);
    return null;
  }
}

// Phase 2 pull: merge notes written by the iOS app (per-document docs
// named ios_{id}) into the web content model. Returns true when new items
// were merged (caller may reload). Idempotent: items already present (by
// sourceId) are skipped.
export async function mergeIOSNotesIntoContent(
  profile: { id: number | string; email?: string }
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!isFirebaseConfigured() || !db || !auth?.currentUser) return false;

  try {
    const uid = auth.currentUser.uid;
    const notesCol = collection(db, "users", uid, "profiles", String(profile.id), "notes");
    const snap = await getDocs(notesCol);

    const key = localContentKey(profile.id);
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const known = new Set(existing.map((i: any) => i.sourceId));
    let added = false;

    const mapType = (raw: unknown): string => {
      const t = String(raw || "").toLowerCase();
      if (t.includes("youtube")) return "youtube";
      if (t.includes("pdf")) return "pdf";
      if (t.includes("image") || t.includes("photo")) return "image";
      return "url";
    };
    const tryParse = (raw: unknown): any => {
      if (typeof raw !== "string" || !raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    };

    for (const noteDoc of snap.docs) {
      if (!noteDoc.id.startsWith("ios_")) continue;
      if (known.has(noteDoc.id)) continue;

      const d = noteDoc.data() as Record<string, unknown>;
      const note = tryParse(d.note);
      const flashcards = tryParse(d.flashcard);
      const quiz = tryParse(d.quiz);
      const base = {
        sourceId: noteDoc.id,
        sourceName: d.title,
        sourceType: mapType(d.contentType),
        title: d.title,
        createdAt: d.createdAt || new Date().toISOString(),
      };

      let hasAny = false;
      if (note && typeof note === "object") {
        existing.push({ id: `${noteDoc.id}_note`, ...base, type: "notes", data: note });
        hasAny = true;
      }
      if (Array.isArray(flashcards) && flashcards.length > 0) {
        existing.push({ id: `${noteDoc.id}_flash`, ...base, type: "flashcards", data: { flashcards } });
        hasAny = true;
      }
      if (Array.isArray(quiz) && quiz.length > 0) {
        existing.push({ id: `${noteDoc.id}_quiz`, ...base, type: "quiz", data: { quizzes: quiz } });
        hasAny = true;
      }
      if (hasAny) added = true;
    }

    if (added) {
      localStorage.setItem(key, JSON.stringify(existing));
    }
    return added;
  } catch (error) {
    console.warn("iOS notes merge failed:", error);
    return false;
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
