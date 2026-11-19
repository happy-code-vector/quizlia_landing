import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Quiz } from "@/components/study/Quiz"
import { DownloadRail } from "@/components/study/DownloadRail"
import { studyStoreUrl } from "@/lib/campaign"
import { getStudyPage, studyPages } from "@/content/study/pages"

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false
export function generateStaticParams() {
  return studyPages.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = getStudyPage(slug)
  if (!page) return {}
  const description = page.video
    ? `Study guide for "${page.video.title}" by ${page.video.channel}: a short summary, 3 flashcards and a 3-question quiz.`
    : `${page.title}: a short summary, 3 flashcards and a 3-question quiz.`
  return {
    title: `${page.title}: flashcards and quiz | QuizliAI`,
    description,
    alternates: { canonical: `https://www.quizliai.com/study/${page.slug}` },
    robots: page.status === "live" ? undefined : { index: false, follow: false },
    openGraph: { title: page.title, description, url: `/study/${page.slug}`, images: [{ url: "/og.png", width: 1200, height: 630 }] },
  }
}

export default async function StudyPageRoute({ params }: Props) {
  const { slug } = await params
  const page = getStudyPage(slug)
  if (!page) notFound()

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <div aria-hidden="true" className="family-surface family-welcome" />
      <SiteHeader />
      <div className="mx-auto w-full max-w-[66rem] px-4 pb-28 pt-8 md:px-6 lg:grid lg:grid-cols-[minmax(0,45rem)_17rem] lg:justify-center lg:gap-10 lg:pb-16 lg:pt-12">
      <main id="main" className="min-w-0">
        <p className="text-subheadline font-semibold text-rust-on-tint">{page.subject}</p>
        <h1 className="mt-1 font-serif text-large-title text-label">{page.title}</h1>
        <p className="mt-4 text-body text-label">{page.context}</p>

        {page.video && (
          <figure className="mt-8">
            <div className="ds-card aspect-video w-full overflow-hidden">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${page.video.id}`}
                title={`${page.video.title} by ${page.video.channel}`}
                loading="lazy"
                allow="encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="size-full border-0"
              />
            </div>
            <figcaption className="mt-3 text-subheadline text-supporting">
              Study guide for{" "}
              <a href={`https://www.youtube.com/watch?v=${page.video.id}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-label">
                {page.video.title}
              </a>{" "}
              by {page.video.channel} on YouTube. This page is our own summary and questions. The channel did not make or approve it.
            </figcaption>
          </figure>
        )}

        <h2 className="mt-10 text-title3 font-semibold text-label">3 flashcards</h2>
        <div className="mt-3 space-y-3">
          {page.flashcards.map((c) => (
            <details key={c.q} className="ds-card group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-headline text-label [&::-webkit-details-marker]:hidden">
                {c.q}
                <ChevronDown aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-supporting transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-5 text-callout text-supporting">{c.a}</p>
            </details>
          ))}
        </div>

        <h2 className="mt-10 text-title3 font-semibold text-label">3 quiz questions</h2>
        <div className="mt-3">
          <Quiz items={page.quiz} />
        </div>

        <section aria-labelledby="unlock-h" className="ds-card mt-10 flex flex-col items-center gap-4 p-8 text-center">
          <h2 id="unlock-h" className="text-title3 font-semibold text-label">Want the full experience?</h2>
          <p className="text-callout text-supporting">Make notes, flashcards and quizzes from any YouTube link, PDF or photo.</p>
          <a
            href={studyStoreUrl(page.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-headline text-primary-foreground transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-primary-hover active:scale-[0.98] active:bg-primary-active"
          >
            Download QuizliAI
            <span className="sr-only"> (opens the App Store)</span>
          </a>
        </section>
        <p className="mt-6 text-center text-subheadline"><Link href="/study" prefetch={false} className="text-supporting underline underline-offset-4 hover:text-label">More free study sets</Link></p>
        {page.status === "draft" && <p className="mt-6 text-footnote text-supporting">Draft preview. Not public.</p>}
      </main>
      <DownloadRail slug={page.slug} />
      </div>
      <SiteFooter />
    </>
  )
}
