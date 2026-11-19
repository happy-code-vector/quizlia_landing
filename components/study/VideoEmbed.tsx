"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"

// Click-to-play video. The YouTube player is heavy (about 3 seconds on a first visit), so the page shows a
// still picture with a play button and loads the player only when the reader presses it.
export function VideoEmbed({ id, title, channel }: { id: string; title: string; channel?: string }) {
  const [on, setOn] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)

  if (on) {
    return (
      <iframe
        ref={frame}
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={`${title}${channel ? ` by ${channel}` : ""}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        onLoad={() => frame.current?.focus()}
        className="size-full border-0"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOn(true)}
      aria-label={`Play video: ${title}${channel ? ` by ${channel}` : ""}`}
      className="group relative block size-full overflow-hidden bg-label"
    >
      <Image
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        fill
        priority
        unoptimized
        sizes="(min-width: 768px) 720px, 100vw"
        className="object-cover"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
      <span className="absolute inset-x-0 bottom-0 p-4 text-left text-white md:p-5">
        <span className="block text-footnote font-semibold uppercase tracking-wide text-white/80">Watch on YouTube{channel ? ` · ${channel}` : ""}</span>
        <span className="mt-0.5 line-clamp-2 block text-headline">{title}</span>
      </span>
      <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-card transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-105 group-active:scale-95">
        <Play aria-hidden="true" strokeWidth={1.75} className="ml-0.5 size-7 fill-current" />
      </span>
    </button>
  )
}
