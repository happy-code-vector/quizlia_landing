"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUBSCRIPTION_PLANS, getSubscription, isPaidSubscription, SubscriptionPlan } from "@/lib/subscription";

export default function PricingPage() {
  const router = useRouter();
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

  const isPaid = isPaidSubscription(profileId ?? -1);
  const saleablePlans = SUBSCRIPTION_PLANS.filter((p) => p.id !== "free");
  const freePlan = SUBSCRIPTION_PLANS[0];
  const familyPlan = SUBSCRIPTION_PLANS.find((p) => p.id === "family_yearly")!;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/note" className="flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg w-10 h-10 flex items-center justify-center">
              <span className="material-symbols-outlined">auto_stories</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">QuizliAI</span>
          </Link>
          <Link href="/note" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Same plans on web and the QuizliAI iOS app — pick whichever works for you
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {saleablePlans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isPopular = plan.id === "individual_yearly";
            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl p-8 relative flex flex-col ${
                  isPopular
                    ? "border-2 border-purple-500"
                    : "border border-gray-200 dark:border-gray-800"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className={`text-4xl font-bold ${isPopular ? "text-purple-600" : "text-gray-900 dark:text-white"}`}>
                      ${plan.price}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      /{plan.interval === "week" ? "week" : "year"}
                    </span>
                  </div>
                  {plan.interval === "year" && (
                    <p className="text-sm text-green-600 mt-1">
                      ${(plan.price / 12).toFixed(2)}/month billed annually
                    </p>
                  )}
                  {plan.id === "family_yearly" && (
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                      About ${Math.round(familyPlan.price / 4)} per child per year, up to 4 kids
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className={`material-symbols-outlined text-lg mt-0.5 ${isPopular ? "text-purple-500" : "text-gray-400"}`}>
                        check_circle
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isLoading === plan.id || isPaid}
                  className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    isPaid
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-not-allowed"
                      : isPopular
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
                        : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90"
                  }`}
                >
                  {isLoading === plan.id ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Processing...
                    </>
                  ) : isPaid ? (
                    <>
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      Current Plan
                    </>
                  ) : plan.trialDays > 0 ? (
                    `Start ${plan.trialDays}-Day Free Trial`
                  ) : (
                    "Get Started"
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Free tier */}
        <div className="mt-8 max-w-5xl mx-auto bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white">
              {freePlan.name} — {freePlan.freeGenerationsTotal} free note
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {freePlan.features.join(" · ")}
            </p>
          </div>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            {currentPlan === "free" ? "Your current plan" : ""}
          </span>
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
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Do web and app plans match?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Yes — the Weekly, Individual Annual and Family Annual plans are the same products and prices as in the QuizliAI iOS app. Subscriptions are billed separately per platform.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">What happens to my content if I downgrade?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                All your existing content remains accessible. You'll just be limited to the free tier's generation allowance.
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
