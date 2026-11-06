"use client";

import React, { useEffect, useReducer, useState } from "react";
import { closeGame, hapticFeedback, postResult } from "@/lib/games/bridge";
import { initAudio, playMatch, playMiss, playTap } from "@/lib/games/sound";
import type { Flashcard, MemoryFlipResult, StudyDeck } from "@/lib/games/types";

type MemoryTile = {
  tileId: string;
  cardId: string;
  kind: "term" | "definition";
  text: string;
};

type MemoryFlipState = {
  deck: StudyDeck;
  status: "empty" | "playing" | "finished";
  cards: Flashcard[];
  tiles: MemoryTile[];
  flippedTileIds: string[];
  matchedCardIds: string[];
  justMatchedCardId: string | null;
  mismatchedTileIds: string[];
  flips: number;
  misses: number;
  cardFlips: Record<string, number>;
  cardMisses: Record<string, number>;
  startedAt: number | null;
  finishedAt: number | null;
  elapsedMs: number;
};

type MemoryAction =
  | { type: "start"; now: number }
  | { type: "flip"; tileId: string; now: number }
  | { type: "resolve" }
  | { type: "clearJustMatched" }
  | { type: "finish"; now: number }
  | { type: "reset"; deck: StudyDeck };

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

function truncateText(text: string): string {
  if (text.length <= 90) return text;
  return `${text.slice(0, 90).trimEnd()}…`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function createMemoryInitialState(deck: StudyDeck): MemoryFlipState {
  if (deck.cards.length < 4) {
    return {
      deck,
      status: "empty",
      cards: [],
      tiles: [],
      flippedTileIds: [],
      matchedCardIds: [],
      justMatchedCardId: null,
      mismatchedTileIds: [],
      flips: 0,
      misses: 0,
      cardFlips: {},
      cardMisses: {},
      startedAt: null,
      finishedAt: null,
      elapsedMs: 0,
    };
  }

  const selectedCards = shuffle(deck.cards).slice(0, 6);
  const rawTiles: MemoryTile[] = [];
  const cardFlips: Record<string, number> = {};
  const cardMisses: Record<string, number> = {};

  for (const card of selectedCards) {
    cardFlips[card.id] = 0;
    cardMisses[card.id] = 0;
    rawTiles.push({
      tileId: `term-${card.id}`,
      cardId: card.id,
      kind: "term",
      text: card.term,
    });
    rawTiles.push({
      tileId: `def-${card.id}`,
      cardId: card.id,
      kind: "definition",
      text: truncateText(card.definition),
    });
  }

  return {
    deck,
    status: "playing",
    cards: selectedCards,
    tiles: shuffle(rawTiles),
    flippedTileIds: [],
    matchedCardIds: [],
    justMatchedCardId: null,
    mismatchedTileIds: [],
    flips: 0,
    misses: 0,
    cardFlips,
    cardMisses,
    startedAt: null,
    finishedAt: null,
    elapsedMs: 0,
  };
}

function memoryFlipReducer(
  state: MemoryFlipState,
  action: MemoryAction
): MemoryFlipState {
  switch (action.type) {
    case "start": {
      if (state.status !== "playing") return state;
      if (state.startedAt === null) {
        return { ...state, startedAt: action.now, elapsedMs: 0 };
      }
      return {
        ...state,
        elapsedMs: Math.max(0, action.now - state.startedAt),
      };
    }

    case "flip": {
      if (state.status !== "playing") return state;
      if (state.flippedTileIds.length >= 2) return state;
      if (state.flippedTileIds.includes(action.tileId)) return state;

      const tile = state.tiles.find((t) => t.tileId === action.tileId);
      if (!tile || state.matchedCardIds.includes(tile.cardId)) return state;

      const startedAt = state.startedAt ?? action.now;
      const nextFlipped = [...state.flippedTileIds, action.tileId];
      const nextCardFlips = {
        ...state.cardFlips,
        [tile.cardId]: (state.cardFlips[tile.cardId] ?? 0) + 1,
      };

      if (nextFlipped.length === 2) {
        const firstTile = state.tiles.find((t) => t.tileId === nextFlipped[0]);
        const isMismatch = firstTile ? firstTile.cardId !== tile.cardId : false;
        return {
          ...state,
          startedAt,
          elapsedMs: Math.max(0, action.now - startedAt),
          flippedTileIds: nextFlipped,
          mismatchedTileIds: isMismatch ? nextFlipped : [],
          flips: state.flips + 1,
          cardFlips: nextCardFlips,
        };
      }

      return {
        ...state,
        startedAt,
        elapsedMs: Math.max(0, action.now - startedAt),
        flippedTileIds: nextFlipped,
        mismatchedTileIds: [],
        flips: state.flips + 1,
        cardFlips: nextCardFlips,
      };
    }

    case "resolve": {
      if (state.flippedTileIds.length !== 2) return state;
      const [firstId, secondId] = state.flippedTileIds;
      const firstTile = state.tiles.find((t) => t.tileId === firstId);
      const secondTile = state.tiles.find((t) => t.tileId === secondId);
      if (!firstTile || !secondTile) {
        return { ...state, flippedTileIds: [], mismatchedTileIds: [] };
      }

      if (firstTile.cardId === secondTile.cardId) {
        return {
          ...state,
          flippedTileIds: [],
          mismatchedTileIds: [],
          matchedCardIds: [...state.matchedCardIds, firstTile.cardId],
          justMatchedCardId: firstTile.cardId,
        };
      }

      return {
        ...state,
        flippedTileIds: [],
        mismatchedTileIds: [],
        misses: state.misses + 1,
        cardMisses: {
          ...state.cardMisses,
          [firstTile.cardId]: (state.cardMisses[firstTile.cardId] ?? 0) + 1,
          [secondTile.cardId]: (state.cardMisses[secondTile.cardId] ?? 0) + 1,
        },
      };
    }

    case "clearJustMatched": {
      return {
        ...state,
        justMatchedCardId: null,
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
      };
    }

    case "reset":
      return createMemoryInitialState(action.deck);

    default:
      return state;
  }
}

function buildMemoryResult(state: MemoryFlipState): MemoryFlipResult {
  const totalPairs = state.cards.length;
  const startedAtMs = state.startedAt ?? Date.now();
  const finishedAtMs = state.finishedAt ?? startedAtMs + state.elapsedMs;
  const durationMs = Math.max(0, finishedAtMs - startedAtMs);
  const denom = totalPairs + state.misses;
  const accuracy = denom > 0 ? Math.round((totalPairs / denom) * 100) / 100 : 1;

  const perCard = state.cards.map((card) => {
    const misses = state.cardMisses[card.id] ?? 0;
    return {
      cardId: card.id,
      flips: state.cardFlips[card.id] ?? 0,
      misses,
      matchedCleanly: misses === 0,
    };
  });

  const reviewCardIds = perCard
    .filter((c) => c.misses >= 2)
    .map((c) => c.cardId);

  return {
    gameId: "memory_flip",
    noteId: state.deck.noteId,
    profileId: state.deck.profileId,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs,
    totalPairs,
    flips: state.flips,
    misses: state.misses,
    accuracy,
    perCard,
    reviewCardIds,
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

export default function MemoryFlip({ deck }: { deck: StudyDeck }) {
  const [state, dispatch] = useReducer(
    memoryFlipReducer,
    deck,
    createMemoryInitialState
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mascotVisible, setMascotVisible] = useState(true);

  useEffect(() => {
    if (state.status !== "playing" || state.startedAt === null) return;
    const interval = window.setInterval(() => {
      dispatch({ type: "start", now: Date.now() });
    }, 250);
    return () => window.clearInterval(interval);
  }, [state.status, state.startedAt]);

  useEffect(() => {
    if (state.flippedTileIds.length !== 2) return;
    const [firstId, secondId] = state.flippedTileIds;
    const firstTile = state.tiles.find((t) => t.tileId === firstId);
    const secondTile = state.tiles.find((t) => t.tileId === secondId);
    if (firstTile && secondTile) {
      if (firstTile.cardId === secondTile.cardId) {
        hapticFeedback("success");
        playMatch(soundEnabled);
      } else {
        hapticFeedback("warning");
        playMiss(soundEnabled);
      }
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: "resolve" });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [state.flippedTileIds, state.tiles, soundEnabled]);

  useEffect(() => {
    if (!state.justMatchedCardId) return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "clearJustMatched" });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state.justMatchedCardId]);

  useEffect(() => {
    if (
      state.status === "playing" &&
      state.cards.length > 0 &&
      state.matchedCardIds.length === state.cards.length
    ) {
      dispatch({ type: "finish", now: Date.now() });
    }
  }, [state.status, state.cards.length, state.matchedCardIds.length]);

  const isFinished = state.status === "finished";
  const finishedResult = isFinished ? buildMemoryResult(state) : null;
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

  if (state.status === "finished" && finishedResult) {
    const reviewCards = state.cards.filter((c) =>
      finishedResult.reviewCardIds.includes(c.id)
    );
    const headingText =
      finishedResult.accuracy >= 0.8 ? "Nice work" : "All matched";

    return (
      <main className="min-h-dvh bg-[var(--game-bg)] text-[var(--game-text)] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] px-4 py-6">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
          {mascotVisible ? (
            <img
              src="/mascot/bear-happy.webp"
              alt=""
              onError={() => setMascotVisible(false)}
              className="h-24 w-auto object-contain self-start"
            />
          ) : null}

          <h1 aria-live="polite" className="text-2xl font-semibold">
            {headingText}
          </h1>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Pairs
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {animatedPairs}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Misses
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {animatedMisses}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Time
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {formatDuration(animatedDurationMs)}
              </div>
            </div>
          </div>

          {reviewCards.length > 0 ? (
            <section className="flex flex-col gap-2.5">
              <h2 className="text-[17px] font-semibold">Worth another look</h2>
              {reviewCards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3.5"
                >
                  <div className="text-[15px] font-semibold">{card.term}</div>
                  <div className="text-[15px] text-[var(--game-text-muted)] mt-1">
                    {card.definition}
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                initAudio();
                hapticFeedback("light");
                playTap(soundEnabled);
                dispatch({ type: "reset", deck });
              }}
              className="h-12 rounded-full border border-[var(--game-accent)] bg-[var(--game-card)] text-[var(--game-accent)] text-[15px] font-semibold"
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
              className="h-12 rounded-full bg-[var(--game-accent)] text-[var(--game-on-accent)] text-[15px] font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </main>
    );
  }

  const progressPct =
    state.cards.length > 0
      ? Math.round((state.matchedCardIds.length / state.cards.length) * 100)
      : 0;

  return (
    <main className="min-h-dvh bg-[var(--game-bg)] text-[var(--game-text)] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] px-4 py-3">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-2.5">
        <header className="grid grid-cols-3 items-center gap-2 min-h-[34px]">
          <div className="truncate text-[15px] font-semibold">
            {state.deck.title}
          </div>
          <div className="text-center text-[13px] text-[var(--game-text-muted)]">
            {state.matchedCardIds.length} of {state.cards.length} pairs
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
              className="min-h-[32px] px-2.5 rounded-full border border-[var(--game-border)] bg-[var(--game-card)] text-[var(--game-text)] text-[12px] font-semibold"
            >
              {soundEnabled ? "Sound On" : "Muted"}
            </button>
            <div className="text-right text-[15px] font-semibold tabular-nums">
              {formatDuration(state.elapsedMs)}
            </div>
          </div>
        </header>

        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 w-full rounded-full bg-[var(--game-border)] overflow-hidden"
        >
          <div
            style={{ width: `${progressPct}%` }}
            className="h-full bg-[var(--game-accent)] motion-safe:transition-[width] motion-safe:duration-300"
          />
        </div>

        {/* Live Right / Wrong Counter Bar */}
        <div
          aria-live="polite"
          className="flex items-center justify-between gap-2 text-[12px]"
        >
          <div className="flex items-center gap-2">
            <div
              key={`right-${state.matchedCardIds.length}`}
              data-testid="counter-right"
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--game-card)] border tabular-nums font-semibold ${
                state.matchedCardIds.length > 0
                  ? "border-[var(--game-accent)] text-[var(--game-accent)] game-anim-bump"
                  : "border-[var(--game-border)] text-[var(--game-text)]"
              }`}
            >
              <span aria-hidden="true">✓</span>
              <span>Right</span>
              <span>{state.matchedCardIds.length}</span>
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

          <div className="text-[var(--game-text-muted)] tabular-nums">
            {state.mismatchedTileIds.length > 0 ? (
              <span className="font-semibold text-[var(--game-text-muted)] game-anim-shake">
                ✗ Try again
              </span>
            ) : state.justMatchedCardId ? (
              <span className="font-semibold text-[var(--game-accent)] game-anim-pop">
                ✓ Match!
              </span>
            ) : (
              <span>Flips: {state.flips}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-0.5">
          {state.tiles.map((tile, idx) => {
            const isFlipped = state.flippedTileIds.includes(tile.tileId);
            const isMatched = state.matchedCardIds.includes(tile.cardId);
            const isJustMatched = state.justMatchedCardId === tile.cardId;
            const isMismatched = state.mismatchedTileIds.includes(tile.tileId);
            const isRevealed = isFlipped || isMatched;

            let borderClass = "border border-[var(--game-border)]";
            if (isMismatched) {
              borderClass =
                "border-2 border-[var(--game-miss)] bg-[color-mix(in_srgb,var(--game-miss)_14%,var(--game-card))]";
            } else if (isFlipped || isMatched) {
              borderClass = "border-2 border-[var(--game-accent)]";
            }

            return (
              <button
                key={tile.tileId}
                type="button"
                aria-label={isRevealed ? tile.text : "Face-down card"}
                aria-pressed={isFlipped}
                aria-disabled={isMatched}
                onClick={() => {
                  if (
                    state.status !== "playing" ||
                    state.flippedTileIds.length >= 2 ||
                    isFlipped ||
                    isMatched
                  ) {
                    return;
                  }
                  initAudio();
                  hapticFeedback("light");
                  playTap(soundEnabled);
                  dispatch({
                    type: "flip",
                    tileId: tile.tileId,
                    now: Date.now(),
                  });
                }}
                style={{
                  perspective: "800px",
                  animationDelay: `${idx * 20}ms`,
                }}
                className={`min-h-[86px] rounded-2xl text-left text-[14px] leading-snug break-words game-anim-deal ${
                  isMatched ? "pointer-events-none" : "motion-safe:active:scale-[0.97]"
                } ${
                  isMismatched
                    ? "game-anim-shake"
                    : isJustMatched
                      ? "game-anim-pop motion-safe:scale-[1.06] motion-safe:transition-transform motion-safe:duration-250"
                      : "motion-safe:scale-100 motion-safe:transition-transform motion-safe:duration-250"
                }`}
              >
                <div
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isRevealed ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                  className="relative w-full h-full min-h-[86px] motion-safe:transition-transform motion-safe:duration-300"
                >
                  {/* Front face (face-down dot) */}
                  <div
                    style={{ backfaceVisibility: "hidden" }}
                    className={`absolute inset-0 rounded-2xl bg-[var(--game-card)] text-[var(--game-text)] p-3 flex items-center justify-center border border-[var(--game-border)]`}
                  >
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full bg-[var(--game-accent)]"
                    />
                  </div>

                  {/* Back face (revealed term/definition) */}
                  <div
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                    className={`w-full min-h-[86px] rounded-2xl bg-[var(--game-card)] text-[var(--game-text)] p-3 flex items-center ${borderClass} ${
                      tile.kind === "term" ? "font-semibold" : "font-normal"
                    }`}
                  >
                    <span className="w-full">{tile.text}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
