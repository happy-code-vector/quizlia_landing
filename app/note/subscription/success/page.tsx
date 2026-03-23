"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPlanById } from "@/lib/subscription";
import { saveSubscriptionToFirebase } from "@/lib/firebaseSubscription";
import Link from "next/link";

export default function SubscriptionSuccessPage() {
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

        // Calculate renewal date
        const plan = getPlanById(planId || "pro_monthly");
        const daysToAdd = planId === "pro_yearly" ? 365 : 30;
        const renewalDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

        const subscription = {
          planId: planId || "pro_monthly",
          status: "active" as const,
          currentPeriodEnd: renewalDate.toISOString(),
          stripeCustomerId: sessionId?.startsWith("demo_") ? null : `cus_${sessionId}`,
          stripeSubscriptionId: sessionId?.startsWith("demo_") ? null : `sub_${sessionId}`,
        };

        // Save to both Firebase and localStorage
        await saveSubscriptionToFirebase(email, parseInt(profileId), subscription);

        setIsProcessing(false);
      }
    };

    processSubscription();
  }, [searchParams]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-purple-600 animate-spin">
            progress_activity
          </span>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">

        <span className="material-symbols-outlined text-5xl text-green-600">check_circle</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to Pro!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your subscription is now active. Enjoy unlimited generations and premium features!
        </p>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-purple-700 dark:text-purple-400 mb-2">What's included:</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 text-left">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-sm">check</span>
              Unlimited generations
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-sm">check</span>
              Priority AI processing
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-sm">check</span>
              Advanced content analysis
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-sm">check</span>
              Priority support
            </li>
          </ul>
        </div>

        <Link
          href="/note"
          className="inline-flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined">arrow_forward</span>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
