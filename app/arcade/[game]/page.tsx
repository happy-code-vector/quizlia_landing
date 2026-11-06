// app/arcade/[game]/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { GAMES, isGameSlug } from "@/lib/arcade";
import { loadDeck } from "@/lib/games/deck";
import { GameHost } from "@/components/games/GameHost";
import MatchRush from "@/components/games/MatchRush";
import MemoryFlip from "@/components/games/MemoryFlip";
import QuizRun from "@/components/games/QuizRun";
import AnswerSnake from "@/components/games/AnswerSnake";
import TrueFalseSprint from "@/components/games/TrueFalseSprint";

export default function ArcadeGamePage() {
  const params = useParams();
  const slug = String(params?.game ?? "");
  if (!isGameSlug(slug)) notFound();

  const [bannerHidden, setBannerHidden] = useState(false);
  const game = GAMES.find((g) => g.slug === slug)!;
  const deck = loadDeck(undefined, undefined, "1");
  const Game =
    slug === "match" ? MatchRush
    : slug === "memory" ? MemoryFlip
    : slug === "run" ? QuizRun
    : slug === "snake" ? AnswerSnake
    : TrueFalseSprint;

  return (
    <GameHost>
      {!bannerHidden && (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0d0a1a]/90 px-4 py-2.5 text-white backdrop-blur">
          <p className="text-xs sm:text-sm">
            Playing the <strong>{game.name}</strong> demo deck —{" "}
            <Link href="/auth/signup" className="font-semibold text-purple-300 underline">
              play YOUR notes free
            </Link>
          </p>
          <button
            onClick={() => setBannerHidden(true)}
            aria-label="Dismiss"
            className="rounded-lg px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      <Game deck={deck} />
    </GameHost>
  );
}
