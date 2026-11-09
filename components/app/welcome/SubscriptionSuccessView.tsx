import Link from "next/link";
import { Check, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WelcomeFrame } from "./WelcomeFrame";

const INCLUDED = [
  "Notes, quizzes, flashcards and AI chat",
  "Priority AI processing",
  "Advanced content analysis",
  "Priority support",
];

/** Shown after checkout returns. Props only; the page confirms the subscription with Firestore first. */
export function SubscriptionSuccessView({ planName }: { planName: string }) {
  return (
    <WelcomeFrame>
      <title>You are subscribed | QuizliAI</title>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <CircleCheck aria-hidden="true" strokeWidth={1.75} className="mb-2 size-10 text-success" />
          <h1 tabIndex={-1} className="font-serif text-title font-semibold">Welcome to QuizliAI Premium.</h1>
          <p className="text-subheadline text-supporting">Your subscription is active. Your plan: {planName}.</p>
        </div>
        <section aria-labelledby="included" className="ds-card flex flex-col gap-3 p-5 sm:p-6">
          <h2 id="included" className="text-headline text-label">What is included</h2>
          <ul className="flex flex-col gap-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-subheadline text-label">
                <Check aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </section>
        <Button asChild size="lg" className="w-full"><Link href="/note">Go to Home</Link></Button>
      </div>
    </WelcomeFrame>
  );
}

export function SubscriptionProcessingView() {
  return (
    <WelcomeFrame>
      <title>Processing your subscription | QuizliAI</title>
      <div role="status" className="flex flex-col items-center gap-4 pt-24 text-center">
        <div aria-hidden="true" className="size-8 animate-spin rounded-full border-2 border-track border-b-rust" />
        <p className="text-subheadline text-supporting">Processing your subscription</p>
      </div>
    </WelcomeFrame>
  );
}
