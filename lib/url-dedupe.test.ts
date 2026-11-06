// lib/url-dedupe.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { extractYouTubeId, normalizeUrlForDedupe } from "./url-dedupe";

test("extractYouTubeId handles every common URL form", () => {
  const id = "dQw4w9WgXcQ";
  assert.equal(extractYouTubeId(`https://www.youtube.com/watch?v=${id}`), id);
  assert.equal(extractYouTubeId(`https://youtu.be/${id}`), id);
  assert.equal(extractYouTubeId(`https://www.youtube.com/shorts/${id}`), id);
  assert.equal(extractYouTubeId(`https://www.youtube.com/embed/${id}`), id);
  assert.equal(extractYouTubeId(`https://www.youtube.com/live/${id}`), id);
  assert.equal(extractYouTubeId(`https://m.youtube.com/watch?v=${id}&t=30s`), id);
  assert.equal(extractYouTubeId(`https://youtu.be/${id}?si=abc123`), id);
  assert.equal(extractYouTubeId(id), id); // bare id
});

test("extractYouTubeId is case-sensitive and rejects non-YouTube input", () => {
  // ids are case-significant: a case change is a different (non-)match —
  // extraction preserves case and never case-folds (spec: [A-Za-z0-9_-]{11},
  // case-sensitive), so the lowercase URL yields the lowercase id, not null.
  assert.equal(extractYouTubeId("https://youtu.be/dqw4w9wgxcq"), "dqw4w9wgxcq");
  assert.notEqual(extractYouTubeId("https://youtu.be/dqw4w9wgxcq"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeId("https://example.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(extractYouTubeId("not a link"), null);
  assert.equal(extractYouTubeId(""), null);
  assert.equal(extractYouTubeId("ftp://youtu.be/dQw4w9WgXcQ"), null);
});

test("normalizeUrlForDedupe ignores scheme, www, trailing slash, fragment, param order", () => {
  const a = normalizeUrlForDedupe("https://www.example.com/articles/photosynthesis/");
  const b = normalizeUrlForDedupe("http://example.com/articles/photosynthesis#section-2");
  assert.equal(a, b);
  assert.equal(a, "https://example.com/articles/photosynthesis");

  const c = normalizeUrlForDedupe("https://example.com/?b=2&a=1");
  const d = normalizeUrlForDedupe("https://example.com/?a=1&b=2");
  assert.equal(c, d);
});

test("normalizeUrlForDedupe strips tracking params but keeps meaningful ones", () => {
  const a = normalizeUrlForDedupe("https://example.com/page?utm_source=x&id=5&fbclid=zz&gclid=yy");
  const b = normalizeUrlForDedupe("https://example.com/page?id=5");
  assert.equal(a, b);
  assert.equal(a, "https://example.com/page?id=5");
});

test("normalizeUrlForDedupe lowercases host and rejects non-URLs", () => {
  assert.equal(normalizeUrlForDedupe("https://EXAMPLE.com/A/B"), "https://example.com/A/B");
  assert.equal(normalizeUrlForDedupe("example.com/no-scheme"), null);
  assert.equal(normalizeUrlForDedupe("Analyze the following link: hi"), null);
});
