"use client";

import Link from "next/link";
import { ChevronRight, Footprints, Grid2x2, Link2, Route, Scale, type LucideIcon } from "lucide-react";
import { CardDialog } from "@/components/app/CardDialog";
import { GAMES, type GameSlug } from "@/lib/arcade";

/** One lucide icon per game (lock: no emoji or icon fonts). */
export const GAME_ICONS: Record<GameSlug, LucideIcon> = {
  match: Link2,
  memory: Grid2x2,
  run: Footprints,
  snake: Route,
  truefalse: Scale,
};

export function GameIcon({ slug, size = "md" }: { slug: GameSlug; size?: "md" | "lg" }) {
  const Icon = GAME_ICONS[slug];
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-xl bg-rust-wash text-rust ${size === "lg" ? "size-12" : "size-10"}`}>
      <Icon strokeWidth={1.75} className={size === "lg" ? "size-6" : "size-5"} />
    </span>
  );
}

export function GamePicker({
  noteId,
  profileId,
  open = true,
  onClose,
}: {
  noteId: string;
  profileId: number;
  open?: boolean;
  onClose: () => void;
}) {
  return (
    <CardDialog open={open} onOpenChange={(v) => !v && onClose()} title="Play this note" description="Each game uses this note's flashcards." wide>
      <ul className="flex flex-col gap-2">
        {GAMES.map((game) => (
          <li key={game.slug}>
            <Link
              href={`/note/play/${game.slug}?noteId=${encodeURIComponent(noteId)}&profileId=${profileId}`}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-divider bg-card px-4 py-3 hover:border-input"
            >
              <GameIcon slug={game.slug} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-headline">{game.name}</span>
                <span className="text-subheadline text-supporting">{game.tagline}</span>
              </span>
              <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-supporting" />
            </Link>
          </li>
        ))}
      </ul>
    </CardDialog>
  );
}
