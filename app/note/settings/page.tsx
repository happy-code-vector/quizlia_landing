"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  canGenerate, getPlanById, getSubscription, resolveEffectivePlan, SUBSCRIPTION_PLANS, type UserSubscription,
} from "@/lib/subscription";
import { getFirebaseSubscription } from "@/lib/firebaseSubscription";
import { isAdminUser } from "@/lib/admin";
import { PromoCodeInput } from "@/components/app/PromoCodeInput";
import { useAuth } from "@/lib/auth";
import { deleteProfile, readCurrentProfile, readProfiles, updateProfile } from "@/lib/profileStore";
import type { Profile } from "@/lib/types";
import { SettingsView, type PlanSummary } from "@/components/app/people/SettingsView";

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [family, setFamily] = useState(false);

  useEffect(() => {
    const current = readCurrentProfile();
    if (!current) {
      router.push("/note/profile-selection");
      return;
    }
    setProfile(current);
    setProfiles(readProfiles());
    const sub = getSubscription(current.id);
    setSubscription(sub);
    setFamily(resolveEffectivePlan(sub.planId).maxProfiles > 1);
  }, [router]);

  // Family rules come from the account plan for signed-in users (same source as iOS).
  useEffect(() => {
    if (!user?.email) return;
    getFirebaseSubscription(user.email)
      .then((sub) => { if (sub) setFamily(resolveEffectivePlan(sub.planId).maxProfiles > 1); })
      .catch(() => {});
  }, [user]);

  if (!profile) return null;

  return (
    <SettingsView
      profile={profile}
      profiles={profiles}
      family={family}
      plan={planSummary(profile.id, subscription)}
      account={user?.email ? { email: user.email } : null}
      onSaveProfile={async (p) => {
        await updateProfile(p, user?.email);
        setProfile(p);
        setProfiles(readProfiles());
      }}
      onDeleteProfile={async () => {
        await deleteProfile(profile, user?.email);
        router.push("/note/profile-selection");
      }}
      onSignOut={async () => {
        await signOut();
        localStorage.removeItem("currentProfile");
        // There is no /note/login route; the sign-in page lives at /auth/login.
        router.push("/auth/login");
      }}
      promo={
        <PromoCodeInput
          email={user?.email || profile.email || ""}
          profileId={profile.id}
          onSuccess={() => setSubscription(getSubscription(profile.id))}
        />
      }
    />
  );
}

function planSummary(profileId: number, subscription: UserSubscription | null): PlanSummary {
  const planId = subscription?.planId || "free";
  const plan = getPlanById(planId) || resolveEffectivePlan(planId) || SUBSCRIPTION_PLANS[0];
  const paid = subscription?.status === "active" && planId !== "free";
  const effective = resolveEffectivePlan(planId);
  const usage = canGenerate(profileId);
  return {
    name: plan.name,
    paid,
    renewsOn: paid ? subscription?.currentPeriodEnd ?? null : null,
    features: plan.features,
    usage: isAdminUser()
      ? { kind: "none" }
      : effective.id === "free"
        ? { kind: "free", noteLeft: usage.allowed }
        : { kind: "daily", used: effective.generationsPerDay - usage.remaining, limit: effective.generationsPerDay },
  };
}
