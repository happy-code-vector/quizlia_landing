"use client";

import { Check, CircleAlert } from "lucide-react";
import { ToastProvider } from "@/components/app/ToastContainer";
import { AppShell, type Family } from "@/components/app/shell/AppShell";
import { HomeView } from "@/components/app/home/HomeView";
import { Button } from "@/components/ui/button";
import { FIXTURE_FOLDERS, FIXTURE_NOW, FIXTURE_PROFILES, FIXTURE_TOPICS, type FixtureFamily } from "../sample-data";

const noop = () => {};

export function FixtureClient({ family }: { family: FixtureFamily }) {
  if (family === "home") {
    return (
      <ToastProvider>
        <HomeView
          profile={FIXTURE_PROFILES[0]}
          topics={FIXTURE_TOPICS}
          onDeleteTopic={noop}
          onGenerated={noop}
          now={FIXTURE_NOW}
          folders={FIXTURE_FOLDERS}
          hideUsage
        />
      </ToastProvider>
    );
  }

  const surface: Family = family === "paywall" ? "welcome" : family;
  const port = { study: "PR 3", people: "PR 4", welcome: "PR 5", paywall: "PR 5" }[family];

  // Welcome and paywall have no app shell (onboarding and purchase are full-screen flows).
  if (family === "welcome" || family === "paywall") {
    return (
      <>
        <a href="#main" className="skip-link">Skip to content</a>
        <div aria-hidden="true" className={`family-surface family-${surface}`} />
        <main id="main" className="mx-auto w-full max-w-[30rem] px-4 py-10">
          <Specimen family={family} port={port} />
        </main>
      </>
    );
  }

  return (
    <AppShell profile={FIXTURE_PROFILES[0]} family={surface} folders={FIXTURE_FOLDERS} hideUsage>
      <main id="main" className="flex-1 overflow-y-auto px-4 py-8 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[45rem]">
          <Specimen family={family} port={port} />
        </div>
      </main>
    </AppShell>
  );
}

/** Token specimen on a family surface. Exercises every token the gate probes until the real screen ports. */
function Specimen({ family, port }: { family: string; port: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold">Token specimen: {family}</h1>
        <p className="text-subheadline text-supporting">The real {family} screen ports in {port}. This page checks tokens on its surface.</p>
      </div>

      <section aria-labelledby="hero" className="ds-card flex flex-col gap-5 rounded-[1.375rem] p-6">
        <h2 id="hero" className="font-serif text-title2 font-semibold sm:text-title">See how the ideas connect.</h2>
        <div className="rounded-2xl bg-paper p-5 text-on-paper shadow-card">
          <p className="text-footnote font-semibold">Question</p>
          <p className="mt-2 font-serif text-title3">What gas do plants take in from the air?</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Continue</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="link">Text link</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section aria-labelledby="chips" className="flex flex-col gap-3">
        <h2 id="chips" className="text-headline">Chips and on-tint text</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed="true" className="inline-flex h-[2.125rem] items-center gap-1.5 rounded-full border-[1.5px] border-rust bg-rust-wash px-3 text-subheadline font-semibold">
            <Check aria-hidden="true" strokeWidth={1.75} className="size-4" /> Selected
          </button>
          <button type="button" aria-pressed="false" className="inline-flex h-[2.125rem] items-center rounded-full border border-card-stroke bg-card px-3 text-subheadline hover:bg-hover-fill">
            Not selected
          </button>
        </div>
        <p className="text-subheadline text-rust-on-tint">Rust text directly on the tint uses the on-tint token.</p>
        <p className="text-subheadline text-supporting">Supporting text on the tint.</p>
      </section>

      <section aria-labelledby="form" className="ds-card flex flex-col gap-4 p-6">
        <h2 id="form" className="text-headline">Form field</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fx-email" className="text-subheadline font-semibold">Email address</label>
          <p id="fx-email-error" className="flex items-center gap-1.5 text-subheadline text-danger">
            <CircleAlert aria-hidden="true" strokeWidth={1.75} className="size-4" />
            <span className="sr-only">Error:</span> Enter an email address like name@example.com
          </p>
          <input
            id="fx-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            defaultValue="maya@"
            aria-invalid="true"
            aria-describedby="fx-email-error"
            className="h-11 rounded-xl border-2 border-danger bg-card px-3 text-callout"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fx-name" className="text-subheadline font-semibold">Name</label>
          <input id="fx-name" type="text" autoComplete="name" defaultValue="Maya" className="h-11 rounded-xl border border-input bg-card px-3 text-callout" />
        </div>
      </section>

      <section aria-labelledby="type" className="ds-card flex flex-col gap-2 p-6">
        <h2 id="type" className="text-headline">Type scale</h2>
        <p className="font-serif text-large-title">Large title, serif</p>
        <p className="text-title">Title</p>
        <p className="text-title2">Title 2</p>
        <p className="text-title3">Title 3</p>
        <p className="text-headline">Headline</p>
        <p className="text-body">Body text for reading.</p>
        <p className="text-callout">Callout</p>
        <p className="text-subheadline text-supporting">Subheadline, the content floor</p>
        <p className="tabular text-footnote text-supporting">Footnote, metadata only · 6 Nov 2026</p>
      </section>
    </div>
  );
}
