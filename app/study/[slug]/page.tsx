import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronDown, ChevronRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Quiz } from "@/components/study/Quiz"
import { VideoEmbed } from "@/components/study/VideoEmbed"
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

  // Up to 3 other live sets: same subject first, rotated by slug so pages do not all point at the same sets.
  const live = studyPages.filter((p) => p.status === "live" && p.slug !== page.slug)
  const same = live.filter((p) => p.subject === page.subject)
  const start = same.length ? [...page.slug].reduce((n, c) => n + c.charCodeAt(0), 0) % same.length : 0
  const related = [...same.slice(start), ...same.slice(0, start), ...live.filter((p) => p.subject !== page.subject)].slice(0, 3)

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <div aria-hidden="true" className="family-surface family-welcome" />
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[45rem] px-4 pb-28 pt-8 md:px-6 lg:pb-16 lg:pt-12">
        <p className="text-subheadline font-semibold text-rust-on-tint">{page.subject}</p>
        <h1 className="mt-1 font-serif text-large-title text-label">{page.title}</h1>
        <p className="mt-4 text-body text-label">{page.context}</p>

        {page.video && (
          <figure className="mt-8">
            <div className="ds-card aspect-video w-full overflow-hidden">
              <VideoEmbed id={page.video.id} title={page.video.title} channel={page.video.channel} />
            </div>
            <figcaption className="mt-3 text-subheadline text-supporting">
              Study guide for{" "}
              <a href={`https://www.youtube.com/watch?v=${page.video.id}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-label">
                {page.video.title}
                <span className="sr-only"> (opens in a new tab)</span>
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
          <Quiz items={page.quiz} storeUrl={studyStoreUrl(page.slug, "r")} />
        </div>

        <section aria-labelledby="keep-h" className="mt-12">
          <h2 id="keep-h" className="text-title2 font-semibold text-label">Keep studying</h2>
          <p className="mt-1 text-callout text-supporting">More free sets to try next.</p>
          <ul className="mt-4 space-y-3">
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={`/study/${p.slug}`} prefetch={false} className="ds-card ds-card-link flex min-h-14 items-center justify-between gap-3 px-5 py-4">
                  <span className="flex min-w-0 items-center gap-3">
                    {p.video && (
                      <Image
                        src={`https://i.ytimg.com/vi/${p.video.id}/mqdefault.jpg`}
                        alt=""
                        width={96}
                        height={54}
                        unoptimized
                        className="aspect-video w-24 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block text-subheadline font-semibold text-rust">{p.subject}{p.video ? " · Video" : ""}</span>
                      <span className="block text-headline text-label">{p.title}</span>
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-supporting" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4">
            <Link href="/study" prefetch={false} className="inline-flex min-h-11 items-center text-subheadline font-semibold text-rust-on-tint underline-offset-4 hover:underline">
              See all free study sets
            </Link>
          </p>
        </section>

        <section aria-labelledby="make-h" className="mt-12 rounded-2xl bg-primary px-6 py-8 text-primary-foreground md:px-10 md:py-10">
          <h2 id="make-h" className="text-title2 font-semibold">Study anything, not just this.</h2>
          <p className="mt-2 max-w-[30rem] text-callout">Paste a YouTube link, PDF or photo. QuizliAI makes the notes, flashcards and quiz for you.</p>
          <a
            href={studyStoreUrl(page.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-paper px-7 text-headline text-on-paper transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:opacity-90 active:scale-[0.98]"
          >
            Download QuizliAI
            <span className="sr-only"> (opens the App Store)</span>
          </a>
        </section>
        {page.status === "draft" && <p className="mt-6 text-footnote text-supporting">Draft preview. Not public.</p>}
      </main>
      <DownloadRail slug={page.slug} />
      <SiteFooter />
      {/* Room for the fixed download bar on phones, so the last footer line stays visible. */}
      <div aria-hidden="true" className="h-24 lg:hidden" />
    </>
  )
}
