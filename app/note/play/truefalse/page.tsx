// app/note/play/truefalse/page.tsx
"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GameHost, GameLoading } from "@/components/games/GameHost";
import { useArcadeDeck } from "@/hooks/use-arcade-deck";
import TrueFalseSprint from "@/components/games/TrueFalseSprint";

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
  return <TrueFalseSprint deck={deck} />;
}

export default function TrueFalsePlayPage() {
  return (
    <Suspense fallback={<GameLoading />}>
      <GameHost>
        <Play />
      </GameHost>
    </Suspense>
  );
}
