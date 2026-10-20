// Publishing notes as public library guides. Extracted from the topic
// page so manual publish (admin button) and auto-publish (admin
// generation) share one implementation. Firestore rules gate writes to
// admins; this code assumes the caller checked (or will find out on write).
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { getYouTubeVideoId } from "./types";
import type { Topic } from "./types";

/** Super admin check — users/{uid}.admin is set in the Firebase console. */
export async function isAdminUser(): Promise<boolean> {
  const user = auth?.currentUser;
  if (!user || !db) return false;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    return snap.exists() && snap.data()?.admin === true;
  } catch {
    return false;
  }
}

/** Publishes a topic as a LISTED public guide (library + sitemap). */
export async function publishNoteToLibrary(topic: Topic, uid: string): Promise<{ slug: string; url: string }> {
  if (!db) throw new Error("Firestore not initialized");
  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "note";
  const slug = `${slugify(topic.title)}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  // YouTube topics keep their video: the public page's embedded player,
  // thumbnail, and the library card's preview all key off youtubeId.
  const youtubeId =
    topic.sourceType === "youtube" && topic.sourceUrl
      ? (getYouTubeVideoId(topic.sourceUrl) ?? "")
      : "";

  // Same shape as seeded guides so the public page renders it identically.
  await setDoc(doc(db, "notes", slug), {
    slug,
    title: topic.title,
    category: "community",
    difficulty: "medium",
    sourceChannel: "QuizliAI user",
    youtubeId,
    createdAt: now,
    updatedAt: now,
    tldr:
      topic.note?.key_findings && topic.note.key_findings.length > 0
        ? topic.note.key_findings.slice(0, 5)
        : [topic.note?.quick_summary].filter(Boolean),
    // Real note fields so the public guide shows exactly what the topic
    // page shows (old docs without these keep the render fallbacks).
    quick_summary: topic.note?.quick_summary ?? "",
    key_findings: topic.note?.key_findings ?? [],
    important_notes: topic.note?.important_notes ?? [],
    sections: topic.note?.sections && topic.note.sections.length > 0
      ? topic.note.sections
      : [
          ...(topic.note?.quick_summary
            ? [{ title: "Summary", content: topic.note.quick_summary, keyTerms: [] }]
            : []),
          ...(topic.note?.detailed_notes
            ? [{
                title: "Detailed Notes",
                content: topic.note.detailed_notes,
                keyTerms: topic.note?.key_findings ?? [],
              }]
            : []),
        ],
    quiz: topic.quiz ?? [],
    flashcards: topic.flashcards ?? [],
    listed: true,
    ownerUid: uid,
    publishedAt: now,
  });

  return { slug, url: `${window.location.origin}/note/${slug}` };
}
