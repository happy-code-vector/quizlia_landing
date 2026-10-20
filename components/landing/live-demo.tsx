"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { demoSamples, type Sample } from "@/content/demoSamples";

type Phase = "idle" | "loading" | "result";
type Tab = "notes" | "cards" | "quiz";

const STEP_MS = 850;
const FINISH_MS = 300;
const TABS: { id: Tab; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "cards", label: "Flashcards" },
  { id: "quiz", label: "Quiz" },
];

export function LiveDemo() {
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
    timers.current.push(
      setTimeout(() => setPhase("result"), STEP_MS * 3 + FINISH_MS),
    );
  }

  const steps = selected
    ? [
        `Reading the ${selected.kind}…`,
        "Writing your notes…",
        "Making flashcards & a quiz…",
      ]
    : [];

  return (
    <div className="relative z-10 mx-auto -mt-[110px] w-full max-w-[900px] rounded-[28px] bg-white p-4 shadow-[0_40px_80px_-40px_rgba(60,20,120,0.45),0_0_0_1px_rgba(22,18,31,0.06)] md:p-[26px]">
      <div className="flex flex-col gap-2 rounded-[18px] bg-c-soft p-2 sm:flex-row sm:items-center sm:pl-5">
        <label htmlFor="demo-link" className="sr-only">
          Link to turn into a study set (demo)
        </label>
        <input
          id="demo-link"
          type="text"
          readOnly
          value={selected?.url ?? ""}
          placeholder="Paste a YouTube link, PDF or website…"
          className="min-h-11 w-full min-w-0 flex-1 bg-transparent px-3 text-[17px] text-c-ink placeholder:text-c-muted focus:outline-none sm:px-0"
        />
        <button
          type="button"
          onClick={() => run(selected ?? demoSamples[0])}
          disabled={phase === "loading"}
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-c-ink px-6 text-[15px] font-bold text-white transition-transform duration-150 motion-safe:hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-brand disabled:opacity-60"
        >
          Make my study set
        </button>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-c-muted">Try one:</span>
        {demoSamples.map((s) => {
          const on = selected?.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              disabled={phase === "loading"}
              onClick={() => run(s)}
              className={`min-h-11 rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-brand disabled:cursor-not-allowed ${
                on
                  ? "border-c-ink bg-c-ink text-white"
                  : "border-[#e2dcee] text-c-ink hover:border-c-brand hover:text-c-brand-ink"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="mt-[22px] min-h-[330px] border-t border-[#eee8f5] pt-[22px]">
        {phase === "idle" && (
          <div className="flex min-h-[286px] flex-col items-center justify-center text-center">
            <p className="text-[22px] font-bold text-c-ink">
              Pick a sample to start ↑
            </p>
            <p className="mt-1 text-[15px] text-c-muted">
              Takes about 3 seconds in this demo.
            </p>
          </div>
        )}

        {phase === "loading" && (
          <div className="relative flex min-h-[286px] flex-col justify-center gap-4 pl-2">
            <Image
              src="/mascot/quizliai_mascot_think.webp"
              alt=""
              width={284}
              height={640}
              className="anim-float pointer-events-none absolute bottom-0 right-0 h-auto w-[83px] sm:w-[104px]"
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
                    className={`flex items-center gap-3 text-[17px] font-semibold text-c-ink transition-opacity duration-300 ${
                      lit ? "opacity-100" : "opacity-25"
                    }`}
                  >
                    {done ? (
                      <span className="grid h-[22px] w-[22px] place-items-center">
                        <span className="h-3 w-3 rounded-full bg-c-brand" />
                      </span>
                    ) : (
                      <span className="h-[22px] w-[22px] rounded-full border-[2.5px] border-[#e2dcee] border-t-c-brand motion-safe:animate-spin" />
                    )}
                    {text}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {phase === "result" && selected && (
          <ResultView
            sample={selected}
            tab={tab}
            onTab={setTab}
            runKey={runKey}
          />
        )}
      </div>
    </div>
  );
}

function ResultView({
  sample,
  tab,
  onTab,
  runKey,
}: {
  sample: Sample;
  tab: Tab;
  onTab: (t: Tab) => void;
  runKey: number;
}) {
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({
    notes: null,
    cards: null,
    quiz: null,
  });

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      TABS[
        (index + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length
      ].id;
    onTab(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="animate-[demo-in_0.35s_ease-out] motion-reduce:animate-none">
      <div
        role="tablist"
        aria-label="Study set"
        className="inline-flex rounded-[14px] bg-c-soft p-[5px]"
      >
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
            className={`min-h-11 rounded-[10px] px-4 text-[14px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-brand ${
              tab === t.id
                ? "bg-white text-c-ink shadow-[0_2px_6px_rgba(60,20,120,0.1)]"
                : "text-c-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`demo-panel-${tab}`}
        aria-labelledby={`demo-tab-${tab}`}
        tabIndex={0}
        className="mt-5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-c-brand"
      >
        {tab === "notes" && <NotesPane sample={sample} />}
        {tab === "cards" && (
          <FlashcardsPane key={`${sample.id}-${runKey}`} sample={sample} />
        )}
        {tab === "quiz" && (
          <QuizPane key={`${sample.id}-${runKey}`} sample={sample} />
        )}
      </div>
    </div>
  );
}

function NotesPane({ sample }: { sample: Sample }) {
  return (
    <div>
      <h3 className="text-[22px] font-bold text-c-ink">{sample.title}</h3>
      <ul className="mt-3.5 space-y-2">
        {sample.notes.map(([label, text]) => (
          <li
            key={label}
            className="rounded-xl border border-[#efeaf7] bg-[#faf8fd] px-4 py-3 text-[16px] leading-snug text-c-ink"
          >
            <b className="text-c-brand-ink">{label}:</b> {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlashcardsPane({ sample }: { sample: Sample }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [q, a] = sample.cards[i];
  const go = (d: number) => {
    setFlipped(false);
    setI((n) => (n + d + sample.cards.length) % sample.cards.length);
  };
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-pressed={flipped}
        onClick={() => setFlipped((f) => !f)}
        data-flipped={flipped}
        className="c-flip relative block h-[220px] w-full max-w-[460px] cursor-pointer rounded-[20px] [perspective:1000px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-c-brand"
      >
        <span className="c-flip-in absolute inset-0 block">
          <span
            aria-hidden={flipped}
            className="c-face c-face-front absolute inset-0 flex items-center justify-center rounded-[20px] bg-c-ink p-6 text-center text-[21px] font-bold leading-snug text-white"
          >
            {q}
          </span>
          <span
            aria-hidden={!flipped}
            className="c-face c-face-back absolute inset-0 flex items-center justify-center rounded-[20px] bg-c-lime p-6 text-center text-[21px] font-bold leading-snug text-c-ink"
          >
            <span className="sr-only">Answer: </span>
            {a}
          </span>
        </span>
      </button>
      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          aria-label="Previous card"
          onClick={() => go(-1)}
          className="grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-[#e2dcee] text-[17px] font-bold text-c-ink hover:border-c-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-brand"
        >
          ←
        </button>
        <span
          className="text-[14px] font-semibold text-c-muted"
          aria-live="polite"
        >
          {i + 1} / {sample.cards.length} · tap to flip
        </span>
        <button
          type="button"
          aria-label="Next card"
          onClick={() => go(1)}
          className="grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-[#e2dcee] text-[17px] font-bold text-c-ink hover:border-c-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-brand"
        >
          →
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
      <h3 className="text-[22px] font-bold text-c-ink">{q}</h3>
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
              className={`min-h-12 rounded-[14px] border-2 px-4 py-3.5 text-left text-[16px] font-semibold text-c-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-brand ${
                right
                  ? "border-c-lime bg-c-lime"
                  : wrong
                    ? "border-[#ffc3c3] bg-c-wrong line-through"
                    : "border-[#ebe5f5] bg-white enabled:hover:border-c-brand"
              }`}
            >
              {opt}
              {right && <span className="sr-only"> (correct answer)</span>}
              {wrong && (
                <span className="sr-only"> (your answer, incorrect)</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex min-h-[72px] items-center gap-3">
        {locked && picked === answer && (
          <Image
            src="/mascot/quizliai_mascot_thumbs_up.webp"
            alt=""
            width={328}
            height={640}
            className="anim-pop h-auto w-[44px] shrink-0"
          />
        )}
        <p className="text-[15px] font-semibold text-c-ink" aria-live="polite">
          {locked &&
            (picked === answer
              ? "Nailed it. Imagine this on your own lecture notes."
              : "Not quite. That's why we quiz you before the test.")}
        </p>
      </div>
    </div>
  );
}
