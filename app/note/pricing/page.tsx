"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUBSCRIPTION_PLANS, getSubscription, saveSubscription, SubscriptionPlan, UserSubscription } from "@/lib/subscription";
import { updateFirebaseSubscription } from "@/lib/firebaseSubscription";

export default function PricingPage() {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [profileId, setProfileId] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const profile = localStorage.getItem("currentProfile");
      if (profile) {
        const parsed = JSON.parse(profile);
        setProfileId(parsed.id);
        const sub = getSubscription(parsed.id);
        setCurrentPlan(sub.planId);
      }
    }
  }, []);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!profileId) {
      router.push("/note/profile-selection");
      return;
    }
    if (plan.id === "free") return;

    setIsLoading(plan.id);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          profileId,
          planId: plan.id,
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleDowngrade = async () => {
    if (!profileId) return;

    setIsLoading("free");
    try {
      const storedUser = localStorage.getItem("firebaseUser");
      const firebaseUser = storedUser ? JSON.parse(storedUser) : null;

      // Update local subscription to free FIRST
      const freeSubscription: UserSubscription = {
        planId: "free",
        status: "active",
        currentPeriodEnd: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };

      saveSubscription(profileId, freeSubscription);

      // Update Firebase to free (cancel all subscription types)
      if (firebaseUser?.email) {
        const { updateFirebaseSubscription } = await import("@/lib/firebaseSubscription");

        // Cancel all subscription types in Firebase
        await updateFirebaseSubscription(firebaseUser.email, "monthly", false, null);
        await updateFirebaseSubscription(firebaseUser.email, "yearly", false, null);
        await updateFirebaseSubscription(firebaseUser.email, "yearlyOffer", false, null);

        console.log("✅ Firebase subscription canceled");
      }

      // Call Stripe cancel endpoint (if applicable)
      if (firebaseUser?.email) {
        try {
          await fetch("/api/stripe/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: firebaseUser.email,
              profileId,
            }),
          });
        } catch (stripeError) {
          console.log("Stripe cancel skipped:", stripeError);
        }
      }

      // Update UI state
      setCurrentPlan("free");

      // Show success message and redirect
      alert("Successfully downgraded to Free plan");
      router.push("/note");
    } catch (error) {
      console.error("Downgrade error:", error);
      alert("Failed to downgrade. Please try again or contact support.");
    } finally {
      setIsLoading(null);
    }
  };

  const freePlan = SUBSCRIPTION_PLANS[0];
  const paidPlans = SUBSCRIPTION_PLANS.filter((p) => p.id !== "free");

 const displayPaidPlan = paidPlans.find((p) => p.interval === billingInterval);
  const monthlyPrice = paidPlans.find((p) => p.interval === "month")?.price || 0;
  const yearlyPrice = paidPlans.find((p) => p.interval === "year")?.price || 0;
  const yearlySavings = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/note" className="flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg w-10 h-10 flex items-center justify-center">
              <span className="material-symbols-outlined">auto_stories</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">QuickNote</span>
          </Link>
          <Link href="/note" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Unlock your full learning potential with QuickNote Pro
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl flex">
            <button
              onClick={() => setBillingInterval("month")}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                billingInterval === "month"
                  ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billingInterval === "year"
                  ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Yearly
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">
                Save {yearlySavings}%
              </span>
            </button>
          </div>
        </div>


       {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{freePlan.name}</h3>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
                <span className="text-gray-500 dark:text-gray-400">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {freePlan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-gray-400 text-lg mt-0.5">check</span>
                  <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleDowngrade}
              disabled={currentPlan === "free" || isLoading === "free"}
              className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                currentPlan === "free"
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                  : isLoading === "free"
                  ? "bg-gray-200 dark:bg-gray-800 text-gray-400"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {isLoading === "free" ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  Processing...
                </>
              ) : currentPlan === "free" ? (
                <>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Current Plan
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">arrow_downward</span>
                  Downgrade
                </>
              )}
            </button>
          </div>

          {/* Pro Plan */}
          {displayPaidPlan && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{displayPaidPlan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold text-purple-600">${displayPaidPlan.price}</span>
                  <span className="text-gray-500 dark:text-gray-400">/{displayPaidPlan.interval}</span>
                </div>
                {billingInterval === "year" && (
                  <p className="text-sm text-green-600 mt-1">
                    ${(displayPaidPlan.price / 12).toFixed(2)}/month billed annually
                  </p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {displayPaidPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-purple-500 text-lg mt-0.5">check_circle</span>
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(displayPaidPlan)}
                disabled={isLoading === displayPaidPlan.id || currentPlan.startsWith("pro")}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  currentPlan.startsWith("pro")
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
                }`}
              >
                {isLoading === displayPaidPlan.id ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Processing...
                  </>
                ) : currentPlan.startsWith("pro") ? (
                  <>
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Current Plan
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">bolt</span>
                    Get Started
                  </>
                )}
              </button>
            </div>
          )}
        </div>


       {/* FAQ Section */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                We accept all major credit cards through our secure payment processor, Stripe.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">What happens to my content if I downgrade?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                All your existing content remains accessible. You'll just be limited to the free tier's daily generation limit.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-6 text-gray-400 dark:text-gray-600">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">lock</span>
              <span className="text-sm">Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">verified</span>
              <span className="text-sm">SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">support_agent</span>
              <span className="text-sm">24/7 Support</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
