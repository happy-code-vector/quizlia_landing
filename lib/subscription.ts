// Subscription management utilities

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  generationsPerDay: number;
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

// Free tier limits
export const FREE_GENERATIONS_PER_DAY = 3;

// Available plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    features: [
      "3 generations per day",
      "Notes, Flashcards & Quizzes",
      "Basic AI analysis",
      "Local storage",
    ],
    generationsPerDay: 3,
    stripePriceId: "",
  },
  {
    id: "pro_monthly",
    name: "Pro",
    price: 9.99,
    interval: "month",
    features: [
      "Unlimited generations",
      "Priority AI processing",
      "Advanced content analysis",
      "Cloud sync (coming soon)",
      "Priority support",
    ],
    generationsPerDay: -1, // unlimited
    stripePriceId: "price_pro_monthly",
  },
  {
    id: "pro_yearly",
    name: "Pro (Annual)",
    price: 79.99,
    interval: "year",
    features: [
      "Unlimited generations",
      "Priority AI processing",
      "Advanced content analysis",
      "Cloud sync (coming soon)",
      "Priority support",
      "2 months free!",
    ],
    generationsPerDay: -1,
    stripePriceId: "price_pro_yearly",
  },
];

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

// Increment usage
export function incrementUsage(profileId: number): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().split("T")[0];
  const key = `usage_${profileId}_${today}`;
  const current = getTodayUsage(profileId);
  const newCount = current + 1;
  localStorage.setItem(key, String(newCount));
  return newCount;
}

// Check if user can generate
export function canGenerate(profileId: number): { allowed: boolean; remaining: number; limit: number } {
  const subscription = getSubscription(profileId);
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === subscription.planId) || SUBSCRIPTION_PLANS[0];

  // Unlimited for paid plans
  if (plan.generationsPerDay === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const used = getTodayUsage(profileId);
  const remaining = Math.max(0, plan.generationsPerDay - used);

  return {
    allowed: remaining > 0,
    remaining,
    limit: plan.generationsPerDay,
  };
}

// Get plan by ID
export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId);
}

// Check if subscription is active (paid)
export function isPaidSubscription(profileId: number): boolean {
  const subscription = getSubscription(profileId);
  return subscription.status === "active" && subscription.planId !== "free";
}
