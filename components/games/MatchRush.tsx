"use client";

import React, { useEffect, useReducer, useRef, useState } from "react";
import { closeGame, hapticFeedback, postResult } from "@/lib/games/bridge";
import { initAudio, playMatch, playMiss, playTap } from "@/lib/games/sound";
import type { Flashcard, MatchRushResult, StudyDeck } from "@/lib/games/types";

export type RoundBoard = {
  cards: Flashcard[];
  terms: Flashcard[];
  definitions: Flashcard[];
};

export type Selection = {
  side: "term" | "definition";
  cardId: string;
};

export type MismatchedPair = {
  termId: string;
  definitionId: string;
};

export type MatchRushState = {
  deck: StudyDeck;
  status: "empty" | "playing" | "finished";
  rounds: RoundBoard[];
  roundIndex: number;
  selected: Selection | null;
  clearedIds: string[];
  mismatchedPair: MismatchedPair | null;
  misses: number;
  cardMisses: Record<string, number>;
  startedAt: number | null;
  finishedAt: number | null;
  elapsedMs: number;
  roundNoticeVisible: boolean;
};

export type MatchRushAction =
  | { type: "start"; now: number }
  | { type: "select"; side: "term" | "definition"; cardId: string; now: number }
  | { type: "resolve" }
  | { type: "nextRound" }
  | { type: "reset"; deck: StudyDeck }
  | { type: "finish"; now: number };

export function shuffleArray<T>(
  items: readonly T[],
  rng: () => number = Math.random
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = temp;
  }
  return copy;
}

export function createRoundBoard(
  cards: Flashcard[],
  rng: () => number = Math.random
): RoundBoard {
  const terms = shuffleArray(cards, rng);
  let definitions = shuffleArray(cards, rng);

  if (
    cards.length > 1 &&
    terms.every((card, index) => card.id === definitions[index]?.id)
  ) {
    const first = definitions[0]!;
    definitions = [...definitions.slice(1), first];
  }

  return {
    cards,
    terms,
    definitions,
  };
}

export function buildRounds(
  cards: readonly Flashcard[],
  rng: () => number = Math.random
): RoundBoard[] {
  if (cards.length < 4) {
    return [];
  }

  const shuffled = shuffleArray(cards, rng);
  const rounds: RoundBoard[] = [];
  let offset = 0;

  while (rounds.length < 3 && shuffled.length - offset >= 4) {
    const count = Math.min(6, shuffled.length - offset);
    const slice = shuffled.slice(offset, offset + count);
    rounds.push(createRoundBoard(slice, rng));
    offset += count;
  }

  return rounds;
}

export function truncateDefinition(text: string): string {
  if (text.length <= 90) {
    return text;
  }
  return `${text.slice(0, 90).trimEnd()}…`;
}

export function formatTimer(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function buildMatchRushResult(state: MatchRushState): MatchRushResult {
  const usedCards = state.rounds.flatMap((round) => round.cards);
  const totalPairs = usedCards.length;
  const misses = state.misses;
  const startedAtMs = state.startedAt ?? Date.now();
  const finishedAtMs =
    state.finishedAt ?? Math.max(startedAtMs, startedAtMs + state.elapsedMs);
  const durationMs = Math.max(0, finishedAtMs - startedAtMs);
  const denominator = totalPairs + misses;
  const accuracy =
    denominator > 0 ? Math.round((totalPairs / denominator) * 100) / 100 : 1;

  const perCard = usedCards.map((card) => {
    const cardMissCount = state.cardMisses[card.id] ?? 0;
    return {
      cardId: card.id,
      misses: cardMissCount,
      matchedCleanly: cardMissCount === 0,
    };
  });

  const reviewCardIds = perCard
    .filter((item) => item.misses >= 2)
    .map((item) => item.cardId);

  return {
    gameId: "match_rush",
    noteId: state.deck.noteId,
    profileId: state.deck.profileId,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs,
    totalPairs,
    misses,
    accuracy,
    perCard,
    reviewCardIds,
  };
}

export function createInitialState(
  deck: StudyDeck,
  rng: () => number = Math.random
): MatchRushState {
  if (deck.cards.length < 4) {
    return {
      deck,
      status: "empty",
      rounds: [],
      roundIndex: 0,
      selected: null,
      clearedIds: [],
      mismatchedPair: null,
      misses: 0,
      cardMisses: {},
      startedAt: null,
      finishedAt: null,
      elapsedMs: 0,
      roundNoticeVisible: false,
    };
  }

  const rounds = buildRounds(deck.cards, rng);
  const initialMisses: Record<string, number> = {};
  for (const round of rounds) {
    for (const card of round.cards) {
      initialMisses[card.id] = 0;
    }
  }

  return {
    deck,
    status: "playing",
    rounds,
    roundIndex: 0,
    selected: null,
    clearedIds: [],
    mismatchedPair: null,
    misses: 0,
    cardMisses: initialMisses,
    startedAt: null,
    finishedAt: null,
    elapsedMs: 0,
    roundNoticeVisible: false,
  };
}

export function matchRushReducer(
  state: MatchRushState,
  action: MatchRushAction
): MatchRushState {
  switch (action.type) {
    case "start": {
      if (state.status !== "playing") return state;
      if (state.startedAt === null) {
        return {
          ...state,
          startedAt: action.now,
          elapsedMs: 0,
        };
      }
      return {
        ...state,
        elapsedMs: Math.max(0, action.now - state.startedAt),
      };
    }

    case "select": {
      if (state.status !== "playing") return state;
      if (state.mismatchedPair !== null) return state;
      if (state.clearedIds.includes(action.cardId)) return state;

      const startedAt = state.startedAt ?? action.now;
      const elapsedMs = Math.max(0, action.now - startedAt);

      if (state.selected === null || state.selected.side === action.side) {
        return {
          ...state,
          startedAt,
          elapsedMs,
          selected: {
            side: action.side,
            cardId: action.cardId,
          },
        };
      }

      const termId =
        action.side === "term" ? action.cardId : state.selected.cardId;
      const definitionId =
        action.side === "definition" ? action.cardId : state.selected.cardId;

      if (termId === definitionId) {
        return {
          ...state,
          startedAt,
          elapsedMs,
          selected: null,
          clearedIds: [...state.clearedIds, termId],
        };
      }

      return {
        ...state,
        startedAt,
        elapsedMs,
        selected: null,
        mismatchedPair: { termId, definitionId },
        misses: state.misses + 1,
        cardMisses: {
          ...state.cardMisses,
          [termId]: (state.cardMisses[termId] ?? 0) + 1,
          [definitionId]: (state.cardMisses[definitionId] ?? 0) + 1,
        },
      };
    }

    case "resolve": {
      if (state.mismatchedPair === null && !state.roundNoticeVisible) {
        return state;
      }
      return {
        ...state,
        mismatchedPair: null,
        roundNoticeVisible: false,
      };
    }

    case "nextRound": {
      if (state.status !== "playing") return state;
      const nextIndex = state.roundIndex + 1;
      if (nextIndex >= state.rounds.length) {
        return state;
      }
      return {
        ...state,
        roundIndex: nextIndex,
        selected: null,
        clearedIds: [],
        mismatchedPair: null,
        roundNoticeVisible: true,
      };
    }

    case "finish": {
      if (state.status !== "playing") return state;
      const startedAt = state.startedAt ?? action.now;
      const finishedAt = Math.max(startedAt, action.now);
      return {
        ...state,
        status: "finished",
        startedAt,
        finishedAt,
        elapsedMs: Math.max(0, finishedAt - startedAt),
        selected: null,
        mismatchedPair: null,
        roundNoticeVisible: false,
      };
    }

    case "reset": {
      return createInitialState(action.deck);
    }

    default:
      return state;
  }
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

export default function MatchRush({ deck }: { deck: StudyDeck }) {
  const [state, dispatch] = useReducer(
    matchRushReducer,
    deck,
    createInitialState
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mascotVisible, setMascotVisible] = useState(true);
  const [justMatchedId, setJustMatchedId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [feedbackBanner, setFeedbackBanner] = useState<
    "match" | "miss" | null
  >(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (state.status !== "playing" || state.startedAt === null) {
      return;
    }
    const interval = window.setInterval(() => {
      dispatch({ type: "start", now: Date.now() });
    }, 250);
    return () => window.clearInterval(interval);
  }, [state.status, state.startedAt]);

  useEffect(() => {
    if (state.mismatchedPair === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: "resolve" });
      setFeedbackBanner(null);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [state.mismatchedPair]);

  useEffect(() => {
    if (!justMatchedId) {
      return;
    }
    const timer = window.setTimeout(() => {
      setJustMatchedId(null);
      setFeedbackBanner((prev) => (prev === "match" ? null : prev));
    }, 240);
    return () => window.clearTimeout(timer);
  }, [justMatchedId]);

  useEffect(() => {
    if (!state.roundNoticeVisible) {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: "resolve" });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [state.roundNoticeVisible, state.roundIndex]);

  const currentRound = state.rounds[state.roundIndex];
  useEffect(() => {
    if (state.status !== "playing" || !currentRound) {
      return;
    }
    if (
      currentRound.cards.length > 0 &&
      state.clearedIds.length === currentRound.cards.length
    ) {
      const delay = justMatchedId ? 220 : 0;
      const timer = window.setTimeout(() => {
        if (state.roundIndex + 1 < state.rounds.length) {
          dispatch({ type: "nextRound" });
        } else {
          dispatch({ type: "finish", now: Date.now() });
        }
      }, delay);
      return () => window.clearTimeout(timer);
    }
  }, [
    state.status,
    state.clearedIds.length,
    state.roundIndex,
    state.rounds.length,
    currentRound,
    justMatchedId,
  ]);

  const handleTileTap = (side: "term" | "definition", cardId: string) => {
    if (
      state.status !== "playing" ||
      state.mismatchedPair !== null ||
      state.clearedIds.includes(cardId)
    ) {
      return;
    }

    initAudio();
    const now = Date.now();
    if (state.startedAt === null) {
      dispatch({ type: "start", now });
    }

    if (state.selected === null || state.selected.side === side) {
      hapticFeedback("light");
      playTap(soundEnabled);
    } else if (state.selected.cardId === cardId) {
      hapticFeedback("success");
      playMatch(soundEnabled);
      setJustMatchedId(cardId);
      setStreak((prev) => prev + 1);
      setFeedbackBanner("match");
    } else {
      hapticFeedback("warning");
      playMiss(soundEnabled);
      setStreak(0);
      setFeedbackBanner("miss");
    }

    dispatch({ type: "select", side, cardId, now });
  };

  const isFinished = state.status === "finished";
  const finishedResult = isFinished ? buildMatchRushResult(state) : null;
  const animatedPairs = useCountUp(
    finishedResult?.totalPairs ?? 0,
    isFinished
  );
  const animatedMisses = useCountUp(finishedResult?.misses ?? 0, isFinished);
  const animatedDurationMs = useCountUp(
    finishedResult?.durationMs ?? 0,
    isFinished
  );

  if (state.status === "empty") {
    return (
      <main className="min-h-dvh bg-[var(--game-bg)] text-[var(--game-text)] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] px-4 py-6 flex flex-col justify-between">
        <div className="max-w-lg mx-auto w-full pt-12 text-center">
          <h1 className="text-[17px] font-semibold">
            Add at least 4 flashcards to play
          </h1>
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

  if (state.status === "finished" && finishedResult) {
    const allUsedCards = state.rounds.flatMap((round) => round.cards);
    const reviewCards = allUsedCards.filter((card) =>
      finishedResult.reviewCardIds.includes(card.id)
    );
    const headingText =
      finishedResult.accuracy >= 0.8 ? "Nice work" : "All matched";

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
            {headingText}
          </h1>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Pairs
              </div>
              <div className="text-xl font-semibold tabular-nums mt-0.5">
                {animatedPairs}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Misses
              </div>
              <div className="text-xl font-semibold tabular-nums mt-0.5">
                {animatedMisses}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Time
              </div>
              <div className="text-xl font-semibold tabular-nums mt-0.5">
                {formatTimer(animatedDurationMs)}
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
              onClick={() => {
                initAudio();
                hapticFeedback("light");
                playTap(soundEnabled);
                setStreak(0);
                setJustMatchedId(null);
                setFeedbackBanner(null);
                dispatch({ type: "reset", deck });
              }}
              className="h-12 rounded-full border border-[var(--game-accent)] bg-[var(--game-card)] text-[var(--game-accent)] text-[15px] font-semibold motion-safe:active:scale-[0.98]"
            >
              Play again
            </button>
            <button
              type="button"
              onClick={() => {
                initAudio();
                hapticFeedback("light");
                playTap(soundEnabled);
                postResult(finishedResult);
                closeGame();
              }}
              className="h-12 rounded-full bg-[var(--game-accent)] text-[var(--game-on-accent)] text-[15px] font-semibold motion-safe:active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      </main>
    );
  }

  const totalRounds = state.rounds.length;
  const roundLabel = `Round ${state.roundIndex + 1} of ${totalRounds}`;
  const totalPairsCount = state.rounds.reduce(
    (sum, r) => sum + r.cards.length,
    0
  );
  const completedInPrevRounds = state.rounds
    .slice(0, state.roundIndex)
    .reduce((sum, r) => sum + r.cards.length, 0);
  const matchedSoFar = completedInPrevRounds + state.clearedIds.length;
  const progressPct =
    totalPairsCount > 0
      ? Math.round((matchedSoFar / totalPairsCount) * 100)
      : 0;

  return (
    <main className="min-h-dvh bg-[var(--game-bg)] text-[var(--game-text)] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] px-3.5 py-2">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-2">
        <header className="grid grid-cols-3 items-center gap-2 min-h-[32px]">
          <h1 className="truncate text-[14px] font-semibold">
            <span className="sr-only">Match Rush: </span>{state.deck.title}
          </h1>
          <div
            data-round-banner={state.roundNoticeVisible ? "true" : "false"}
            className={`text-center text-[13px] whitespace-nowrap ${
              state.roundNoticeVisible
                ? "font-semibold text-[var(--game-accent)] game-anim-pop"
                : "text-[var(--game-text-muted)]"
            }`}
          >
            {roundLabel}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
              aria-pressed={soundEnabled}
              onClick={() => {
                initAudio();
                setSoundEnabled((prev) => !prev);
              }}
              className="min-h-[30px] px-2.5 rounded-full border border-[var(--game-border)] bg-[var(--game-card)] text-[var(--game-text)] text-[12px] font-semibold"
            >
              {soundEnabled ? "Sound On" : "Muted"}
            </button>
            <div className="text-right text-[14px] font-semibold tabular-nums">
              {formatTimer(state.elapsedMs)}
            </div>
          </div>
        </header>

        <div
          role="progressbar"
          aria-label="Progress"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1 w-full rounded-full bg-[var(--game-border)] overflow-hidden"
        >
          <div
            style={{ width: `${progressPct}%` }}
            className="h-full bg-[var(--game-accent)] motion-safe:transition-[width] motion-safe:duration-300"
          />
        </div>

        {/* Live Right / Wrong / Feedback Scoreboard Bar */}
        <div
          aria-live="polite"
          className="flex items-center justify-between gap-2 text-[12px]"
        >
          <div className="flex items-center gap-1.5">
            <div
              key={`right-${matchedSoFar}`}
              data-testid="counter-right"
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--game-card)] border tabular-nums font-semibold ${
                matchedSoFar > 0
                  ? "border-[var(--game-accent)] text-[var(--game-accent)] game-anim-bump"
                  : "border-[var(--game-border)] text-[var(--game-text)]"
              }`}
            >
              <span aria-hidden="true">✓</span>
              <span>Right</span>
              <span>{matchedSoFar}</span>
            </div>

            <div
              key={`wrong-${state.misses}`}
              data-testid="counter-wrong"
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--game-card)] border tabular-nums font-semibold ${
                state.misses > 0
                  ? "border-[var(--game-miss)] text-[var(--game-text)] game-anim-shake"
                  : "border-[var(--game-border)] text-[var(--game-text-muted)]"
              }`}
            >
              <span aria-hidden="true">✗</span>
              <span>Wrong</span>
              <span>{state.misses}</span>
            </div>
          </div>

          <div className="flex items-center justify-end min-h-[24px]">
            {feedbackBanner === "miss" || state.mismatchedPair !== null ? (
              <span
                key={`miss-pill-${state.misses}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--game-card)] border border-[var(--game-miss)] text-[var(--game-text-muted)] text-[12px] font-semibold game-anim-shake"
              >
                ✗ Not a match
              </span>
            ) : feedbackBanner === "match" ? (
              <span
                key={`match-pill-${matchedSoFar}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--game-accent)] text-[var(--game-on-accent)] text-[12px] font-semibold game-anim-pop"
              >
                {streak >= 2 ? `✓ Streak ×${streak}!` : "✓ +1 Match!"}
              </span>
            ) : streak >= 2 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--game-card)] border border-[var(--game-accent)] text-[var(--game-accent)] text-[12px] font-semibold">
                Streak ×{streak}
              </span>
            ) : (
              <span className="text-[12px] text-[var(--game-text-muted)]">
                {state.selected
                  ? "Now tap its match"
                  : `${totalPairsCount - matchedSoFar} left`}
              </span>
            )}
          </div>
        </div>

        {currentRound ? (
          <div
            ref={boardRef}
            key={`round-${state.roundIndex}`}
            className="grid grid-cols-2 gap-2 items-stretch"
          >
            {currentRound.terms.map((termCard, rowIdx) => {
              const defCard = currentRound.definitions[rowIdx]!;

              const isTermCleared = state.clearedIds.includes(termCard.id);
              const isTermCelebrating = justMatchedId === termCard.id;
              const isTermSelected =
                state.selected?.side === "term" &&
                state.selected.cardId === termCard.id;
              const isTermMismatched =
                state.mismatchedPair?.termId === termCard.id;

              let termSurfaceClass =
                "border border-[var(--game-border)] bg-[var(--game-card)] text-[var(--game-text)]";
              if (isTermCelebrating) {
                termSurfaceClass =
                  "border-2 border-[var(--game-accent)] bg-[var(--game-accent)] text-[var(--game-on-accent)] game-anim-pop";
              } else if (isTermSelected) {
                termSurfaceClass =
                  "border-2 border-[var(--game-accent)] bg-[color-mix(in_srgb,var(--game-accent)_10%,var(--game-card))] text-[var(--game-text)] motion-safe:scale-[1.02]";
              } else if (isTermMismatched) {
                termSurfaceClass =
                  "border-2 border-[var(--game-miss)] bg-[color-mix(in_srgb,var(--game-miss)_16%,var(--game-card))] text-[var(--game-text)] game-anim-shake";
              }

              const termVisibilityClass =
                isTermCleared && !isTermCelebrating
                  ? "opacity-0 motion-safe:scale-90 pointer-events-none motion-safe:transition-[transform,opacity] motion-safe:duration-200"
                  : "game-anim-deal motion-safe:transition-[transform,opacity,border-color,background-color] motion-safe:duration-200 motion-safe:active:scale-[0.97]";

              const isDefCleared = state.clearedIds.includes(defCard.id);
              const isDefCelebrating = justMatchedId === defCard.id;
              const isDefSelected =
                state.selected?.side === "definition" &&
                state.selected.cardId === defCard.id;
              const isDefMismatched =
                state.mismatchedPair?.definitionId === defCard.id;

              let defSurfaceClass =
                "border border-[var(--game-border)] bg-[var(--game-card)] text-[var(--game-text)]";
              if (isDefCelebrating) {
                defSurfaceClass =
                  "border-2 border-[var(--game-accent)] bg-[var(--game-accent)] text-[var(--game-on-accent)] game-anim-pop";
              } else if (isDefSelected) {
                defSurfaceClass =
                  "border-2 border-[var(--game-accent)] bg-[color-mix(in_srgb,var(--game-accent)_10%,var(--game-card))] text-[var(--game-text)] motion-safe:scale-[1.02]";
              } else if (isDefMismatched) {
                defSurfaceClass =
                  "border-2 border-[var(--game-miss)] bg-[color-mix(in_srgb,var(--game-miss)_16%,var(--game-card))] text-[var(--game-text)] game-anim-shake";
              }

              const defVisibilityClass =
                isDefCleared && !isDefCelebrating
                  ? "opacity-0 motion-safe:scale-90 pointer-events-none motion-safe:transition-[transform,opacity] motion-safe:duration-200"
                  : "game-anim-deal motion-safe:transition-[transform,opacity,border-color,background-color] motion-safe:duration-200 motion-safe:active:scale-[0.97]";

              return (
                <React.Fragment key={`row-${termCard.id}-${defCard.id}`}>
                  <button
                    type="button"
                    data-side="term"
                    data-card-id={termCard.id}
                    aria-pressed={isTermSelected}
                    aria-disabled={isTermCleared}
                    style={{ animationDelay: `${rowIdx * 30}ms` }}
                    onClick={() => handleTileTap("term", termCard.id)}
                    className={`w-full h-full min-h-[54px] rounded-2xl px-3 py-2 text-left text-[14px] font-semibold leading-snug break-words flex items-center justify-between gap-2 ${termSurfaceClass} ${termVisibilityClass}`}
                  >
                    <span>{termCard.term}</span>
                    {isTermCelebrating ? (
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-[13px] font-bold"
                      >
                        ✓
                      </span>
                    ) : isTermMismatched ? (
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-[13px] font-bold text-[var(--game-miss)]"
                      >
                        ✗
                      </span>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    data-side="definition"
                    data-card-id={defCard.id}
                    aria-pressed={isDefSelected}
                    aria-disabled={isDefCleared}
                    style={{ animationDelay: `${rowIdx * 30 + 15}ms` }}
                    onClick={() => handleTileTap("definition", defCard.id)}
                    className={`w-full h-full min-h-[54px] rounded-2xl px-3 py-2 text-left text-[13px] font-normal leading-snug break-words flex items-center justify-between gap-2 ${defSurfaceClass} ${defVisibilityClass}`}
                  >
                    <span>{truncateDefinition(defCard.definition)}</span>
                    {isDefCelebrating ? (
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-[13px] font-bold"
                      >
                        ✓
                      </span>
                    ) : isDefMismatched ? (
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-[13px] font-bold text-[var(--game-miss)]"
                      >
                        ✗
                      </span>
                    ) : null}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
