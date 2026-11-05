// Firebase subscription management (matches iOS implementation)
import { db, auth, isFirebaseConfigured } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { UserSubscription } from "./subscription";

// Convert email to Firestore-safe document ID (matches iOS)
export function emailToDocId(email: string): string {
  return email.replace(/@/g, "_").replace(/\./g, "_");
}

// Shared user doc key: UID-keyed for signed-in users (the schema shared
// with the iOS app), falling back to the legacy email-derived key when
// there is no auth session (pre-migration docs).
export function currentUserDocId(email: string): string {
  const uid = auth?.currentUser?.uid;
  if (uid) return uid;
  return emailToDocId(email);
}

// User document structure. The subscriptions map carries whichever plan
// types have been sold (legacy monthly/yearly/yearlyOffer from the old web
// lineup, plus weekly/individual_yearly/family_yearly matching the iOS
// Release B lineup).
export interface FirebaseUserDoc {
  email: string;
  promoApplied: string | null;
  promoAppliedAt: Date | null;
  promoExpiresAt: Date | null;
  isLocked: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  subscriptions: Record<
    string,
    { active: boolean; renewalDate: Date | null } | undefined
  >;
  freePlanActive?: boolean;
  freePlanExpiresAt?: Date | null;
}

// Create or update user in Firestore (matches iOS createOrUpdateUser)
export async function createOrUpdateFirebaseUser(email: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    console.log("Firebase not configured, skipping user creation");
    return;
  }

  try {
    const docId = currentUserDocId(email);
    const userRef = doc(db, "users", docId);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      // Update last login only
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
      });
      console.log("✅ User login updated:", email);
    } else {
      // Create new user
      const data = {
        email,
        promoApplied: null,
        promoAppliedAt: null,
        promoExpiresAt: null,
        isLocked: false,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        // Empty map — plan keys appear server-side on first purchase only.
        // The legacy monthly/yearly/yearlyOffer placeholders stopped being
        // seeded 2026-11-06 (dead pre-Release-B lineup; zero active legacy
        // subscribers in the DB). QuizliSyncManager.swift seeds the identical
        // shape on iOS — change both together.
        subscriptions: {},
      };

      await setDoc(userRef, data);
      console.log("✅ New user created:", email);
    }
  } catch (error) {
    console.error("❌ Error creating/updating user:", error);
  }
}

// Get user subscription from Firestore
export async function getFirebaseSubscription(email: string): Promise<UserSubscription | null> {
  if (!isFirebaseConfigured() || !db) {
    return null;
  }

  try {
    const docId = currentUserDocId(email);
    const userRef = doc(db, "users", docId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as FirebaseUserDoc;

    // Check promo code first
    if (data.freePlanActive && data.freePlanExpiresAt) {
      const expiryDate = data.freePlanExpiresAt instanceof Timestamp
        ? data.freePlanExpiresAt.toDate()
        : new Date(data.freePlanExpiresAt);

      if (expiryDate > new Date()) {
        return {
          planId: "pro_monthly",
          status: "active",
          currentPeriodEnd: expiryDate.toISOString(),
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        };
      }
    }

    // Check subscriptions — current lineup only. Legacy
    // monthly/yearly/yearlyOffer fields are ignored (lineup retired with
    // Release B; DB audit 2026-11-06 found zero active legacy subscribers).
    const planFieldToPlanId: Record<string, string> = {
      family_yearly: "family_yearly",
      individual_yearly: "individual_yearly",
      weekly: "weekly",
    };

    for (const [field, planId] of Object.entries(planFieldToPlanId)) {
      const sub = data.subscriptions?.[field];
      if (!sub?.active) continue;

      const renewalDate = sub.renewalDate instanceof Timestamp
        ? sub.renewalDate.toDate()
        : sub.renewalDate
          ? new Date(sub.renewalDate)
          : null;

      return {
        planId,
        status: "active",
        currentPeriodEnd: renewalDate?.toISOString() || null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    }

    // Free plan
    return {
      planId: "free",
      status: "free",
      currentPeriodEnd: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  } catch (error) {
    console.error("❌ Error getting subscription:", error);
    return null;
  }
}

// NOTE (2026-10-21): production subscriptions are server-written (Stripe
// webhook + /api/ios/entitlements via Admin SDK). These client writes are
// demo-mode only until the cutover rules lockdown (see plan Task 12).
// Update subscription in Firestore
export async function updateFirebaseSubscription(
  email: string,
  type: "monthly" | "yearly" | "yearlyOffer" | "weekly" | "individual_yearly" | "family_yearly",
  active: boolean,
  renewalDate: Date | null
): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    console.log("Firebase not configured, skipping subscription update");
    return;
  }

  try {
    const docId = currentUserDocId(email);
    const userRef = doc(db, "users", docId);

    const updates: any = {};
    updates[`subscriptions.${type}.active`] = active;
    updates[`subscriptions.${type}.renewalDate`] = renewalDate;

    await updateDoc(userRef, updates);
    console.log(`✅ Subscription ${type} updated successfully`);
  } catch (error) {
    console.error("❌ Failed to update subscription:", error);
  }
}


// Apply promo code — server-side since the rules lockdown. The route
// (app/api/promo) validates against the promoCodes collection (isActive,
// expirationDate, one redemption per user) and grants the free month via
// the Admin SDK; clients can no longer write their own grant fields.
export async function applyPromoCode(
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  const user = auth?.currentUser;
  if (!user) {
    return { success: false, message: "Sign in to redeem a promo code." };
  }
  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
    return await res.json();
  } catch {
    return { success: false, message: "Failed to apply promo code" };
  }
}

// Sync subscription from Firestore to localStorage
export async function syncSubscriptionFromFirebase(
  email: string,
  profileId: number
): Promise<UserSubscription> {
  const firebaseSub = await getFirebaseSubscription(email);

  if (firebaseSub) {
    // Save to localStorage for offline access
    if (typeof window !== "undefined") {
      localStorage.setItem(`subscription_${profileId}`, JSON.stringify(firebaseSub));
    }
    return firebaseSub;
  }

  // Fallback to localStorage
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(`subscription_${profileId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  }

  // Default free plan
  return {
    planId: "free",
    status: "free",
    currentPeriodEnd: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };
}

// Save subscription to both Firebase and localStorage
export async function saveSubscriptionToFirebase(
  email: string,
  profileId: number,
  subscription: UserSubscription
): Promise<void> {
  // Save to localStorage immediately
  if (typeof window !== "undefined") {
    localStorage.setItem(`subscription_${profileId}`, JSON.stringify(subscription));
  }

  // Sync to Firebase if configured
  if (isFirebaseConfigured() && db && subscription.status === "active") {
    try {
      const planFieldByPlanId: Record<string, string> = {
        family_yearly: "family_yearly",
        individual_yearly: "individual_yearly",
        weekly: "weekly",
      };
      const type = planFieldByPlanId[subscription.planId];
      if (!type) {
        // Unknown planId (e.g. stale localStorage) — never invent a
        // legacy field, just keep the local mirror.
        console.warn("Skipping Firebase mirror for unknown planId:", subscription.planId);
      } else {
        const renewalDate = subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd)
          : null;

        await updateFirebaseSubscription(email, type as any, true, renewalDate);
      }
    } catch (error) {
      console.warn("Failed to sync to Firebase, saved locally only:", error);
    }
  }
}
