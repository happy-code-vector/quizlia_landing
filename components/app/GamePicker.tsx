"use client";
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
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
      </div>
    </div>
  );
}
