// Admin flag (users/{uid}.admin): admins bypass every generation limit on
// the server (lib/quota). This client-side mirror lets the UI pre-gates
// (canGenerate, paywalls, usage meters) know too, so an admin never sees
// an upgrade prompt the server would have waved through anyway.
import { db, auth, isFirebaseConfigured } from "./firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

let isAdmin = false;
let checkedUid: string | null = null;
const listeners = new Set<(admin: boolean) => void>();

/** Reads users/{uid}.admin once per signed-in account and keeps it live. */
export function watchAdminFlag() {
  if (!isFirebaseConfigured() || !db || !auth) return;
  const database = db;

  auth.onAuthStateChanged((user) => {
    if (!user || user.uid === checkedUid) return;
    checkedUid = user.uid;
    isAdmin = false;

    doc(database, "users", user.uid)
      .onSnapshot((snap) => {
        isAdmin = snap.data()?.admin === true;
        listeners.forEach((fn) => fn(isAdmin));
      });
  });
}

export function isAdminUser(): boolean {
  return isAdmin;
}

export function onAdminChanged(fn: (admin: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
