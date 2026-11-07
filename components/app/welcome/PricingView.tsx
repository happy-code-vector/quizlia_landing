"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, CircleCheck, Check, ChevronDown, Unlock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineBanner } from "@/components/app/people/FormKit";
import type { SubscriptionPlan } from "@/lib/subscription";
import { WelcomeFrame } from "./WelcomeFrame";

// Pricing on the welcome family. Below 1024 px it is the approved iOS paywall port (one default plan,
// the rest behind "See more plans", one rust capsule). At 1024+ it is the split layout AR picked
// from two mockups (2026-11-06): story left, plans and the capsule right.

const money = (n: number) => `$${n.toFixed(2)}`;
const per = (p: SubscriptionPlan) => (p.interval === "week" ? "a week" : "a year");

/** One sentence in words, as on the iOS paywall. */
function priceSentence(p: SubscriptionPlan) {
  if (p.trialDays > 0) return `Try ${p.trialDays} days free, then ${money(p.price)} ${per(p)}. Cancel any time.`;
  return `${money(p.price)} ${per(p)}, billed ${p.interval === "week" ? "weekly" : "yearly"}. Cancel any time.`;
}

function subline(p: SubscriptionPlan) {
  if (p.id === "family_yearly") return `About $${Math.round(p.price / 4)} per child a year, up to 4 kids`;
  if (p.interval === "year") return `${money(p.price / 12)} a month, billed yearly`;
  return "Billed weekly";
}

const FAQ: { q: string; a: string }[] = [
  { q: "Can I cancel any time?", a: "Yes. Cancel whenever you like and you keep access until the end of the billing period." },
  { q: "What payment methods do you accept?", a: "All major credit cards, through our payment processor, Stripe." },
  { q: "Do web and app plans match?", a: "Yes. Weekly, Individual Annual and Family Annual are the same products and prices as in the QuizliAI iPhone app. Subscriptions are billed separately on each platform." },
  { q: "What happens to my notes if I downgrade?", a: "Everything you made stays available. You are limited to the free plan's allowance for new notes." },
];

export interface PricingViewProps {
  plans: SubscriptionPlan[];
  freePlan: SubscriptionPlan;
  currentPlan: string;
  /** Plan id while a checkout request is in flight. */
  loadingPlan: string | null;
  /** Returns an error message to show in a banner, or null when checkout started. */
  onChoose: (plan: SubscriptionPlan) => Promise<string | null>;
  closeHref?: string;
}

export function PricingView({ plans, freePlan, currentPlan, loadingPlan, onChoose, closeHref = "/note" }: PricingViewProps) {
  const [selectedId, setSelectedId] = useState(plans.find((p) => p.id === "family_yearly")?.id ?? plans[0].id);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = plans.find((p) => p.id === selectedId)!;
  const isCurrent = currentPlan === selected.id;
  const busy = loadingPlan === selected.id;

  const choose = async () => {
    setError(null);
    const message = await onChoose(selected);
    if (message) setError(message);
  };

  const close = (
    <Link href={closeHref} aria-label="Close" className="inline-flex size-11 items-center justify-center rounded-full text-supporting hover:text-label">
      <X aria-hidden="true" strokeWidth={1.75} className="size-5" />
    </Link>
  );

  const rows = (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Choose a plan</legend>
      {plans.map((p) => {
        const checked = p.id === selectedId;
        const hiddenSmall = !checked && !more ? "hidden lg:flex" : "flex";
        return (
          <label
            key={p.id}
            className={`${hiddenSmall} mb-3 last:mb-0 cursor-pointer items-start gap-3 rounded-2xl p-4 ${
              checked ? "border-[1.5px] border-rust bg-card shadow-card" : "border border-card-stroke bg-card hover:bg-hover-fill"
            }`}
          >
            <span className="flex w-full items-start gap-3">
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={checked}
                onChange={() => setSelectedId(p.id)}
                className="mt-1 size-5 shrink-0 accent-[var(--primary-fill)]"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-headline text-label">{p.name}</span>
                  <span className="text-headline text-label tabular-nums">{money(p.price)} <span className="text-subheadline font-normal text-supporting">{per(p)}</span></span>
                </span>
                <span className="text-subheadline text-supporting">{subline(p)}</span>
                {currentPlan === p.id && <span className="mt-1 text-subheadline font-semibold text-label">Your current plan</span>}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );

  const seeMore = !more && plans.length > 1 && (
    <button
      type="button"
      aria-expanded={more}
      onClick={() => setMore(true)}
      className="inline-flex min-h-11 items-center justify-center gap-1 self-center rounded-full px-3 text-subheadline font-semibold text-rust-on-tint underline-offset-4 hover:underline lg:hidden"
    >
      See more plans
      <ChevronDown aria-hidden="true" strokeWidth={1.75} className="size-4" />
    </button>
  );

  const purchase = (
    <div className="flex flex-col gap-3">
      {error && <InlineBanner>{error}</InlineBanner>}
      <Button size="lg" className="w-full" onClick={choose} disabled={busy || isCurrent}>
        {isCurrent ? (
          <>
            <CircleCheck aria-hidden="true" strokeWidth={1.75} className="size-5" /> Current plan
          </>
        ) : busy ? (
          "Opening checkout"
        ) : selected.trialDays > 0 ? (
          `Start ${selected.trialDays}-day free trial`
        ) : (
          `Subscribe for ${money(selected.price)} ${per(selected)}`
        )}
      </Button>
      <p className="text-center text-subheadline text-supporting">{priceSentence(selected)}</p>
    </div>
  );

  const features = (
    <section aria-labelledby="includes" className="flex flex-col gap-2">
      <h2 id="includes" className="text-subheadline font-semibold text-label">{selected.name} includes</h2>
      <ul className="flex flex-col gap-2">
        {selected.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-subheadline text-label">
            <Check aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-success" />
            {f}
          </li>
        ))}
      </ul>
    </section>
  );

  const faq = (
    <section aria-labelledby="faq" className="mx-auto flex w-full max-w-[40rem] flex-col gap-3">
      <h2 id="faq" className="text-title3 text-label">Questions</h2>
      <div className="flex flex-col gap-2">
        {FAQ.map((f) => (
          <details key={f.q} className="ds-card group px-4 py-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-headline text-label [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-supporting transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <p className="pb-3 text-subheadline text-supporting">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );

  const free = (
    <p className="text-center text-subheadline text-supporting">
      Not ready? The {freePlan.name} plan includes {freePlan.freeGenerationsTotal} free note with a quiz and flashcards.
      {currentPlan === "free" && " It is your current plan."}
    </p>
  );

  const footer = (
    <p className="text-center text-subheadline text-supporting">
      <a href="https://sites.google.com/view/quizliai-terms/home" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Terms<span className="sr-only"> (opens in a new tab)</span></a>
      {" · "}
      <a href="https://sites.google.com/view/quizliai-privacy/home" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Privacy<span className="sr-only"> (opens in a new tab)</span></a>
    </p>
  );

  const heading = (
    <div className="flex flex-col gap-1">
      <h1 tabIndex={-1} className="font-serif text-title font-semibold lg:text-large-title">Try QuizliAI free.</h1>
      <p className="text-subheadline text-supporting">The same plans as the QuizliAI iPhone app. Pick the one that fits.</p>
    </div>
  );

  return (
    <WelcomeFrame width="wide" headerEnd={close}>
      <title>Plans | QuizliAI</title>
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[5fr_7fr] lg:items-start lg:gap-12">
          <div className="mx-auto flex w-full max-w-[30rem] flex-col gap-6 lg:mx-0 lg:max-w-none lg:pt-6">
            {heading}
            <section aria-label="Example question" className="hidden rounded-[1.375rem] bg-paper p-6 text-on-paper shadow-card lg:block">
              <p className="text-footnote font-semibold">Example from a quiz</p>
              <p className="mt-2 text-title3">What gas do plants take in from the air?</p>
              <p className="mt-3 text-subheadline">Carbon dioxide. Plants take it in through small pores in their leaves and use it, with light and water, to make sugar.</p>
            </section>
            {selected.trialDays > 0 && (
              <ol aria-label="How the free trial works" className="hidden flex-col gap-4 lg:flex">
                <li className="flex items-start gap-3">
                  <Unlock aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-rust-on-tint" />
                  <span className="flex flex-col">
                    <span className="text-headline text-label">Today</span>
                    <span className="text-subheadline text-supporting">Start the trial and use everything in {selected.name}.</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CalendarClock aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-rust-on-tint" />
                  <span className="flex flex-col">
                    <span className="text-headline text-label">Day {selected.trialDays}</span>
                    <span className="text-subheadline text-supporting">Your plan begins and {money(selected.price)} is charged. Cancel before then to pay nothing.</span>
                  </span>
                </li>
              </ol>
            )}
          </div>
          <div className="mx-auto flex w-full max-w-[30rem] flex-col gap-6 lg:mx-0 lg:max-w-none">
            {rows}
            {seeMore}
            {features}
            {purchase}
            {free}
          </div>
        </div>
        {faq}
        {footer}
      </div>
    </WelcomeFrame>
  );
}
