"use client";
// HOST code (ours), not game logic. The bridge's closeGame() already calls
// window.history.back() on web, so we deliberately do NOT navigate on the
// "close" event — navigating here would go back twice.
import { useEffect, type ReactNode } from "react";
import "@/lib/games/theme.css";

export function GameHost({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onGameEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type?: string; payload?: unknown };
      if (detail?.type === "result") {
        console.debug("[arcade] game result", detail.payload);
      }
    };
    window.addEventListener("quizli:game", onGameEvent);
    return () => window.removeEventListener("quizli:game", onGameEvent);
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--game-bg)] text-[var(--game-text)]">
      {children}
    </div>
  );
}
