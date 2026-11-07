"use client";

import { useMemo, useRef, useState } from "react";
import { AppShell, SKETCHED_WEB, readLocalFolders, type ShellFolder } from "@/components/app/shell/AppShell";
import type { SourceType } from "@/hooks/useGenerateContent";
import type { ContentItem, Profile, Topic } from "@/lib/types";
import type { StudyPositions } from "@/lib/studyPosition";
import { DeckHero } from "./DeckHero";
import { EmptyHero } from "./EmptyHero";
import { NewNoteDialog } from "./NewNoteDialog";
import { RecentNotes } from "./RecentNotes";
import { SketchedCard, type SketchPreview } from "./SketchedCard";
import { ExamLensLink, SourceButtons } from "./SourceButtons";
import { pickHeroDeck } from "./pickDeck";

export interface HomeViewProps {
  profile: Profile;
  topics: Topic[];
  onGenerated: (updatedContent: ContentItem[]) => void;
  /** Saved flashcard positions per topic (lib/studyPosition). Picks the hero deck and its card. */
  positions?: StudyPositions;
  /** Newest Sketched drawing of the hero's note. Real pages pass none until the read route ships. */
  sketch?: SketchPreview | null;
  /** Overrides NEXT_PUBLIC_SKETCHED_WEB. Fixtures set it so screenshots show both layouts. */
  sketchedEnabled?: boolean;
  /** Reference time for the greeting and relative dates; fixtures pass a fixed value. */
  now?: Date;
  /** Fixture routes pass folders directly; the real page lets the shell read the local cache. */
  folders?: ShellFolder[];
  hideUsage?: boolean;
}

function greeting(now: Date, name: string) {
  const h = now.getHours();
  const part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  return `Good ${part}, ${name}`;
}

/**
 * Home, Option A (approved 2026-11-06). Job: so a parent can get back into the last deck in
 * one click, and start a new note in two. Data in, markup out; loading lives in app/note/page.tsx
 * so /dev/fixtures/home renders this with sample data (W-10).
 */
export function HomeView({
  profile,
  topics,
  onGenerated,
  positions = {},
  sketch = null,
  sketchedEnabled = SKETCHED_WEB,
  now: givenNow,
  folders,
  hideUsage,
}: HomeViewProps) {
  const [newNoteSource, setNewNoteSource] = useState<SourceType | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openNewNote = (type: SourceType) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNewNoteSource(type);
  };
  const [now] = useState(() => givenNow ?? new Date());

  const deck = useMemo(() => pickHeroDeck(topics, positions), [topics, positions]);
  const showSketch = Boolean(sketchedEnabled && deck && sketch && sketch.noteId === deck.topic.id);

  // Folder names for the recent-note labels. Fixtures pass folders; the real page reads the
  // local cache (it renders client-side only, after the profile loads).
  const folderNames = useMemo(() => {
    const list = folders ?? (typeof window !== "undefined" ? readLocalFolders(profile.id) : []);
    return Object.fromEntries(list.map((f) => [f.id, f.name]));
  }, [folders, profile.id]);

  return (
    <AppShell profile={profile} family="home" folders={folders} hideUsage={hideUsage}>
      <main id="main" className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[70rem] flex-col gap-7 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          <h1 tabIndex={-1} className="text-title font-bold">{greeting(now, profile.name)}</h1>

          <div className={showSketch ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,45rem)_minmax(20rem,1fr)]" : "max-w-[45rem]"}>
            {deck ? <DeckHero deck={deck} /> : <EmptyHero onPick={openNewNote} />}
            {showSketch && sketch && <SketchedCard sketch={sketch} />}
          </div>

          {deck && (
            <section aria-labelledby="new-note-from" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="new-note-from" className="text-headline">New note from</h2>
                <ExamLensLink />
              </div>
              <SourceButtons onPick={openNewNote} />
            </section>
          )}

          <RecentNotes topics={topics} now={now} folderNames={folderNames} />
        </div>
      </main>

      <NewNoteDialog
        source={newNoteSource}
        onClose={() => setNewNoteSource(null)}
        returnFocusTo={opener}
        profile={profile}
        onGenerated={(content) => {
          setNewNoteSource(null);
          onGenerated(content);
        }}
      />
    </AppShell>
  );
}
