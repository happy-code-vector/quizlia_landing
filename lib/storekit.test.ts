// Receipt intake contract (iOS -> /api/ios/entitlements -> users/{uid}.subscriptions).
// Pins three things the 1.0.12 device test depends on:
//  1. every StoreKit product ID the app sells maps to a subscriptions field
//     that planFromSubscriptions reads back as the same plan;
//  2. receipts signed by anything other than Apple Root CA G3 (for example
//     Xcode's StoreKit configuration file) are rejected, so a Simulator or
//     StoreKit-config purchase never unlocks the server plan;
//  3. bestEntitlement fails closed on empty or unverifiable input.
// Run: npx -y tsx --test lib/storekit.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPrivateKey, sign, verify, X509Certificate } from "node:crypto";
import { PRODUCT_FIELD_BY_ID } from "./storekit-products";
import { verifyStoreKitJws, bestEntitlement } from "./storekit-verify";
import { planFromSubscriptions } from "./quota";

// Test-only chain made with openssl for this file: a self-signed root named like
// Xcode's local StoreKit signer and a leaf under it. Not an Apple certificate.
const FIXTURE_ROOT_B64 = "MIIBszCCAVmgAwIBAgIUZu7HgSV8LJ14FZ1yTdVXIlkBnhQwCgYIKoZIzj0EAwIwLjEsMCoGA1UEAwwjU3RvcmVLaXQgVGVzdGluZyBpbiBYY29kZSAoZml4dHVyZSkwIBcNMjYxMTE0MTc1MDIwWhgPMjEyNjEwMjExNzUwMjBaMC4xLDAqBgNVBAMMI1N0b3JlS2l0IFRlc3RpbmcgaW4gWGNvZGUgKGZpeHR1cmUpMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2U8LkmBdJ93wvif7Ck9rwqIYIfX8drrhw7YSTmZ+Nht4jDgc4lUIWi6ws3CnfT61xbsQb01yh9TloPcSkqE3MaNTMFEwHQYDVR0OBBYEFA+gSpHbwWmJEBs5hSE1zr/mkwHlMB8GA1UdIwQYMBaAFA+gSpHbwWmJEBs5hSE1zr/mkwHlMA8GA1UdEwEB/wQFMAMBAf8wCgYIKoZIzj0EAwIDSAAwRQIhANQqJKFXvBuWwwvK6o9IPdIETyzeJLwepyAdHblbhKhlAiAc4yU2fZvhzt7ygWLkM3GG7KlS3LDO2tQq/FakpiUMDA==";
const FIXTURE_LEAF_B64 = "MIIBQjCB6AIUM/jDIXHbjH3vTZeKEkk3my6zopcwCgYIKoZIzj0EAwIwLjEsMCoGA1UEAwwjU3RvcmVLaXQgVGVzdGluZyBpbiBYY29kZSAoZml4dHVyZSkwIBcNMjYxMTE0MTc1MDIwWhgPMjEyNjEwMjExNzUwMjBaMBcxFTATBgNVBAMMDEZpeHR1cmUgbGVhZjBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHAKS7aqMMELh0l/ShbYKcEkngcEM3rybnJqn47hH0a2F7e6l62R19v1Xx9WrCeznHuGAGbPD03AIJgDYnHXVrQwCgYIKoZIzj0EAwIDSQAwRgIhAKv3ELaxzaIHhtkfzlcAopdqf2DRf25B1xd/s2OjFUyBAiEAl+5uG6ajkt+wFTnt9Iz71RzNVtt3vo8IMX6hl6lHX4w=";
const FIXTURE_LEAF_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgkHPPox3I4qE49pm/
grC3y45VFmbyOOVwJOxTuWR9Ey2hRANCAARwCku2qjDBC4dJf0oW2CnBJJ4HBDN6
8m5yap+O4R9Gthe3upetkdfb9V8fVqwns5x7hgBmzw9NwCCYA2Jx11a0
-----END PRIVATE KEY-----`;

const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function signJws(payload: Record<string, unknown>, x5c: string[], alg = "ES256"): string {
  const h = b64url(Buffer.from(JSON.stringify({ alg, x5c })));
  const p = b64url(Buffer.from(JSON.stringify(payload)));
  const s = sign("sha256", Buffer.from(`${h}.${p}`), {
    key: createPrivateKey(FIXTURE_LEAF_KEY),
    dsaEncoding: "ieee-p1363",
  });
  return `${h}.${p}.${b64url(s)}`;
}

const validPayload = {
  bundleId: "com.test.QuickNote",
  productId: "com.test.QuickNote.premium.yearly",
  transactionId: "2000000000000001",
  originalTransactionId: "2000000000000001",
  inAppOwnershipType: "PROPRIETARY",
  expiresDate: Date.now() + 7 * 24 * 3600 * 1000,
  signedDate: Date.now(),
};

test("every sold product ID maps to a field that reads back as the same plan", () => {
  const ids = Object.keys(PRODUCT_FIELD_BY_ID).sort();
  assert.deepEqual(ids, [
    "com.test.QuickNote.premium.discountyearly",
    "com.test.QuickNote.premium.weekly",
    "com.test.QuickNote.premium.yearly",
  ]);
  for (const [id, { field, plan }] of Object.entries(PRODUCT_FIELD_BY_ID)) {
    assert.equal(planFromSubscriptions({ [field]: { active: true } }), plan, id);
  }
});

test("Family Annual is the yearly product, Individual Annual is discountyearly", () => {
  assert.equal(PRODUCT_FIELD_BY_ID["com.test.QuickNote.premium.yearly"].plan, "family");
  assert.equal(PRODUCT_FIELD_BY_ID["com.test.QuickNote.premium.discountyearly"].plan, "individual");
  assert.equal(PRODUCT_FIELD_BY_ID["com.test.QuickNote.premium.weekly"].plan, "individual");
});

test("planFromSubscriptions: family wins, inactive and legacy fields are free", () => {
  assert.equal(planFromSubscriptions({ family_yearly: { active: true }, weekly: { active: true } }), "family");
  assert.equal(planFromSubscriptions({ individual_yearly: { active: false } }), "free");
  assert.equal(planFromSubscriptions({ monthly: { active: true } }), "free");
  assert.equal(planFromSubscriptions({}), "free");
});

test("a correctly signed receipt from a non-Apple chain (Xcode StoreKit config) is rejected", () => {
  const jws = signJws(validPayload, [FIXTURE_LEAF_B64, FIXTURE_ROOT_B64]);
  // Guard: the signature itself is valid for the leaf, so the only reason to reject is the chain.
  const [h, p, s] = jws.split(".");
  const leaf = new X509Certificate(`-----BEGIN CERTIFICATE-----\n${FIXTURE_LEAF_B64}\n-----END CERTIFICATE-----`);
  const sig = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  assert.ok(verify("sha256", Buffer.from(`${h}.${p}`), { key: leaf.publicKey, dsaEncoding: "ieee-p1363" }, sig));
  assert.equal(verifyStoreKitJws(jws), null);
  assert.equal(bestEntitlement([jws]), null);
});

test("malformed receipts fail closed", () => {
  assert.equal(verifyStoreKitJws(""), null);
  assert.equal(verifyStoreKitJws("a.b"), null);
  assert.equal(verifyStoreKitJws("not.base64.json"), null);
  // Wrong algorithm and a one-cert chain are refused before any crypto.
  assert.equal(verifyStoreKitJws(signJws(validPayload, [FIXTURE_LEAF_B64, FIXTURE_ROOT_B64], "HS256")), null);
  assert.equal(verifyStoreKitJws(signJws(validPayload, [FIXTURE_LEAF_B64])), null);
});

test("bestEntitlement returns null for no receipts", () => {
  assert.equal(bestEntitlement([]), null);
});
