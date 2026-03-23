// Firebase profile management for cross-platform sync
import { db, isFirebaseConfigured } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { emailToDocId } from "./firebaseSubscription";

export interface SyncedProfile {
  id: string; // Firebase doc ID
  localId: number; // Local storage ID
  name: string;
  type: "student" | "parent";
  avatar: string;
  gradeLevel?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Save profile to Firebase (linked to user's email)
export async function saveProfileToFirebase(
  email: string,
  profile: {
    id: number;
    name: string;
    type: string;
    avatar: string;
    gradeLevel?: string;
    createdAt: string;
  }
): Promise<string> {
  if (!isFirebaseConfigured() || !db) {
    console.log("Firebase not configured, profile saved locally only");
    return profile.id.toString();
  }

  try {
    const userDocId = emailToDocId(email);
    const profileRef = doc(db, "users", userDocId, "profiles", profile.id.toString());

    const profileData = {
      localId: profile.id,
      name: profile.name,
      type: profile.type,
      avatar: profile.avatar,
      gradeLevel: profile.gradeLevel || null,
      createdAt: profile.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(profileRef, profileData);
    console.log("✅ Profile saved to Firebase:", profile.name);
    return profile.id.toString();
  } catch (error) {
    console.error("❌ Failed to save profile to Firebase:", error);
    return profile.id.toString();
  }
}

// Get all profiles for a user from Firebase
export async function getProfilesFromFirebase(email: string): Promise<any[]> {
  if (!isFirebaseConfigured() || !db) {
    return [];
  }

  try {
    const userDocId = emailToDocId(email);
    const profilesRef = collection(db, "users", userDocId, "profiles");
    const snapshot = await getDocs(profilesRef);

    const profiles: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      profiles.push({
        id: data.localId,
        name: data.name,
        type: data.type,
        avatar: data.avatar,
        gradeLevel: data.gradeLevel,
        createdAt: data.createdAt,
      });
    });

    // Sort by createdAt
    profiles.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    console.log(`✅ Loaded ${profiles.length} profiles from Firebase`);
    return profiles;
  } catch (error) {
    console.error("❌ Failed to get profiles from Firebase:", error);
    return [];
  }
}

// Delete profile from Firebase
export async function deleteProfileFromFirebase(
  email: string,
  profileId: number
): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    return;
  }

  try {
    const userDocId = emailToDocId(email);
    const profileRef = doc(db, "users", userDocId, "profiles", profileId.toString());
    await deleteDoc(profileRef);
    console.log("✅ Profile deleted from Firebase");
  } catch (error) {
    console.error("❌ Failed to delete profile from Firebase:", error);
  }
}

// Sync profiles: Firebase -> localStorage
export async function syncProfilesFromFirebase(email: string): Promise<any[]> {
  const firebaseProfiles = await getProfilesFromFirebase(email);

  if (firebaseProfiles.length > 0) {
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("profiles", JSON.stringify(firebaseProfiles));
    }
    return firebaseProfiles;
  }

  return [];
}

// Sync profiles: localStorage -> Firebase
export async function syncProfilesToFirebase(email: string): Promise<void> {
  if (typeof window === "undefined") return;

  const localProfiles = JSON.parse(localStorage.getItem("profiles") || "[]");

  for (const profile of localProfiles) {
    await saveProfileToFirebase(email, profile);
  }
}
