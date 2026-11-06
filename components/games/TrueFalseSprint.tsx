"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { closeGame, hapticFeedback, postResult } from "@/lib/games/bridge";
import { initAudio, playMatch, playMiss, playTap } from "@/lib/games/sound";
import type { Flashcard, StudyDeck, TrueFalseResult } from "@/lib/games/types";

const ROUND_DURATION_MS = 60_000;
const WRONG_HOLD_MS = 1400;
const SLIDE_OUT_MS = 180;

export type StatementPrompt = {
  card: Flashcard;
  shownDefinition: string;
  isTrue: boolean;
};

export function createNextStatement(
  cards: readonly Flashcard[],
  previousCardId: string | null,
  rng: () => number = Math.random
): StatementPrompt {
  const candidates =
    cards.length > 1
      ? cards.filter((c) => c.id !== previousCardId)
      : [...cards];
  const cardIndex = Math.floor(rng() * candidates.length);
  const card = candidates[cardIndex] ?? cards[0]!;

  const isTrue = rng() < 0.5;
  if (isTrue) {
    return {
      card,
      shownDefinition: card.definition,
      isTrue: true,
    };
  }

  const otherCards = cards.filter((c) => c.id !== card.id);
  const distractorIndex = Math.floor(rng() * otherCards.length);
  const distractor = otherCards[distractorIndex] ?? card;

  return {
    card,
    shownDefinition: distractor.definition,
    isTrue: distractor.id === card.id,
  };
}

function useCountUp(target: number, active: boolean, durationMs = 600): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target === 0) {
      setValue(target);
      return;
    }

    let rafId = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * progress));
      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };
    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [target, active, durationMs]);

  return value;
}

export default function TrueFalseSprint({ deck }: { deck: StudyDeck }) {
  const isTooSmall = deck.cards.length < 4;

  const [phase, setPhase] = useState<"ready" | "playing" | "finished">("ready");
  const [statement, setStatement] = useState<StatementPrompt | null>(() =>
    isTooSmall ? null : createNextStatement(deck.cards, null)
  );
  const [statementKey, setStatementKey] = useState(0);
  const [remainingMs, setRemainingMs] = useState<number>(ROUND_DURATION_MS);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mascotVisible, setMascotVisible] = useState(true);

  const [wrongFeedbackCard, setWrongFeedbackCard] = useState<Flashcard | null>(
    null
  );
  const [lastChoice, setLastChoice] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(
    null
  );
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [totalStatements, setTotalStatements] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [perCardStats, setPerCardStats] = useState<
    Record<string, { shown: number; correct: number }>
  >({});
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [finishedAtMs, setFinishedAtMs] = useState<number | null>(null);

  const phaseRef = useRef(phase);
  const isPausedRef = useRef(isPaused);
  const soundEnabledRef = useRef(soundEnabled);
  const statementRef = useRef(statement);
  const lockedRef = useRef(false);
  const dragStartXRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  phaseRef.current = phase;
  isPausedRef.current = isPaused;
  soundEnabledRef.current = soundEnabled;
  statementRef.current = statement;

  // Clear pending feedback timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // 60-second countdown clock (continues running during 1.4s wrong answer display, freezes on pause)
  useEffect(() => {
    if (phase !== "playing" || isPaused) {
      return;
    }

    let lastTick = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.max(0, now - lastTick);
      lastTick = now;

      setRemainingMs((prev) => {
        const next = prev - dt;
        if (next <= 0) {
          if (feedbackTimerRef.current !== null) {
            window.clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = null;
          }
          lockedRef.current = false;
          setWrongFeedbackCard(null);
          setLastChoice(null);
          setSlideDirection(null);
          setFinishedAtMs(Date.now());
          setPhase("finished");
          return 0;
        }
        return next;
      });
    }, 50);

    return () => window.clearInterval(interval);
  }, [phase, isPaused]);

  const loadFollowingStatement = useCallback(
    (prevCardId: string | null) => {
      const next = createNextStatement(deck.cards, prevCardId);
      statementRef.current = next;
      setStatement(next);
      setStatementKey((prev) => prev + 1);
      setWrongFeedbackCard(null);
      setLastChoice(null);
      setSlideDirection(null);
      setDragOffsetX(0);
      lockedRef.current = false;
    },
    [deck.cards]
  );

  const submitAnswer = useCallback(
    (choiceIsTrue: boolean) => {
      if (
        phaseRef.current !== "playing" ||
        isPausedRef.current ||
        lockedRef.current ||
        !statementRef.current
      ) {
        return;
      }

      initAudio();
      lockedRef.current = true;
      setDragOffsetX(0);
      setIsDragging(false);
      setLastChoice(choiceIsTrue);

      const current = statementRef.current;
      const isCorrect = choiceIsTrue === current.isTrue;

      setTotalStatements((prev) => prev + 1);
      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setStreak((prev) => prev + 1);
      } else {
        setStreak(0);
      }
      setPerCardStats((prev) => {
        const existing = prev[current.card.id] ?? { shown: 0, correct: 0 };
        return {
          ...prev,
          [current.card.id]: {
            shown: existing.shown + 1,
            correct: existing.correct + (isCorrect ? 1 : 0),
          },
        };
      });

      if (isCorrect) {
        hapticFeedback("success");
        playMatch(soundEnabledRef.current);

        const reduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reduced) {
          loadFollowingStatement(current.card.id);
        } else {
          setSlideDirection(choiceIsTrue ? "right" : "left");
          feedbackTimerRef.current = window.setTimeout(() => {
            feedbackTimerRef.current = null;
            loadFollowingStatement(current.card.id);
          }, SLIDE_OUT_MS);
        }
      } else {
        hapticFeedback("warning");
        playMiss(soundEnabledRef.current);
        setWrongFeedbackCard(current.card);

        feedbackTimerRef.current = window.setTimeout(() => {
          feedbackTimerRef.current = null;
          loadFollowingStatement(current.card.id);
        }, WRONG_HOLD_MS);
      }
    },
    [loadFollowingStatement]
  );

  // Desktop keyboard controls: ArrowLeft/F -> False, ArrowRight/T -> True
  useEffect(() => {
    if (isTooSmall || phase !== "playing") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isPausedRef.current || lockedRef.current) return;
      if (e.key === "ArrowLeft" || e.key === "f" || e.key === "F") {
        e.preventDefault();
        submitAnswer(false);
      } else if (e.key === "ArrowRight" || e.key === "t" || e.key === "T") {
        e.preventDefault();
        submitAnswer(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isTooSmall, phase, submitAnswer]);

  const handleStartRound = () => {
    initAudio();
    hapticFeedback("light");
    playTap(soundEnabled);

    const first = createNextStatement(deck.cards, null);
    statementRef.current = first;
    lockedRef.current = false;

    setStatement(first);
    setStatementKey((prev) => prev + 1);
    setRemainingMs(ROUND_DURATION_MS);
    setIsPaused(false);
    setWrongFeedbackCard(null);
    setLastChoice(null);
    setStreak(0);
    setSlideDirection(null);
    setDragOffsetX(0);
    setTotalStatements(0);
    setCorrectCount(0);
    setPerCardStats({});
    setStartedAtMs(Date.now());
    setFinishedAtMs(null);
    setPhase("playing");
  };

  const isFinished = phase === "finished";
  const resultPayload: TrueFalseResult | null = isFinished
    ? (() => {
        const startMs = startedAtMs ?? Date.now() - ROUND_DURATION_MS;
        const endMs = finishedAtMs ?? Date.now();
        const durationMs = Math.max(0, endMs - startMs);
        const accuracy =
          totalStatements > 0
            ? Math.round((correctCount / totalStatements) * 100) / 100
            : 0;

        const perCard = deck.cards
          .map((card) => {
            const st = perCardStats[card.id];
            if (!st || st.shown === 0) return null;
            return {
              cardId: card.id,
              shown: st.shown,
              correct: st.correct,
            };
          })
          .filter(
            (
              item
            ): item is { cardId: string; shown: number; correct: number } =>
              item !== null
          );

        const reviewCardIds = perCard
          .filter((item) => item.shown > item.correct)
          .map((item) => item.cardId);

        return {
          gameId: "true_false",
          noteId: deck.noteId,
          profileId: deck.profileId,
          startedAt: new Date(startMs).toISOString(),
          finishedAt: new Date(endMs).toISOString(),
          durationMs,
          totalStatements,
          correct: correctCount,
          accuracy,
          perCard,
          reviewCardIds,
        };
      })()
    : null;

  const animatedStatements = useCountUp(
    resultPayload?.totalStatements ?? 0,
    isFinished
  );
  const animatedCorrect = useCountUp(resultPayload?.correct ?? 0, isFinished);
  const animatedAccuracyPct = useCountUp(
    Math.round((resultPayload?.accuracy ?? 0) * 100),
    isFinished
  );

  if (isTooSmall) {
    return (
      <main className="min-h-dvh bg-[var(--game-bg)] text-[var(--game-text)] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] px-4 py-6 flex flex-col justify-between">
        <div className="max-w-lg mx-auto w-full pt-12 text-center">
          <p className="text-[17px] font-semibold">
            Add at least 4 flashcards to play
          </p>
        </div>
        <div className="max-w-lg mx-auto w-full pb-4">
          <button
            type="button"
            onClick={closeGame}
            className="w-full h-12 rounded-full bg-[var(--game-accent)] text-[var(--game-on-accent)] text-[15px] font-semibold"
          >
            Done
          </button>
        </div>
      </main>
    );
  }

  if (isFinished && resultPayload) {
    const reviewCards = deck.cards.filter((c) =>
      resultPayload.reviewCardIds.includes(c.id)
    );
    const titleText =
      resultPayload.accuracy >= 0.8 ? "Nice work" : "Time's up";

    return (
      <main className="min-h-dvh bg-[var(--game-bg)] text-[var(--game-text)] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] px-4 py-6">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-6 game-anim-deal">
          {mascotVisible ? (
            <img
              src="/mascot/bear-happy.webp"
              alt=""
              onError={() => setMascotVisible(false)}
              className="h-24 w-auto object-contain self-start"
            />
          ) : null}

          <h1
            aria-live="polite"
            className="text-2xl font-semibold tracking-tight"
          >
            {titleText}
          </h1>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Statements
              </div>
              <div className="text-xl font-semibold tabular-nums mt-0.5">
                {animatedStatements}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Correct
              </div>
              <div className="text-xl font-semibold tabular-nums mt-0.5">
                {animatedCorrect}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Accuracy
              </div>
              <div className="text-xl font-semibold tabular-nums mt-0.5">
                {animatedAccuracyPct}%
              </div>
            </div>
          </div>

          {reviewCards.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-[17px] font-semibold">Worth another look</h2>
              <div className="flex flex-col gap-2.5">
                {reviewCards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3.5 flex flex-col gap-1"
                  >
                    <div className="text-[15px] font-semibold">{card.term}</div>
                    <div className="text-[15px] font-normal text-[var(--game-text-muted)]">
                      {card.definition}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleStartRound}
              className="h-14 rounded-full border border-[var(--game-accent)] bg-[var(--game-card)] text-[var(--game-accent)] text-[15px] font-semibold motion-safe:active:scale-[0.98]"
            >
              Play again
            </button>
            <button
              type="button"
              onClick={() => {
                initAudio();
                hapticFeedback("light");
                playTap(soundEnabled);
                postResult(resultPayload);
                closeGame();
              }}
              className="h-14 rounded-full bg-[var(--game-accent)] text-[var(--game-on-accent)] text-[15px] font-semibold motion-safe:active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      </main>
    );
  }

  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const isFinalTenSeconds = phase === "playing" && secondsLeft <= 10;
  const drainPct = Math.max(
    0,
    Math.min(100, (remainingMs / ROUND_DURATION_MS) * 100)
  );
  const wrongCount = Math.max(0, totalStatements - correctCount);

  const dragRotation = Math.max(-10, Math.min(10, dragOffsetX * 0.05));
  let cardTransform = `translateX(${dragOffsetX}px) rotate(${dragRotation}deg)`;
  if (slideDirection === "left") {
    cardTransform = "translateX(-120%) rotate(-8deg)";
  } else if (slideDirection === "right") {
    cardTransform = "translateX(120%) rotate(8deg)";
  }

  const isFalseShaking = wrongFeedbackCard !== null && lastChoice === false;
  const isTrueShaking = wrongFeedbackCard !== null && lastChoice === true;
  const isFalsePopping = slideDirection === "left" && lastChoice === false;
  const isTruePopping = slideDirection === "right" && lastChoice === true;

  return (
    <main className="h-dvh overflow-hidden bg-[var(--game-bg)] text-[var(--game-text)] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] px-4 py-3 flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-between gap-2.5">
        {/* Top bar + 4px draining timer bar + Live Right/Wrong Scoreboard */}
        <div className="flex flex-col gap-2">
          <header className="grid grid-cols-3 items-center gap-2 min-h-[34px]">
            <div className="truncate text-[14px] font-semibold">
              {deck.title}
            </div>
            <div
              className={`text-center text-[15px] font-semibold tabular-nums ${
                isFinalTenSeconds
                  ? "text-[var(--game-accent)] game-anim-pop"
                  : "text-[var(--game-text)]"
              }`}
            >
              {secondsLeft}s
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
                aria-pressed={soundEnabled}
                onClick={() => {
                  initAudio();
                  setSoundEnabled((prev) => !prev);
                }}
                className="min-h-[32px] px-2.5 rounded-full border border-[var(--game-border)] bg-[var(--game-card)] text-[var(--game-text)] text-[12px] font-semibold"
              >
                {soundEnabled ? "Sound" : "Muted"}
              </button>
              {phase === "playing" ? (
                <button
                  type="button"
                  aria-pressed={isPaused}
                  onClick={() => {
                    initAudio();
                    hapticFeedback("light");
                    playTap(soundEnabled);
                    setIsPaused((prev) => !prev);
                  }}
                  className="min-h-[32px] px-2.5 rounded-full border border-[var(--game-border)] bg-[var(--game-card)] text-[var(--game-text)] text-[12px] font-semibold"
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
              ) : null}
            </div>
          </header>

          <div
            role="progressbar"
            aria-valuenow={Math.round(drainPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1 w-full rounded-full bg-[var(--game-border)] overflow-hidden"
          >
            <div
              style={{ width: `${drainPct}%` }}
              className="h-full bg-[var(--game-accent)] motion-safe:transition-[width] motion-safe:duration-100"
            />
          </div>

          {/* Live Right / Wrong / Streak Counter Row */}
          <div
            aria-live="polite"
            className="flex items-center justify-between gap-2 text-[12px] pt-0.5"
          >
            <div className="flex items-center gap-2">
              <div
                key={`right-${correctCount}`}
                data-testid="counter-right"
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--game-card)] border tabular-nums font-semibold ${
                  correctCount > 0
                    ? "border-[var(--game-accent)] text-[var(--game-accent)] game-anim-bump"
                    : "border-[var(--game-border)] text-[var(--game-text)]"
                }`}
              >
                <span aria-hidden="true">✓</span>
                <span>Right</span>
                <span>{correctCount}</span>
              </div>

              <div
                key={`wrong-${wrongCount}`}
                data-testid="counter-wrong"
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--game-card)] border tabular-nums font-semibold ${
                  wrongCount > 0
                    ? "border-[var(--game-miss)] text-[var(--game-text)] game-anim-shake"
                    : "border-[var(--game-border)] text-[var(--game-text-muted)]"
                }`}
              >
                <span aria-hidden="true">✗</span>
                <span>Wrong</span>
                <span>{wrongCount}</span>
              </div>
            </div>

            <div className="flex items-center justify-end min-h-[24px]">
              {wrongFeedbackCard ? (
                <span
                  key={`miss-badge-${wrongCount}`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--game-card)] border border-[var(--game-miss)] text-[var(--game-text-muted)] font-semibold game-anim-shake"
                >
                  ✗ Missed
                </span>
              ) : streak >= 2 ? (
                <span
                  key={`streak-${streak}`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--game-accent)] text-[var(--game-on-accent)] font-semibold game-anim-pop"
                >
                  ✓ Streak ×{streak}
                </span>
              ) : (
                <span className="text-[var(--game-text-muted)] tabular-nums">
                  {phase === "playing" ? `Card ${statementKey}` : "60s sprint"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center stage: Ready prompt, Paused cover, or Active Statement Card with Stacked Deck */}
        <div className="flex-1 flex items-center justify-center py-2">
          {phase === "ready" ? (
            <div className="w-full rounded-3xl bg-[var(--game-card)] border border-[var(--game-border)] p-6 flex flex-col items-center text-center gap-5 game-anim-deal">
              <h1 className="text-xl font-semibold">Is it true or false?</h1>
              <button
                type="button"
                onClick={handleStartRound}
                className="w-full h-14 rounded-full bg-[var(--game-accent)] text-[var(--game-on-accent)] text-[16px] font-semibold motion-safe:active:scale-[0.98]"
              >
                Start
              </button>
            </div>
          ) : isPaused ? (
            <div className="w-full rounded-3xl bg-[var(--game-card)] border border-[var(--game-border)] p-6 text-center game-anim-deal">
              <p className="text-[17px] font-semibold text-[var(--game-text-muted)]">
                Paused
              </p>
            </div>
          ) : statement ? (
            <div className="relative w-full">
              {/* Background stacked cards for depth */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 translate-y-2.5 scale-[0.94] rounded-3xl bg-[var(--game-card)] border border-[var(--game-border)] opacity-60"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 translate-y-1.5 scale-[0.97] rounded-3xl bg-[var(--game-card)] border border-[var(--game-border)] opacity-80"
              />

              <div
                key={`stmt-${statementKey}`}
                onTouchStart={(e) => {
                  if (lockedRef.current) return;
                  const touch = e.touches[0];
                  if (touch) {
                    dragStartXRef.current = touch.clientX;
                    setIsDragging(true);
                  }
                }}
                onTouchMove={(e) => {
                  if (lockedRef.current || dragStartXRef.current === null)
                    return;
                  const touch = e.touches[0];
                  if (touch) {
                    setDragOffsetX(touch.clientX - dragStartXRef.current);
                  }
                }}
                onTouchEnd={() => {
                  if (lockedRef.current || dragStartXRef.current === null)
                    return;
                  const deltaX = dragOffsetX;
                  dragStartXRef.current = null;
                  setIsDragging(false);

                  if (deltaX <= -40) {
                    submitAnswer(false);
                  } else if (deltaX >= 40) {
                    submitAnswer(true);
                  } else {
                    setDragOffsetX(0);
                  }
                }}
                style={{
                  transform: wrongFeedbackCard ? undefined : cardTransform,
                }}
                className={`relative w-full rounded-3xl bg-[var(--game-card)] p-6 flex flex-col gap-3.5 select-none touch-pan-y ${
                  wrongFeedbackCard
                    ? "border-2 border-[var(--game-miss)] bg-[color-mix(in_srgb,var(--game-miss)_12%,var(--game-card))] game-anim-shake"
                    : slideDirection
                      ? "border-2 border-[var(--game-accent)]"
                      : "border border-[var(--game-border)] game-anim-deal"
                } ${
                  isDragging
                    ? ""
                    : "motion-safe:transition-[transform,opacity] motion-safe:duration-180"
                } ${slideDirection ? "motion-safe:opacity-0" : "opacity-100"}`}
              >
                {/* Live Drag, Answer Stamp, or Wrong Badge */}
                {wrongFeedbackCard ? (
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[var(--game-miss)] text-[var(--game-text-muted)] text-[11px] font-bold uppercase tracking-wider">
                      ✗ Not quite
                    </span>
                  </div>
                ) : Math.abs(dragOffsetX) >= 18 || slideDirection ? (
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        dragOffsetX > 0 || slideDirection === "right"
                          ? "bg-[var(--game-accent)] text-[var(--game-on-accent)]"
                          : "border border-[var(--game-accent)] text-[var(--game-accent)]"
                      }`}
                    >
                      {dragOffsetX > 0 || slideDirection === "right"
                        ? "True →"
                        : "← False"}
                    </span>
                  </div>
                ) : null}

                <div className="text-[19px] font-semibold leading-snug break-words">
                  {statement.card.term}
                </div>
                <div className="text-[17px] font-normal leading-relaxed break-words">
                  {statement.shownDefinition}
                </div>

                {wrongFeedbackCard ? (
                  <div
                    aria-live="assertive"
                    className="pt-2.5 border-t border-[var(--game-border)] text-[14px] leading-snug text-[var(--game-text-muted)]"
                  >
                    Correct: {wrongFeedbackCard.definition}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom action buttons: False on the left, True on the right */}
        <div className="grid grid-cols-2 gap-3 pb-1">
          <button
            type="button"
            disabled={
              phase !== "playing" || isPaused || wrongFeedbackCard !== null
            }
            onClick={() => submitAnswer(false)}
            className={`h-14 rounded-full border border-[var(--game-accent)] bg-[var(--game-card)] text-[var(--game-accent)] text-[16px] font-semibold disabled:opacity-50 motion-safe:transition-transform motion-safe:active:scale-[0.96] ${
              isFalseShaking
                ? "game-anim-shake border-2 border-[var(--game-miss)] text-[var(--game-text)]"
                : isFalsePopping
                  ? "game-anim-pop"
                  : ""
            }`}
          >
            False
          </button>
          <button
            type="button"
            disabled={
              phase !== "playing" || isPaused || wrongFeedbackCard !== null
            }
            onClick={() => submitAnswer(true)}
            className={`h-14 rounded-full bg-[var(--game-accent)] text-[var(--game-on-accent)] text-[16px] font-semibold disabled:opacity-50 motion-safe:transition-transform motion-safe:active:scale-[0.96] ${
              isTrueShaking
                ? "game-anim-shake border-2 border-[var(--game-miss)]"
                : isTruePopping
                  ? "game-anim-pop"
                  : ""
            }`}
          >
            True
          </button>
        </div>
      </div>
    </main>
  );
}
