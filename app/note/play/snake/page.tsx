// app/note/play/snake/page.tsx
"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GameHost, GameLoading } from "@/components/games/GameHost";
import { useArcadeDeck } from "@/hooks/use-arcade-deck";
import AnswerSnake from "@/components/games/AnswerSnake";

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
  return <AnswerSnake deck={deck} />;
}

export default function SnakePlayPage() {
  return (
    <Suspense fallback={<GameLoading />}>
      <GameHost>
        <Play />
      </GameHost>
    </Suspense>
  );
}
