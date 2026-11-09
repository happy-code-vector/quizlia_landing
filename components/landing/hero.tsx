import { LiveDemo } from "@/components/landing/live-demo"
import { Primary, Secondary } from "@/components/landing/sections"

// Hero copy is server-rendered (section 11: view-source holds the h1 and hero copy).
// The h1 is the page's one serif line (lock rule 2). One rust capsule above the fold (lock rule 4).

function HeroCopy() {
  return (
    <div className="max-w-[34rem]">
      <p className="text-subheadline font-semibold text-rust-on-tint">For families and students</p>
      <h1 id="hero-h" className="mt-3 font-serif text-title text-label md:text-large-title lg:text-display">
        <span className="sm:block">Paste anything.</span> <span className="sm:block">Get quizzed.</span>
      </h1>
      <p className="mt-4 text-body text-supporting">
        Turn a YouTube video, PDF, web page or photo of a page into notes, flashcards and a quiz. One family account
        covers up to four kids.
      </p>
      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
        <Primary />
        <Secondary href="/note">Continue on web</Secondary>
      </div>
      <p className="mt-4 text-subheadline text-supporting">Free to download. Android is coming soon.</p>
    </div>
  )
}

/** The live demo is the hero object, beside the copy at 1024+ (AR picked this layout over a card deck hero, 2026-11-07). */
export function HeroDemo() {
  return (
    <section aria-labelledby="hero-h" className="mx-auto w-full max-w-[75rem] px-4 pb-8 pt-10 md:px-6 lg:px-8 lg:pb-16 lg:pt-20">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
        <HeroCopy />
        <div id="demo" className="scroll-mt-4">
          <h2 className="sr-only">Try the demo</h2>
          <LiveDemo hero />
        </div>
      </div>
    </section>
  )
}
