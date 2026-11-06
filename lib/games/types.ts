export type Flashcard = {
  id: string;
  term: string;
  definition: string;
};

export type Card = Flashcard;

export type StudyDeck = {
  noteId: string;
  profileId: string;
  title: string;
  cards: Flashcard[];
};

export type Deck = StudyDeck;

export type MemoryFlipResult = {
  gameId: "memory_flip";
  noteId: string;
  profileId: string;
  startedAt: string;   // ISO
  finishedAt: string;  // ISO
  durationMs: number;
  totalPairs: number;
  flips: number;
  misses: number;
  accuracy: number;    // totalPairs / (totalPairs + misses), 0..1, 2 dp
  perCard: { cardId: string; flips: number; misses: number; matchedCleanly: boolean }[];
  reviewCardIds: string[]; // cards with misses >= 2
};

export type MatchRushResult = {
  gameId: "match_rush";
  noteId: string;
  profileId: string;
  startedAt: string;   // ISO
  finishedAt: string;  // ISO
  durationMs: number;
  totalPairs: number;
  misses: number;      // wrong term-definition selections
  accuracy: number;    // totalPairs / (totalPairs + misses), 0..1, 2 dp
  perCard: { cardId: string; misses: number; matchedCleanly: boolean }[];
  reviewCardIds: string[]; // cards with misses >= 2
};

export type AnswerSnakeResult = {
  gameId: "answer_snake";
  noteId: string;
  profileId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  totalCards: number;
  wrongPicks: number;
  accuracy: number;   // totalCards / (totalCards + wrongPicks), 0..1, 2 dp
  perCard: { cardId: string; wrongPicks: number; correctFirstTry: boolean }[];
  reviewCardIds: string[]; // cards with wrongPicks >= 1
};

export type QuizRunResult = {
  gameId: "quiz_run";
  noteId: string;
  profileId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  totalCards: number;
  wrongPicks: number;
  accuracy: number;   // totalCards / (totalCards + wrongPicks), 0..1, 2 dp
  perCard: { cardId: string; wrongPicks: number; correctFirstTry: boolean }[];
  reviewCardIds: string[]; // cards with wrongPicks >= 1
};

export type TrueFalseResult = {
  gameId: "true_false";
  noteId: string;
  profileId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  totalStatements: number;
  correct: number;
  accuracy: number;   // correct / totalStatements, 0..1, 2 dp
  perCard: { cardId: string; shown: number; correct: number }[];
  reviewCardIds: string[]; // cards with at least one wrong answer
};

export type GameResult =
  | MemoryFlipResult
  | MatchRushResult
  | AnswerSnakeResult
  | QuizRunResult
  | TrueFalseResult;
