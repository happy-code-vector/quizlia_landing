// lib/typed-text.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  TYPED_TEXT_MAX_CHARS, countTypedWords, docSourceType, isLoneLink, typedTextSourceName, validateTypedText,
} from "./typed-text";

const fifteen = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen";

test("validateTypedText asks for text when empty or blank", () => {
  assert.equal(validateTypedText(""), "Type or paste what you want to study");
  assert.equal(validateTypedText("   \n\t "), "Type or paste what you want to study");
});

test("validateTypedText applies the iOS minimum: 15 words or 60 characters", () => {
  assert.equal(countTypedWords(fifteen), 15);
  assert.equal(validateTypedText(fifteen), null);
  const fourteen = Array(14).fill("cat").join(" ");
  assert.equal(fourteen.length < 60, true);
  // 14 longer words pass on the character rule, as on iOS.
  assert.equal(validateTypedText(fifteen.split(" ").slice(0, 14).join(" ")), null);
  assert.match(validateTypedText(fourteen) ?? "", /Add a few more sentences/);
  // Languages without spaces count characters instead.
  assert.equal(validateTypedText("光".repeat(60)), null);
  assert.match(validateTypedText("光".repeat(59)) ?? "", /Add a few more sentences/);
});

test("validateTypedText trims before counting", () => {
  assert.equal(validateTypedText(`  \n${fifteen}\n  `), null);
});

test("validateTypedText rejects text over the cap and names the length", () => {
  const long = "a ".repeat(TYPED_TEXT_MAX_CHARS); // trimmed length is 2*cap - 1
  const msg = validateTypedText(long) ?? "";
  assert.match(msg, /^Shorten your text to 120,000 characters or fewer\. It has 239,999$/);
  assert.equal(validateTypedText("a".repeat(TYPED_TEXT_MAX_CHARS)), null);
});

test("a lone link is sent to the link sources, a link inside notes is fine", () => {
  assert.equal(isLoneLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assert.equal(isLoneLink("  www.example.com/article  "), true);
  assert.match(validateTypedText(`https://example.com/${"x".repeat(80)}`) ?? "", /That is a link/);
  assert.equal(isLoneLink(`See https://example.com for ${fifteen}`), false);
  assert.equal(validateTypedText(`See https://example.com for ${fifteen}`), null);
});

test("validation messages avoid the banned W-7.7 words", () => {
  const msgs = ["", "short", "https://x.com", "a ".repeat(TYPED_TEXT_MAX_CHARS)].map((t) => validateTypedText(t) ?? "");
  for (const m of msgs) assert.doesNotMatch(m, /invalid|valid|please|sorry|oops|required/i);
});

test("typedTextSourceName uses the first line, collapsed and cut to 50", () => {
  assert.equal(typedTextSourceName("  Photosynthesis   basics\nsecond line"), "Photosynthesis basics");
  assert.equal(typedTextSourceName("x".repeat(60)), `${"x".repeat(50)}...`);
  assert.equal(typedTextSourceName("   "), "Typed notes");
});

test("docSourceType keeps link notes as url and typed notes as text", () => {
  assert.equal(docSourceType("text", ""), "text");
  assert.equal(docSourceType("TEXT", ""), "text");
  assert.equal(docSourceType("text", "https://example.com/a"), "url");
  assert.equal(docSourceType("youtube", "https://youtu.be/dQw4w9WgXcQ"), "youtube");
  assert.equal(docSourceType("pdf", ""), "pdf");
  assert.equal(docSourceType("photo", ""), "image");
  assert.equal(docSourceType("web", "https://example.com"), "url");
  assert.equal(docSourceType(undefined, ""), "url");
});
