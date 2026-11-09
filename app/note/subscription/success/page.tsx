"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPlanById, resolveEffectivePlan } from "@/lib/subscription";
import {
  getFirebaseSubscription,
  saveSubscriptionToFirebase,
  syncSubscriptionFromFirebase,
} from "@/lib/firebaseSubscription";
import { SubscriptionProcessingView, SubscriptionSuccessView } from "@/components/app/welcome/SubscriptionSuccessView";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processSubscription = async () => {
      const sessionId = searchParams.get("session_id");
      const profileId = searchParams.get("profile_id");
      const planId = searchParams.get("plan_id");

      if (profileId) {
        // Get user email from profile
        const profile = localStorage.getItem("currentProfile");
        const email = profile ? JSON.parse(profile).email || "demo@example.com" : "demo@example.com";

        // Calculate renewal date from the plan's billing interval
        const plan = getPlanById(planId || "") || resolveEffectivePlan(planId || "free");
        const daysToAdd = plan.interval === "week" ? 7 : plan.interval === "year" ? 365 : 30;
        const renewalDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

        const subscription = {
          planId: planId || "free",
          status: "active" as const,
          currentPeriodEnd: renewalDate.toISOString(),
          stripeCustomerId: sessionId?.startsWith("demo_") ? null : `cus_${sessionId}`,
          stripeSubscriptionId: sessionId?.startsWith("demo_") ? null : `sub_${sessionId}`,
        };

        if (sessionId?.startsWith("demo_")) {
          // Demo mode (no Stripe keys, no webhook): keep the legacy
          // client-side local mirror so dev-without-Stripe still works.
          await saveSubscriptionToFirebase(email, parseInt(profileId), subscription);
        } else {
          // Production: the Stripe webhook already wrote Firestore — poll
          // the read path until the subscription reflects it (the webhook
          // may land a few seconds after the redirect).
          for (let i = 0; i < 5; i++) {
            await syncSubscriptionFromFirebase(email, parseInt(profileId));
            const sub = await getFirebaseSubscription(email);
            if (sub && sub.status === "active" && sub.planId !== "free") break;
            if (i < 4) await new Promise((r) => setTimeout(r, 2000));
          }
        }

        setIsProcessing(false);
      } else {
        // No profile on the return URL: nothing to confirm, so do not spin forever.
        setIsProcessing(false);
      }
    };

    processSubscription();
  }, [searchParams]);

  if (isProcessing) return <SubscriptionProcessingView />;
  return <SubscriptionSuccessView planName={getPlanById(searchParams.get("plan_id") || "")?.name ?? "Premium"} />;
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<SubscriptionProcessingView />}>
      <SuccessContent />
    </Suspense>
  );
}
