// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

// Helper function to check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "your_firebase_api_key"
  );
}

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern) - only if configured
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

if (typeof window !== "undefined" && isFirebaseConfigured()) {
  try {
    // Only initialize on client side and if properly configured
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    db = getFirestore(app);
    auth = getAuth(app);

    // App Check (spec §5.8): tokens mint for every Firestore call; the
    // console keeps enforcement OFF (log-only) until traffic looks clean.
    if (process.env.NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY) {
      if (process.env.NODE_ENV === "development") {
        // Dev only: makes the SDK print a debug token to the console;
        // register it under App Check → Manage debug tokens for localhost.
        (window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
          true;
      }
      try {
        // reCAPTCHA Enterprise (Google Cloud "Fraud Defense") — classic
        // reCAPTCHA v3 keys are deprecated. Same env var carries the
        // Enterprise web key; see .env.example for where it's created.
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (error) {
        console.warn("⚠️ App Check initialization failed:", error);
      }
    }

    console.log("✅ Firebase initialized successfully");
  } catch (error) {
    console.warn("⚠️ Firebase initialization failed:", error);
  }
}

export { app, db, auth };
