"use client";
import { useEffect } from "react";
import Link from "next/link";
import { GAMES } from "@/lib/arcade";

export function GamePicker({
  noteId,
  profileId,
  onClose,
}: {
  noteId: string;
  profileId: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Play this note</h3>
        <ul className="space-y-2">
          {GAMES.map((game) => (
            <li key={game.slug}>
              <Link
                href={`/note/play/${game.slug}?noteId=${encodeURIComponent(noteId)}&profileId=${profileId}`}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:border-purple-400 hover:bg-purple-50 dark:border-gray-700 dark:hover:bg-purple-900/20"
              >
                <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${game.accent} text-lg`}>
                  {game.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">{game.name}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{game.tagline}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Cancel</button>
      </div>
    </div>
  );
}
