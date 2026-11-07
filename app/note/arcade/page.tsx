// app/note/arcade/page.tsx
"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/shell/AppShell";
import { ArcadeView } from "@/components/app/arcade/ArcadeView";
import { topicsWithFlashcards } from "@/lib/arcade";
import type { Profile } from "@/lib/types";

export default function ArcadePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const currentProfile = localStorage.getItem("currentProfile");
    if (!currentProfile) return;
    const profileData = JSON.parse(currentProfile);
    setProfile(profileData);
    const stored = localStorage.getItem(`content_${profileData.id}`);
    if (!stored) return;
    try {
      setTopics(topicsWithFlashcards(JSON.parse(stored)));
    } catch {
      // leave the list empty; demo links still work
    }
  }, []);

  if (!profile) return null;

  return (
    <AppShell profile={profile} family="study">
      <ArcadeView topics={topics} profileId={profile.id} />
    </AppShell>
  );
}
