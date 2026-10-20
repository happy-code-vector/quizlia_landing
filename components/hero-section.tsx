import Link from "next/link"
import Image from "next/image"
import { APP_STORE_URL } from "@/lib/constants"

export function HeroSection() {
  return (
    <section aria-labelledby="hero-h" className="relative z-10">
      <Image
        src="/mascot/quizliai_mascot_wave.webp"
        alt=""
        width={345}
        height={640}
        priority
        className="anim-wave pointer-events-none absolute bottom-[-40px] right-[3%] z-10 hidden h-auto w-[146px] xl:block 2xl:right-[8%] 2xl:w-[177px]"
      />
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-5 pt-[70px] text-center md:px-10">
        <h1
          id="hero-h"
          className="anim-rise text-[clamp(52px,9.5vw,148px)] font-extrabold leading-[0.88] tracking-[-0.055em] text-white"
        >
          Paste anything.
          <br />
          Get{" "}
          <span className="anim-chip inline-block rotate-[-3deg] rounded-[0.18em] bg-c-lime px-[0.14em] pb-[0.04em] text-c-ink">
            quizzed.
          </span>
        </h1>
        <p className="mt-[30px] max-w-[520px] text-[20px] leading-[1.45] text-white">
          Pick a sample below and watch QuizliAI turn it into notes, flashcards and a quiz. This is what the app does
          with your own stuff.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-c-ink px-6 text-[15px] font-bold text-white transition-transform duration-150 motion-safe:hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Download for iPhone
          </Link>
          <Link
            href="/note"
            className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-white px-6 text-[15px] font-bold text-white transition-transform duration-150 motion-safe:hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Continue on web
          </Link>
        </div>
        <p className="anim-rise mt-5 text-[18px] font-bold text-white [--d:0.3s] md:text-[20px]">
          Android is coming soon.
        </p>
      </div>
    </section>
  )
}
