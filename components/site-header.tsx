import Link from "next/link"
import Image from "next/image"
import { APP_STORE_URL } from "@/lib/constants"

const links = [
  { href: "#demo", label: "Try it" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
  { href: "#about", label: "About" },
]

export function SiteHeader() {
  return (
    <header className="relative z-10">
      <div className="mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between px-5 md:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white">
            <Image src="/logo.png" alt="" width={36} height={36} className="h-full w-full object-cover" priority />
          </span>
          <span className="text-xl font-extrabold tracking-[-0.03em] text-white">QuizliAI</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded text-[15px] font-semibold text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-c-ink px-6 text-[15px] font-bold text-white transition-transform duration-150 motion-safe:hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Download
        </Link>
      </div>
    </header>
  )
}
