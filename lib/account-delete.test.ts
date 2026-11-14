// lib/account-delete.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  PROFILE_SUBCOLLECTIONS, accountDeletePaths, chunk, clearLocalAppData, deleteAccountFailure,
  needsRecentSignIn, profileIdsToClean, reauthMethod,
} from "./account-delete";

test("needsRecentSignIn: inside 4 minutes no, after or unknown yes", () => {
  const now = Date.parse("2026-11-14T12:00:00Z");
  assert.equal(needsRecentSignIn("2026-11-14T11:57:00Z", now), false);
  assert.equal(needsRecentSignIn("2026-11-14T11:56:00Z", now), false);
  assert.equal(needsRecentSignIn("2026-11-14T11:55:59Z", now), true);
  assert.equal(needsRecentSignIn(null, now), true);
  assert.equal(needsRecentSignIn("not a date", now), true);
});

test("reauthMethod prefers the password, then Google, then Apple", () => {
  assert.equal(reauthMethod(["google.com", "password"]), "password");
  assert.equal(reauthMethod(["google.com"]), "google");
  assert.equal(reauthMethod(["apple.com"]), "apple");
  assert.equal(reauthMethod(["apple.com", "google.com"]), "google");
  assert.equal(reauthMethod(["phone"]), "unsupported");
  assert.equal(reauthMethod([]), "unsupported");
});

test("subcollections cover every profile subcollection in firestore.rules", async () => {
  const { readFileSync } = await import("node:fs");
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const profileBlock = rules.slice(rules.indexOf("match /profiles/{profileId}"), rules.indexOf("match /generationQuota"));
  const subs = [...profileBlock.matchAll(/match \/(\w+)\/\{/g)].map((m) => m[1]).filter((s) => s !== "profiles").sort();
  assert.deepEqual(subs, [...PROFILE_SUBCOLLECTIONS].sort());
});

test("profileIdsToClean unions remote and local ids", () => {
  assert.deepEqual(profileIdsToClean(["1", "2"], [2, 3]), ["1", "2", "3"]);
  assert.deepEqual(profileIdsToClean([], []), []);
});

test("accountDeletePaths deletes children, then profiles, then the user doc", () => {
  const paths = accountDeletePaths("u1", [
    { profileId: "1", children: { notes: ["n1", "n2"], folders: ["f1"], quizAttempts: ["q1"] } },
    { profileId: "2", children: {} },
  ]);
  assert.deepEqual(paths, [
    "users/u1/profiles/1/notes/n1",
    "users/u1/profiles/1/notes/n2",
    "users/u1/profiles/1/folders/f1",
    "users/u1/profiles/1/quizAttempts/q1",
    "users/u1/profiles/1",
    "users/u1/profiles/2",
    "users/u1",
  ]);
  assert.deepEqual(accountDeletePaths("u1", []), ["users/u1"]);
  for (const p of paths) assert.ok(p.startsWith("users/u1"), "never outside the user's subtree");
});

test("chunk keeps batches under the 500-write limit", () => {
  const items = Array.from({ length: 1001 }, (_, i) => i);
  const parts = chunk(items);
  assert.deepEqual(parts.map((p) => p.length), [450, 450, 101]);
  assert.deepEqual(parts.flat(), items);
  assert.deepEqual(chunk([]), []);
});

test("clearLocalAppData removes every key but the theme", () => {
  const data = new Map<string, string>([
    ["profiles", "[]"], ["currentProfile", "{}"], ["content_1", "[]"], ["chat_1_s", "[]"], ["theme", "dark"],
  ]);
  const storage = {
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => { data.delete(k); },
  };
  assert.equal(clearLocalAppData(storage), 4);
  assert.deepEqual([...data.keys()], ["theme"]);
});

test("deleteAccountFailure maps codes to W-7.7 wording", () => {
  assert.equal(deleteAccountFailure("auth/popup-closed-by-user"), null);
  assert.equal(deleteAccountFailure("auth/wrong-password")?.field, "password");
  assert.equal(deleteAccountFailure("auth/invalid-credential")?.field, "password");
  assert.match(deleteAccountFailure("auth/network-request-failed")!.message, /can't be reached/);
  assert.match(deleteAccountFailure(undefined)!.message, /hello@quizliai\.com/);
  for (const code of ["auth/wrong-password", "auth/user-mismatch", "permission-denied", "x"]) {
    assert.doesNotMatch(deleteAccountFailure(code)!.message, /invalid|\bvalid|please|sorry|oops|required/i);
  }
});
