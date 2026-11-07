"use client";

import { useId, useState } from "react";
import { auth } from "@/lib/firebase";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { CardDialog } from "@/components/app/CardDialog";
import { InlineBanner } from "@/components/app/people/FormKit";
import { PlanFeatures, PlanOption, capsuleLabel, priceSentence } from "@/components/app/welcome/planParts";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingGenerations: number;
  profileId: number;
}

export interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: SubscriptionPlan[];
  /** True when the profile has used its allowance (changes the line under the title). */
  limitReached: boolean;
  /** Plan id while a checkout request is in flight. */
  loadingPlan: string | null;
  /** Returns an error message to show in a banner, or null when checkout started. */
  onChoose: (plan: SubscriptionPlan) => Promise<string | null>;
}

const FOOTER_LINK = "underline underline-offset-4";

/**
 * Paywall dialog: the same plans, rows and sentence as /note/pricing (components/app/welcome/planParts),
 * in one column at every width. Family is preselected and listed first; every plan is visible
 * (AR, 2026-11-07). Takes props only so /dev/fixtures/paywall-modal can render it.
 */
export function PaywallDialog({ open, onOpenChange, plans, limitReached, loadingPlan, onChoose }: PaywallDialogProps) {
  const ordered = [...plans].reverse();
  const [selectedId, setSelectedId] = useState(ordered.find((p) => p.id === "family_yearly")?.id ?? ordered[0].id);
  const [error, setError] = useState<string | null>(null);
  const includesId = useId();
  const selected = ordered.find((p) => p.id === selectedId) ?? ordered[0];
  const busy = loadingPlan === selected.id;

  const choose = async () => {
    setError(null);
    const message = await onChoose(selected);
    if (message) setError(message);
  };

  return (
    <CardDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
      title="Keep making study sets"
      description={
        limitReached
          ? "You've reached your generation limit. Pick a plan to keep going."
          : "Pick a plan to keep going. The same plans as the QuizliAI iPhone app."
      }
      wide
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Choose a plan</legend>
        {ordered.map((p) => (
          <PlanOption key={p.id} plan={p} checked={p.id === selectedId} onSelect={() => setSelectedId(p.id)} compact />
        ))}
      </fieldset>

      <PlanFeatures plan={selected} headingId={includesId} level={3} />

      <div className="flex flex-col gap-3">
        {error && <InlineBanner>{error}</InlineBanner>}
        <Button size="lg" className="w-full" onClick={choose} disabled={busy}>
          {busy ? "Opening checkout" : capsuleLabel(selected)}
        </Button>
        <p className="text-center text-subheadline text-supporting">{priceSentence(selected)}</p>
      </div>

      <p className="text-center text-subheadline text-supporting">
        <a href="https://sites.google.com/view/quizliai-terms/home" target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}>
          Terms<span className="sr-only"> (opens in a new tab)</span>
        </a>
        {" · "}
        <a href="https://sites.google.com/view/quizliai-privacy/home" target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}>
          Privacy<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </CardDialog>
  );
}

/** Container: owns Stripe checkout. Same request as /note/pricing. */
export function PaywallModal({ isOpen, onClose, remainingGenerations, profileId }: PaywallModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleChoose = async (plan: SubscriptionPlan): Promise<string | null> => {
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
    <PaywallDialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      plans={SUBSCRIPTION_PLANS.filter((p) => p.id !== "free")}
      limitReached={remainingGenerations <= 0}
      loadingPlan={loadingPlan}
      onChoose={handleChoose}
    />
  );
}
