"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { closeGame, hapticFeedback, postResult } from "@/lib/games/bridge";
import { initAudio, playMatch, playMiss, playTap } from "@/lib/games/sound";
import type { Flashcard, QuizRunResult, StudyDeck } from "@/lib/games/types";

const GATE_TRAVEL_MS = 6000;
const LANE_CHANGE_MS = 120;

type LaneOption = {
  lane: 0 | 1 | 2;
  cardId: string;
  term: string;
  isCorrect: boolean;
};

type ThemePalette = {
  bg: string;
  card: string;
  text: string;
  border: string;
  accent: string;
  onAccent: string;
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
      onAccent: "rgb(255, 255, 255)",
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
    onAccent:
      style.getPropertyValue("--game-on-accent").trim() || "rgb(255, 255, 255)",
  };
}

function buildGateOptions(
  targetCard: Flashcard,
  allCards: readonly Flashcard[]
): LaneOption[] {
  const distractors = shuffle(
    allCards.filter((c) => c.id !== targetCard.id)
  ).slice(0, 2);
  const cards = shuffle([targetCard, ...distractors]);
  const lanes: (0 | 1 | 2)[] = [0, 1, 2];

  return lanes.map((lane, idx) => {
    const c = cards[idx] ?? targetCard;
    return {
      lane,
      cardId: c.id,
      term: c.term,
      isCorrect: c.id === targetCard.id,
    };
  });
}

function useCountUp(target: number, active: boolean, durationMs = 600): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    // setState only inside rAF callbacks, never synchronously in the effect body.
    if (!active) {
      const resetId = window.requestAnimationFrame(() => setValue(0));
      return () => window.cancelAnimationFrame(resetId);
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target === 0) {
      const settleId = window.requestAnimationFrame(() => setValue(target));
      return () => window.cancelAnimationFrame(settleId);
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

  return active ? value : 0;
}

export default function QuizRun({ deck }: { deck: StudyDeck }) {
  const isTooSmall = deck.cards.length < 4;

  const [distinctCards, setDistinctCards] = useState<Flashcard[]>(() =>
    isTooSmall ? [] : shuffle(deck.cards).slice(0, 10)
  );
  const [queue, setQueue] = useState<Flashcard[]>(() => distinctCards);
  const [queueIndex, setQueueIndex] = useState(0);
  const [gateOptions, setGateOptions] = useState<LaneOption[]>(() =>
    isTooSmall || !distinctCards[0]
      ? []
      : buildGateOptions(distinctCards[0], deck.cards)
  );
  const [runnerLane, setRunnerLane] = useState<0 | 1 | 2>(1);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mascotVisible, setMascotVisible] = useState(true);
  const [showCorrectRing, setShowCorrectRing] = useState(false);
  const [wrongPicks, setWrongPicks] = useState(0);
  const [cardWrongPicks, setCardWrongPicks] = useState<Record<string, number>>(
    () => {
      const init: Record<string, number> = {};
      for (const c of distinctCards) {
        init[c.id] = 0;
      }
      return init;
    }
  );
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [finishedAtMs, setFinishedAtMs] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 358, height: 420 });

  // Simulation refs
  const queueRef = useRef<Flashcard[]>(queue);
  const queueIndexRef = useRef<number>(queueIndex);
  const requeuedCardIdsRef = useRef<Set<string>>(new Set());
  const gateOptionsRef = useRef<LaneOption[]>(gateOptions);
  const gateProgressRef = useRef<number>(0); // 0 at horizon -> 1 at runner
  const roadScrollRef = useRef<number>(0);
  const totalElapsedMsRef = useRef<number>(0);
  const targetLaneRef = useRef<0 | 1 | 2>(1);
  const visualLaneRef = useRef<number>(1);
  const laneFromRef = useRef<number>(1);
  const laneAnimStartRef = useRef<number>(0);
  const slowUntilRef = useRef<number>(0);
  const flashCorrectUntilRef = useRef<number>(0);
  const missHoldUntilRef = useRef<number>(0);
  const resolvingGateRef = useRef<"none" | "hit" | "miss">("none");
  const hasStartedRef = useRef<boolean>(hasStarted);
  const isPausedRef = useRef<boolean>(isPaused);
  const isFinishedRef = useRef<boolean>(isFinished);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const paletteRef = useRef<ThemePalette>(readThemePalette());
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Mirror latest state into refs after commit so timers and listeners read current values.
  useLayoutEffect(() => {
    queueRef.current = queue;
    queueIndexRef.current = queueIndex;
    gateOptionsRef.current = gateOptions;
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

  // Compute responsive canvas dimensions so 390x844 fits without scrolling
  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(
        containerRef.current?.clientWidth ?? window.innerWidth - 32,
        420
      );
      const maxH = Math.max(280, Math.min(440, window.innerHeight - 280));
      setCanvasSize({ width: Math.max(280, w), height: maxH });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const changeToLane = useCallback((nextLane: 0 | 1 | 2) => {
    if (isFinishedRef.current) return;
    initAudio();

    const now = performance.now();
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      setHasStarted(true);
      setStartedAtMs((prev) => prev ?? Date.now());
    }

    if (isPausedRef.current) return;

    if (nextLane !== targetLaneRef.current) {
      laneFromRef.current = visualLaneRef.current;
      targetLaneRef.current = nextLane;
      laneAnimStartRef.current = now;
      if (reduced) {
        visualLaneRef.current = nextLane;
      }
      setRunnerLane(nextLane);
      hapticFeedback("light");
      playTap(soundEnabledRef.current);
    } else if (!hasStartedRef.current) {
      hapticFeedback("light");
      playTap(soundEnabledRef.current);
    }
  }, []);

  const shiftLaneBy = useCallback(
    (delta: -1 | 1) => {
      const current = targetLaneRef.current;
      const next = Math.max(0, Math.min(2, current + delta)) as 0 | 1 | 2;
      if (!hasStartedRef.current) {
        changeToLane(next);
        return;
      }
      if (next !== current) {
        changeToLane(next);
      }
    },
    [changeToLane]
  );

  // Desktop keyboard controls: ArrowLeft/ArrowRight and A/D
  useEffect(() => {
    if (isTooSmall || isFinished) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        shiftLaneBy(-1);
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        shiftLaneBy(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFinished, isTooSmall, shiftLaneBy]);

  // Main requestAnimationFrame time-based simulation and perspective renderer
  useEffect(() => {
    if (isTooSmall || isFinished) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvasSize.width;
    const H = canvasSize.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    let rafId = 0;
    let lastTime = performance.now();

    const advanceToNextGate = () => {
      const nextIdx = queueIndexRef.current + 1;
      const currentQueue = queueRef.current;
      if (nextIdx >= currentQueue.length) {
        isFinishedRef.current = true;
        setFinishedAtMs(Date.now());
        setIsFinished(true);
        return;
      }

      const nextCard = currentQueue[nextIdx]!;
      const nextOpts = buildGateOptions(nextCard, deck.cards);
      queueIndexRef.current = nextIdx;
      gateOptionsRef.current = nextOpts;
      gateProgressRef.current = 0;
      resolvingGateRef.current = "none";
      setQueueIndex(nextIdx);
      setGateOptions(nextOpts);
      setShowCorrectRing(false);
    };

    const updateSimulation = (now: number, dt: number) => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      // Update lane interpolation (120ms, or instant with reduced motion)
      if (reduced) {
        visualLaneRef.current = targetLaneRef.current;
      } else if (visualLaneRef.current !== targetLaneRef.current) {
        const t = Math.min(1, (now - laneAnimStartRef.current) / LANE_CHANGE_MS);
        visualLaneRef.current =
          laneFromRef.current +
          (targetLaneRef.current - laneFromRef.current) * t;
      }

      if (
        !hasStartedRef.current ||
        isPausedRef.current ||
        isFinishedRef.current
      ) {
        return;
      }

      const speedFactor = now < slowUntilRef.current ? 0.5 : 1;
      totalElapsedMsRef.current += dt;
      roadScrollRef.current =
        (roadScrollRef.current + (dt / 1000) * 1.8 * speedFactor) % 1;

      if (resolvingGateRef.current === "hit") {
        if (now >= flashCorrectUntilRef.current) {
          advanceToNextGate();
        }
        return;
      }

      if (resolvingGateRef.current === "miss") {
        if (now >= missHoldUntilRef.current) {
          advanceToNextGate();
        }
        return;
      }

      // Gate takes 6 seconds to travel from horizon (0) to runner (1) at constant speed
      gateProgressRef.current += dt / GATE_TRAVEL_MS;

      if (gateProgressRef.current >= 1) {
        gateProgressRef.current = 1;
        const currentLane = targetLaneRef.current;
        const chosenPanel = gateOptionsRef.current[currentLane];
        const currentCard = queueRef.current[queueIndexRef.current];

        if (chosenPanel?.isCorrect) {
          hapticFeedback("success");
          playMatch(soundEnabledRef.current);
          if (reduced) {
            advanceToNextGate();
          } else {
            resolvingGateRef.current = "hit";
            flashCorrectUntilRef.current = now + 200;
          }
        } else {
          hapticFeedback("warning");
          playMiss(soundEnabledRef.current);

          slowUntilRef.current = now + 1000;
          missHoldUntilRef.current = now + 1200;
          resolvingGateRef.current = "miss";
          setShowCorrectRing(true);
          setWrongPicks((prev) => prev + 1);

          if (currentCard) {
            setCardWrongPicks((prev) => ({
              ...prev,
              [currentCard.id]: (prev[currentCard.id] ?? 0) + 1,
            }));

            // Re-queue this card once at the end of the queue if not already re-queued
            if (!requeuedCardIdsRef.current.has(currentCard.id)) {
              requeuedCardIdsRef.current.add(currentCard.id);
              const updatedQueue = [...queueRef.current, currentCard];
              queueRef.current = updatedQueue;
              setQueue(updatedQueue);
            }
          }
        }
      }
    };

    const drawScene = (now: number) => {
      const palette = paletteRef.current;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      ctx.save();
      ctx.scale(dpr, dpr);

      const horizonY = H * 0.35;
      const vpX = W * 0.5;
      const topRoadHalfWidth = W * 0.2;
      const bottomRoadHalfWidth = W * 0.47;

      const roadHalfWidthAtY = (y: number) => {
        const t = Math.max(0, Math.min(1, (y - horizonY) / (H - horizonY)));
        return topRoadHalfWidth + (bottomRoadHalfWidth - topRoadHalfWidth) * t;
      };

      // Sky (--game-bg) and ground fill
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, W, H);

      // Road trapezoid (--game-card)
      ctx.beginPath();
      ctx.moveTo(vpX - topRoadHalfWidth, horizonY);
      ctx.lineTo(vpX + topRoadHalfWidth, horizonY);
      ctx.lineTo(vpX + bottomRoadHalfWidth, H);
      ctx.lineTo(vpX - bottomRoadHalfWidth, H);
      ctx.closePath();
      ctx.fillStyle = palette.card;
      ctx.fill();

      // Road outer edges (--game-border)
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(vpX - topRoadHalfWidth, horizonY);
      ctx.lineTo(vpX - bottomRoadHalfWidth, H);
      ctx.moveTo(vpX + topRoadHalfWidth, horizonY);
      ctx.lineTo(vpX + bottomRoadHalfWidth, H);
      ctx.moveTo(0, horizonY);
      ctx.lineTo(W, horizonY);
      ctx.stroke();

      // Scrolling lane divider dashes (between lanes 0|1 and 1|2)
      const numDashes = 7;
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 1.5;
      for (const dividerFrac of [-1 / 3, 1 / 3]) {
        for (let i = 0; i < numDashes; i += 1) {
          const zStart = (i + roadScrollRef.current) / numDashes;
          const zEnd = Math.min(1, zStart + 0.065);
          // Perspective mapping z^1.6
          const p1 = Math.pow(zStart, 1.6);
          const p2 = Math.pow(zEnd, 1.6);
          const y1 = horizonY + (H - horizonY) * p1;
          const y2 = horizonY + (H - horizonY) * p2;
          const x1 = vpX + dividerFrac * roadHalfWidthAtY(y1);
          const x2 = vpX + dividerFrac * roadHalfWidthAtY(y2);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // Approaching Gate (3 panels side by side, growing with perspective)
      const runnerY = H * 0.86;
      const z = Math.max(0, Math.min(1, gateProgressRef.current));
      const persp = Math.pow(z, 1.35);
      const gateY = horizonY + (runnerY - horizonY) * persp;
      const halfW = roadHalfWidthAtY(gateY);
      const totalGateW = halfW * 2;
      const laneW = totalGateW / 3;
      const panelH = Math.max(24, 22 + 32 * persp);
      const fontPx = Math.max(10, Math.round(10 + 5 * persp));

      const opts = gateOptionsRef.current;
      for (let laneIdx = 0; laneIdx < 3; laneIdx += 1) {
        const opt = opts[laneIdx];
        if (!opt) continue;

        const panelX = vpX - halfW + laneIdx * laneW + 2;
        const panelY = gateY - panelH;
        const panelW = Math.max(20, laneW - 4);

        const isFlashingHit =
          !reduced &&
          resolvingGateRef.current === "hit" &&
          opt.isCorrect &&
          now < flashCorrectUntilRef.current;
        const isCorrectRinged =
          resolvingGateRef.current === "miss" &&
          opt.isCorrect &&
          now < missHoldUntilRef.current;

        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 6);
        ctx.fillStyle = isFlashingHit ? palette.accent : palette.card;
        ctx.fill();

        if (isCorrectRinged) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = palette.accent;
        } else {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = palette.text;
        }
        ctx.stroke();

        // Term text inside gate panel (never smaller than 10px, fitted with ellipsis)
        ctx.fillStyle = isFlashingHit ? palette.onAccent : palette.text;
        ctx.font = `600 ${fontPx}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const maxTextW = Math.max(12, panelW - 8);
        let label = opt.term;
        if (ctx.measureText(label).width > maxTextW) {
          while (
            label.length > 1 &&
            ctx.measureText(`${label}…`).width > maxTextW
          ) {
            label = label.slice(0, -1);
          }
          label = `${label}…`;
        }
        ctx.fillText(label, panelX + panelW / 2, panelY + panelH / 2);
      }

      // Runner: rounded rectangle at bottom of its lane with 2px bob 3x/sec
      const runnerHalfW = roadHalfWidthAtY(runnerY);
      const runnerLaneW = (runnerHalfW * 2) / 3;
      const laneCenterOffset = (visualLaneRef.current - 1) * runnerLaneW;
      const runnerCenterX = vpX + laneCenterOffset;
      const bobOffset =
        !reduced && hasStartedRef.current && !isPausedRef.current
          ? Math.sin((totalElapsedMsRef.current / 1000) * Math.PI * 2 * 3) * 2
          : 0;

      const runnerW = Math.min(54, runnerLaneW * 0.56);
      const runnerH = 28;
      ctx.beginPath();
      ctx.roundRect(
        runnerCenterX - runnerW / 2,
        runnerY - runnerH / 2 + bobOffset,
        runnerW,
        runnerH,
        8
      );
      ctx.fillStyle = palette.accent;
      ctx.fill();

      ctx.restore();
    };

    const loop = (now: number) => {
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;

      updateSimulation(now, dt);
      drawScene(now);

      if (!isFinishedRef.current) {
        rafId = window.requestAnimationFrame(loop);
      }
    };

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [canvasSize, deck.cards, isFinished, isTooSmall]);

  const handleRestart = () => {
    initAudio();
    hapticFeedback("light");
    playTap(soundEnabled);

    const nextDistinct = shuffle(deck.cards).slice(0, 10);
    const firstOpts = buildGateOptions(nextDistinct[0]!, deck.cards);
    const initWrong: Record<string, number> = {};
    for (const c of nextDistinct) {
      initWrong[c.id] = 0;
    }

    requeuedCardIdsRef.current = new Set();
    queueRef.current = nextDistinct;
    queueIndexRef.current = 0;
    gateOptionsRef.current = firstOpts;
    gateProgressRef.current = 0;
    roadScrollRef.current = 0;
    totalElapsedMsRef.current = 0;
    targetLaneRef.current = 1;
    visualLaneRef.current = 1;
    laneFromRef.current = 1;
    slowUntilRef.current = 0;
    flashCorrectUntilRef.current = 0;
    missHoldUntilRef.current = 0;
    resolvingGateRef.current = "none";
    hasStartedRef.current = false;
    isPausedRef.current = false;
    isFinishedRef.current = false;

    setDistinctCards(nextDistinct);
    setQueue(nextDistinct);
    setQueueIndex(0);
    setGateOptions(firstOpts);
    setRunnerLane(1);
    setHasStarted(false);
    setIsPaused(false);
    setIsFinished(false);
    setShowCorrectRing(false);
    setWrongPicks(0);
    setCardWrongPicks(initWrong);
    setStartedAtMs(null);
    setFinishedAtMs(null);
  };

  const resultPayload: QuizRunResult | null = isFinished
    ? (() => {
        const totalCards = distinctCards.length;
        // Both are set before isFinished flips; the fallbacks only keep types total.
        const endMs = finishedAtMs ?? startedAtMs ?? 0;
        const startMs = startedAtMs ?? endMs;
        const durationMs = Math.max(0, endMs - startMs);
        const denom = totalCards + wrongPicks;
        const accuracy =
          denom > 0 ? Math.round((totalCards / denom) * 100) / 100 : 1;
        const perCard = distinctCards.map((c) => {
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
          gameId: "quiz_run",
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
    const reviewCards = distinctCards.filter((c) =>
      resultPayload.reviewCardIds.includes(c.id)
    );
    const titleText =
      resultPayload.accuracy >= 0.8 ? "Nice work" : "All done";

    return (
      <main className="min-h-dvh bg-[var(--game-bg)] text-[var(--game-text)] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] px-4 py-6">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
          {mascotVisible ? (
            // Decorative 96px mascot, hidden by onError when the asset is absent; next/image adds no value here.
            // eslint-disable-next-line @next/next/no-img-element
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
              className="h-12 rounded-full border border-[var(--game-accent)] bg-[var(--game-card)] text-[var(--game-accent-text)] text-[15px] font-semibold"
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

  const currentCard = queue[queueIndex];
  const displayCardNumber = Math.min(queueIndex + 1, distinctCards.length);
  const progressPct =
    queue.length > 0 ? Math.round((queueIndex / queue.length) * 100) : 0;

  return (
    <main className="min-h-dvh bg-[var(--game-bg)] text-[var(--game-text)] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] px-4 py-2">
      <div
        ref={containerRef}
        className="max-w-md mx-auto w-full flex flex-col gap-2"
      >
        <header className="grid grid-cols-3 items-center gap-2 min-h-[32px]">
          <h1 className="truncate text-[14px] font-semibold">
            <span className="sr-only">Quiz Run: </span>{deck.title}
          </h1>
          <div className="text-center text-[13px] text-[var(--game-text-muted)] whitespace-nowrap tabular-nums">
            Card {displayCardNumber} of {distinctCards.length}
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
          key={`run-prompt-${queueIndex}`}
          className={`rounded-2xl bg-[var(--game-card)] border px-3 py-2 flex flex-col gap-1.5 ${
            showCorrectRing
              ? "border-[var(--game-miss)] game-anim-shake"
              : "border-[var(--game-border)] game-anim-deal"
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
            <div className="flex items-center gap-1.5">
              <span
                key={`run-right-${queueIndex}`}
                data-testid="counter-right"
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border tabular-nums ${
                  queueIndex > 0
                    ? "border-[var(--game-accent)] text-[var(--game-accent-text)] game-anim-bump"
                    : "border-[var(--game-border)] text-[var(--game-text)]"
                }`}
              >
                ✓ Right {queueIndex}
              </span>
              <span
                key={`run-wrong-${wrongPicks}`}
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
              Pick the matching lane
            </span>
          </div>
          <p className="text-[14px] leading-snug break-words">
            {currentCard?.definition}
          </p>
        </section>

        {/* Road Canvas */}
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
            if (Math.abs(dx) >= 24) {
              shiftLaneBy(dx > 0 ? 1 : -1);
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
              onClick={() => changeToLane(runnerLane)}
              className="absolute inset-0 flex items-center justify-center p-4 text-center"
            >
              <span className="rounded-full bg-[var(--game-card)] border border-[var(--game-border)] px-4 py-2 text-[14px] font-semibold text-[var(--game-text)]">
                Swipe or use arrow keys to change lanes
              </span>
            </button>
          ) : null}
        </div>

        {/* Three lane chips below the canvas (left, middle, right) */}
        <div className="grid grid-cols-3 gap-2">
          {gateOptions.map((opt) => {
            const isActiveLane = runnerLane === opt.lane;
            const isCorrectRinged = showCorrectRing && opt.isCorrect;
            const isWrongSelectedLane =
              showCorrectRing && isActiveLane && !opt.isCorrect;

            let borderClass = "border border-[var(--game-border)]";
            if (isWrongSelectedLane) {
              borderClass = "border-2 border-[var(--game-miss)] game-anim-shake";
            } else if (isCorrectRinged) {
              borderClass = "border-2 border-[var(--game-accent)] game-anim-pop";
            } else if (isActiveLane) {
              borderClass = "border-2 border-[var(--game-accent)]";
            }

            return (
              <button
                key={`lane-${queueIndex}-${opt.lane}`}
                type="button"
                aria-pressed={isActiveLane}
                onClick={() => changeToLane(opt.lane)}
                className={`min-h-[44px] rounded-xl bg-[var(--game-card)] text-[var(--game-text)] px-2.5 py-2 text-[13px] font-semibold leading-tight text-center break-words flex items-center justify-center motion-safe:active:scale-[0.97] ${borderClass}`}
              >
                <span className="line-clamp-2">{opt.term}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
