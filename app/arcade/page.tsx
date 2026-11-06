// app/arcade/page.tsx
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GAMES } from "@/lib/arcade";

export const metadata = {
  title: "Arcade — QuizliAI",
  description: "Five arcade games built from your notes. Play a demo instantly — no signup.",
};

export default function ArcadePage() {
  return (
    <div className="min-h-screen bg-[#0d0a1a] text-white">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-5 pb-24 md:px-10">
        <section className="flex flex-col items-center pb-16 pt-10 text-center">
          <Image
            src="/mascot/quizliai_mascot_celebrate.webp"
            alt="QuizliAI mascot celebrating"
            width={180}
            height={180}
            priority
            className="mb-6"
          />
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Games that make studying{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              addictive
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/70">
            QuizliAI turns your notes into five arcade games. Try any of them right now on a
            sample deck — no signup, no install.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/arcade/match"
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
            >
              Play now
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-xl border border-white/30 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Play YOUR notes — free
            </Link>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => (
            <Link
              key={game.slug}
              href={`/arcade/${game.slug}`}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/30 hover:bg-white/10"
            >
              <div className={`mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${game.accent} text-3xl`}>
                {game.icon}
              </div>
              <h2 className="text-xl font-bold">{game.name}</h2>
              <p className="mt-1 flex-1 text-sm text-white/70">{game.tagline}</p>
              <span className="mt-4 text-sm font-semibold text-purple-300 group-hover:text-purple-200">
                Play demo →
              </span>
            </Link>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
