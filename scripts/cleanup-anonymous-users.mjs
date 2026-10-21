// Post-cutover cleanup (spec §8.2): deletes anonymous Firebase identities
// inactive for 30+ days — users/{uid} (+subcollections via recursiveDelete),
// generationQuota/{uid}, then the Auth user.
// Run AFTER the rebuilt app ships and the Anonymous provider is disabled.
//
// Usage:
//   node scripts/cleanup-anonymous-users.mjs            # dry-run
//   node scripts/cleanup-anonymous-users.mjs --apply
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const INACTIVE_DAYS = 30;

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : JSON.parse(readFileSync("firebase-service-account.json", "utf8"));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  let page;
  const victims = [];
  do {
    const result = await auth.listUsers(1000, page);
    for (const user of result.users) {
      const anonymous = user.providerData.length === 0;
      const lastMs = user.metadata.lastSignInTime
        ? new Date(user.metadata.lastSignInTime).getTime()
        : 0;
      const inactive = Date.now() - lastMs > INACTIVE_DAYS * 24 * 60 * 60 * 1000;
      if (anonymous && inactive) victims.push(user);
    }
    page = result.pageToken;
  } while (page);

  console.log(`Anonymous users inactive ${INACTIVE_DAYS}+ days: ${victims.length}`);
  for (const user of victims) {
    console.log(`${APPLY ? "DELETING" : "would delete"} ${user.uid} (last seen ${user.metadata.lastSignInTime ?? "never"})`);
    if (!APPLY) continue;
    await db.recursiveDelete(db.collection("users").doc(user.uid));
    await db.collection("generationQuota").doc(user.uid).delete();
    await auth.deleteUser(user.uid);
  }
  console.log(APPLY ? "Done." : "Dry run — re-run with --apply to delete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
