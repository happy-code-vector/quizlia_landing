// Firebase subscription management (matches iOS implementation)
import { db, isFirebaseConfigured } from "./firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { Topic } from "./types";

// Check if user has Pro subscription
function isProSubscription(): boolean {
  if (typeof window === "undefined") return false;

  const storedSub = localStorage.getItem("subscription");
  if (storedSub) {
    const sub = JSON.parse(storedSub);
    return sub.status === "active" && sub.planId !== "free";
  }
  return false
}

// Save a topic to Firebase (full data: note, flashcards, quiz)
// ONLY syncs if user has Pro subscription
export async function saveTopicToFirebase(
  email: string,
  profileId: number,
  topic: Topic
): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    console.log("Firebase not configured, topic saved locally only");
    return
  }

  // Check Pro subscription before syncing topic data
  if (!isProSubscription()) {
    console.log("⏭ Topic sync skipped - Pro subscription required for cloud sync")
    return
  }

  try {
    const userDocId = emailToDocId(email)
    const topicRef = doc(
      db,
      "users",
      userDocId,
      "profiles",
      profileId.toString(),
      "topics",
      topic.id
    )

    // Save the FULL topic including note, flashcards, and quiz
    await setDoc(topicRef, {
      ...topic,
      updatedAt: new Date().toISOString(),
    })

    console.log("✅ Topic synced to Firebase (Pro):", topic.title)
  } catch (error) {
    console.error("❌ Failed to sync topic to Firebase:", error)
  }
}

// Get all topics for a profile from Firebase
// Only syncs from cloud if user has Pro subscription
export async function getTopicsFromFirebase(
  email: string,
  profileId: number
): Promise<Topic[]> {
  if (!isFirebaseConfigured() || !db) {
    return []
  }

  // Check Pro subscription before loading from cloud
  if (!isProSubscription()) {
    console.log("⏭ Loading topics from cloud skipped - Pro subscription required")
    return []
  }

  try {
    const userDocId = emailToDocId(email)
    const topicsRef = collection(
      db,
      "users",
      userDocId,
      "profiles",
      profileId.toString(),
      "topics"
    )
    const q = query(topicsRef, orderBy("createdAt", "desc"))
    const snapshot = await getDocs(q)

    const topics: Topic[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      topics.push({
        id: data.id,
        title: data.title,
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl,
        createdAt: data.createdAt,
        // Full note data
        note: data.note,
        flashcards: data.flashcards,
        quiz: data.quiz,
      })
    })

    console.log(
      `✅ Loaded ${topics.length} topics from Firebase (Pro) for profile ${profileId}`
    )
    return topics
  } catch (error) {
    console.error("❌ Failed to get topics from Firebase:", error)
    return []
  }
}

// Delete a topic from Firebase
// Only syncs deletion if user has Pro subscription
export async function deleteTopicFromFirebase(
  email: string,
  profileId: number,
  topicId: string
): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    return
  }

  // Check Pro subscription before syncing deletion
  if (!isProSubscription()) {
    console.log("⏭ Topic deletion sync skipped - Pro subscription required")
    return
  }

  try {
    const userDocId = emailToDocId(email)
    const topicRef = doc(
      db,
      "users",
      userDocId,
      "profiles",
      profileId.toString(),
      "topics",
      topicId
    )
    await deleteDoc(topicRef)
    console.log("✅ Topic deleted from Firebase (Pro)")
  } catch (error) {
    console.error("❌ Failed to delete topic from Firebase:", error)
  }
}

// Sync topics: Firebase -> localStorage
export async function syncTopicsFromFirebase(
  email: string,
  profileId: number
): Promise<Topic[]> {
  const firebaseTopics = await getTopicsFromFirebase(email, profileId)

  if (firebaseTopics.length > 0) {
    // Save to localStorage as cache
    if (typeof window !== "undefined") {
      localStorage.setItem(`topics_${profileId}`, JSON.stringify(firebaseTopics))
    }
    return firebaseTopics
  }

  return []
}

// Sync all local topics to Firebase (one-time migration)
export async function syncAllTopicsToFirebase(
  email: string,
  profileId: number,
  topics: Topic[]
): Promise<void> {
  if (!isFirebaseConfigured() || !db) return

  for (const topic of topics) {
    await saveTopicToFirebase(email, profileId, topic)
  }
  console.log(`✅ Synced ${topics.length} topics to Firebase`)
}

// Get topics from localStorage
export function getTopicsFromLocalStorage(profileId: number): Topic[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem(`topics_${profileId}`)
  if (stored) {
    return JSON.parse(stored)
  }

  return []
}

// Save topics to localStorage
export function saveTopicsToLocalStorage(
  profileId: number,
  topics: Topic[]
): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`topics_${profileId}`, JSON.stringify(topics))
}

// Convert email to Firestore-safe document ID (matches iOS)
export function emailToDocId(email: string): string {
  return email.replace(/@/g, "_").replace(/\./g, "_")
}

// User document structure (matches iOS Firestore schema)
export interface FirebaseUserDoc {
  email: string
  promoApplied: string | null
  promoAppliedAt: Date | null
  promoExpiresAt: Date | null
  isLocked: boolean
  createdAt: Date
  lastLoginAt: Date
  subscriptions: {
    monthly: {
      active: boolean
      renewalDate: Date | null
    }
    yearly: {
      active: boolean
      renewalDate: Date | null
    }
    yearlyOffer: {
      active: boolean
      renewalDate: Date | null
    }
  }
  freePlanActive?: boolean
  freePlanExpiresAt?: Date | null
}

// Create or update user in Firestore (matches iOS createOrUpdateUser)
export async function createOrUpdateFirebaseUser(email: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    console.log("Firebase not configured, skipping user creation")
    return
  }

  try {
    const docId = emailToDocId(email)
    const userRef = doc(db, "users", docId)
    const snapshot = await getDoc(userRef)

    if (snapshot.exists()) {
      // Update last login only
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
      })
      console.log("✅ User login updated:", email)
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
      }

      await setDoc(userRef, data)
      console.log("✅ New user created:", email)
    }
  } catch (error) {
    console.error("❌ Error creating/updating user:", error)
  }
}

// Get user subscription from Firestore
export async function getFirebaseSubscription(email: string): Promise<UserSubscription | null> {
  if (!isFirebaseConfigured() || !db) {
    return null
  }

  try {
    const docId = emailToDocId(email)
    const userRef = doc(db, "users", docId)
    const snapshot = await getDoc(userRef)

    if (!snapshot.exists()) {
      return null
    }

    const data = snapshot.data() as FirebaseUserDoc

    // Check promo code first
    if (data.freePlanActive && data.freePlanExpiresAt) {
      const expiryDate = data.freePlanExpiresAt instanceof Timestamp
        ? data.freePlanExpiresAt.toDate()
        : new Date(data.freePlanExpiresAt)

      if (expiryDate > new Date()) {
        return {
          planId: "pro_monthly",
          status: "active",
          currentPeriodEnd: expiryDate.toISOString(),
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        }
      }
    }

    // Check all subscription types - return pro if any is active
    if (data.subscriptions.yearly.active) {
      const renewalDate = data.subscriptions.yearly.renewalDate instanceof Timestamp
        ? data.subscriptions.yearly.renewalDate.toDate()
        : data.subscriptions.yearly.renewalDate
          ? new Date(data.subscriptions.yearly.renewalDate)
          : null

      return {
        planId: "pro_yearly",
        status: "active",
        currentPeriodEnd: renewalDate?.toISOString() || null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      }
    }

    if (data.subscriptions.monthly.active) {
      const renewalDate = data.subscriptions.monthly.renewalDate instanceof Timestamp
        ? data.subscriptions.monthly.renewalDate.toDate()
        : data.subscriptions.monthly.renewalDate
          ? new Date(data.subscriptions.monthly.renewalDate)
          : null

      return {
        planId: "pro_monthly",
        status: "active",
        currentPeriodEnd: renewalDate?.toISOString() || null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      }
    }

    // Check yearlyOffer subscription type
    if (data.subscriptions.yearlyOffer?.active) {
      const renewalDate = data.subscriptions.yearlyOffer.renewalDate instanceof Timestamp
        ? data.subscriptions.yearlyOffer.renewalDate.toDate()
        : data.subscriptions.yearlyOffer.renewalDate
          ? new Date(data.subscriptions.yearlyOffer.renewalDate)
          : null

      return {
        planId: "pro_yearly",
        status: "active",
        currentPeriodEnd: renewalDate?.toISOString() || null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      }
    }

    // Free plan - all subscriptions are inactive
    return {
      planId: "free",
      status: "free",
      currentPeriodEnd: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    }
  } catch (error) {
    console.error("❌ Error getting subscription:", error)
    return null
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
    console.log("Firebase not configured, skipping subscription update")
    return
  }

  try {
    const docId = emailToDocId(email)
    const userRef = doc(db, "users", docId)

    const updates: any = {}
    updates[`subscriptions.${type}.active`] = active
    updates[`subscriptions.${type}.renewalDate`] = renewalDate

    await updateDoc(userRef, updates)
    console.log(`✅ Subscription ${type} updated to ${active}`)
  } catch (error) {
    console.error("❌ Failed to update subscription:", error)
    throw error
  }
}


// Apply promo code (matches iOS applyPromoCode)
export async function applyPromoCode(
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  if (!isFirebaseConfigured() || !db) {
    return { success: false, message: "Firebase not configured. Promo codes require Firebase setup." }
  }

  try {
    const docId = emailToDocId(email)
    const userRef = doc(db, "users", docId)

    const now = new Date()
    const expiryDate = new Date(now)
    expiryDate.setMonth(expiryDate.getMonth() + 1) // 1 month free

    await updateDoc(userRef, {
      promoApplied: code,
      promoAppliedAt: now,
      promoExpiresAt: expiryDate,
      freePlanActive: true,
      freePlanExpiresAt: expiryDate,
    })

    console.log("✅ Promo code applied successfully")
    return { success: true, message: "Promo code applied! You have 1 month of Pro access." }
  } catch (error) {
    console.error("❌ Failed to apply promo:", error)
    return { success: false, message: "Failed to apply promo code" }
  }
}

// Sync subscription from Firestore to localStorage
export async function syncSubscriptionFromFirebase(
  email: string,
  profileId: number
): Promise<UserSubscription> {
  // First check local subscription to avoid overwriting with stale Firebase data
  if (typeof window !== "undefined") {
    const localSub = localStorage.getItem(`subscription_${profileId}`)
    if (localSub) {
      const parsed = JSON.parse(localSub)
      // If local subscription is already "free", return it local data directly
      // No need to sync from Firebase
      if (parsed.planId === "free") {
        console.log("⏭ Skipping Firebase sync - local subscription is already free")
        return {
          planId: "free",
          status: "free",
          currentPeriodEnd: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        }
      }
    }
  }

  const firebaseSub = await getFirebaseSubscription(email)

  if (firebaseSub) {
    // Save to localStorage for offline access
    if (typeof window !== "undefined") {
      localStorage.setItem(`subscription_${profileId}`, JSON.stringify(firebaseSub))
    }
    return firebaseSub
  }

  // Fallback to localStorage
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(`subscription_${profileId}`)
    if (stored) {
      return JSON.parse(stored)
    }
  }

  // Default free plan
  return {
    planId: "free",
    status: "free",
    currentPeriodEnd: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  }
}

// Save subscription to both Firebase and localStorage
export async function saveSubscriptionToFirebase(
  email: string,
  profileId: number,
  subscription: UserSubscription
): Promise<void> {
  // save to localStorage immediately
  if (typeof window !== "undefined") {
    localStorage.setItem(`subscription_${profileId}`, JSON.stringify(subscription))
  }

  // sync to Firebase if configured
  if (isFirebaseConfigured() && db && subscription.status === "active") {
    try {
      const type = subscription.planId === "pro_yearly" ? "yearly" : "monthly"
      const renewalDate = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : null

      await updateFirebaseSubscription(email, type, true, renewalDate)
    } catch (error) {
      console.warn("Failed to sync to Firebase, saved locally only:", error)
    }
  }
}

// UserSubscription type (from subscription.ts)
export interface UserSubscription {
  planId: string
  status: "active" | "canceled" | "past_due" | "free"
  currentPeriodEnd: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}
