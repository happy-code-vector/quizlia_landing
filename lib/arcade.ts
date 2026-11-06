import type { StudyDeck } from "@/lib/games/types";

export type GameSlug = "match" | "memory" | "run" | "snake" | "truefalse";

export const GAMES: {
  slug: GameSlug;
  name: string;
  tagline: string;
  icon: string;
  accent: string; // tailwind gradient classes for the card
}[] = [
  { slug: "match", name: "Match Rush", tagline: "Pair each term with its definition before the round timer runs out.", icon: "🎲", accent: "from-purple-600 to-fuchsia-500" },
  { slug: "memory", name: "Memory Flip", tagline: "Flip tiles, remember positions, and clear every pair.", icon: "🃏", accent: "from-sky-500 to-indigo-500" },
  { slug: "run", name: "Quiz Run", tagline: "A nonstop quiz sprint through your deck — one card at a time.", icon: "🏃", accent: "from-emerald-500 to-teal-500" },
  { slug: "snake", name: "Answer Snake", tagline: "Steer the snake into the correct answer and keep growing.", icon: "🐍", accent: "from-lime-500 to-green-600" },
  { slug: "truefalse", name: "True or False", tagline: "Snap judgments, statement by statement. How fast can you go?", icon: "⚡", accent: "from-amber-500 to-orange-500" },
];

export function isGameSlug(v: string): v is GameSlug {
  return GAMES.some((g) => g.slug === v);
}

export type ContentItem = {
  sourceId: string;
  sourceName?: string;
  title?: string;
  type: string;
  data?: { flashcards?: { question: string; answer: string }[] } & Record<string, unknown>;
};

/** Maps a topic's stored flashcards (same store the topic page reads) to
 *  the game Deck shape. Topics without a flashcards item produce an empty
 *  deck — games render their own "not enough cards" state. */
export function buildDeckFromContent(
  noteId: string,
  profileId: string,
  items: ContentItem[]
): StudyDeck {
  const topicItems = items.filter((i) => i.sourceId === noteId);
  const flashItem = topicItems.find(
    (i) => i.type === "flashcards" && Array.isArray(i.data?.flashcards)
  );
  const cards = (flashItem?.data?.flashcards ?? []).map((f, i) => ({
    id: `${noteId}-${i}`,
    term: f.question,
    definition: f.answer,
  }));
  const title = topicItems[0]?.sourceName || topicItems[0]?.title || "Your note";
  return { noteId, profileId, title, cards };
}

/** Topics (notes) that have at least one flashcard — the "pick a note" list. */
export function topicsWithFlashcards(items: ContentItem[]): { id: string; title: string }[] {
  const byId = new Map<string, { title: string; has: boolean }>();
  for (const i of items) {
    const cur = byId.get(i.sourceId) ?? { title: i.sourceName || i.title || "Untitled", has: false };
    if (i.sourceName) cur.title = i.sourceName;
    else if (i.title) cur.title = i.title;
    if (i.type === "flashcards" && (i.data?.flashcards?.length ?? 0) > 0) cur.has = true;
    byId.set(i.sourceId, cur);
  }
  return [...byId.entries()].filter(([, v]) => v.has).map(([id, v]) => ({ id, title: v.title }));
}
