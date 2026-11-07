import type { Topic } from "@/lib/types";
import type { StudyPositions } from "@/lib/studyPosition";

export interface HeroDeck {
  topic: Topic;
  /** Zero-based card the deck resumes on. */
  index: number;
  total: number;
  /** True when a saved position exists (Continue resumes), false when it starts at card 1. */
  resumed: boolean;
}

const time = (iso: string | undefined) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Home hero deck: the note with flashcards the profile studied most recently. A note never
 * studied on this device counts by its creation date, so a brand-new note beats an old one.
 * Positions past the last card (the deck shrank) clamp to the last card.
 */
export function pickHeroDeck(topics: Topic[], positions: StudyPositions): HeroDeck | null {
  let best: { topic: Topic; at: number } | null = null;
  for (const topic of topics) {
    if (!topic.flashcards?.length) continue;
    const at = Math.max(time(positions[topic.id]?.updatedAt), time(topic.createdAt));
    if (!best || at > best.at) best = { topic, at };
  }
  if (!best) return null;
  const total = best.topic.flashcards!.length;
  const saved = positions[best.topic.id];
  const index = saved ? Math.min(Math.max(0, saved.index), total - 1) : 0;
  return { topic: best.topic, index, total, resumed: Boolean(saved) };
}
