"use client";

import { Check, CircleAlert } from "lucide-react";
import { ToastProvider } from "@/components/app/ToastContainer";
import { AppShell, type Family } from "@/components/app/shell/AppShell";
import { HomeView } from "@/components/app/home/HomeView";
import { NoteView } from "@/components/app/note/NoteView";
import type { NoteChatState } from "@/components/app/note/useNoteChat";
import { FlashcardStudyMode } from "@/components/app/FlashcardStudyMode";
import { QuizStudyMode } from "@/components/app/QuizStudyMode";
import { ArcadeView } from "@/components/app/arcade/ArcadeView";
import { Button } from "@/components/ui/button";
import { ProfilePickerView } from "@/components/app/people/ProfilePickerView";
import { PeopleFrame } from "@/components/app/people/PeopleFrame";
import { SignInPanel } from "@/components/app/people/SignInPanel";
import { CreateProfileForm } from "@/components/app/people/CreateProfileForm";
import { SettingsView, type PlanSummary } from "@/components/app/people/SettingsView";
import { PromoCodeInput } from "@/components/app/PromoCodeInput";
import {
  FIXTURE_FOLDERS, FIXTURE_NOW, FIXTURE_POSITIONS, FIXTURE_PROFILES, FIXTURE_SKETCH, FIXTURE_TOPICS, type FixtureFamily,
} from "../sample-data";

const noop = () => {};

export function FixtureClient({ family, state }: { family: FixtureFamily; state?: string }) {
  if (family === "home") {
    const empty = state === "empty";
    return (
      <ToastProvider>
        <HomeView
          profile={FIXTURE_PROFILES[0]}
          topics={empty ? [] : FIXTURE_TOPICS}
          positions={empty ? {} : FIXTURE_POSITIONS}
          sketch={FIXTURE_SKETCH}
          sketchedEnabled={state !== "nosketch"}
          onGenerated={noop}
          now={FIXTURE_NOW}
          folders={FIXTURE_FOLDERS}
          hideUsage
        />
      </ToastProvider>
    );
  }

  if (family === "study") return <StudyFixture state={state} />;
  if (family === "people") return <PeopleFixture state={state} />;

  const surface: Family = family === "paywall" ? "welcome" : family;
  const port = { welcome: "PR 5", paywall: "PR 5" }[family];

  // Welcome and paywall have no app shell (onboarding and purchase are full-screen flows).
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

const asyncNoop = async () => {};
const authNoop = async () => null;

const FIXTURE_PLAN: PlanSummary = {
  name: "Family Annual",
  paid: true,
  renewsOn: "2027-09-14T00:00:00Z",
  features: ["Up to 4 kid profiles and a parent profile", "20 notes a day", "Flashcards, quizzes and games for every note"],
  usage: { kind: "daily", used: 3, limit: 20 },
};

/**
 * People family: profile picker, sign in, create profile, settings.
 * ?state=picker (default) | edit | signin | create | settings
 */
function PeopleFixture({ state }: { state?: string }) {
  const [maya] = FIXTURE_PROFILES;
  if (state === "signin") {
    return (
      <PeopleFrame>
        <SignInPanel googleAvailable onGoogle={authNoop} onEmail={authNoop} onSkip={noop} />
      </PeopleFrame>
    );
  }
  if (state === "create") {
    return (
      <PeopleFrame backHref="/dev/fixtures/people" backLabel="Profiles">
        <CreateProfileForm
          profiles={FIXTURE_PROFILES}
          maxProfiles={4}
          accountEmail="parent@example.com"
          cancelHref="/dev/fixtures/people"
          onCreate={asyncNoop}
        />
      </PeopleFrame>
    );
  }
  if (state === "settings") {
    return (
      <ToastProvider>
        <SettingsView
          profile={maya}
          profiles={FIXTURE_PROFILES}
          family
          plan={FIXTURE_PLAN}
          account={{ email: "parent@example.com" }}
          onSaveProfile={asyncNoop}
          onDeleteProfile={asyncNoop}
          onSignOut={asyncNoop}
          promo={<PromoCodeInput email="parent@example.com" profileId={maya.id} apply={async () => ({ success: false, message: "That promo code has expired" })} />}
          folders={FIXTURE_FOLDERS}
          hideUsage
        />
      </ToastProvider>
    );
  }
  return (
    <ProfilePickerView
      profiles={FIXTURE_PROFILES}
      currentId={maya.id}
      family
      accountEmail="parent@example.com"
      canGoBack
      onSelect={noop}
      onSave={asyncNoop}
      onDelete={asyncNoop}
      initialEditing={state === "edit"}
    />
  );
}

const FIXTURE_CHAT: NoteChatState = {
  messages: [
    { id: "default", sender: "default", text: "Ask me anything about this note." },
    { id: "q1", sender: "user", text: "Why do leaves change color in fall?" },
    { id: "a1", sender: "ai", text: "In fall the tree stops making **chlorophyll**. The green fades and the yellow and orange pigments that were there all along show through." },
  ],
  inputText: "",
  setInputText: noop,
  isLoading: false,
  send: noop,
};

/**
 * Study family: the real note page and both study modes with sample data.
 * ?state=note (default) | flashcards | quiz | arcade
 */
function StudyFixture({ state }: { state?: string }) {
  const topic = FIXTURE_TOPICS[0];
  if (state === "flashcards") {
    return (
      <FlashcardStudyMode
        flashcards={topic.flashcards!}
        startIndex={FIXTURE_POSITIONS[topic.id].index}
        deckTitle={topic.title}
        onClose={noop}
        onQuiz={noop}
      />
    );
  }
  if (state === "quiz") {
    return <QuizStudyMode quizzes={topic.quiz!} topicTitle={topic.title} onClose={noop} />;
  }
  return (
    <ToastProvider>
      <AppShell profile={FIXTURE_PROFILES[0]} family="study" folders={FIXTURE_FOLDERS} hideUsage>
        {state === "arcade" ? (
          <ArcadeView topics={FIXTURE_TOPICS.filter((t) => t.flashcards?.length).map((t) => ({ id: t.id, title: t.title }))} profileId={FIXTURE_PROFILES[0].id} />
        ) : (
          <NoteView
            topic={topic}
            chat={FIXTURE_CHAT}
            onStudyFlashcards={noop}
            onQuiz={noop}
            onPlay={noop}
            menu={{
              onShare: noop, onRename: noop, onDelete: noop, publishedSlug: null, isAdmin: false,
              isPublishing: false, onPublish: noop, onUnpublish: noop, onCopyLink: noop,
            }}
          />
        )}
      </AppShell>
    </ToastProvider>
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
