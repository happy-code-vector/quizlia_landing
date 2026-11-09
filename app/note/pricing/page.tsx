"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { SUBSCRIPTION_PLANS, getSubscription, type SubscriptionPlan } from "@/lib/subscription";
import { PricingView } from "@/components/app/welcome/PricingView";

export default function PricingPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    const profile = localStorage.getItem("currentProfile");
    if (profile) {
      const parsed = JSON.parse(profile);
      setProfileId(parsed.id);
      setCurrentPlan(getSubscription(parsed.id).planId);
    }
  }, []);

  const handleChoose = async (plan: SubscriptionPlan): Promise<string | null> => {
    if (!profileId) {
      router.push("/note/profile-selection");
      return null;
    }
    setLoadingPlan(plan.id);
    try {
      const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ priceId: plan.stripePriceId, profileId, planId: plan.id }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return null;
      }
      return "Checkout did not open. Try again in a minute.";
    } catch (error) {
      console.error("Checkout error:", error);
      return "QuizliAI can't be reached. Check your connection, then try again.";
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <PricingView
      plans={SUBSCRIPTION_PLANS.filter((p) => p.id !== "free")}
      freePlan={SUBSCRIPTION_PLANS[0]}
      currentPlan={currentPlan}
      loadingPlan={loadingPlan}
      onChoose={handleChoose}
    />
  );
}
