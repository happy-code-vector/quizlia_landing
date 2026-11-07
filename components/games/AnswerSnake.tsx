"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { closeGame, hapticFeedback, postResult } from "@/lib/games/bridge";
import { initAudio, playMatch, playMiss, playTap } from "@/lib/games/sound";
import type { AnswerSnakeResult, Flashcard, StudyDeck } from "@/lib/games/types";

const GRID_COLS = 15;
const GRID_ROWS = 19;
const TICK_MS = 1000 / 6; // 6 cells per second

type Direction = {
  col: number;
  row: number;
};

type Cell = {
  col: number;
  row: number;
};

type OrbOption = {
  letter: "A" | "B" | "C";
  cardId: string;
  term: string;
  col: number;
  row: number;
  isCorrect: boolean;
  eaten: boolean;
};

type ThemePalette = {
  bg: string;
  card: string;
  text: string;
  border: string;
  accent: string;
};

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

function formatTimer(durationMs: number): string {
  const totalSec = Math.max(0, Math.floor(durationMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function readThemePalette(): ThemePalette {
  if (typeof window === "undefined") {
    return {
      bg: "rgb(242, 242, 247)",
      card: "rgb(255, 255, 255)",
      text: "rgb(0, 0, 0)",
      border: "rgba(60, 60, 67, 0.18)",
      accent: "rgb(184, 88, 24)",
    };
  }
  const style = window.getComputedStyle(document.documentElement);
  return {
    bg: style.getPropertyValue("--game-bg").trim() || "rgb(242, 242, 247)",
    card: style.getPropertyValue("--game-card").trim() || "rgb(255, 255, 255)",
    text: style.getPropertyValue("--game-text").trim() || "rgb(0, 0, 0)",
    border:
      style.getPropertyValue("--game-border").trim() ||
      "rgba(60, 60, 67, 0.18)",
    accent:
      style.getPropertyValue("--game-accent").trim() || "rgb(184, 88, 24)",
  };
}

function createInitialSnake(): Cell[] {
  const centerCol = Math.floor(GRID_COLS / 2); // 7
  const centerRow = Math.floor(GRID_ROWS / 2); // 9
  return [
    { col: centerCol, row: centerRow },
    { col: centerCol - 1, row: centerRow },
    { col: centerCol - 2, row: centerRow },
    { col: centerCol - 3, row: centerRow },
  ];
}

function buildOrbsForCard(
  targetCard: Flashcard,
  allCards: readonly Flashcard[],
  snake: readonly Cell[],
  headDir: Direction
): OrbOption[] {
  const otherCards = shuffle(
    allCards.filter((c) => c.id !== targetCard.id)
  ).slice(0, 2);
  const chosenCards = shuffle([targetCard, ...otherCards]);
  const letters: ("A" | "B" | "C")[] = ["A", "B", "C"];

  const occupied = new Set<string>();
  for (const seg of snake) {
    occupied.add(`${seg.col},${seg.row}`);
  }
  // Avoid spawning directly 1 or 2 cells ahead of the snake head
  const head = snake[0];
  if (head) {
    for (let step = 1; step <= 2; step += 1) {
      const aheadCol = (head.col + headDir.col * step + GRID_COLS) % GRID_COLS;
      const aheadRow = (head.row + headDir.row * step + GRID_ROWS) % GRID_ROWS;
      occupied.add(`${aheadCol},${aheadRow}`);
    }
  }

  const emptyCells: Cell[] = [];
  for (let r = 0; r < GRID_ROWS; r += 1) {
    for (let c = 0; c < GRID_COLS; c += 1) {
      if (!occupied.has(`${c},${r}`)) {
        emptyCells.push({ col: c, row: r });
      }
    }
  }

  const pickedCells = shuffle(emptyCells).slice(0, 3);

  return letters.map((letter, idx) => {
    const card = chosenCards[idx] ?? targetCard;
    const cell = pickedCells[idx] ?? { col: idx * 3 + 1, row: 1 };
    return {
      letter,
      cardId: card.id,
      term: card.term,
      col: cell.col,
      row: cell.row,
      isCorrect: card.id === targetCard.id,
      eaten: false,
    };
  });
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

export default function AnswerSnake({ deck }: { deck: StudyDeck }) {
  const isTooSmall = deck.cards.length < 4;

  const [gameCards, setGameCards] = useState<Flashcard[]>(() =>
    isTooSmall ? [] : shuffle(deck.cards).slice(0, 10)
  );
  const [cardIndex, setCardIndex] = useState(0);
  const [orbs, setOrbs] = useState<OrbOption[]>(() => {
    if (isTooSmall) return [];
    const initialSnake = createInitialSnake();
    const firstCard = gameCards[0] ?? deck.cards[0]!;
    return buildOrbsForCard(firstCard, deck.cards, initialSnake, {
      col: 1,
      row: 0,
    });
  });
  const [showCorrectRing, setShowCorrectRing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mascotVisible, setMascotVisible] = useState(true);
  const [wrongPicks, setWrongPicks] = useState(0);
  const [cardWrongPicks, setCardWrongPicks] = useState<Record<string, number>>(
    () => {
      const init: Record<string, number> = {};
      for (const c of gameCards) {
        init[c.id] = 0;
      }
      return init;
    }
  );
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [finishedAtMs, setFinishedAtMs] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cellSize, setCellSize] = useState(22);

  // Mutable simulation state for fixed-tick loop
  const snakeRef = useRef<Cell[]>(createInitialSnake());
  const dirRef = useRef<Direction>({ col: 1, row: 0 });
  const nextDirRef = useRef<Direction>({ col: 1, row: 0 });
  const orbsRef = useRef<OrbOption[]>(orbs);
  const showCorrectRingRef = useRef<boolean>(showCorrectRing);
  const cardIndexRef = useRef<number>(cardIndex);
  const gameCardsRef = useRef<Flashcard[]>(gameCards);
  const hasStartedRef = useRef<boolean>(hasStarted);
  const isPausedRef = useRef<boolean>(isPaused);
  const isFinishedRef = useRef<boolean>(isFinished);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const headPulseUntilRef = useRef<number>(0);
  const paletteRef = useRef<ThemePalette>(readThemePalette());
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Mirror latest state into refs after commit so timers and listeners read current values.
  useLayoutEffect(() => {
    orbsRef.current = orbs;
    showCorrectRingRef.current = showCorrectRing;
    cardIndexRef.current = cardIndex;
    gameCardsRef.current = gameCards;
    hasStartedRef.current = hasStarted;
    isPausedRef.current = isPaused;
    isFinishedRef.current = isFinished;
    soundEnabledRef.current = soundEnabled;
  });

  // Read theme.css variables on mount and when prefers-color-scheme changes
  useEffect(() => {
    paletteRef.current = readThemePalette();
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      paletteRef.current = readThemePalette();
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Compute responsive cell size to fit available width (with 16px side padding) and viewport height
  useEffect(() => {
    const updateSize = () => {
      const containerWidth =
        containerRef.current?.clientWidth ??
        Math.min(window.innerWidth - 32, 360);
      const maxWidthCell = Math.floor(containerWidth / GRID_COLS);
      const availableHeight = Math.max(260, window.innerHeight - 255);
      const maxHeightCell = Math.floor(availableHeight / GRID_ROWS);
      const computed = Math.max(14, Math.min(maxWidthCell, maxHeightCell, 24));
      setCellSize(computed);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleDirectionInput = useCallback((requested: Direction) => {
    if (isFinishedRef.current) return;
    initAudio();

    const current = dirRef.current;
    const isReversal =
      requested.col === -current.col && requested.row === -current.row;

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      setHasStarted(true);
      setStartedAtMs((prev) => prev ?? Date.now());
      if (!isReversal) {
        dirRef.current = requested;
        nextDirRef.current = requested;
      }
      hapticFeedback("light");
      playTap(soundEnabledRef.current);
      return;
    }

    if (isPausedRef.current) return;
    if (isReversal) return;

    if (
      requested.col !== nextDirRef.current.col ||
      requested.row !== nextDirRef.current.row
    ) {
      nextDirRef.current = requested;
      hapticFeedback("light");
      playTap(soundEnabledRef.current);
    }
  }, []);

  // Keyboard controls (Arrow keys + WASD)
  useEffect(() => {
    if (isTooSmall || isFinished) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        handleDirectionInput({ col: 0, row: -1 });
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleDirectionInput({ col: 0, row: 1 });
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        handleDirectionInput({ col: -1, row: 0 });
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        handleDirectionInput({ col: 1, row: 0 });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDirectionInput, isFinished, isTooSmall]);

  // Fixed-tick simulation + Canvas 2D rendering loop
  useEffect(() => {
    if (isTooSmall || isFinished) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = GRID_COLS * cellSize;
    const logicalHeight = GRID_ROWS * cellSize;
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;

    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;

    const stepTick = (now: number) => {
      const snake = [...snakeRef.current];
      const dir = nextDirRef.current;
      dirRef.current = dir;

      const head = snake[0]!;
      const nextHead: Cell = {
        col: (head.col + dir.col + GRID_COLS) % GRID_COLS,
        row: (head.row + dir.row + GRID_ROWS) % GRID_ROWS,
      };

      const activeOrbs = orbsRef.current;
      const hitOrb = activeOrbs.find(
        (orb) =>
          !orb.eaten && orb.col === nextHead.col && orb.row === nextHead.row
      );

      if (hitOrb) {
        if (hitOrb.isCorrect) {
          // Correct orb: snake grows by 1, success haptic + match sound, head pulse, next card
          const grownSnake = [nextHead, ...snake];
          snakeRef.current = grownSnake;
          hapticFeedback("success");
          playMatch(soundEnabledRef.current);

          const reduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches;
          if (!reduced) {
            headPulseUntilRef.current = now + 220;
          }

          const nextIdx = cardIndexRef.current + 1;
          const cards = gameCardsRef.current;
          if (nextIdx >= cards.length) {
            isFinishedRef.current = true;
            setFinishedAtMs(Date.now());
            setIsFinished(true);
          } else {
            const nextCard = cards[nextIdx]!;
            const nextOrbs = buildOrbsForCard(
              nextCard,
              deck.cards,
              grownSnake,
              dir
            );
            cardIndexRef.current = nextIdx;
            orbsRef.current = nextOrbs;
            showCorrectRingRef.current = false;
            setCardIndex(nextIdx);
            setOrbs(nextOrbs);
            setShowCorrectRing(false);
          }
          return;
        }

        // Wrong orb: snake shrinks by 1 (never below 3), warning haptic + miss sound,
        // orb disappears, chip struck through, correct orb gets 2px accent ring
        const movedSnake = [nextHead, ...snake.slice(0, -1)];
        const shrunkSnake =
          movedSnake.length > 3 ? movedSnake.slice(0, -1) : movedSnake;
        snakeRef.current = shrunkSnake;

        hapticFeedback("warning");
        playMiss(soundEnabledRef.current);

        const currentCard = gameCardsRef.current[cardIndexRef.current];
        const updatedOrbs = activeOrbs.map((o) =>
          o.letter === hitOrb.letter ? { ...o, eaten: true } : o
        );
        orbsRef.current = updatedOrbs;
        showCorrectRingRef.current = true;
        setOrbs(updatedOrbs);
        setShowCorrectRing(true);
        setWrongPicks((prev) => prev + 1);
        if (currentCard) {
          setCardWrongPicks((prev) => ({
            ...prev,
            [currentCard.id]: (prev[currentCard.id] ?? 0) + 1,
          }));
        }
        return;
      }

      // Normal step
      snakeRef.current = [nextHead, ...snake.slice(0, -1)];
    };

    const draw = (now: number) => {
      const palette = paletteRef.current;
      ctx.save();
      ctx.scale(dpr, dpr);

      // Board background
      ctx.fillStyle = palette.card;
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // 1px grid lines
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 1;
      for (let c = 1; c < GRID_COLS; c += 1) {
        const x = c * cellSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, logicalHeight);
        ctx.stroke();
      }
      for (let r = 1; r < GRID_ROWS; r += 1) {
        const y = r * cellSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(logicalWidth, y);
        ctx.stroke();
      }

      // Orbs: circles filling 80% of cell (radius = 0.4 * cellSize)
      const orbRadius = cellSize * 0.4;
      for (const orb of orbsRef.current) {
        if (orb.eaten) continue;
        const cx = (orb.col + 0.5) * cellSize;
        const cy = (orb.row + 0.5) * cellSize;

        ctx.beginPath();
        ctx.arc(cx, cy, orbRadius, 0, Math.PI * 2);
        ctx.fillStyle = palette.bg;
        ctx.fill();

        if (showCorrectRingRef.current && orb.isCorrect) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = palette.accent;
        } else {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = palette.border;
        }
        ctx.stroke();

        ctx.fillStyle = palette.text;
        ctx.font = `700 ${Math.max(11, Math.round(cellSize * 0.5))}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(orb.letter, cx, cy + 0.5);
      }

      // Snake segments: body in --game-text, head in --game-accent
      const snake = snakeRef.current;
      for (let i = snake.length - 1; i >= 0; i -= 1) {
        const seg = snake[i]!;
        const isHead = i === 0;
        const pad = 2;
        let x = seg.col * cellSize + pad;
        let y = seg.row * cellSize + pad;
        let w = cellSize - pad * 2;
        let h = cellSize - pad * 2;

        if (isHead && now < headPulseUntilRef.current) {
          const grow = cellSize * 0.12;
          x -= grow;
          y -= grow;
          w += grow * 2;
          h += grow * 2;
        }

        ctx.fillStyle = isHead ? palette.accent : palette.text;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 4);
        ctx.fill();
      }

      ctx.restore();
    };

    const loop = (now: number) => {
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;

      if (
        hasStartedRef.current &&
        !isPausedRef.current &&
        !isFinishedRef.current
      ) {
        accumulator += dt;
        while (accumulator >= TICK_MS) {
          accumulator -= TICK_MS;
          stepTick(now);
          if (isFinishedRef.current) break;
        }
      }

      draw(now);
      if (!isFinishedRef.current) {
        rafId = window.requestAnimationFrame(loop);
      }
    };

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [cellSize, deck.cards, isFinished, isTooSmall]);

  const handleRestart = () => {
    initAudio();
    hapticFeedback("light");
    playTap(soundEnabled);

    const nextCards = shuffle(deck.cards).slice(0, 10);
    const initialSnake = createInitialSnake();
    const initialDir = { col: 1, row: 0 };
    const firstOrbs = buildOrbsForCard(
      nextCards[0]!,
      deck.cards,
      initialSnake,
      initialDir
    );
    const initialWrongMap: Record<string, number> = {};
    for (const c of nextCards) {
      initialWrongMap[c.id] = 0;
    }

    snakeRef.current = initialSnake;
    dirRef.current = initialDir;
    nextDirRef.current = initialDir;
    orbsRef.current = firstOrbs;
    showCorrectRingRef.current = false;
    cardIndexRef.current = 0;
    gameCardsRef.current = nextCards;
    hasStartedRef.current = false;
    isPausedRef.current = false;
    isFinishedRef.current = false;

    setGameCards(nextCards);
    setCardIndex(0);
    setOrbs(firstOrbs);
    setShowCorrectRing(false);
    setHasStarted(false);
    setIsPaused(false);
    setIsFinished(false);
    setWrongPicks(0);
    setCardWrongPicks(initialWrongMap);
    setStartedAtMs(null);
    setFinishedAtMs(null);
  };

  const resultPayload: AnswerSnakeResult | null = isFinished
    ? (() => {
        const totalCards = gameCards.length;
        const startMs = startedAtMs ?? Date.now();
        const endMs = finishedAtMs ?? Date.now();
        const durationMs = Math.max(0, endMs - startMs);
        const denom = totalCards + wrongPicks;
        const accuracy =
          denom > 0 ? Math.round((totalCards / denom) * 100) / 100 : 1;
        const perCard = gameCards.map((c) => {
          const wp = cardWrongPicks[c.id] ?? 0;
          return {
            cardId: c.id,
            wrongPicks: wp,
            correctFirstTry: wp === 0,
          };
        });
        const reviewCardIds = perCard
          .filter((item) => item.wrongPicks >= 1)
          .map((item) => item.cardId);

        return {
          gameId: "answer_snake",
          noteId: deck.noteId,
          profileId: deck.profileId,
          startedAt: new Date(startMs).toISOString(),
          finishedAt: new Date(endMs).toISOString(),
          durationMs,
          totalCards,
          wrongPicks,
          accuracy,
          perCard,
          reviewCardIds,
        };
      })()
    : null;

  const animatedCards = useCountUp(resultPayload?.totalCards ?? 0, isFinished);
  const animatedWrong = useCountUp(resultPayload?.wrongPicks ?? 0, isFinished);
  const animatedTime = useCountUp(resultPayload?.durationMs ?? 0, isFinished);

  if (isTooSmall) {
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

  if (isFinished && resultPayload) {
    const reviewCards = gameCards.filter((c) =>
      resultPayload.reviewCardIds.includes(c.id)
    );
    const titleText =
      resultPayload.accuracy >= 0.8 ? "Nice work" : "All done";

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

          <h1
            aria-live="polite"
            className="text-2xl font-semibold tracking-tight"
          >
            {titleText}
          </h1>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Cards
              </div>
              <div className="text-xl font-semibold tabular-nums mt-0.5">
                {animatedCards}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Wrong picks
              </div>
              <div className="text-xl font-semibold tabular-nums mt-0.5">
                {animatedWrong}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--game-card)] border border-[var(--game-border)] p-3">
              <div className="text-[13px] text-[var(--game-text-muted)]">
                Time
              </div>
              <div className="text-xl font-semibold tabular-nums mt-0.5">
                {formatTimer(animatedTime)}
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
              onClick={handleRestart}
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
                postResult(resultPayload);
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

  const currentCard = gameCards[cardIndex];
  const progressPct =
    gameCards.length > 0
      ? Math.round((cardIndex / gameCards.length) * 100)
      : 0;

  return (
    <main className="min-h-dvh bg-[var(--game-bg)] text-[var(--game-text)] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] px-4 py-2">
      <div
        ref={containerRef}
        className="max-w-md mx-auto w-full flex flex-col gap-2"
      >
        <header className="grid grid-cols-3 items-center gap-2 min-h-[32px]">
          <h1 className="truncate text-[14px] font-semibold">
            <span className="sr-only">Answer Snake: </span>{deck.title}
          </h1>
          <div className="text-center text-[13px] text-[var(--game-text-muted)] whitespace-nowrap tabular-nums">
            Card {cardIndex + 1} of {gameCards.length}
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

        {/* Prompt panel showing current card's definition in full + Live Right/Wrong Counters */}
        <section
          key={`prompt-${cardIndex}`}
          className={`rounded-2xl bg-[var(--game-card)] border px-3 py-2 flex flex-col gap-1.5 ${
            showCorrectRing
              ? "border-[var(--game-miss)] game-anim-shake"
              : "border-[var(--game-border)] game-anim-deal"
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
            <div className="flex items-center gap-1.5">
              <span
                key={`snake-right-${cardIndex}`}
                data-testid="counter-right"
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border tabular-nums ${
                  cardIndex > 0
                    ? "border-[var(--game-accent)] text-[var(--game-accent)] game-anim-bump"
                    : "border-[var(--game-border)] text-[var(--game-text)]"
                }`}
              >
                ✓ Right {cardIndex}
              </span>
              <span
                key={`snake-wrong-${wrongPicks}`}
                data-testid="counter-wrong"
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border tabular-nums ${
                  wrongPicks > 0
                    ? "border-[var(--game-miss)] text-[var(--game-text)] game-anim-shake"
                    : "border-[var(--game-border)] text-[var(--game-text-muted)]"
                }`}
              >
                ✗ Wrong {wrongPicks}
              </span>
            </div>
            <span className="text-[var(--game-text-muted)]">
              Eat the matching orb
            </span>
          </div>
          <p className="text-[14px] leading-snug break-words">
            {currentCard?.definition}
          </p>
        </section>

        {/* Board container */}
        <div
          onTouchStart={(e) => {
            const touch = e.touches[0];
            if (touch) {
              touchStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
              };
            }
          }}
          onTouchEnd={(e) => {
            const start = touchStartRef.current;
            const touch = e.changedTouches[0];
            if (!start || !touch) return;
            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            if (Math.hypot(dx, dy) < 24) return;
            if (Math.abs(dx) > Math.abs(dy)) {
              handleDirectionInput({ col: dx > 0 ? 1 : -1, row: 0 });
            } else {
              handleDirectionInput({ col: 0, row: dy > 0 ? 1 : -1 });
            }
            touchStartRef.current = null;
          }}
          className="relative flex justify-center items-center select-none touch-none"
        >
          <canvas
            ref={canvasRef}
            className="rounded-2xl border border-[var(--game-border)] block"
          />

          {!hasStarted ? (
            <button
              type="button"
              onClick={() => handleDirectionInput({ col: 1, row: 0 })}
              className="absolute inset-0 flex items-center justify-center p-4 text-center"
            >
              <span className="rounded-full bg-[var(--game-card)] border border-[var(--game-border)] px-4 py-2 text-[14px] font-semibold text-[var(--game-text)]">
                Swipe or use arrow keys to start
              </span>
            </button>
          ) : null}
        </div>

        {/* Three chips below the board showing A <term>, B <term>, C <term> */}
        <div className="grid grid-cols-3 gap-2">
          {orbs.map((orb) => {
            const isHighlightedCorrect = showCorrectRing && orb.isCorrect;
            return (
              <div
                key={`${cardIndex}-${orb.letter}-${orb.eaten ? "eaten" : "active"}`}
                className={`rounded-xl bg-[var(--game-card)] px-2.5 py-2 text-[13px] leading-tight flex items-center gap-1.5 ${
                  isHighlightedCorrect
                    ? "border-2 border-[var(--game-accent)] game-anim-pop"
                    : orb.eaten
                      ? "border-2 border-[var(--game-miss)] game-anim-shake"
                      : "border border-[var(--game-border)]"
                } ${orb.eaten ? "line-through text-[var(--game-text-muted)]" : ""}`}
              >
                <span className="font-bold shrink-0">{orb.letter}</span>
                <span className="truncate font-medium">{orb.term}</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
