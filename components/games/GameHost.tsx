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

  // Games sit on the study family surface (W-3.2); the game palette maps onto the app tokens.
  return (
    <div className="min-h-dvh text-label">
      <div aria-hidden="true" className="family-surface family-study" />
      {children}
    </div>
  );
}

/** Shared loading state while a play page reads its deck. */
export function GameLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p role="status" className="text-callout text-supporting">Loading the deck…</p>
    </div>
  );
}
