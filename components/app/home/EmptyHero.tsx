import type { SourceType } from "@/hooks/useGenerateContent";
import { ExamLensLink, SourceButtons } from "./SourceButtons";

/**
 * No deck yet: Option C source strip in the hero slot (lock decision). The bear is allowed
 * here and only here on Home (mascot rule: empty state, wave, never the largest element).
 */
export function EmptyHero({ onPick }: { onPick: (type: SourceType) => void }) {
  return (
    <section
      aria-labelledby="empty-hero-title"
      className="ds-card flex w-full min-w-0 max-w-[45rem] flex-col gap-6 rounded-[1.375rem] p-5 sm:p-7"
    >
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/quizliai_mascot_wave.webp" alt="" width={64} height={64} className="size-16 shrink-0 object-contain" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 id="empty-hero-title" className="font-serif text-title font-semibold lg:text-large-title">
            What are we studying today?
          </h2>
          <p className="text-subheadline text-supporting">
            Add a YouTube link, a PDF or photos of your notes. You get notes, flashcards and a quiz.
          </p>
        </div>
      </div>
      <SourceButtons onPick={onPick} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button type="button" onClick={() => onPick("youtube")} className="btn-primary min-h-12 px-7">
          Add your first note
        </button>
        <ExamLensLink onTint={false} />
      </div>
    </section>
  );
}
