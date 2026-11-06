// lib/arcade.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildDeckFromContent, topicsWithFlashcards, GAMES, type ContentItem } from "./arcade";

const items: ContentItem[] = [
  { sourceId: "t1", sourceName: "Photosynthesis", type: "notes", data: { title: "Photosynthesis" } },
  { sourceId: "t1", type: "flashcards", data: { flashcards: [
    { question: "Q1", answer: "A1" },
    { question: "Q2", answer: "A2" },
    { question: "Q3", answer: "A3" },
    { question: "Q4", answer: "A4" },
  ] } },
  { sourceId: "t2", sourceName: "No-cards note", type: "notes" },
  { sourceId: "t3", title: "Fallback title", type: "flashcards", data: { flashcards: [{ question: "Q", answer: "A" }] } },
];

test("buildDeckFromContent maps flashcards to a game deck", () => {
  const deck = buildDeckFromContent("t1", "7", items);
  assert.equal(deck.noteId, "t1");
  assert.equal(deck.profileId, "7");
  assert.equal(deck.title, "Photosynthesis");
  assert.equal(deck.cards.length, 4);
  assert.deepEqual(deck.cards[0], { id: "t1-0", term: "Q1", definition: "A1" });
});

test("buildDeckFromContent with no flashcards item yields an empty deck (game shows its own empty state)", () => {
  const deck = buildDeckFromContent("t2", "7", items);
  assert.equal(deck.cards.length, 0);
  assert.equal(deck.title, "No-cards note");
});

test("topicsWithFlashcards lists only topics that have cards, preferring sourceName", () => {
  const topics = topicsWithFlashcards(items);
  assert.deepEqual(topics, [
    { id: "t1", title: "Photosynthesis" },
    { id: "t3", title: "Fallback title" },
  ]);
});

test("registry exposes all five games with unique slugs", () => {
  assert.equal(GAMES.length, 5);
  assert.equal(new Set(GAMES.map((g) => g.slug)).size, 5);
});
