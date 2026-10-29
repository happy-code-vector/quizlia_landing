// Offline StoreKit 2 signed-transaction (JWS) verification — spec §5.4.
// Chain: leaf cert ← intermediate ← Apple Root CA - G3 (embedded PEM).
// Signature: ES256 over `${header}.${payload}` with the leaf's public key.
// No network, no Apple API key; fail closed (null) on ANY anomaly.
import { createVerify, X509Certificate } from "node:crypto";
import { PRODUCT_FIELD_BY_ID } from "@/lib/storekit-products";
import type { DeviceEntitlement } from "@/lib/devices";

/** Alias of DeviceEntitlement (plan Task 3 interface, consumed by Tasks 4/5). */
export type StoreKitEntitlement = DeviceEntitlement;

// Apple Root CA - G3 (public cert) — INLINED as a string constant so the
// Netlify function bundle never depends on file tracing for a runtime fs
// read (final-review Important #4). Rotation: replace this constant with
// the PEM from https://www.apple.com/certificateauthority/ (Apple Root CA
// - G3) and update lib/certs/AppleRootCA-G3.pem to match.
const APPLE_ROOT_CA_G3 = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`;
const EXPECTED_BUNDLE_ID = "com.test.QuickNote";

interface JwsHeader {
  alg: string;
  x5c: string[];
}

interface TransactionPayload {
  bundleId: string;
  productId: string;
  transactionId: string;
  originalTransactionId?: number | string; // stable across renewals — budget key (item 28)
  expiresDate: number; // ms since epoch
  revocationDate?: number | null;
  signedDate: number;
}

function b64urlToBuffer(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function certFromPemB64(pemB64: string): X509Certificate {
  return new X509Certificate(`-----BEGIN CERTIFICATE-----\n${pemB64}\n-----END CERTIFICATE-----`);
}

/** true iff `child` is directly signed by `parent`. */
function signedBy(child: X509Certificate, parent: X509Certificate): boolean {
  return child.verify(parent.publicKey);
}

/** true iff the leaf's signature over the signing input is valid. */
function signatureValid(signingInput: string, signature: Buffer, leaf: X509Certificate): boolean {
  const verify = createVerify("SHA256");
  verify.update(signingInput);
  // JWS ES256 signatures are raw r||s (RFC 7518 §3.4), NOT DER —
  // dsaEncoding:"der" would reject every genuine Apple receipt.
  return verify.verify({ key: leaf.publicKey, dsaEncoding: "ieee-p1363" }, signature);
}

export function verifyStoreKitJws(jws: string): DeviceEntitlement | null {
  try {
    const [h, p, s] = jws.split(".");
    if (!h || !p || !s) return null;

    const header: JwsHeader = JSON.parse(b64urlToBuffer(h).toString("utf8"));
    if (header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length < 2) return null;

    const certs = header.x5c.map(certFromPemB64);
    const leaf = certs[0];
    const root = new X509Certificate(APPLE_ROOT_CA_G3);

    // Chain walk: each cert must be signed by the next (consecutive
    // pairs), then the trailing cert anchors at the embedded Apple root —
    // either it IS the root (Apple's [leaf, intermediate, root] shape) or
    // it is signed by it ([leaf, intermediate]).
    for (let i = 0; i < certs.length - 1; i++) {
      if (!signedBy(certs[i], certs[i + 1])) return null;
    }
    const last = certs[certs.length - 1];
    if (!last.raw.equals(root.raw) && !signedBy(last, root)) return null;

    if (!signatureValid(`${h}.${p}`, b64urlToBuffer(s), leaf)) return null;

    const payload: TransactionPayload = JSON.parse(b64urlToBuffer(p).toString("utf8"));
    if (payload.bundleId !== EXPECTED_BUNDLE_ID) return null;
    if (payload.revocationDate != null) return null;
    if (payload.expiresDate <= Date.now()) return null;

    const mapped = PRODUCT_FIELD_BY_ID[payload.productId];
    if (!mapped) return null;

    return {
      plan: mapped.plan,
      productField: mapped.field,
      productId: payload.productId,
      transactionId: String(payload.transactionId),
      ...(payload.originalTransactionId != null && {
        originalTransactionId: String(payload.originalTransactionId),
      }),
      expiresAt: new Date(payload.expiresDate).toISOString(),
      renewalDate: new Date(payload.expiresDate).toISOString(),
      verifiedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Best (family > individual, then longest expiry) of a receipt list. */
export function bestEntitlement(jwsList: string[]): DeviceEntitlement | null {
  const verified = jwsList
    .map((jws) => verifyStoreKitJws(jws))
    .filter((e): e is DeviceEntitlement => e !== null);
  if (!verified.length) return null;
  verified.sort((a, b) =>
    a.plan !== b.plan
      ? a.plan === "family" ? -1 : 1
      : b.expiresAt.localeCompare(a.expiresAt)
  );
  return verified[0];
}
