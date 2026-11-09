"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CardDialog } from "@/components/app/CardDialog";
import { GameIcon } from "@/components/app/GamePicker";
import { GAMES, type GameSlug } from "@/lib/arcade";

export interface ArcadeViewProps {
  /** Notes that have flashcards. */
  topics: { id: string; title: string }[];
  profileId: number | string;
}

/** Arcade on the study surface. No rust capsule here: every game card offers the same two actions. */
export function ArcadeView({ topics, profileId }: ArcadeViewProps) {
  const [pickerFor, setPickerFor] = useState<GameSlug | null>(null);
  const game = GAMES.find((g) => g.slug === pickerFor);

  return (
    <main id="main" className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[70rem] flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-1.5">
          <h1 tabIndex={-1} className="font-serif text-title font-semibold lg:text-large-title">Arcade</h1>
          <p className="text-callout text-supporting">Five games that drill the same flashcards. Pick a note to play.</p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {GAMES.map((g) => (
            <li key={g.slug} className="ds-card flex flex-col gap-3 p-5">
              <GameIcon slug={g.slug} size="lg" />
              <div className="flex flex-1 flex-col gap-1">
                <h2 className="text-title3 font-semibold">{g.name}</h2>
                <p className="text-subheadline text-supporting">{g.tagline}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button type="button" onClick={() => setPickerFor(g.slug)} className="btn-secondary">
                  Pick a note<span className="sr-only"> for {g.name}</span>
                </button>
                <Link href={`/note/play/${g.slug}?mock=1`} className="inline-flex min-h-11 items-center text-subheadline font-semibold text-rust hover:underline">
                  Try a demo<span className="sr-only"> of {g.name}</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <CardDialog
        open={!!pickerFor}
        onOpenChange={(v) => !v && setPickerFor(null)}
        title={game ? `Play ${game.name}` : "Play"}
        description={topics.length ? "Choose a note with flashcards." : undefined}
        wide
      >
        {topics.length === 0 ? (
          <div className="flex flex-col gap-4">
            <p className="text-callout text-supporting">None of your notes have flashcards yet. Make a note on Home, or try the demo deck.</p>
            {pickerFor && (
              <Link href={`/note/play/${pickerFor}?mock=1`} className="btn-secondary self-start">Try the demo deck</Link>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {topics.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/note/play/${pickerFor}?noteId=${encodeURIComponent(t.id)}&profileId=${profileId}`}
                  className="flex min-h-12 items-center gap-3 rounded-2xl border border-divider bg-card px-4 py-3 text-headline hover:border-input"
                >
                  <span className="min-w-0 flex-1 break-words">{t.title}</span>
                  <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-supporting" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardDialog>
    </main>
  );
}
