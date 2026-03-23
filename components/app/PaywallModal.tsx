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
  const [selectedPlan, setSelectedPlan] = useState<string>("pro_monthly");
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const paidPlans = SUBSCRIPTION_PLANS.filter((p) => p.id !== "free");
  const displayPlans = paidPlans.filter((p) => p.interval === billingInterval);

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

  const yearlyPlan = paidPlans.find((p) => p.interval === "year");
  const monthlyPlan = paidPlans.find((p) => p.interval === "month");
  const yearlySavings = monthlyPlan && yearlyPlan
    ? Math.round((1 - yearlyPlan.price / (monthlyPlan.price * 12)) * 100)
    : 0;


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
            <h2 className="text-2xl font-bold">Upgrade to Pro</h2>
            <p className="text-white/80 mt-1">Unlock unlimited learning potential</p>
          </div>
        </div>

        {/* Usage Warning */}
        {remainingGenerations <= 0 && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <span className="material-symbols-outlined text-lg">warning</span>
              <p className="text-sm font-medium">You've used all your free generations for today</p>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mt-6">
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex">
            <button
              onClick={() => setBillingInterval("month")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingInterval === "month"
                  ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                billingInterval === "year"
                  ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Yearly
              <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">Save {yearlySavings}%</span>
            </button>
          </div>
        </div>


        {/* Plan Card */}
        <div className="p-6">
          {displayPlans.map((plan) => (
            <div
              key={plan.id}
              className="border-2 border-purple-500 rounded-xl p-5 bg-purple-50/50 dark:bg-purple-900/10"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-purple-600">${plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400">/{plan.interval}</span>
                  </div>
                </div>
                <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">POPULAR</span>
              </div>

              <ul className="space-y-3 mb-6">
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
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">bolt</span>
                    Subscribe Now
                  </>
                )}
              </button>
            </div>
          ))}

          {/* Free Plan Comparison */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Free plan: {SUBSCRIPTION_PLANS[0].generationsPerDay} generations/day
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
