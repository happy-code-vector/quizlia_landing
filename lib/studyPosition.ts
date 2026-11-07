/**
 * Where a profile stopped in a note's flashcards, so Home's Continue can reopen
 * study mode at that card. Web only (localStorage); iOS stores no position yet.
 * Key: flashcardPos_<profileId> -> { [topicId]: { index, updatedAt } }.
 */
export interface StudyPosition {
  /** Zero-based index of the card on screen when the user last moved. */
  index: number;
  /** ISO timestamp of the last move. Home uses it to pick the most recent deck. */
  updatedAt: string;
}

export type StudyPositions = Record<string, StudyPosition>;

const key = (profileId: number | string) => `flashcardPos_${profileId}`;

export function readStudyPositions(profileId: number | string): StudyPositions {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(key(profileId)) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as StudyPositions) : {};
  } catch {
    return {};
  }
}

export function readStudyPosition(profileId: number | string, topicId: string): StudyPosition | null {
  const pos = readStudyPositions(profileId)[topicId];
  return pos && Number.isInteger(pos.index) && pos.index >= 0 ? pos : null;
}

export function writeStudyPosition(profileId: number | string, topicId: string, index: number) {
  if (typeof window === "undefined") return;
  try {
    const all = readStudyPositions(profileId);
    all[topicId] = { index, updatedAt: new Date().toISOString() };
    localStorage.setItem(key(profileId), JSON.stringify(all));
  } catch {
    // Storage full or blocked: Continue falls back to card 1.
  }
}
