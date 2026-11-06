// Quiz attempts: one record per quiz run, shared with the iOS app.
// Schema: docs/superpowers/specs/2026-11-06-quiz-attempts-design.md
// Path: users/{uid}/profiles/{pid}/quizAttempts/{attemptId}
import { db, auth, isFirebaseConfigured } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

export interface QuizAttemptResult {
  noteId: string;
  noteTitle: string;
  total: number;
  answers: Array<{ i: number; correct: boolean }>;
  startedAt: Date;
  finishedAt: Date;
}

function newAttemptId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `web_${uuid}`;
}

/** Writes one finished attempt. Never throws: a failed cloud write is logged and dropped. */
export async function recordQuizAttempt(
  profile: { id: number | string },
  result: QuizAttemptResult
): Promise<void> {
  if (!isFirebaseConfigured() || !db || !auth?.currentUser) return;
  if (!result.noteId || result.total < 1) return;
  const id = newAttemptId();
  const correct = result.answers.filter((a) => a.correct).length;
  try {
    await setDoc(
      doc(db, "users", auth.currentUser.uid, "profiles", String(profile.id), "quizAttempts", id),
      {
        id,
        noteId: result.noteId,
        noteTitle: result.noteTitle ?? "",
        status: "finished",
        correct,
        total: Math.min(result.total, 100),
        answered: result.answers.length,
        durationSec: Math.max(0, Math.round((result.finishedAt.getTime() - result.startedAt.getTime()) / 1000)),
        answers: result.answers,
        startedAt: result.startedAt.toISOString(),
        finishedAt: result.finishedAt.toISOString(),
        clientOrigin: "web",
        updatedAt: new Date().toISOString(),
      }
    );
  } catch (err) {
    console.warn("[quizAttempts] write failed", err);
  }
}
