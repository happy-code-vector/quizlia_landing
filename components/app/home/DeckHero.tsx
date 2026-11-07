import Link from "next/link";
import type { HeroDeck } from "./pickDeck";

/**
 * Option A hero (lock rule 3: the one radius-22 object). Shows the real card the deck
 * resumes on, one rust Continue (lock rule 4) and the screen's one serif line (rule 2).
 */
export function DeckHero({ deck }: { deck: HeroDeck }) {
  const { topic, index, total } = deck;
  const card = topic.flashcards![index];

  return (
    <section
      aria-labelledby="deck-hero-title"
      className="ds-card flex w-full min-w-0 max-w-[45rem] flex-col gap-6 rounded-[1.375rem] p-5 sm:p-7"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="deck-hero-title" className="font-serif text-title font-semibold lg:text-large-title">
          Pick up where you left off.
        </h2>
        <p className="tabular text-subheadline text-supporting">
          <span className="font-semibold text-label">{topic.title}</span> · Flashcards ·{" "}
          <span className="whitespace-nowrap">{index + 1} of {total}</span>
        </p>
      </div>

      {/* Paper stack: the top card is the real next card; the two behind it are decoration. */}
      <div className="relative mr-4 mb-3">
        <div aria-hidden="true" className="absolute top-5 -right-4 -bottom-3 left-6 rounded-2xl bg-paper-back-2 shadow-[0_1px_2px_rgb(0_0_0/0.05)]" />
        <div aria-hidden="true" className="absolute top-2.5 -right-2 -bottom-1.5 left-3 rounded-2xl bg-paper-back-1 shadow-[0_1px_2px_rgb(0_0_0/0.05)]" />
        <div className="relative flex min-h-44 flex-col gap-3 rounded-2xl bg-paper p-5 text-on-paper shadow-[0_1px_2px_rgb(0_0_0/0.06),0_6px_18px_rgb(0_0_0/0.08)] sm:p-7">
          <p className="tabular text-footnote font-semibold text-on-paper-supporting">
            Question <span className="sr-only">, card {index + 1} of {total}</span>
          </p>
          <p className="line-clamp-4 font-serif text-title3 lg:text-title2">{card.question}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link href={`/note/topic/${topic.id}?study=flashcards`} className="btn-primary min-h-12 px-7">
          Continue<span className="sr-only"> studying {topic.title}</span>
        </Link>
        <Link href="/note/notes" className="inline-flex min-h-6 items-center text-subheadline text-rust hover:underline">
          Choose another deck
        </Link>
      </div>
    </section>
  );
}
