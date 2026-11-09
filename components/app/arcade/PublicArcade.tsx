import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { GameIcon } from "@/components/app/GamePicker"
import type { GAMES } from "@/lib/arcade"

/**
 * Public arcade (`/arcade`, signed out) on the welcome family, like the landing page.
 * Takes the game list as a prop so /dev/fixtures/welcome?state=arcade renders the same view (rule 10).
 * One rust capsule above the fold: "Play now". The h1 is the page's one serif line.
 */
export function PublicArcade({ games }: { games: typeof GAMES }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <div aria-hidden="true" className="family-surface family-welcome" />
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[75rem] px-4 pb-16 pt-10 md:px-6 lg:px-8 lg:pb-24 lg:pt-16">
        <section aria-labelledby="arcade-h" className="max-w-[40rem]">
          <p className="text-subheadline font-semibold text-rust-on-tint">Arcade</p>
          <h1 id="arcade-h" className="mt-3 font-serif text-title text-label md:text-large-title lg:text-display">
            Games that make studying stick.
          </h1>
          <p className="mt-4 text-body text-supporting">
            QuizliAI turns your notes into five arcade games. Try any of them on a sample deck right now, with no signup
            and no install.
          </p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
            <Link href="/arcade/match" className="btn-primary h-12 px-7">Play now</Link>
            <Link href="/auth/signup" prefetch={false} className="btn-secondary h-12 px-7">Play with your notes</Link>
          </div>
        </section>

        <section aria-labelledby="games-h" className="mt-12 lg:mt-16">
          <h2 id="games-h" className="text-title2 font-semibold text-label lg:text-title">Five games, one deck</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <li key={game.slug} className="flex">
                <Link
                  href={`/arcade/${game.slug}`}
                  className="ds-card ds-card-link flex w-full flex-col gap-3 p-5"
                >
                  <GameIcon slug={game.slug} size="lg" />
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-title3 font-semibold text-label">{game.name}</span>
                    <span className="text-subheadline text-supporting">{game.tagline}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-subheadline font-semibold text-rust">
                    Play demo<span className="sr-only"> of {game.name}</span>
                    <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
