// Pre-call budget reservation for inline fileData (photo/PDF base64).
// The old flat 3,000-token figure under-reserved chapter PDFs ~3.7x
// (aitoolsiuse 2026-11-16: a 20-page PDF ≈ 11,200 tokens at 560/page,
// and the app will send 10–15 page chapter scans). Pure math, no I/O.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileDataEstimateTokens, FILE_BYTES_PER_PAGE } from "./file-estimate";

// A single-page file: the floor — never cheaper than one page.
test("smallest file reserves one page (560 tokens)", () => {
  assert.equal(fileDataEstimateTokens(4_000), 560); // ~3KB decoded
  assert.equal(fileDataEstimateTokens(0), 560);
});

// The anchor from the spec: a 20-page PDF (~50KB/page, ~1MB decoded,
// ~1.37M base64 chars) reserves 11,200 tokens.
test("20-page PDF reserves 11,200 tokens", () => {
  const twentyPagesBytes = 20 * FILE_BYTES_PER_PAGE;
  const base64Length = Math.ceil((twentyPagesBytes * 4) / 3);
  assert.equal(fileDataEstimateTokens(base64Length), 11_200);
});

// Between pages rounds UP: 10.2 pages reserves 11 pages (worst-case side).
test("partial pages round up", () => {
  const tenAndABit = Math.ceil((10.2 * FILE_BYTES_PER_PAGE * 4) / 3);
  assert.equal(fileDataEstimateTokens(tenAndABit), 11 * 560);
});

// The 10–15 page chapter range the app will actually send.
test("15-page chapter PDF reserves 8,400 tokens", () => {
  const fifteen = Math.ceil((15 * FILE_BYTES_PER_PAGE * 4) / 3);
  assert.equal(fileDataEstimateTokens(fifteen), 8_400);
});
