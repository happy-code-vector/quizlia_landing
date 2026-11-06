// lib/types.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { topicKey, removeTopicItems } from "./types";

const content = [
  // One topic keyed by sourceId: three artifacts (note/flashcards/quiz)
  { id: 101, sourceId: "source_5000", type: "notes", title: "A" },
  { id: 102, sourceId: "source_5000", type: "flashcards", title: "A cards" },
  { id: 103, sourceId: "source_5000", type: "quiz", title: "A quiz" },
  // A legacy item (pre-sync era, no sourceId) keyed by legacy_<id>
  { id: 7, type: "notes", title: "Legacy note" },
  // Another topic that must survive
  { id: 201, sourceId: "source_9000", type: "notes", title: "B" },
];

test("topicKey prefers sourceId and falls back to legacy_<id>", () => {
  assert.equal(topicKey({ id: 1, sourceId: "t1" }), "t1");
  assert.equal(topicKey({ id: 7 }), "legacy_7");
});

test("removeTopicItems drops every artifact of a sourceId-keyed topic", () => {
  const kept = removeTopicItems(content, "source_5000");
  assert.equal(kept.length, 2);
  assert.ok(kept.every((i: any) => i.sourceId !== "source_5000"));
});

test("removeTopicItems drops legacy-keyed items by their legacy_<id> topic id", () => {
  const kept = removeTopicItems(content, "legacy_7");
  assert.equal(kept.length, 4);
  assert.ok(kept.every((i: any) => i.id !== 7));
});

test("removeTopicItems keeps unrelated topics untouched", () => {
  const kept = removeTopicItems(content, "source_5000");
  assert.equal(kept.filter((i: any) => i.sourceId === "source_9000").length, 1);
  assert.equal(kept.filter((i: any) => i.id === 7).length, 1);
});

test("removeTopicItems with an unknown topic id is a no-op", () => {
  assert.equal(removeTopicItems(content, "nope").length, content.length);
});

test("removeTopicItems with non-array input returns an empty array", () => {
  assert.deepEqual(removeTopicItems(undefined as any, "x"), []);
});
