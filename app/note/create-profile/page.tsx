"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/app/ToastContainer";
import { saveProfileToFirebase, getProfilesFromFirebase } from "@/lib/firebaseProfiles";
import { getMaxProfiles, resolveEffectivePlan } from "@/lib/subscription";
import { getFirebaseSubscription } from "@/lib/firebaseSubscription";
import { readCurrentProfile, readProfiles, setCurrentProfile, writeProfiles, type ProfileKind } from "@/lib/profileStore";
import type { Profile } from "@/lib/types";
import { PeopleFrame, PeopleLoading } from "@/components/app/people/PeopleFrame";
import { SignInPanel, authFailure } from "@/components/app/people/SignInPanel";
import { CreateProfileForm } from "@/components/app/people/CreateProfileForm";

export default function CreateProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, signInWithGoogle, signIn, signUp, isConfigured, loading: authLoading } = useAuth();

  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [maxProfiles, setMaxProfiles] = useState(1);
  const [initialKind, setInitialKind] = useState<ProfileKind>("student");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("kind") === "parent") setInitialKind("parent");
  }, []);

  // Signed in: a returning user with cloud profiles belongs on profile selection, unless this is
  // an explicit "Add a profile" click (?add=1).
  useEffect(() => {
    if (authLoading || !user) return;
    if (new URLSearchParams(window.location.search).has("add") || !user.email) {
      setStep("profile");
      return;
    }
    let cancelled = false;
    getProfilesFromFirebase(user.email)
      .then((cloud) => {
        if (cancelled) return;
        if (cloud.length > 0) router.push("/note/profile-selection");
        else setStep("profile");
      })
      .catch(() => { if (!cancelled) setStep("profile"); });
    return () => { cancelled = true; };
  }, [user, authLoading, router]);

  // Plan limits for the form. The plan is account-level (users/{uid}.subscriptions, as on iOS);
  // the per-profile local cache is only a fallback for device-only users.
  useEffect(() => {
    if (step !== "profile") return;
    let cancelled = false;
    const list = readProfiles();
    setProfiles(list);
    let max = getMaxProfiles(readCurrentProfile()?.id ?? 0);
    (async () => {
      if (user?.email) {
        const sub = await getFirebaseSubscription(user.email).catch(() => null);
        if (sub) max = resolveEffectivePlan(sub.planId).maxProfiles;
      }
      if (!cancelled) setMaxProfiles(max);
    })();
    return () => { cancelled = true; };
  }, [step, user]);

  if (authLoading) return <PeopleLoading label="Loading" />;

  const hasProfiles = profiles.length > 0;

  if (step === "auth") {
    return (
      <PeopleFrame>
        <SignInPanel
          googleAvailable={isConfigured}
          onGoogle={async () => {
            try {
              await signInWithGoogle();
              return null; // the auth state change moves to the profile step
            } catch (error) {
              return authFailure((error as { code?: string }).code, "signin");
            }
          }}
          onEmail={async (mode, email, password) => {
            try {
              if (mode === "signup") await signUp(email, password, email.split("@")[0]);
              else await signIn(email, password);
              return null;
            } catch (error) {
              return authFailure((error as { code?: string }).code, mode);
            }
          }}
          onSkip={() => setStep("profile")}
        />
      </PeopleFrame>
    );
  }

  return (
    <PeopleFrame backHref={hasProfiles ? "/note/profile-selection" : undefined} backLabel="Profiles">
      <CreateProfileForm
        profiles={profiles}
        maxProfiles={maxProfiles}
        initialKind={initialKind}
        accountEmail={user?.email ?? null}
        cancelHref={hasProfiles ? "/note/profile-selection" : undefined}
        onCreate={async ({ name, type, gradeLevel }) => {
          const newProfile: Profile = {
            id: Date.now(),
            name,
            type,
            // Faces are serif monograms now; avatar stays for the iOS and Firestore schema.
            avatar: "avatar-1",
            ...(gradeLevel ? { gradeLevel } : {}),
            createdAt: new Date().toISOString(),
          };
          writeProfiles([...readProfiles(), newProfile]);
          setCurrentProfile(newProfile);
          if (user?.email) await saveProfileToFirebase(user.email, { ...newProfile, createdAt: newProfile.createdAt! });
          showToast(`${name} is ready`, "success");
          router.push("/note");
        }}
      />
    </PeopleFrame>
  );
}
