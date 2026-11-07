// app/arcade/[game]/page.tsx
"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { X } from "lucide-react";
import { GAMES, isGameSlug } from "@/lib/arcade";
import { loadDeck } from "@/lib/games/deck";
import { GameHost, GameLoading } from "@/components/games/GameHost";
import MatchRush from "@/components/games/MatchRush";
import MemoryFlip from "@/components/games/MemoryFlip";
import QuizRun from "@/components/games/QuizRun";
import AnswerSnake from "@/components/games/AnswerSnake";
import TrueFalseSprint from "@/components/games/TrueFalseSprint";

const subscribe = () => () => {};

export default function ArcadeGamePage() {
  const params = useParams();
  // The games shuffle on first render, so they render on the client only (a server render would not match).
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const slug = String(params?.game ?? "");
  if (!isGameSlug(slug)) notFound();

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
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-divider bg-[var(--study-top)] px-4 py-1 text-label">
          <p className="min-w-0 flex-1 text-subheadline">
            Playing the <strong>{game.name}</strong> demo deck.{" "}
            <Link
              href="/auth/signup"
              prefetch={false}
              className="inline-flex min-h-11 items-center font-semibold text-rust-on-tint underline underline-offset-4"
            >
              Play with your notes
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setBannerHidden(true)}
            aria-label="Dismiss"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-supporting transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-hover-fill hover:text-label"
          >
            <X aria-hidden="true" strokeWidth={1.75} className="size-5" />
          </button>
        </div>
      )}
      {mounted ? <Game deck={deck} /> : <GameLoading />}
    </GameHost>
  );
}
