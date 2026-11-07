import Link from "next/link"
import Image from "next/image"
import { APP_STORE_URL } from "@/lib/constants"
import { SUPPORT_EMAIL } from "@/lib/support"

const PRIVACY_URL = "https://sites.google.com/view/quizliai-privacy/home"
const TERMS_URL = "https://sites.google.com/view/quizliai-terms/home"

const linkClass =
  "inline-flex min-h-11 items-center text-subheadline text-supporting underline-offset-4 hover:text-label hover:underline"

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-subheadline font-semibold text-label">{title}</h2>
      <ul className="mt-1">{children}</ul>
    </div>
  )
}

// Public site footer (landing, arcade). Help sits here and in Settings (W-9.5).
// Solid welcome bottom stop so it reads on any page behind it.
export function SiteFooter() {
  return (
    <footer className="border-t border-divider bg-[var(--welcome-bottom)]">
      <div className="mx-auto grid w-full max-w-[75rem] gap-8 px-4 py-12 md:grid-cols-2 md:px-6 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2.5">
            <Image src="/logo.png" alt="" width={32} height={32} className="size-8 rounded-[0.5rem]" />
            <span className="text-headline text-label">QuizliAI</span>
          </Link>
          <p className="mt-2 max-w-[22rem] text-subheadline text-supporting">
            Notes, flashcards and quizzes from the lessons you already have.
          </p>
        </div>

        <Column title="Product">
          <li><Link href="/#how-it-works" className={linkClass}>How it works</Link></li>
          <li><Link href="/note/pricing" prefetch={false} className={linkClass}>Pricing</Link></li>
          <li><Link href="/note" prefetch={false} className={linkClass}>Continue on web</Link></li>
          <li>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
              iPhone app<span className="sr-only"> (opens the App Store)</span>
            </a>
          </li>
        </Column>

        <Column title="Company">
          <li><Link href="/#about" className={linkClass}>About</Link></li>
          <li><a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>Help: {SUPPORT_EMAIL}</a></li>
        </Column>

        <Column title="Legal">
          <li>
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Privacy<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Terms<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        </Column>
      </div>
      <p className="mx-auto w-full max-w-[75rem] border-t border-divider px-4 py-6 text-footnote text-supporting md:px-6 lg:px-8">
        © {new Date().getFullYear()} QuizliAI
      </p>
    </footer>
  )
}
