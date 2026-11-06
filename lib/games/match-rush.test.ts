import test from "node:test";
import assert from "node:assert/strict";
import { loadDeck } from "./deck";
import {
  buildMatchRushResult,
  buildRounds,
  createInitialState,
  matchRushReducer,
  truncateDefinition,
} from "../../components/games/MatchRush";

test("14-card fixture builds 2 rounds of 6 (totalPairs = 12)", () => {
  const deck = loadDeck("mock-note", "mock-profile", "1");
  assert.equal(deck.cards.length, 14);

  const rounds = buildRounds(deck.cards, () => 0.42);
  assert.equal(rounds.length, 2);
  assert.equal(rounds[0]?.cards.length, 6);
  assert.equal(rounds[1]?.cards.length, 6);

  const state = createInitialState(deck, () => 0.42);
  const result = buildMatchRushResult(state);
  assert.equal(result.totalPairs, 12);
});

test("Fewer than 4 cards enters empty state", () => {
  const deck = loadDeck("mock-note", "mock-profile", "1");
  const tinyDeck = { ...deck, cards: deck.cards.slice(0, 3) };
  const state = createInitialState(tinyDeck);
  assert.equal(state.status, "empty");
});

test("Truncates definitions longer than 90 characters with ellipsis", () => {
  const shortText = "Short definition under ninety characters.";
  assert.equal(truncateDefinition(shortText), shortText);

  const longText =
    "Membrane-bound organelle that generates most of the chemical energy needed to power the cell's biochemical reactions.";
  assert.equal(longText.length > 90, true);
  const truncated = truncateDefinition(longText);
  assert.equal(truncated.endsWith("…"), true);
  assert.equal(truncated.length <= 91, true);
});

test("Matching, misses, and reviewCardIds calculation", () => {
  const deck = loadDeck("mock-note", "mock-profile", "1");
  let state = createInitialState(deck, () => 0.25);

  const round1 = state.rounds[0]!;
  const cardA = round1.cards[0]!;
  const cardB = round1.cards[1]!;

  state = matchRushReducer(state, { type: "start", now: 1000 });
  state = matchRushReducer(state, {
    type: "select",
    side: "term",
    cardId: cardA.id,
    now: 1100,
  });
  state = matchRushReducer(state, {
    type: "select",
    side: "definition",
    cardId: cardB.id,
    now: 1200,
  });
  assert.equal(state.misses, 1);
  state = matchRushReducer(state, { type: "resolve" });

  state = matchRushReducer(state, {
    type: "select",
    side: "term",
    cardId: cardA.id,
    now: 1600,
  });
  state = matchRushReducer(state, {
    type: "select",
    side: "definition",
    cardId: cardB.id,
    now: 1700,
  });
  assert.equal(state.misses, 2);
  state = matchRushReducer(state, { type: "resolve" });

  for (const card of round1.cards) {
    state = matchRushReducer(state, {
      type: "select",
      side: "term",
      cardId: card.id,
      now: 2000,
    });
    state = matchRushReducer(state, {
      type: "select",
      side: "definition",
      cardId: card.id,
      now: 2100,
    });
  }
  assert.equal(state.clearedIds.length, 6);

  state = matchRushReducer(state, { type: "nextRound" });
  assert.equal(state.roundIndex, 1);
  assert.equal(state.roundNoticeVisible, true);
  state = matchRushReducer(state, { type: "resolve" });

  const round2 = state.rounds[1]!;
  for (const card of round2.cards) {
    state = matchRushReducer(state, {
      type: "select",
      side: "term",
      cardId: card.id,
      now: 3000,
    });
    state = matchRushReducer(state, {
      type: "select",
      side: "definition",
      cardId: card.id,
      now: 3100,
    });
  }

  state = matchRushReducer(state, { type: "finish", now: 5000 });
  assert.equal(state.status, "finished");

  const result = buildMatchRushResult(state);
  assert.equal(result.totalPairs, 12);
  assert.equal(result.misses, 2);
  assert.deepEqual(result.reviewCardIds, [cardA.id, cardB.id]);
});

test("TrueFalseSprint createNextStatement never repeats consecutive cards and balances true/false", async () => {
  const { createNextStatement } = await import(
    "../../components/games/TrueFalseSprint"
  );
  const deck = loadDeck("mock-note", "mock-profile", "1");
  let prevId: string | null = null;
  let trueCount = 0;
  let seed = 1;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 60; i += 1) {
    const stmt = createNextStatement(deck.cards, prevId, rng);
    assert.notEqual(stmt.card.id, prevId);
    if (stmt.isTrue) {
      assert.equal(stmt.shownDefinition, stmt.card.definition);
      trueCount += 1;
    } else {
      assert.notEqual(stmt.shownDefinition, stmt.card.definition);
    }
    prevId = stmt.card.id;
  }

  assert.equal(trueCount >= 18 && trueCount <= 42, true);
});

