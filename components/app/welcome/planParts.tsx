import { Check } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/subscription";

// Plan pieces shared by the pricing page (PricingView) and the paywall modal (PaywallModal),
// so the two never drift: same sentence in words, same row, same feature list.

export const money = (n: number) => `$${n.toFixed(2)}`;
export const per = (p: SubscriptionPlan) => (p.interval === "week" ? "a week" : "a year");

/** One sentence in words, as on the iOS paywall. */
export function priceSentence(p: SubscriptionPlan) {
  if (p.trialDays > 0) return `Try ${p.trialDays} days free, then ${money(p.price)} ${per(p)}. Cancel any time.`;
  return `${money(p.price)} ${per(p)}, billed ${p.interval === "week" ? "weekly" : "yearly"}. Cancel any time.`;
}

export function subline(p: SubscriptionPlan) {
  if (p.id === "family_yearly") return `About $${Math.round(p.price / 4)} per child a year, up to 4 kids`;
  if (p.interval === "year") return `${money(p.price / 12)} a month, billed yearly`;
  return "Billed weekly";
}

/** Label for the primary capsule. */
export function capsuleLabel(p: SubscriptionPlan) {
  return p.trialDays > 0 ? `Start ${p.trialDays}-day free trial` : `Subscribe for ${money(p.price)} ${per(p)}`;
}

interface PlanOptionProps {
  plan: SubscriptionPlan;
  checked: boolean;
  onSelect: () => void;
  /** Shown under the plan when it is the user's plan. */
  isCurrent?: boolean;
  /** Unselected rows drop the subline so the capsule stays near the fold (modal). */
  compact?: boolean;
  /** Display and spacing classes from the caller (the page hides rows below 1024 px). */
  className?: string;
}

/** One radio row. Must sit inside a fieldset with a legend; the radio group name is "plan". */
export function PlanOption({ plan, checked, onSelect, isCurrent, compact, className = "flex" }: PlanOptionProps) {
  const pad = compact && !checked ? "px-4 py-3" : "p-4";
  return (
    <label
      className={`${className} ${pad} cursor-pointer items-start gap-3 rounded-2xl ${
        checked
          ? "border-[1.5px] border-rust bg-card shadow-card"
          : `border bg-card hover:bg-hover-fill ${compact ? "border-divider" : "border-card-stroke"}`
      }`}
    >
      <span className="flex w-full items-start gap-3">
        <input
          type="radio"
          name="plan"
          value={plan.id}
          checked={checked}
          onChange={onSelect}
          className="mt-1 size-5 shrink-0 accent-[var(--primary-fill)]"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-headline text-label">{plan.name}</span>
            <span className="text-headline text-label tabular-nums">
              {money(plan.price)} <span className="text-subheadline font-normal text-supporting">{per(plan)}</span>
            </span>
          </span>
          {!(compact && !checked) && <span className="text-subheadline text-supporting">{subline(plan)}</span>}
          {isCurrent && <span className="mt-1 text-subheadline font-semibold text-label">Your current plan</span>}
        </span>
      </span>
    </label>
  );
}

/** "<Plan> includes" list. `headingId` labels the section. */
export function PlanFeatures({ plan, headingId, level = 2 }: { plan: SubscriptionPlan; headingId: string; level?: 2 | 3 }) {
  const Heading = level === 3 ? "h3" : "h2";
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <Heading id={headingId} className="text-subheadline font-semibold text-label">{plan.name} includes</Heading>
      <ul className="flex flex-col gap-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-subheadline text-label">
            <Check aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-success" />
            {f}
          </li>
        ))}
      </ul>
    </section>
  );
}
