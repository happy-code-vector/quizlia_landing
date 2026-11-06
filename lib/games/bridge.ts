import type { GameResult } from "./types";

export type HapticStyle = "light" | "success" | "warning";

type WebkitMessageHandler = {
  postMessage: (message: unknown) => void;
};

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        quizliGame?: WebkitMessageHandler;
      };
    };
  }
}

export function hapticFeedback(style: HapticStyle): void {
  if (typeof window === "undefined") return;

  const handler = window.webkit?.messageHandlers?.quizliGame;
  if (handler && typeof handler.postMessage === "function") {
    handler.postMessage({ type: "haptic", style });
    return;
  }

  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      if (style === "light") {
        navigator.vibrate(10);
      } else if (style === "success") {
        navigator.vibrate([15, 40, 15]);
      } else if (style === "warning") {
        navigator.vibrate(30);
      }
    } catch {
      // Ignore vibration errors on unsupported environments
    }
  }
}

export function postResult(payload: GameResult): void {
  if (typeof window === "undefined") return;

  const handler = window.webkit?.messageHandlers?.quizliGame;
  if (handler && typeof handler.postMessage === "function") {
    handler.postMessage({ type: "result", payload });
    return;
  }

  window.dispatchEvent(
    new CustomEvent("quizli:game", {
      detail: { type: "result", payload },
    })
  );
}

export function closeGame(): void {
  if (typeof window === "undefined") return;

  const handler = window.webkit?.messageHandlers?.quizliGame;
  if (handler && typeof handler.postMessage === "function") {
    handler.postMessage({ type: "close" });
    return;
  }

  window.dispatchEvent(
    new CustomEvent("quizli:game", {
      detail: { type: "close" },
    })
  );

  window.history.back();
}
