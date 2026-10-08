"use client";

import { useState } from "react";
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from "@/lib/subscription";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingGenerations: number;
  profileId: number;
}

export function PaywallModal({ isOpen, onClose, remainingGenerations, profileId }: PaywallModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const paidPlans = SUBSCRIPTION_PLANS.filter((p) => p.id !== "free");
  const freePlan = SUBSCRIPTION_PLANS[0];

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setIsLoading(true);
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
      } else {
        console.error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl text-white">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl mb-2">rocket_launch</span>
            <h2 className="text-2xl font-bold">Upgrade to Premium</h2>
            <p className="text-white/80 mt-1">Same plans as the QuizliAI iOS app</p>
          </div>
        </div>

        {/* Usage Warning */}
        {remainingGenerations <= 0 && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <span className="material-symbols-outlined text-lg">warning</span>
              <p className="text-sm font-medium">You&apos;ve reached your generation limit</p>
            </div>
          </div>
        )}

        {/* Plan Cards */}
        <div className="p-6 space-y-4">
          {paidPlans.map((plan) => {
            const isPopular = plan.id === "individual_yearly";
            return (
              <div
                key={plan.id}
                className={`rounded-xl p-5 ${
                  isPopular
                    ? "border-2 border-purple-500 bg-purple-50/50 dark:bg-purple-900/10"
                    : "border border-gray-200 dark:border-gray-800"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-bold text-purple-600">${plan.price}</span>
                      <span className="text-gray-500 dark:text-gray-400">/{plan.interval}</span>
                    </div>
                    {plan.id === "family_yearly" && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        About ${Math.round(plan.price / 4)} per child per year, up to 4 kids
                      </p>
                    )}
                  </div>
                  {isPopular && (
                    <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">POPULAR</span>
                  )}
                </div>

                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isLoading}
                  className={`w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isPopular
                      ? "bg-gradient-to-r from-purple-600 to-pink-600"
                      : "bg-gray-900 dark:bg-gray-700"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      Processing...
                    </>
                  ) : plan.trialDays > 0 ? (
                    <>
                      <span className="material-symbols-outlined">bolt</span>
                      Start {plan.trialDays}-Day Free Trial
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">bolt</span>
                      Subscribe Now
                    </>
                  )}
                </button>
              </div>
            );
          })}

          {/* Free Plan Comparison */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Free plan: {freePlan.freeGenerationsTotal} note to try
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cancel anytime. Secure payment via Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
