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
import { localFoldersKey, SyncedFolder } from "./folderSync";

export function localContentKey(profileId: number | string): string {
  return `content_${profileId}`;
}

// Longer-history-wins chat reconciliation for one topic's messages
// (chats grow monotonically per topic; the longer array replaces the
// shorter). Web message shape: { id, sender: "user" | "ai", text }.
const writeChatIfLonger = (
  profileId: number | string,
  topicId: string,
  remote: Array<{ id: string; sender: string; text: string }> | null | undefined
): boolean => {
  if (typeof window === "undefined" || !Array.isArray(remote) || remote.length === 0) return false;
  const key = `chat_${profileId}_${topicId}`;
  let local: unknown[] = [];
  try {
    local = JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    local = [];
  }
  if (!Array.isArray(local) || remote.length > local.length) {
    localStorage.setItem(key, JSON.stringify(remote));
    return true;
  }
  return false;
};

// Applies chat histories carried on pulled content items (web↔web sync).
export function applyRemoteChats(
  profileId: number | string,
  items: any[]
): boolean {
  let changed = false;
  for (const item of items) {
    const sid = item?.sourceId;
    if (typeof sid !== "string" || !sid) continue;
    if (writeChatIfLonger(profileId, sid, item.chat)) changed = true;
  }
  return changed;
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
    const notesCol = collection(db, "users", uid, "profiles", String(profile.id), "notes");

    // One doc per note — the canonical schema shared with the iOS app
    // (notes/{sourceId} with id/title/contentType/…/clientOrigin; note,
    // flashcard, quiz, chat as JSON strings). A topic arrives as up to
    // three items (notes/flashcards/quiz) sharing one sourceId. The legacy
    // consolidated userContent blob is no longer written; the read path
    // keeps it as a fallback for accounts that have not re-saved yet.
    if (!Array.isArray(content)) return;

    const bySource = new Map<string, any[]>();
    for (const item of content as any[]) {
      const sid = item?.sourceId ?? item?.id;
      if (typeof sid === "string" && sid) {
        bySource.set(sid, [...(bySource.get(sid) ?? []), item]);
      }
    }

    for (const [sid, items] of bySource) {
      const first = items[0] ?? {};
      const notesItem = items.find((i: any) => i.type === "notes");
      const fcItem = items.find((i: any) => i.type === "flashcards");
      const quizItem = items.find((i: any) => i.type === "quiz");

      // Chat rides the cloud doc only (local content_ items stay
      // chat-free); receiving devices reconcile via applyRemoteChats.
      let chatJson: string | null = null;
      if (typeof window !== "undefined") {
        try {
          const chat = JSON.parse(localStorage.getItem(`chat_${profile.id}_${sid}`) || "[]");
          if (Array.isArray(chat) && chat.length > 0) chatJson = JSON.stringify(chat);
        } catch {
          // no chat stored for this topic
        }
      }

      // The original source URL (YouTube video, linked page) belongs in
      // contentPath — the canonical home iOS also reads. noteData.sourceUrl
      // carries the full untruncated URL from generation; sourceName holds
      // the display-cut copy for youtube/url sources. Without this the
      // URL never survives the cloud round-trip, and every consumer of
      // topic.sourceUrl (video embed, thumbnails, source link) starves.
      const looksLikeUrl = (v: unknown) => /^https?:\/\//i.test(String(v ?? ""));
      const contentPath =
        (typeof notesItem?.data?.sourceUrl === "string" && notesItem.data.sourceUrl) ||
        (looksLikeUrl(first.sourceName) ? String(first.sourceName) : "");

      const payload: Record<string, unknown> = {
        id: sid,
        title: first.sourceName ?? first.title ?? "Web note",
        contentType: webContentType(first.sourceType),
        contentPath,
        folderName: "",
        fid: first.folderId ?? null,
        createdAt: first.createdAt ?? new Date().toISOString(),
        clientOrigin: "web",
        updatedAt: new Date().toISOString(),
        ...(notesItem ? { note: JSON.stringify(notesItem.data ?? null) } : {}),
        ...(fcItem?.data?.flashcards ? { flashcard: JSON.stringify(fcItem.data.flashcards) } : {}),
        ...(quizItem?.data?.quizzes ? { quiz: JSON.stringify(quizItem.data.quizzes) } : {}),
        ...(chatJson ? { chat: chatJson } : {}),
      };
      await setDoc(doc(notesCol, sid), payload, { merge: true });
    }
  } catch (error) {
    console.warn("Cloud sync write failed (kept locally):", error);
  }
}

// Web sourceType ("youtube"/"pdf"/…) → the iOS-style contentType the
// canonical note schema carries.
function webContentType(t: unknown): string {
  const s = String(t ?? "").toLowerCase();
  if (s.includes("youtube")) return "YouTube";
  if (s.includes("pdf")) return "PDF";
  if (s.includes("image") || s.includes("photo")) return "Image";
  return "Text";
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
        // Chat rides the cloud payload only — strip it before caching so
        // local content_ items stay chat-free (histories live in their own
        // chat_<pid>_<topicId> keys, applied below).
        const cacheable = Array.isArray(parsed)
          ? parsed.map(({ chat: _chat, ...rest }: any) => rest)
          : parsed;
        localStorage.setItem(localContentKey(profile.id), JSON.stringify(cacheable));
      }
    }

    if (Array.isArray(parsed)) {
      applyRemoteChats(profile.id, parsed);
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
// or chat histories changed (caller may refresh). Idempotent: items already present (by
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

    let chatChanged = false;
    const newItems: any[] = [];
    const tombstonedIds = new Set<string>();
    for (const noteDoc of snap.docs) {
      // The legacy consolidated blob is handled by loadProfileContent;
      // every other doc — ios origin or web — follows the canonical
      // per-note schema and merges by sourceId.
      if (noteDoc.id === "userContent") continue;

      const d = noteDoc.data() as Record<string, unknown>;

      // Tombstoned remotely (any origin): never import it, and apply the
      // delete to a local copy if one exists (collected after the loop).
      if ((d.deleted as unknown) === true) {
        tombstonedIds.add(noteDoc.id);
        continue;
      }

      // The iOS chat seed runs even for already-known topics: items are
      // idempotence-keyed by sourceId, but chat is length-compared.
      if (typeof d.chat === "string" && d.chat.trim().length > 0) {
        if (writeChatIfLonger(profile.id, noteDoc.id, [
          { id: "ios_seed", sender: "ai", text: d.chat },
        ])) {
          chatChanged = true;
        }
      }

      if (known.has(noteDoc.id)) continue;
      // Route the note into the same folder it lives in on iOS. fid is the
      // cloud folder id (registry); legacy docs fall back to folderName; the
      // hidden General bucket means Unsorted (no folderId).
      const resolveFolderId = (): string | undefined => {
        const fid = typeof d.fid === "string" && d.fid ? d.fid : null;
        const fname = typeof d.folderName === "string" ? d.folderName : "";

        const key = localFoldersKey(profile.id);
        let stored: SyncedFolder[] = [];
        try {
          stored = JSON.parse(localStorage.getItem(key) || "[]");
        } catch {
          stored = [];
        }

        const ensure = (id: string, name: string): string | undefined => {
          // A tombstoned entry with this id means the folder was deleted
          // (remotely or locally); the note belongs in Unsorted rather than a
          // resurrected duplicate.
          if (stored.find((f) => f.id === id && f.deletedAt)) return undefined;
          const hit = stored.find((f) => f.id === id && !f.deletedAt);
          if (hit) return id;
          stored.push({
            id,
            name: name || "Imported",
            icon: "📁",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            clientOrigin: "ios",
          });
          localStorage.setItem(key, JSON.stringify(stored));
          return id;
        };

        // fid is authoritative when present (a user folder legitimately named
        // "General Physics" keeps its notes); the hidden General bucket's
        // name rule applies only to legacy docs with no fid.
        if (fid) return ensure(fid, fname);
        if (fname.toLowerCase().startsWith("general")) return undefined;
        if (fname) {
          const byName = stored.find((f) => !f.deletedAt && f.name.toLowerCase() === fname.toLowerCase());
          if (byName) return byName.id;
          return ensure(`ios_name_${fname.toLowerCase().replace(/\s+/g, "_")}`, fname);
        }
        return undefined;
      };
      const folderId = resolveFolderId();
      const note = tryParse(d.note);
      const flashcards = tryParse(d.flashcard);
      const quiz = tryParse(d.quiz);
      const sourceType = mapType(d.contentType);
      // The original URL lives in contentPath (iOS writes it; the web does
      // too since the URL-loss fix). Legacy web docs stuffed it into title
      // instead — a URL-shaped title is the fallback so old docs keep
      // their video embed / source link across the round-trip.
      const remoteUrl =
        (typeof d.contentPath === "string" && d.contentPath) ||
        (/^https?:\/\//i.test(String(d.title ?? "")) ? String(d.title) : "");
      const base = {
        sourceId: noteDoc.id,
        sourceName:
          (sourceType === "youtube" || sourceType === "url") && remoteUrl ? remoteUrl : d.title,
        sourceType,
        title: d.title,
        createdAt: d.createdAt || new Date().toISOString(),
        folderId,
      };

      let hasAny = false;
      if (note && typeof note === "object") {
        newItems.push({ id: `${noteDoc.id}_note`, ...base, type: "notes", data: note });
        hasAny = true;
      }
      if (Array.isArray(flashcards) && flashcards.length > 0) {
        newItems.push({ id: `${noteDoc.id}_flash`, ...base, type: "flashcards", data: { flashcards } });
        hasAny = true;
      }
      if (Array.isArray(quiz) && quiz.length > 0) {
        newItems.push({ id: `${noteDoc.id}_quiz`, ...base, type: "quiz", data: { quizzes: quiz } });
        hasAny = true;
      }
    }

    // Remote deletes: drop local topics whose doc came back tombstoned
    // (a note the iOS app — or another browser — deleted).
    let removedRemote = false;
    if (tombstonedIds.size > 0) {
      let current: any[] = [];
      try {
        current = JSON.parse(localStorage.getItem(key) || "[]");
      } catch {
        current = [];
      }
      if (Array.isArray(current) && current.some((i: any) => tombstonedIds.has(i.sourceId))) {
        const kept = current.filter((i: any) => !tombstonedIds.has(i.sourceId));
        localStorage.setItem(key, JSON.stringify(kept));
        removedRemote = true;
      }
    }

    if (newItems.length > 0) {
      // Lossless write-back: re-read storage (a user edit or delete may
      // have landed during the Firestore round-trip) and prepend only the
      // genuinely-new iOS items — edits win, deletions stay deleted.
      let fresh: any[] = [];
      try {
        fresh = JSON.parse(localStorage.getItem(key) || "[]");
      } catch {
        fresh = [];
      }
      if (!Array.isArray(fresh)) fresh = [];
      localStorage.setItem(key, JSON.stringify([...newItems, ...fresh]));
    }
    return newItems.length > 0 || chatChanged || removedRemote;
  } catch (error) {
    console.warn("iOS notes merge failed:", error);
    return false;
  }
}

// Web-side delete: tombstone the note's cloud doc (any origin — ios or
// web) so it stays deleted everywhere (restore/hydration skip tombstones).
export async function tombstoneIOSNoteIfAny(
  profile: { id: number | string; email?: string },
  topicId: string
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isFirebaseConfigured() || !db || !auth?.currentUser) return;

  try {
    const uid = auth.currentUser.uid;
    const ref = doc(db, "users", uid, "profiles", String(profile.id), "notes", topicId);
    await setDoc(ref, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.warn("Note tombstone failed:", error);
  }
}

// Per-visit web↔web chat delivery: reads each note doc's chat field
// (JSON string of messages) and reconciles histories. Returns true when
// any chat history was updated.
export async function pullRemoteChats(
  profile: { id: number | string; email?: string }
): Promise<boolean> {
  if (!isFirebaseConfigured() || !db || !auth?.currentUser) return false;

  try {
    const uid = auth.currentUser.uid;
    const snap = await getDocs(
      collection(db, "users", uid, "profiles", String(profile.id), "notes")
    );
    const items: any[] = [];
    for (const d of snap.docs) {
      const chatRaw = d.data()?.chat;
      if (typeof chatRaw !== "string" || !chatRaw) continue;
      try {
        items.push({ sourceId: d.id, chat: JSON.parse(chatRaw) });
      } catch {
        // not a JSON chat payload
      }
    }
    if (!items.length) return false;
    return applyRemoteChats(profile.id, items);
  } catch (error) {
    console.warn("Chat pull failed:", error);
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
