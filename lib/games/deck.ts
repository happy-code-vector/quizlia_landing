import sampleDeckData from "./fixtures/sample-deck.json";
import type { StudyDeck } from "./types";

export function loadDeck(noteId?: string, profileId?: string, mock?: string): StudyDeck {
  const isMock = mock === "1" || !noteId;
  const resolvedNoteId = isMock ? "mock-note" : noteId;
  const resolvedProfileId = isMock ? "mock-profile" : (profileId ?? "mock-profile");

  return {
    noteId: resolvedNoteId,
    profileId: resolvedProfileId,
    title: sampleDeckData.title,
    cards: sampleDeckData.cards.map((card) => ({
      id: card.id,
      term: card.term,
      definition: card.definition,
    })),
  };
}

export const getDeck = loadDeck;
