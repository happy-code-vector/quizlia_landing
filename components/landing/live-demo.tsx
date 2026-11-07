"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileText, Globe, PlayCircle, X } from "lucide-react";
import { demoSamples, type Sample } from "@/content/demoSamples";

// Landing demo (no backend): pick a sample, watch it turn into notes, flashcards and a quiz.
// The bear appears only at state changes (generating, a right answer), never at rest.

type Phase = "idle" | "loading" | "result";
type Tab = "notes" | "cards" | "quiz";

const STEP_MS = 850;
const FINISH_MS = 300;
const TABS: { id: Tab; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "cards", label: "Flashcards" },
  { id: "quiz", label: "Quiz" },
];
const ICONS = { video: PlayCircle, PDF: FileText, page: Globe } as const;
const ease = "ease-[cubic-bezier(0.2,0,0,1)]";

export function LiveDemo({ hero = false }: { hero?: boolean }) {
  const [selected, setSelected] = useState<Sample | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<Tab>("notes");
  const [runKey, setRunKey] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function run(sample: Sample) {
    if (phase === "loading") return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSelected(sample);
    setPhase("loading");
    setStep(1);
    setTab("notes");
    setRunKey((k) => k + 1);
    timers.current.push(setTimeout(() => setStep(2), STEP_MS));
    timers.current.push(setTimeout(() => setStep(3), STEP_MS * 2));
    timers.current.push(setTimeout(() => setPhase("result"), STEP_MS * 3 + FINISH_MS));
  }

  const steps = selected
    ? [`Reading the ${selected.kind}`, "Writing your notes", "Making flashcards and a quiz"]
    : [];

  return (
    <div className={`ds-card w-full p-4 md:p-6 ${hero ? "rounded-[1.375rem]" : ""}`}>
      <label htmlFor="demo-link" className="text-subheadline font-semibold text-label">
        Link or file <span className="font-normal text-supporting">(sample only)</span>
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="demo-link"
          type="text"
          readOnly
          value={selected?.url ?? ""}
          placeholder="Pick a sample below"
          className="h-11 w-full min-w-0 rounded-xl border border-input sm:flex-1 bg-card px-3 text-callout text-label placeholder:text-supporting"
        />
        <button
          type="button"
          onClick={() => run(selected ?? demoSamples[0])}
          disabled={phase === "loading"}
          className={`inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-divider bg-card px-5 text-subheadline font-semibold text-label transition-[border-color,background-color] duration-150 ${ease} hover:border-input active:bg-hover-fill disabled:opacity-40`}
        >
          Make my study set
        </button>
      </div>

      <fieldset className="mt-4">
        <legend className="text-subheadline text-supporting">Try one:</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {demoSamples.map((s) => {
            const on = selected?.id === s.id;
            const Icon = ICONS[s.kind];
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                disabled={phase === "loading"}
                onClick={() => run(s)}
                className={`relative inline-flex h-[2.125rem] items-center gap-1.5 rounded-full px-3 text-subheadline font-semibold text-label transition-colors duration-150 after:absolute after:-inset-y-[0.3125rem] after:inset-x-0 after:content-[""] disabled:opacity-40 ${
                  on ? "border-[1.5px] border-rust bg-card" : "border border-divider bg-card hover:bg-hover-fill"
                }`}
              >
                {on ? (
                  <Check aria-hidden="true" strokeWidth={1.75} className="size-4 text-rust" />
                ) : (
                  <Icon aria-hidden="true" strokeWidth={1.75} className="size-4 text-supporting" />
                )}
                {s.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 min-h-[21rem] border-t border-divider pt-5">
        {phase === "idle" && (
          <div className="flex min-h-[19rem] flex-col items-center justify-center text-center">
            <p className="text-title3 font-semibold text-label">Pick a sample to start</p>
            <p className="mt-1 text-subheadline text-supporting">This demo takes about three seconds.</p>
          </div>
        )}

        {phase === "loading" && (
          <div className="relative flex min-h-[19rem] flex-col justify-center gap-4">
            <Image
              src="/mascot/quizliai_mascot_think.webp"
              alt=""
              width={284}
              height={640}
              className="pointer-events-none absolute bottom-0 right-0 h-auto w-[4.5rem] sm:w-24"
            />
            <div role="status" aria-live="polite" className="sr-only">
              {steps[Math.min(step, 3) - 1]}
            </div>
            <ul className="space-y-4" aria-hidden="true">
              {steps.map((text, i) => {
                const lit = i < step;
                const done = i < step - 1;
                return (
                  <li
                    key={text}
                    className={`flex items-center gap-3 text-headline transition-colors duration-200 ${lit ? "text-label" : "text-supporting"}`}
                  >
                    {done ? (
                      <span className="grid size-6 place-items-center rounded-full bg-rust-wash">
                        <Check strokeWidth={2} className="size-4 text-rust" />
                      </span>
                    ) : lit ? (
                      <span className="size-6 rounded-full border-2 border-track border-b-rust motion-safe:animate-spin" />
                    ) : (
                      <span className="size-6 rounded-full border-2 border-track" />
                    )}
                    {text}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {phase === "result" && selected && (
          <ResultView sample={selected} tab={tab} onTab={setTab} runKey={runKey} />
        )}
      </div>
    </div>
  );
}

function ResultView({ sample, tab, onTab, runKey }: { sample: Sample; tab: Tab; onTab: (t: Tab) => void; runKey: number }) {
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ notes: null, cards: null, quiz: null });

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = TABS[(index + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length].id;
    onTab(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="animate-[demo-in_200ms_cubic-bezier(0.2,0,0,1)]">
      <div role="tablist" aria-label="Study set" className="inline-flex rounded-full bg-control p-1">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            role="tab"
            id={`demo-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`demo-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            type="button"
            onClick={() => onTab(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-9 rounded-full px-4 text-subheadline font-semibold transition-colors duration-150 ${
              tab === t.id ? "bg-card text-label shadow-card" : "text-supporting hover:text-label"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`demo-panel-${tab}`} aria-labelledby={`demo-tab-${tab}`} tabIndex={0} className="mt-5 rounded-lg">
        {tab === "notes" && <NotesPane sample={sample} />}
        {tab === "cards" && <FlashcardsPane key={`${sample.id}-${runKey}`} sample={sample} />}
        {tab === "quiz" && <QuizPane key={`${sample.id}-${runKey}`} sample={sample} />}
      </div>
    </div>
  );
}

function NotesPane({ sample }: { sample: Sample }) {
  return (
    <div>
      <h3 className="text-title3 font-semibold text-label">{sample.title}</h3>
      <ul className="mt-3 space-y-2">
        {sample.notes.map(([label, text]) => (
          <li key={label} className="rounded-xl border border-divider px-4 py-3 text-callout text-label">
            <span className="font-semibold text-rust">{label}:</span> {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

const roundIcon =
  "relative grid size-[2.125rem] place-items-center rounded-full border border-divider bg-card text-label hover:border-input after:absolute after:-inset-[0.3125rem] after:content-['']";

function FlashcardsPane({ sample }: { sample: Sample }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [q, a] = sample.cards[i];
  const go = (d: number) => {
    setFlipped(false);
    setI((n) => (n + d + sample.cards.length) % sample.cards.length);
  };
  const face = "study-face absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-paper p-6 text-center text-on-paper shadow-card";
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={flipped ? `Answer: ${a}. Show question` : `Question: ${q}. Show answer`}
        onClick={() => setFlipped((f) => !f)}
        className="relative block h-52 w-full max-w-[28rem] rounded-2xl [perspective:1000px]"
      >
        <span data-flipped={flipped} className="study-flip absolute inset-0 block">
          <span aria-hidden="true" className={`${face} study-face-front`}>
            <span className="font-serif text-title3">{q}</span>
          </span>
          <span aria-hidden="true" className={`${face} study-face-back`}>
            <span className="text-footnote font-semibold uppercase tracking-wide text-on-paper-supporting">Answer</span>
            <span className="mt-1 text-title3 font-semibold">{a}</span>
          </span>
        </span>
      </button>
      <div className="mt-4 flex items-center gap-4">
        <button type="button" aria-label="Previous card" onClick={() => go(-1)} className={roundIcon}>
          <ChevronLeft aria-hidden="true" strokeWidth={1.75} className="size-5" />
        </button>
        <span className="tabular text-subheadline text-supporting" aria-live="polite">
          {i + 1} of {sample.cards.length}, select the card to flip
        </span>
        <button type="button" aria-label="Next card" onClick={() => go(1)} className={roundIcon}>
          <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5" />
        </button>
      </div>
    </div>
  );
}

function QuizPane({ sample }: { sample: Sample }) {
  const [picked, setPicked] = useState<number | null>(null);
  const { q, options, answer } = sample.quiz;
  const locked = picked !== null;
  return (
    <div>
      <h3 className="text-title3 font-semibold text-label">{q}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((opt, j) => {
          const right = locked && j === answer;
          const wrong = locked && j === picked && j !== answer;
          return (
            <button
              key={opt}
              type="button"
              disabled={locked}
              aria-pressed={picked === j}
              onClick={() => setPicked(j)}
              className={`flex min-h-12 items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-callout font-semibold text-label transition-colors duration-150 disabled:cursor-default ${
                right
                  ? "border-2 border-success bg-card"
                  : wrong
                    ? "border-2 border-danger bg-card"
                    : "border border-divider bg-card enabled:hover:border-input"
              }`}
            >
              <span>{opt}</span>
              {right && (
                <span className="inline-flex items-center gap-1 text-subheadline text-label">
                  <Check aria-hidden="true" strokeWidth={2} className="size-4 text-success" />
                  Correct
                </span>
              )}
              {wrong && (
                <span className="inline-flex items-center gap-1 text-subheadline text-label">
                  <X aria-hidden="true" strokeWidth={2} className="size-4 text-danger" />
                  Your answer
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex min-h-[4.5rem] items-center gap-3">
        {locked && picked === answer && (
          <Image src="/mascot/quizliai_mascot_thumbs_up.webp" alt="" width={328} height={640} className="h-auto w-11 shrink-0" />
        )}
        <p className="text-subheadline font-semibold text-label" aria-live="polite">
          {locked &&
            (picked === answer
              ? "Right. Your own lessons get quizzed the same way."
              : "Not this time. That is why the quiz comes before the test.")}
        </p>
      </div>
    </div>
  );
}
