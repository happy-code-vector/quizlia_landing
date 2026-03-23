// Firebase subscription management (matches iOS implementation)
import { db, isFirebaseConfigured } from "./firebase";
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

// User document structure (matches iOS Firestore schema)
export interface FirebaseUserDoc {
  email: string;
  promoApplied: string | null;
  promoAppliedAt: Date | null;
  promoExpiresAt: Date | null;
  isLocked: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  subscriptions: {
    monthly: {
      active: boolean;
      renewalDate: Date | null;
    };
    yearly: {
      active: boolean;
      renewalDate: Date | null;
    };
    yearlyOffer: {
      active: boolean;
      renewalDate: Date | null;
    };
  };
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
    const docId = emailToDocId(email);
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
        subscriptions: {
          monthly: {
            active: false,
            renewalDate: null,
          },
          yearly: {
            active: false,
            renewalDate: null,
          },
          yearlyOffer: {
            active: false,
            renewalDate: null,
          },
        },
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
    const docId = emailToDocId(email);
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

    // Check subscriptions
    if (data.subscriptions.yearly.active) {
      const renewalDate = data.subscriptions.yearly.renewalDate instanceof Timestamp
        ? data.subscriptions.yearly.renewalDate.toDate()
        : data.subscriptions.yearly.renewalDate
          ? new Date(data.subscriptions.yearly.renewalDate)
          : null;

      return {
        planId: "pro_yearly",
        status: "active",
        currentPeriodEnd: renewalDate?.toISOString() || null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    }

    if (data.subscriptions.monthly.active) {
      const renewalDate = data.subscriptions.monthly.renewalDate instanceof Timestamp
        ? data.subscriptions.monthly.renewalDate.toDate()
        : data.subscriptions.monthly.renewalDate
          ? new Date(data.subscriptions.monthly.renewalDate)
          : null;

      return {
        planId: "pro_monthly",
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

// Update subscription in Firestore (matches iOS updateSubscription)
export async function updateFirebaseSubscription(
  email: string,
  type: "monthly" | "yearly" | "yearlyOffer",
  active: boolean,
  renewalDate: Date | null
): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    console.log("Firebase not configured, skipping subscription update");
    return;
  }

  try {
    const docId = emailToDocId(email);
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


// Apply promo code (matches iOS applyPromoCode)
export async function applyPromoCode(
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  if (!isFirebaseConfigured() || !db) {
    return { success: false, message: "Firebase not configured. Promo codes require Firebase setup." };
  }

  try {
    const docId = emailToDocId(email);
    const userRef = doc(db, "users", docId);

    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month free

    await updateDoc(userRef, {
      promoApplied: code,
      promoAppliedAt: now,
      promoExpiresAt: expiryDate,
      freePlanActive: true,
      freePlanExpiresAt: expiryDate,
    });

    console.log("✅ Promo code applied successfully");
    return { success: true, message: "Promo code applied! You have 1 month of Pro access." };
  } catch (error) {
    console.error("❌ Failed to apply promo:", error);
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
      const type = subscription.planId === "pro_yearly" ? "yearly" : "monthly";
      const renewalDate = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : null;

      await updateFirebaseSubscription(email, type, true, renewalDate);
    } catch (error) {
      console.warn("Failed to sync to Firebase, saved locally only:", error);
    }
  }
}
