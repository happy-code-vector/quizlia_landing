// app/note/play/run/page.tsx
"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GameHost, GameLoading } from "@/components/games/GameHost";
import { useArcadeDeck } from "@/hooks/use-arcade-deck";
import QuizRun from "@/components/games/QuizRun";

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
  return <QuizRun deck={deck} />;
}

export default function RunPlayPage() {
  return (
    <Suspense fallback={<GameLoading />}>
      <GameHost>
        <Play />
      </GameHost>
    </Suspense>
  );
}
