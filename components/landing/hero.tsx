import { LiveDemo } from "@/components/landing/live-demo"
import { Primary, Secondary } from "@/components/landing/sections"

// Hero copy is server-rendered (section 11: view-source holds the h1 and hero copy).
// The h1 is the page's one serif line (lock rule 2). One rust capsule above the fold (lock rule 4).

function HeroCopy({ align }: { align: "start" | "center" }) {
  const center = align === "center"
  return (
    <div className={center ? "mx-auto max-w-[45rem] text-center" : "max-w-[34rem]"}>
      <p className="text-subheadline font-semibold text-rust-on-tint">For families and students</p>
      <h1 id="hero-h" className="mt-3 font-serif text-title text-label md:text-large-title lg:text-display">
        <span className="md:block">Paste anything.</span> <span className="md:block">Get quizzed.</span>
      </h1>
      <p className="mt-4 text-body text-supporting">
        Turn a YouTube video, PDF, web page or photo of a page into notes, flashcards and a quiz. One family account
        covers up to four kids.
      </p>
      <div className={`mt-8 flex flex-col gap-3 sm:flex-row ${center ? "items-center justify-center" : "items-start"}`}>
        <Primary />
        <Secondary href="/note">Continue on web</Secondary>
      </div>
      <p className="mt-4 text-subheadline text-supporting">Free to download. Android is coming soon.</p>
    </div>
  )
}

/** Option A: the live demo is the hero object, beside the copy at 1024+. */
export function HeroDemo() {
  return (
    <section aria-labelledby="hero-h" className="mx-auto w-full max-w-[75rem] px-4 pb-8 pt-10 md:px-6 lg:px-8 lg:pb-16 lg:pt-20">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
        <HeroCopy align="start" />
        <div id="demo" className="scroll-mt-4">
          <h2 className="sr-only">Try the demo</h2>
          <LiveDemo hero />
        </div>
      </div>
    </section>
  )
}

/** Option B: a paper card deck is the hero object under centered copy; the demo is the next section. */
export function HeroDeck() {
  return (
    <>
      <section aria-labelledby="hero-h" className="mx-auto w-full max-w-[75rem] px-4 pb-12 pt-10 md:px-6 lg:px-8 lg:pt-20">
        <HeroCopy align="center" />
        <div aria-hidden="true" className="relative mx-auto mt-14 h-72 w-full max-w-[34rem]">
          <div className="absolute inset-x-6 top-6 h-60 rotate-[-4deg] rounded-2xl bg-paper-back-2 shadow-card" />
          <div className="absolute inset-x-3 top-3 h-60 rotate-[2.5deg] rounded-2xl bg-paper-back-1 shadow-card" />
          <div className="absolute inset-x-0 top-0 flex h-60 flex-col rounded-[1.375rem] bg-paper p-6 text-on-paper shadow-card">
            <p className="text-subheadline text-on-paper-supporting">From a YouTube lesson · The Roman Empire</p>
            <p className="my-auto text-center font-serif text-title">Who was the first Roman emperor?</p>
            <p className="tabular text-right text-subheadline text-on-paper-supporting">Card 1 of 12</p>
          </div>
        </div>
      </section>
      <section id="demo" aria-labelledby="demo-h" className="mx-auto w-full max-w-[56rem] scroll-mt-4 px-4 pb-8 md:px-6 lg:pb-16">
        <h2 id="demo-h" className="text-title2 font-semibold text-label lg:text-title">Try it on a sample</h2>
        <p className="mt-2 mb-8 text-body text-supporting">Pick one and watch it become a study set.</p>
        <LiveDemo />
      </section>
    </>
  )
}
