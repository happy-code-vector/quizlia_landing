import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, Play } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { studyPages } from "@/content/study/pages"
import { studyStoreUrl } from "@/lib/campaign"
import { DownloadRail } from "@/components/study/DownloadRail"

const title = "Free study sets: flashcards and quizzes"
const description = "Free study sets on history, English, science and math. Each one has a short summary, 3 flashcards and a 3-question quiz."

export const metadata: Metadata = {
  title: `${title} | QuizliAI`,
  description,
  alternates: { canonical: "https://www.quizliai.com/study" },
  openGraph: { title, description, url: "/study", images: [{ url: "/og.png", width: 1200, height: 630 }] },
}

const ORDER = ["History", "English", "Biology", "Chemistry", "Physics", "Earth science", "Math"]

export default function StudyHub() {
  const live = studyPages.filter((p) => p.status === "live")
  const subjects = [...ORDER, ...Array.from(new Set(live.map((p) => p.subject))).filter((s) => !ORDER.includes(s))]
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <div aria-hidden="true" className="family-surface family-welcome" />
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[75rem] px-4 pb-28 pt-8 md:px-6 lg:px-8 lg:pb-16 lg:pr-40 lg:pt-12">
        <h1 className="font-serif text-large-title text-label">Free study sets</h1>
        <p className="mt-3 max-w-[40rem] text-body text-supporting">
          A short summary, 3 flashcards and a 3-question quiz on each topic. Free to read and try.
        </p>

        {subjects.map((subject) => {
          const items = live.filter((p) => p.subject === subject)
          if (items.length === 0) return null
          return (
            <section key={subject} aria-labelledby={`h-${subject}`} className="mt-10">
              <h2 id={`h-${subject}`} className="text-title2 font-semibold text-label">{subject}</h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/study/${p.slug}`}
                      prefetch={false}
                      className="ds-card ds-card-link flex min-h-14 items-center justify-between gap-3 px-5 py-4"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-headline text-label">{p.title}{p.video && (<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rust-wash px-2 py-0.5 text-footnote font-semibold text-rust"><Play aria-hidden="true" strokeWidth={1.75} className="size-3 fill-current" />Video</span>)}</span>
                      <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-supporting" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        <section aria-labelledby="hub-cta" className="ds-card mt-12 flex flex-col items-center gap-4 p-8 text-center">
          <h2 id="hub-cta" className="text-title3 font-semibold text-label">Want the full experience?</h2>
          <p className="text-callout text-supporting">Make notes, flashcards and quizzes from any YouTube link, PDF or photo.</p>
          <a
            href={studyStoreUrl("hub")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-headline text-primary-foreground transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-primary-hover active:scale-[0.98] active:bg-primary-active"
          >
            Download QuizliAI
            <span className="sr-only"> (opens the App Store)</span>
          </a>
        </section>
      </main>
      <DownloadRail slug="hub" />
      <SiteFooter />
      {/* Room for the fixed download bar on phones, so the last footer line stays visible. */}
      <div aria-hidden="true" className="h-24 lg:hidden" />
    </>
  )
}
