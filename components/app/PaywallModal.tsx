"use client";

import { useId, useMemo, useState } from "react";
import { CircleCheck } from "lucide-react";
import { auth } from "@/lib/firebase";
import { SUBSCRIPTION_PLANS, getSubscription, resolveEffectivePlan, type SubscriptionPlan } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { CardDialog } from "@/components/app/CardDialog";
import { InlineBanner } from "@/components/app/people/FormKit";
import { PlanFeatures, PlanOption, capsuleLabel, priceSentence } from "@/components/app/welcome/planParts";
import { SUPPORT_EMAIL } from "@/lib/support";

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
  /** The plan the profile is on now (the free plan, or a paid plan resolved through resolveEffectivePlan). */
  currentPlan: SubscriptionPlan;
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
export function PaywallDialog({ open, onOpenChange, plans, currentPlan, limitReached, loadingPlan, onChoose }: PaywallDialogProps) {
  const ordered = [...plans].reverse();
  const paid = currentPlan.id !== "free";
  // A paid profile only reaches this dialog at its daily cap, so the free-plan wording does not apply.
  // The plan worth offering is the first one with a higher daily cap; none exists on the top plan.
  const upgrade = paid ? ordered.find((p) => p.generationsPerDay > currentPlan.generationsPerDay) : undefined;
  const preferred =
    upgrade ??
    (paid ? ordered.find((p) => p.id === currentPlan.id) : undefined) ??
    ordered.find((p) => p.id === "family_yearly") ??
    ordered[0];
  // null = follow the default; cleared on close so each opening starts from the current plan again.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const includesId = useId();
  const selected = ordered.find((p) => p.id === pickedId) ?? preferred;
  const isCurrent = selected.id === currentPlan.id;
  // A paid profile cannot buy a plan that does not raise its daily cap: checkout would add a second, lower or equal
  // subscription, and there is no plan-change route yet. Those rows stay visible, disabled, with the reason.
  const blockedReason = (p: SubscriptionPlan): string | undefined => {
    if (!paid || p.id === currentPlan.id || p.generationsPerDay > currentPlan.generationsPerDay) return undefined;
    return p.generationsPerDay < currentPlan.generationsPerDay ? "Lower daily limit than your plan" : "Same daily limit as your plan";
  };
  const hasBlocked = ordered.some((p) => blockedReason(p));
  const canBuy = !isCurrent && !blockedReason(selected);
  // The server drops the free trial for an account that already has a subscription, so a paid profile is never promised one.
  const offered = paid ? { ...selected, trialDays: 0 } : selected;
  const includes = paid ? { ...selected, features: selected.features.filter((f) => !/free trial/i.test(f)) } : selected;
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
        if (!next) {
          setError(null);
          setPickedId(null);
        }
        onOpenChange(next);
      }}
      title={paid ? "You've reached today's limit" : "Keep making study sets"}
      description={
        paid
          ? `Your plan allows ${currentPlan.generationsPerDay} generations a day. ${
              upgrade ? `${upgrade.name} allows ${upgrade.generationsPerDay}.` : "The limit resets daily."
            }`
          : limitReached
            ? "You've reached your generation limit. Pick a plan to keep going."
            : "Pick a plan to keep going. The same plans as the QuizliAI iPhone app."
      }
      wide
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Choose a plan</legend>
        {ordered.map((p) => (
          <PlanOption
            key={p.id}
            plan={p}
            checked={p.id === selected.id}
            onSelect={() => setPickedId(p.id)}
            isCurrent={p.id === currentPlan.id}
            unavailable={blockedReason(p)}
            compact
          />
        ))}
      </fieldset>

      {hasBlocked && (
        <p className="text-subheadline text-supporting">
          To change your plan, email{" "}
          <a className="font-semibold text-rust underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      )}

      <PlanFeatures plan={includes} headingId={includesId} level={3} />

      <div className="flex flex-col gap-3">
        {error && <InlineBanner>{error}</InlineBanner>}
        <Button size="lg" className="w-full" onClick={choose} disabled={busy || !canBuy}>
          {isCurrent ? (
            <>
              <CircleCheck aria-hidden="true" strokeWidth={1.75} className="size-5" /> Current plan
            </>
          ) : !canBuy ? (
            "Not available"
          ) : busy ? (
            "Opening checkout"
          ) : (
            capsuleLabel(offered)
          )}
        </Button>
        {canBuy && <p className="text-center text-subheadline text-supporting">{priceSentence(offered)}</p>}
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
  // Read when the dialog opens (localStorage, client only), the same source as /note/pricing.
  const currentPlan = useMemo(
    () => resolveEffectivePlan(isOpen ? getSubscription(profileId).planId : "free"),
    [isOpen, profileId],
  );

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
      currentPlan={currentPlan}
      limitReached={remainingGenerations <= 0}
      loadingPlan={loadingPlan}
      onChoose={handleChoose}
    />
  );
}
