// Subscription management utilities
//
// Plan lineup mirrors the iOS app (Release B) exactly:
//   Weekly $6.99 (no trial, 1 profile)
//   Individual Annual $49.99 (7-day trial, 1 profile)
//   Family Annual $99.99 (7-day trial, up to 6 profiles)
// Free tier: 1 generation total (notes, quiz, flashcards), then upgrade.
// Legacy web plans (pro_monthly / pro_yearly) stay recognized and are
// grandfathered to Family-level limits, like legacy iOS subscribers.

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: "week" | "year";
  features: string[];
  generationsPerDay: number; // -1 = not applicable (free plan uses lifetime total)
  freeGenerationsTotal: number; // free plan only: lifetime allowance
  maxProfiles: number;
  trialDays: number;
  stripePriceId: string;
}

export interface UserSubscription {
  planId: string;
  status: "active" | "canceled" | "past_due" | "free";
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface UsageData {
  date: string;
  generationsUsed: number;
}

// Legacy plans removed from sale — existing subscribers keep access and
// get Family-level limits (grandfathered).
export const LEGACY_PAID_PLAN_IDS = ["pro_monthly", "pro_yearly"];

// Available plans. Stripe price IDs come from env so each environment
// (local/demo/production) can point at its own Stripe account. Empty
// price ID = checkout runs in demo mode.
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "year",
    features: [
      "1 free note with quiz & flashcards",
      "Try QuizliAI on one upload",
      "Local storage",
    ],
    generationsPerDay: 0,
    freeGenerationsTotal: 1,
    maxProfiles: 1,
    trialDays: 0,
    stripePriceId: "",
  },
  {
    id: "weekly",
    name: "Weekly",
    price: 6.99,
    interval: "week",
    features: [
      "5 AI generations per day",
      "Notes, quizzes, flashcards & AI chat",
      "1 learner profile",
    ],
    generationsPerDay: 5,
    freeGenerationsTotal: 0,
    maxProfiles: 1,
    trialDays: 0,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_WEEKLY || "",
  },
  {
    id: "individual_yearly",
    name: "Individual Annual",
    price: 49.99,
    interval: "year",
    features: [
      "5 AI generations per day",
      "Notes, quizzes, flashcards & AI chat",
      "1 learner profile",
      "7-day free trial",
    ],
    generationsPerDay: 5,
    freeGenerationsTotal: 0,
    maxProfiles: 1,
    trialDays: 7,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_YEARLY || "",
  },
  {
    id: "family_yearly",
    name: "Family Annual",
    price: 99.99,
    interval: "year",
    features: [
      "15 AI generations per day",
      "Notes, quizzes, flashcards & AI chat",
      "Up to 6 learner profiles",
      "7-day free trial",
    ],
    generationsPerDay: 15,
    freeGenerationsTotal: 0,
    maxProfiles: 6,
    trialDays: 7,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_YEARLY || "",
  },
];

// Family-equivalent limits applied to grandfathered legacy subscribers.
const LEGACY_EQUIVALENT_PLAN: SubscriptionPlan = {
  id: "legacy_pro",
  name: "Pro (legacy)",
  price: 0,
  interval: "year",
  features: [],
  generationsPerDay: 15,
  freeGenerationsTotal: 0,
  maxProfiles: 6,
  trialDays: 0,
  stripePriceId: "",
};

// Resolve any stored planId (including legacy ones) to the limits that
// actually apply for this user.
export function resolveEffectivePlan(planId: string): SubscriptionPlan {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  if (plan) return plan;
  if (LEGACY_PAID_PLAN_IDS.includes(planId)) return LEGACY_EQUIVALENT_PLAN;
  return SUBSCRIPTION_PLANS[0]; // free
}

// Get subscription from localStorage
export function getSubscription(profileId: number): UserSubscription {
  if (typeof window === "undefined") {
    return { planId: "free", status: "free", currentPeriodEnd: null, stripeCustomerId: null, stripeSubscriptionId: null };
  }
  const stored = localStorage.getItem(`subscription_${profileId}`);
  if (stored) {
    return JSON.parse(stored);
  }
  return { planId: "free", status: "free", currentPeriodEnd: null, stripeCustomerId: null, stripeSubscriptionId: null };
}

// Save subscription to localStorage
export function saveSubscription(profileId: number, subscription: UserSubscription): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(`subscription_${profileId}`, JSON.stringify(subscription));
  }
}

// Get today's usage
export function getTodayUsage(profileId: number): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().split("T")[0];
  const stored = localStorage.getItem(`usage_${profileId}_${today}`);
  return stored ? parseInt(stored, 10) : 0;
}

// Increment usage. Also marks the free plan's lifetime allowance as used.
export function incrementUsage(profileId: number): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().split("T")[0];
  const key = `usage_${profileId}_${today}`;
  const newCount = getTodayUsage(profileId) + 1;
  localStorage.setItem(key, String(newCount));

  const plan = resolveEffectivePlan(getSubscription(profileId).planId);
  if (plan.id === "free") {
    localStorage.setItem(`freeGenerationUsed_${profileId}`, "1");
  }
  return newCount;
}

// Free plan: has the lifetime free generation been used?
export function isFreeGenerationUsed(profileId: number): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`freeGenerationUsed_${profileId}`) === "1";
}

// Check if user can generate
export function canGenerate(profileId: number): { allowed: boolean; remaining: number; limit: number } {
  const subscription = getSubscription(profileId);
  const plan = resolveEffectivePlan(subscription.planId);

  // Free plan: 1 generation total, ever.
  if (plan.id === "free") {
    const used = isFreeGenerationUsed(profileId);
    return { allowed: !used, remaining: used ? 0 : plan.freeGenerationsTotal, limit: plan.freeGenerationsTotal };
  }

  // Paid plans: daily cap (5 individual / 15 family).
  const used = getTodayUsage(profileId);
  const remaining = Math.max(0, plan.generationsPerDay - used);

  return {
    allowed: remaining > 0,
    remaining,
    limit: plan.generationsPerDay,
  };
}

// Profile cap for the account behind the given profile (free/individual:
// 1 profile — adding a second is a Family upsell; family/legacy: 6).
export function getMaxProfiles(profileId: number): number {
  return resolveEffectivePlan(getSubscription(profileId).planId).maxProfiles;
}

// Get plan by ID (saleable plans only)
export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId);
}

// Check if subscription is active (paid)
export function isPaidSubscription(profileId: number): boolean {
  const subscription = getSubscription(profileId);
  if (subscription.status !== "active") return false;
  return subscription.planId !== "free";
}
