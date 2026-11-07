"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeView } from "@/components/app/home/HomeView";
import { loadProfileContent } from "@/lib/notesSync";
import { readStudyPositions, type StudyPositions } from "@/lib/studyPosition";
import { syncSubscriptionFromFirebase, createOrUpdateFirebaseUser } from "@/lib/firebaseSubscription";
import { Topic, migrateContentToTopics, ContentItem, Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function NotePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [positions, setPositions] = useState<StudyPositions>({});

  useEffect(() => {
    const initializeDashboard = async () => {
      if (typeof window !== "undefined") {
        const currentProfile = localStorage.getItem("currentProfile");
        if (!currentProfile) {
          router.push("/note/profile-selection");
          return;
        }
        const profileData = JSON.parse(currentProfile);
        setProfile(profileData);
        setPositions(readStudyPositions(profileData.id));

        const storedContent = localStorage.getItem(`content_${profileData.id}`);
        if (!storedContent) {
          // First visit on this device: pull content synced from other
          // devices / the iOS app, cache it, and reload once to display.
          loadProfileContent(profileData).then((cloud) => {
            if (cloud) window.location.reload();
          });
        }
        if (storedContent) {
          const parsedContent = JSON.parse(storedContent);
          setTopics(migrateContentToTopics(parsedContent));
        }
      }
    };

    initializeDashboard();
  }, [router]);

  // Sync subscription from Firebase only for signed-in users.
  // Signed-out visitors stay on localStorage and skip Firestore entirely,
  // which avoids permission-denied errors from the security rules.
  useEffect(() => {
    if (!user?.email || !profile) return;

    const email = profile.email || user.email;
    createOrUpdateFirebaseUser(email)
      .then(() => syncSubscriptionFromFirebase(email, profile.id))
      .catch((error) => console.log("Firebase sync skipped:", error));
  }, [user, profile]);

  if (!profile) return null;

  return (
    <HomeView
      profile={profile}
      topics={topics}
      positions={positions}
      onGenerated={(updatedContent: ContentItem[]) => setTopics(migrateContentToTopics(updatedContent))}
    />
  );
}
