// One-time migration: email-keyed user docs → UID-keyed docs (shared
// schema with the iOS app). Idempotent, dry-run by default.
//
// Usage:
//   FIREBASE_SERVICE_ACCOUNT='{"project_id":"quailizy",...}' \
//   node scripts/migrate-to-uid.mjs            # dry-run (prints plan)
//   node scripts/migrate-to-uid.mjs --apply    # write
//   node scripts/migrate-to-uid.mjs --prune    # AFTER verifying: delete
//                                              # migrated source docs
//
// The service account JSON comes from Firebase console → Project settings
// → Service accounts → Generate new private key (quailizy project).
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const emailToDocId = (email) => email.replace(/@/g, "_").replace(/\./g, "_");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const PRUNE = args.includes("--prune");

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : (() => {
      try {
        return JSON.parse(readFileSync("firebase-service-account.json", "utf8"));
      } catch {
        console.error(
          "Provide FIREBASE_SERVICE_ACCOUNT env var or firebase-service-account.json (quailizy service account)."
        );
        process.exit(1);
      }
    })();

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  // All auth users → map email → uid
  const users = [];
  let page;
  do {
    const result = await auth.listUsers(1000, page);
    users.push(...result.users);
    page = result.pageToken;
  } while (page);

  console.log(`Auth users: ${users.length}`);
  let planned = 0;
  let copied = 0;
  const migrated = []; // {emailDocId, uid} for --prune

  for (const user of users) {
    if (!user.email) continue;
    const emailDocId = emailToDocId(user.email);
    const srcRef = db.collection("users").doc(emailDocId);
    const dstRef = db.collection("users").doc(user.uid);
    const src = await srcRef.get();
    if (!src.exists) {
      console.log(`- ${user.email}: no legacy doc, skip`);
      continue;
    }

    const dst = await dstRef.get();
    if (dst.exists && !PRUNE) {
      console.log(`- ${user.email}: uid doc already exists, skip (use --prune to remove source)`);
      migrated.push({ emailDocId, uid: user.uid });
      continue;
    }

    planned++;
    const data = src.data();
    const profilesSnap = await srcRef.collection("profiles").get();

    if (APPLY) {
      const payload = { ...data, uid: user.uid, migratedFromEmailDoc: emailDocId };
      await dstRef.set(payload, { merge: true });
      for (const p of profilesSnap.docs) {
        await dstRef.collection("profiles").doc(p.id).set(p.data(), { merge: true });
      }
      copied++;
      migrated.push({ emailDocId, uid: user.uid });
      console.log(`✅ ${user.email}: users/${emailDocId} → users/${user.uid} (+${profilesSnap.size} profiles)`);
    } else {
      console.log(`DRY  ${user.email}: users/${emailDocId} → users/${user.uid} (+${profilesSnap.size} profiles)`);
    }
  }

  if (PRUNE) {
    for (const { emailDocId } of migrated) {
      const ref = db.collection("users").doc(emailDocId);
      const profiles = await ref.collection("profiles").get();
      for (const p of profiles.docs) await p.ref.delete();
      await ref.delete();
      console.log(`🧹 pruned users/${emailDocId}`);
    }
  }

  console.log(`\nDone. planned=${planned} copied=${copied} pruned-docs=${PRUNE ? migrated.length : 0} (${APPLY || PRUNE ? "applied" : "dry-run"})`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
