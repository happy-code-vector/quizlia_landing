// Refund builders — "errors are never metered" (item 42, the refundDeviceScan
// principle) extended to generation and chat: a failed model call must not
// permanently consume a device's free note (freeUsed), daily unit, or lifetime
// chat message. Pure functions over DeviceDoc; the impure wrappers in
// devices.ts only read/patch Firestore around them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGenerationRefund, buildChatRefund, type DeviceDoc } from "./devices";
import { today } from "./quota";

const yesterday = "2000-01-01";

// --- generation -------------------------------------------------------------

test("generation refund: free plan undoes the free note and the unit", () => {
  const doc: DeviceDoc = { date: today(), used: 1, freeUsed: true };
  assert.deepEqual(buildGenerationRefund(doc, "free"), { freeUsed: false, used: 0 });
});

test("generation refund: free plan with freeUsed already false is a no-op", () => {
  // Nothing was metered (or a duplicate refund) — flipping/decrementing again
  // would corrupt counters.
  assert.equal(buildGenerationRefund({ date: today(), used: 2, freeUsed: false }, "free"), null);
});

test("generation refund: paid plan decrements today's used", () => {
  assert.deepEqual(buildGenerationRefund({ date: today(), used: 3 }, "individual"), { used: 2 });
  assert.deepEqual(buildGenerationRefund({ date: today(), used: 3 }, "family"), { used: 2 });
});

test("generation refund: paid plan at zero used is a no-op", () => {
  assert.equal(buildGenerationRefund({ date: today(), used: 0 }, "individual"), null);
});

test("generation refund: date rolled past midnight is a no-op", () => {
  // The unit was charged on a previous day; touching today's fresh counters
  // would create a negative or wrong-day decrement.
  assert.equal(buildGenerationRefund({ date: yesterday, used: 2, freeUsed: true }, "free"), null);
  assert.equal(buildGenerationRefund({ date: yesterday, used: 2 }, "family"), null);
});

// --- chat -------------------------------------------------------------------

test("chat refund: free plan gives back one lifetime message", () => {
  const doc: DeviceDoc = { chatDate: today(), chatUsed: 1, chatTotal: 4 };
  assert.deepEqual(buildChatRefund(doc, "free"), { chatUsed: 0, chatTotal: 3 });
});

test("chat refund: free plan at zero lifetime messages is a no-op", () => {
  assert.equal(buildChatRefund({ chatDate: today(), chatUsed: 0, chatTotal: 0 }, "free"), null);
});

test("chat refund: paid plan decrements today's chatUsed only", () => {
  // The paid meter never touches chatTotal — the refund must not either.
  const doc: DeviceDoc = { chatDate: today(), chatUsed: 5, chatTotal: 9 };
  assert.deepEqual(buildChatRefund(doc, "individual"), { chatUsed: 4 });
});

test("chat refund: paid plan at zero chatUsed is a no-op", () => {
  assert.equal(buildChatRefund({ chatDate: today(), chatUsed: 0 }, "individual"), null);
});

test("chat refund: chatDate rolled past midnight is a no-op", () => {
  assert.equal(buildChatRefund({ chatDate: yesterday, chatUsed: 2, chatTotal: 4 }, "free"), null);
  assert.equal(buildChatRefund({ chatDate: yesterday, chatUsed: 2 }, "family"), null);
});
