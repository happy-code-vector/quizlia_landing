"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeView } from "@/components/app/home/HomeView";
import { useToast } from "@/components/app/ToastContainer";
import { loadProfileContent, persistProfileContent, tombstoneIOSNoteIfAny } from "@/lib/notesSync";
import { syncSubscriptionFromFirebase, createOrUpdateFirebaseUser } from "@/lib/firebaseSubscription";
import { Topic, migrateContentToTopics, removeTopicItems, ContentItem, Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function NotePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

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
          setContent(parsedContent);
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

  const handleDeleteTopic = (topicId: string) => {
    if (!profile || typeof window === "undefined") return;

    // Fresh read: a cloud merge may have updated localStorage since this
    // component's state snapshot was taken.
    const storedContent = localStorage.getItem(`content_${profile.id}`);
    const updatedContent = removeTopicItems(storedContent ? JSON.parse(storedContent) : [], topicId);
    setContent(updatedContent);
    setTopics(migrateContentToTopics(updatedContent));
    // Write-through + cloud tombstone: without the tombstone the note's
    // cloud doc survives and the iOS-notes merge re-imports the topic on
    // the next notes-page visit (deleted topics "re-appearing").
    persistProfileContent(profile, updatedContent);
    tombstoneIOSNoteIfAny(profile, topicId);
    showToast("Topic deleted", "success");
  };

  if (!profile) return null;

  return (
    <HomeView
      profile={profile}
      topics={topics}
      onDeleteTopic={handleDeleteTopic}
      onGenerated={(updatedContent) => {
        setContent(updatedContent);
        setTopics(migrateContentToTopics(updatedContent));
      }}
    />
  );
}
