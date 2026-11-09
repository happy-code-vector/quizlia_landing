import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Newest Sketched drawing of the hero's note, made on iPhone. Web only views it (AGENTS.md rule 12). */
export interface SketchPreview {
  noteId: string;
  noteTitle: string;
  /** Image URL of the newest drawing (from the Sketched read route once Kevin confirms it). */
  imageUrl: string;
  /** Drawings this note has. The badge shows only when there is more than one. */
  count: number;
}

export function SketchedCard({ sketch }: { sketch: SketchPreview }) {
  return (
    <Link
      href={`/note/sketched?note=${encodeURIComponent(sketch.noteId)}`}
      className="ds-card ds-card-link flex min-w-0 flex-col gap-4 p-5 text-label md:flex-row md:items-center xl:flex-col xl:items-stretch"
    >
      <div className="relative flex h-[13.75rem] shrink-0 items-center justify-center rounded-xl bg-study-top md:w-56 xl:w-auto">
        {sketch.count > 1 && (
          <span className="tabular absolute top-2.5 left-2.5 inline-flex h-6 items-center rounded-full bg-card px-2.5 text-footnote font-semibold text-supporting">
            {sketch.count} drawings
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sketch.imageUrl}
          alt=""
          className="max-h-[12.375rem] max-w-[85%] rounded-md object-contain shadow-[0_1px_2px_rgb(0_0_0/0.08),0_8px_20px_rgb(0_0_0/0.12)]"
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-footnote font-semibold tracking-[0.04em] text-supporting uppercase">Sketched</span>
          <span className="text-title3 font-semibold">Your drawing of {sketch.noteTitle}</span>
          <span className="text-subheadline text-supporting">Made on iPhone. Open, print or download it.</span>
        </span>
        <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-supporting" />
      </div>
    </Link>
  );
}
