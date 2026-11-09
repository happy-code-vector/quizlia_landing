"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { syncProfilesFromFirebase, syncProfilesToFirebase } from "@/lib/firebaseProfiles";
import { getFirebaseSubscription } from "@/lib/firebaseSubscription";
import { getMaxProfiles, resolveEffectivePlan } from "@/lib/subscription";
import {
  deleteProfile, readCurrentProfile, readProfiles, setCurrentProfile, updateProfile,
} from "@/lib/profileStore";
import type { Profile } from "@/lib/types";
import { ProfilePickerView } from "@/components/app/people/ProfilePickerView";
import { PeopleLoading } from "@/components/app/people/PeopleFrame";

export default function ProfileSelectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [family, setFamily] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      let list: Profile[] = [];
      // Signed in: Firestore is the source of truth, then the local copy.
      if (user?.email) list = await syncProfilesFromFirebase(user.email);
      if (!list.length) {
        list = readProfiles();
        if (user?.email && list.length) await syncProfilesToFirebase(user.email);
      }
      const current = readCurrentProfile();

      // Plan is account-level for signed-in users (users/{uid}.subscriptions, same as iOS).
      let maxProfiles = getMaxProfiles(current?.id ?? list[0]?.id ?? 0);
      if (user?.email) {
        const sub = await getFirebaseSubscription(user.email).catch(() => null);
        if (sub) maxProfiles = resolveEffectivePlan(sub.planId).maxProfiles;
      }
      if (cancelled) return;
      setProfiles(list);
      setCurrentId(current && list.some((p) => p.id === current.id) ? current.id : null);
      setFamily(maxProfiles > 1);
      setIsLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  // No profiles: go to create profile. router.push must not run during render.
  useEffect(() => {
    if (!authLoading && !isLoading && profiles.length === 0) router.push("/note/create-profile");
  }, [authLoading, isLoading, profiles.length, router]);

  if (authLoading || isLoading) return <PeopleLoading label="Loading profiles" />;
  if (profiles.length === 0) return null;

  return (
    <ProfilePickerView
      profiles={profiles}
      currentId={currentId}
      family={family}
      accountEmail={user?.email ?? null}
      canGoBack={currentId !== null}
      onSelect={(p) => {
        setCurrentProfile(p);
        router.push("/note");
      }}
      onSave={async (p) => {
        await updateProfile(p, user?.email);
        setProfiles(readProfiles());
      }}
      onDelete={async (p) => {
        await deleteProfile(p, user?.email);
        const rest = readProfiles();
        setProfiles(rest);
        if (p.id === currentId) setCurrentId(null);
      }}
    />
  );
}
