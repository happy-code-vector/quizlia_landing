// app/note/play/match/page.tsx
"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GameHost, GameLoading } from "@/components/games/GameHost";
import { useArcadeDeck } from "@/hooks/use-arcade-deck";
import MatchRush from "@/components/games/MatchRush";

function Play() {
  const params = useSearchParams();
  const { deck } = useArcadeDeck(
    params.get("noteId") ?? undefined,
    params.get("profileId") ?? undefined,
    params.get("mock") ?? undefined
  );
  if (!deck) {
    return <GameLoading />;
  }
  return <MatchRush deck={deck} />;
}

export default function MatchPlayPage() {
  return (
    <Suspense fallback={<GameLoading />}>
      <GameHost>
        <Play />
      </GameHost>
    </Suspense>
  );
}
