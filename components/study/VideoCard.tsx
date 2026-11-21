import Image from "next/image"
import Link from "next/link"
import { Play } from "lucide-react"
import type { StudyPage } from "@/content/study/pages"

// Small YouTube-style card for a study set that has a companion video: still picture, channel, title.
// Picture: YouTube's 320x180 still, loaded straight from YouTube (about 10 KB). On phones the card is a row; from 640 px it is a stacked card.
export function VideoCard({ page, eager = false }: { page: StudyPage; eager?: boolean }) {
  if (!page.video) return null
  return (
    <Link
      href={`/study/${page.slug}`}
      prefetch={false}
      className="ds-card ds-card-link group flex h-full gap-3 overflow-hidden p-3 sm:flex-col sm:gap-0 sm:p-0"
    >
      <span className="relative block aspect-video w-32 shrink-0 overflow-hidden rounded-xl bg-label sm:w-full sm:rounded-none">
        <Image
          src={`https://i.ytimg.com/vi/${page.video.id}/mqdefault.jpg`}
          alt=""
          width={320}
          height={180}
          unoptimized
          priority={eager}
          className="size-full object-cover transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.03] motion-reduce:transition-none"
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-card sm:size-12">
            <Play aria-hidden="true" strokeWidth={1.75} className="ml-0.5 size-5 fill-current" />
          </span>
          <span className="sr-only">Video</span>
        </span>
      </span>
      <span className="min-w-0 sm:p-4">
        <span className="block text-footnote font-semibold uppercase tracking-wide text-rust">{page.video.channel}</span>
        <span className="mt-0.5 block text-headline text-label">{page.title}</span>
        <span className="mt-1 block text-subheadline text-supporting">Flashcards and a quiz</span>
      </span>
    </Link>
  )
}
