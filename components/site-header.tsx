import Link from "next/link"
import Image from "next/image"

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#demo", label: "Try it" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#about", label: "About" },
]

// Public site header (landing, arcade). Solid welcome top stop (W-3.3) so it reads on any page behind it.
// One rust capsule per screen lives in the hero, so the header action is the secondary capsule (lock rule 4).
export function SiteHeader() {
  return (
    <header className="bg-[var(--welcome-top)]">
      <div className="mx-auto flex h-16 w-full max-w-[75rem] items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-full">
          <Image src="/logo.png" alt="" width={32} height={32} className="size-8 rounded-[0.5rem]" />
          <span className="text-headline text-label">QuizliAI</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-subheadline font-semibold text-supporting hover:text-label"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/auth/login"
            className="hidden min-h-11 items-center rounded-full px-3 text-subheadline font-semibold text-label underline-offset-4 hover:underline sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/note"
            className="inline-flex h-11 items-center rounded-full border border-divider bg-card px-4 text-subheadline font-semibold text-label transition-[border-color,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:border-input active:bg-hover-fill"
          >
            Continue on web
          </Link>
        </div>
      </div>
    </header>
  )
}
