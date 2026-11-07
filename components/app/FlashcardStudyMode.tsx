"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Check, CircleCheck, RotateCcw, Undo2 } from "lucide-react";
import { StudySurface, StudyProgress, type Shortcut } from "@/components/app/study/StudySurface";

interface Flashcard {
  question: string;
  answer: string;
}

type Mark = "got" | "review";

interface FlashcardStudyModeProps {
  flashcards: Flashcard[];
  onClose: () => void;
  /** Card to open on (Home's Continue passes the saved position). Clamped to the deck. */
  startIndex?: number;
  /** Called whenever the visible card changes, so the caller can save the position. */
  onIndexChange?: (index: number) => void;
  /** Note name shown under the title. */
  deckTitle?: string;
  /** End-of-deck primary action. Omit when the note has no quiz. */
  onQuiz?: () => void;
}

const ICON = { strokeWidth: 1.75, "aria-hidden": true } as const;

const SHORTCUTS: Shortcut[] = [
  { keys: ["Space"], action: "Flip the card" },
  { keys: ["←"], action: "Previous card" },
  { keys: ["→"], action: "Next card" },
  { keys: ["Esc"], action: "Back to the note" },
  { keys: ["?"], action: "Show these shortcuts" },
];

/**
 * Flashcards study mode, ported from the iOS design lock (2026-11-04): paper card on the study
 * surface, "Review again" and "Got it" after the flip, session-only marks, undo, end-of-deck screen.
 * Every swipe has a button (W-5.7). Marks never leave this component.
 */
export function FlashcardStudyMode({
  flashcards, onClose, startIndex = 0, onIndexChange, deckTitle, onQuiz,
}: FlashcardStudyModeProps) {
  const total = flashcards.length;
  const [index, setIndex] = useState(() => Math.min(Math.max(0, startIndex), Math.max(0, total - 1)));
  const [flipped, setFlipped] = useState(false);
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [history, setHistory] = useState<{ index: number; prev?: Mark }[]>([]);
  const [done, setDone] = useState(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const cardRef = useRef<HTMLButtonElement>(null);
  const gotItRef = useRef<HTMLButtonElement>(null);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const focusGotIt = useRef(false);

  // Show answer unmounts itself; focus moves to Got it once it exists (W-5.4).
  useEffect(() => {
    if (flipped && focusGotIt.current) {
      focusGotIt.current = false;
      gotItRef.current?.focus({ preventScroll: true });
    }
  }, [flipped]);

  useEffect(() => {
    onIndexChange?.(index);
    // onIndexChange is a fresh closure each render; saving on index change is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Focus starts on the card so Space works at once (W-5.6).
  useEffect(() => {
    // On open there was no keyboard step yet, so skip the ring; later moves follow the browser's heuristic.
    if (!done) cardRef.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    else doneHeadingRef.current?.focus({ preventScroll: true });
  }, [done]);

  if (total === 0) return null;

  const card = flashcards[index];
  const gotCount = Object.values(marks).filter((m) => m === "got").length;
  const reviewCount = Object.values(marks).filter((m) => m === "review").length;
  const remaining = total - index - 1;

  const goTo = (next: number) => {
    if (next < 0 || next >= total || next === index) return;
    setFlipped(false);
    setDx(0);
    setIndex(next);
  };

  const mark = (m: Mark) => {
    setHistory((h) => [...h, { index, prev: marks[index] }]);
    setMarks((all) => ({ ...all, [index]: m }));
    setDx(0);
    if (index >= total - 1) {
      setDone(true);
      // A finished deck starts over next time Continue opens it.
      onIndexChange?.(0);
      return;
    }
    setFlipped(false);
    setIndex(index + 1);
    cardRef.current?.focus({ preventScroll: true });
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setMarks((all) => {
      const nextMarks = { ...all };
      if (last.prev) nextMarks[last.index] = last.prev;
      else delete nextMarks[last.index];
      return nextMarks;
    });
    setDone(false);
    setFlipped(false);
    setDx(0);
    setIndex(last.index);
    cardRef.current?.focus({ preventScroll: true });
  };

  const restart = () => {
    setMarks({});
    setHistory([]);
    setFlipped(false);
    setDx(0);
    setIndex(0);
    setDone(false);
  };

  const showAnswer = () => {
    focusGotIt.current = true;
    setFlipped(true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (done) return;
    const target = e.target as HTMLElement;
    // On the card, Space is the button's own click (onCardClick). On any other control, Space keeps its meaning.
    const onControl = !!target.closest("button, a, input, textarea, select");
    if (e.key === " " && !onControl) {
      e.preventDefault();
      setFlipped((f) => !f);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  // Swipe: right = Got it, left = Review again, from either side (design lock). Buttons do the same.
  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const mx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(mx) < 8 || Math.abs(mx) < Math.abs(e.clientY - d.y)) return;
      d.moved = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDx(mx);
  };
  const endDrag = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    suppressClick.current = true;
    setDragging(false);
    const width = e.currentTarget.getBoundingClientRect().width;
    const mx = e.clientX - d.x;
    if (Math.abs(mx) > Math.min(120, width * 0.25)) mark(mx > 0 ? "got" : "review");
    else setDx(0);
  };
  const onCardClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setFlipped((f) => !f);
  };

  const stamp = dx > 24 ? "got" : dx < -24 ? "review" : null;
  const stampOpacity = Math.min(1, Math.abs(dx) / 120);
  const cardTransform = dx === 0 ? undefined : reduceMotion ? `translateX(${dx}px)` : `translateX(${dx}px) rotate(${dx / 24}deg)`;

  if (done) {
    return (
      <StudySurface
        title="Flashcards"
        subtitle={deckTitle}
        backLabel="Back to the note"
        onBack={onClose}
        shortcuts={SHORTCUTS}
        onKeyDown={onKeyDown}
        footer={
          <div className="flex flex-col items-center gap-2">
            {onQuiz ? (
              <>
                <button type="button" onClick={onQuiz} className="btn-primary min-h-12 w-full">Quiz me on this note</button>
                <button type="button" onClick={restart} className="inline-flex min-h-11 items-center px-3 text-subheadline font-semibold text-rust-on-tint hover:underline">
                  Go through the cards again
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={restart} className="btn-primary min-h-12 w-full">Go through the cards again</button>
                <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center px-3 text-subheadline font-semibold text-rust-on-tint hover:underline">
                  Back to the note
                </button>
              </>
            )}
          </div>
        }
      >
        <div className="mx-auto flex w-full max-w-[45rem] flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot/quizliai_mascot_celebrate.webp" alt="" width={160} height={160} className="size-36 object-contain sm:size-40" />
          <h2 ref={doneHeadingRef} tabIndex={-1} className="font-serif text-title font-semibold lg:text-large-title">
            You went through all {total} cards
          </h2>
          <div className="grid w-full max-w-[24rem] grid-cols-2 gap-3">
            <div className="ds-card flex flex-col items-center gap-1 p-4">
              <CircleCheck {...ICON} className="size-6 text-success" />
              <p className="tabular text-title2 font-semibold">{gotCount}</p>
              <p className="text-subheadline text-supporting">Got it</p>
            </div>
            <div className="ds-card flex flex-col items-center gap-1 p-4">
              <RotateCcw {...ICON} className="size-6 text-warning" />
              <p className="tabular text-title2 font-semibold">{reviewCount}</p>
              <p className="text-subheadline text-supporting">Review again</p>
            </div>
          </div>
          <button
            type="button"
            onClick={undo}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-subheadline text-supporting hover:bg-hover-fill hover:text-label"
          >
            <Undo2 {...ICON} className="size-4" /> Undo the last card
          </button>
        </div>
      </StudySurface>
    );
  }

  return (
    <StudySurface
      title="Flashcards"
      subtitle={deckTitle}
      backLabel="Back to the note"
      onBack={onClose}
      shortcuts={SHORTCUTS}
      onKeyDown={onKeyDown}
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            aria-label="Undo"
            className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-full border border-divider bg-card text-label hover:border-input disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Undo2 {...ICON} className="size-5" />
          </button>
          {flipped ? (
            <>
              <button type="button" onClick={() => mark("review")} className="btn-secondary min-h-12 flex-1 px-3">
                <RotateCcw {...ICON} className="size-5 shrink-0 text-warning" />
                Review again
              </button>
              <button ref={gotItRef} type="button" onClick={() => mark("got")} className="btn-primary min-h-12 flex-1 px-3">
                <Check {...ICON} className="size-5 shrink-0" />
                Got it
              </button>
            </>
          ) : (
            <button type="button" onClick={showAnswer} className="btn-primary min-h-12 flex-1">
              Show answer
            </button>
          )}
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-[45rem] flex-1 flex-col gap-4 px-4 pt-4 pb-6 sm:pt-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-subheadline">
            <p className="tabular font-semibold">Card {index + 1} of {total}</p>
            <p className="tabular flex items-center gap-3 text-supporting">
              <span className="flex items-center gap-1">
                <CircleCheck {...ICON} className="size-4 text-success" />
                {gotCount}<span className="sr-only"> got it</span>
              </span>
              <span className="flex items-center gap-1">
                <RotateCcw {...ICON} className="size-4 text-warning" />
                {reviewCount}<span className="sr-only"> to review again</span>
              </span>
            </p>
          </div>
          <StudyProgress value={index + 1} total={total} />
        </div>

        {/* Deck stack: two paper cards peek below; the stack thins near the end of the deck. */}
        <div className="flex flex-1 items-center">
        <div className="relative mx-auto mt-2 mb-4 h-[clamp(17rem,52dvh,26rem)] w-full max-w-[36rem] sm:mt-4">
          {remaining >= 2 && (
            <div aria-hidden="true" className="absolute inset-x-6 top-6 -bottom-4 rounded-[1.375rem] bg-paper-back-2 opacity-50 shadow-[0_1px_2px_rgb(0_0_0/0.05)]" />
          )}
          {remaining >= 1 && (
            <div aria-hidden="true" className="absolute inset-x-3 top-3 -bottom-2 rounded-[1.375rem] bg-paper-back-1 opacity-75 shadow-[0_1px_2px_rgb(0_0_0/0.05)]" />
          )}

          <button
            ref={cardRef}
            type="button"
            aria-describedby="flash-hint"
            onClick={onCardClick}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{ transform: cardTransform, touchAction: "pan-y" }}
            className={`relative block h-full w-full select-none rounded-[1.375rem] text-left [perspective:1200px] ${
              dragging ? "" : "transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
            }`}
          >
            <span key={index} data-flipped={flipped} className="study-flip grid h-full">
              <span
                aria-hidden={flipped}
                className="study-face study-face-front col-start-1 row-start-1 flex min-h-0 flex-col gap-3 rounded-[1.375rem] bg-paper p-6 text-on-paper shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_rgb(0_0_0/0.1)] sm:p-8"
              >
                <span className="text-footnote font-semibold text-on-paper-supporting">Question</span>
                <span className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-2 text-center font-serif text-title2 font-bold sm:text-title">
                  {card.question}
                </span>
              </span>
              <span
                aria-hidden={!flipped}
                className="study-face study-face-back col-start-1 row-start-1 flex min-h-0 flex-col gap-3 rounded-[1.375rem] bg-paper p-6 text-on-paper shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_rgb(0_0_0/0.1)] sm:p-8"
              >
                <span className="text-footnote font-semibold text-on-paper-supporting">Answer</span>
                <span className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-2 text-center font-serif text-title3 font-semibold sm:text-title2">
                  {card.answer}
                </span>
              </span>
            </span>

            {stamp && (
              <span
                aria-hidden="true"
                style={{ opacity: stampOpacity }}
                className={`absolute top-5 flex items-center gap-1.5 rounded-xl border-2 bg-paper px-3 py-1 text-title3 font-bold ${
                  stamp === "got" ? "left-5 border-success-on-paper text-success-on-paper" : "right-5 border-warning-on-paper text-warning-on-paper"
                }`}
              >
                {stamp === "got" ? <Check {...ICON} className="size-5" /> : <RotateCcw {...ICON} className="size-5" />}
                {stamp === "got" ? "Got it" : "Review again"}
              </span>
            )}
          </button>
        </div>
        </div>

        <p id="flash-hint" className="text-center text-subheadline text-supporting">
          {flipped
            ? "Or swipe: right for Got it, left for Review again. Tap or click the card to see the question."
            : "Tap or click the card to flip it."}
        </p>
        <p className="sr-only" aria-live="polite">
          {flipped ? `Answer: ${card.answer}` : `Card ${index + 1} of ${total}. ${card.question}`}
        </p>
      </div>
    </StudySurface>
  );
}
