// Server side of the iOS 429 path: meterGeneration decides whether a
// generation is allowed. The app opens the paywall on 429 (ScienceOfMasteryVC,
// GeneratingViewController, LoaderViewController.isFreeNoteUsed).
// Firestore REST is replaced by an in-memory fetch so nothing leaves the machine.
// Run: npx -y tsx --test lib/quota-meter.test.ts
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { meterGeneration, today, GENERATION_LIMITS } from "./quota";

type Doc = { fields: Record<string, any>; updateTime: string } | null;
let userDoc: Doc;
let quotaDoc: Doc;
let patches: Record<string, any>[];
const realFetch = globalThis.fetch;

function subs(field: string) {
  return { subscriptions: { mapValue: { fields: { [field]: { mapValue: { fields: { active: { booleanValue: true } } } } } } } };
}

beforeEach(() => {
  userDoc = null;
  quotaDoc = null;
  patches = [];
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input);
    const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 404, json: async () => body }) as any;
    if (init?.method === "PATCH") {
      const fields = JSON.parse(init.body).fields;
      patches.push(fields);
      quotaDoc = { fields: { ...(quotaDoc?.fields ?? {}), ...fields }, updateTime: `t${patches.length}` };
      return json(quotaDoc);
    }
    if (url.includes("/users/")) return userDoc ? json(userDoc) : json({}, false);
    if (url.includes("/generationQuota/")) return quotaDoc ? json(quotaDoc) : json({}, false);
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("free account: first generation is allowed and marks the free note used", async () => {
  const r = await meterGeneration("tok", "u1");
  assert.deepEqual(r, { ok: true });
  assert.equal(patches.length, 1);
  assert.deepEqual(patches[0].freeUsed, { booleanValue: true });
});

test("free account: second generation answers 429 (this opens the iOS paywall)", async () => {
  quotaDoc = { fields: { freeUsed: { booleanValue: true }, date: { stringValue: today() } }, updateTime: "t0" };
  const r = await meterGeneration("tok", "u1");
  assert.equal(r.ok, false);
  assert.equal((r as any).status, 429);
  assert.match((r as any).message, /free note/i);
  assert.equal(patches.length, 0);
});

test("subscriber whose receipt reached the server is not blocked by the used free note", async () => {
  userDoc = { fields: subs("individual_yearly"), updateTime: "u" };
  quotaDoc = { fields: { freeUsed: { booleanValue: true }, date: { stringValue: today() } }, updateTime: "t0" };
  assert.deepEqual(await meterGeneration("tok", "u1"), { ok: true });
});

test("individual and weekly cap at 5 per day, family at 15", async () => {
  for (const [field, limit] of [["individual_yearly", 5], ["weekly", 5], ["family_yearly", 15]] as const) {
    userDoc = { fields: subs(field), updateTime: "u" };
    quotaDoc = { fields: { date: { stringValue: today() }, used: { integerValue: String(limit) } }, updateTime: "t0" };
    const r = await meterGeneration("tok", "u1");
    assert.equal((r as any).status, 429, field);
    quotaDoc = { fields: { date: { stringValue: today() }, used: { integerValue: String(limit - 1) } }, updateTime: "t0" };
    assert.deepEqual(await meterGeneration("tok", "u1"), { ok: true }, field);
  }
  assert.deepEqual(GENERATION_LIMITS, { individual: 5, family: 15 });
});

test("yesterday's count does not carry over", async () => {
  userDoc = { fields: subs("individual_yearly"), updateTime: "u" };
  quotaDoc = { fields: { date: { stringValue: "2000-01-01" }, used: { integerValue: "5" } }, updateTime: "t0" };
  assert.deepEqual(await meterGeneration("tok", "u1"), { ok: true });
  assert.deepEqual(patches[0].used, { integerValue: "1" });
});
