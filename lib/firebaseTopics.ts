// Firebase topics sync - full note data (notes, flashcards, quizzes)
import { db, isFirebaseConfigured } from "./firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { emailToDocId } from "./firebaseSubscription";
import { Topic } from "./types";

// Check if user has Pro subscription
function isProSubscription(): boolean {
  if (typeof window === "undefined") return false;

  const storedSub = localStorage.getItem("subscription");
  if (storedSub) {
    const sub = JSON.parse(storedSub);
    return sub.status === "active" && sub.planId !== "free";
  }
  return false;
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
    return;
  }

  // Check Pro subscription before syncing topic data
  if (!isProSubscription()) {
    console.log("⏭ Topic sync skipped - Pro subscription required for cloud sync");
    return;
  }

  try {
    const userDocId = emailToDocId(email);
    const topicRef = doc(
      db,
      "users",
      userDocId,
      "profiles",
      profileId.toString(),
      "topics",
      topic.id
    );

    // Save the FULL topic including note, flashcards, and quiz
    await setDoc(topicRef, {
      ...topic,
      updatedAt: new Date().toISOString(),
    });

    console.log("✅ Topic synced to Firebase (Pro):", topic.title);
  } catch (error) {
    console.error("❌ Failed to sync topic to Firebase:", error);
  }
}

// Get all topics for a profile from Firebase
// Only syncs from cloud if user has Pro subscription
export async function getTopicsFromFirebase(
  email: string,
  profileId: number
): Promise<Topic[]> {
  if (!isFirebaseConfigured() || !db) {
    return [];
  }

  // Check Pro subscription before loading from cloud
  if (!isProSubscription()) {
    console.log("⏭ Loading topics from cloud skipped - Pro subscription required");
    return [];
  }

  try {
    const userDocId = emailToDocId(email);
    const topicsRef = collection(
      db,
      "users",
      userDocId,
      "profiles",
      profileId.toString(),
      "topics"
    );
    const q = query(topicsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const topics: Topic[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
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
      });
    });

    console.log(
      `✅ Loaded ${topics.length} topics from Firebase (Pro) for profile ${profileId}`
    );
    return topics;
  } catch (error) {
    console.error("❌ Failed to get topics from Firebase:", error);
    return [];
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
    return;
  }

  // Check Pro subscription before syncing deletion
  if (!isProSubscription()) {
    console.log("⏭ Topic deletion sync skipped - Pro subscription required");
    return;
  }

  try {
    const userDocId = emailToDocId(email);
    const topicRef = doc(
      db,
      "users",
      userDocId,
      "profiles",
      profileId.toString(),
      "topics",
      topicId
    );
    await deleteDoc(topicRef);
    console.log("✅ Topic deleted from Firebase (Pro)");
  } catch (error) {
    console.error("❌ Failed to delete topic from Firebase:", error);
  }
}

// Sync topics: Firebase -> localStorage
export async function syncTopicsFromFirebase(
  email: string,
  profileId: number
): Promise<Topic[]> {
  const firebaseTopics = await getTopicsFromFirebase(email, profileId);

  if (firebaseTopics.length > 0) {
    // Save to localStorage as cache
    if (typeof window !== "undefined") {
      localStorage.setItem(`topics_${profileId}`, JSON.stringify(firebaseTopics));
    }
    return firebaseTopics;
  }

  return [];
}

// Sync all local topics to Firebase (one-time migration)
export async function syncAllTopicsToFirebase(
  email: string,
  profileId: number,
  topics: Topic[]
): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;

  for (const topic of topics) {
    await saveTopicToFirebase(email, profileId, topic);
  }
  console.log(`✅ Synced ${topics.length} topics to Firebase`);
}

// Get topics from localStorage
export function getTopicsFromLocalStorage(profileId: number): Topic[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`topics_${profileId}`);
  if (stored) {
    return JSON.parse(stored);
  }

  return [];
}

// Save topics to localStorage
export function saveTopicsToLocalStorage(
  profileId: number,
  topics: Topic[]
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`topics_${profileId}`, JSON.stringify(topics));
}
