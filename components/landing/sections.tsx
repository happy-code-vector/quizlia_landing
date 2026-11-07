import Image from "next/image"
import Link from "next/link"
import { BookOpen, Check, ChevronDown, Users } from "lucide-react"
import { APP_STORE_URL } from "@/lib/constants"
import { LazyVideo } from "@/components/landing/lazy-video"

// Landing sections below the hero. Server components: every word is in the server-rendered HTML.
// Section headings are sans (one serif line per screen, lock rule 2; the serif line is the hero h1).

const h2 = "text-title2 font-semibold text-label lg:text-title"
const lead = "mt-2 text-body text-supporting"
const section = "mx-auto w-full max-w-[75rem] scroll-mt-4 px-4 md:px-6 lg:px-8"

export function Primary({ children = "Download for iPhone" }: { children?: React.ReactNode }) {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-headline text-primary-foreground transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-primary-hover active:scale-[0.98] active:bg-primary-active"
    >
      {children}
      <span className="sr-only"> (opens the App Store)</span>
    </a>
  )
}

export function Secondary({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-full border border-divider bg-card px-7 text-headline text-label transition-[border-color,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:border-input active:bg-hover-fill"
    >
      {children}
    </Link>
  )
}

const tiles = [
  {
    step: "1",
    title: "Add a lesson",
    description: "Paste a YouTube link or web page, upload a PDF, or take a photo of a textbook page.",
    video: "/tiles/learn-from-any-link.mp4",
    poster: "/tiles/learn-from-any-link.jpg",
  },
  {
    step: "2",
    title: "Read the notes",
    description: "A two-hour lecture becomes a short set of notes you can read in five minutes.",
    video: "/tiles/youtube-summaries.mp4",
    poster: "/tiles/youtube-summaries.jpg",
  },
  {
    step: "3",
    title: "Take the quiz",
    description: "Flashcards and a quiz from the same lesson show what still needs work before the test.",
    video: "/tiles/quiz-yourself.mp4",
    poster: "/tiles/quiz-yourself.jpg",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-h" className={`${section} py-16 lg:py-24`}>
      <h2 id="how-h" className={h2}>How it works</h2>
      <p className={lead}>One lesson in, a full study set out.</p>
      <ol className="mt-8 grid gap-4 md:grid-cols-3 lg:gap-6">
        {tiles.map((t) => (
          <li key={t.title} className="ds-card p-3">
            <LazyVideo src={t.video} poster={t.poster} label={`${t.title}: demo video`} />
            <div className="px-2 pb-2 pt-4">
              <p className="tabular text-subheadline font-semibold text-rust">Step {t.step}</p>
              <h3 className="mt-1 text-title3 font-semibold text-label">{t.title}</h3>
              <p className="mt-1 text-subheadline text-supporting">{t.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

const audiences = [
  {
    icon: Users,
    eyebrow: "For parents",
    title: "One account, up to four kids",
    points: [
      "A profile for each child, with their own notes and quizzes",
      "Study sets from the books and videos you already teach with",
      "The Family plan covers every profile",
    ],
  },
  {
    icon: BookOpen,
    eyebrow: "For students",
    title: "Study from what you already have",
    points: [
      "Lectures, PDFs, web pages and photos of your notes",
      "History, science, English and languages",
      "Quiz yourself before the test does",
    ],
  },
]

export function Audiences() {
  return (
    <section aria-labelledby="who-h" className={`${section} pb-16 lg:pb-24`}>
      <h2 id="who-h" className={h2}>Made for families and students</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:gap-6">
        {audiences.map((a) => (
          <div key={a.eyebrow} className="ds-card p-6 lg:p-8">
            <span className="grid size-11 place-items-center rounded-full bg-rust-wash">
              <a.icon aria-hidden="true" strokeWidth={1.75} className="size-5 text-rust" />
            </span>
            <p className="mt-4 text-subheadline font-semibold text-rust">{a.eyebrow}</p>
            <h3 className="mt-1 text-title3 font-semibold text-label">{a.title}</h3>
            <ul className="mt-4 space-y-3">
              {a.points.map((p) => (
                <li key={p} className="flex gap-3 text-callout text-label">
                  <Check aria-hidden="true" strokeWidth={2} className="mt-0.5 size-5 shrink-0 text-rust" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

// Live features only (image, PDF, YouTube, web page; notes, flashcards, quizzes; profiles).
const faqs = [
  {
    question: "What does QuizliAI do?",
    answer:
      "QuizliAI turns a YouTube video, PDF, web page or photo of a page into organized notes, flashcards and a quiz, so you can study the material instead of rewriting it.",
  },
  {
    question: "Can I use it for more than one child?",
    answer:
      "Yes. One parent account holds up to four child profiles, and each child keeps their own notes and quizzes. The Family plan covers all of them.",
  },
  {
    question: "Is QuizliAI ok to use at school?",
    answer:
      "Yes. QuizliAI helps you learn the material and check what you know. It does not write assignments for you.",
  },
  {
    question: "Is QuizliAI available for iPhone and Android?",
    answer:
      "QuizliAI is on the App Store for iPhone. Android is coming soon. The web app works in any browser at quizliai.com/note.",
  },
  {
    question: "Is QuizliAI free?",
    answer:
      "You can download QuizliAI and start for free. For unlimited notes and study materials, upgrade to a premium plan at any time.",
  },
]

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
}

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-h" className={`${section} pb-16 lg:pb-24`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mx-auto max-w-[45rem]">
        <h2 id="faq-h" className={h2}>Questions</h2>
        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="ds-card group">
              <summary className="flex min-h-14 list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-headline text-label [&::-webkit-details-marker]:hidden">
                {f.question}
                <ChevronDown
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="size-5 shrink-0 text-supporting transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-open:rotate-180"
                />
              </summary>
              <p className="px-5 pb-5 text-callout text-supporting">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

const companies = ["Spotify", "Morgan Stanley", "NYSE / ICE", "City National Bank"]

export function Founder() {
  return (
    <section id="about" aria-labelledby="about-h" className={`${section} pb-16 lg:pb-24`}>
      <h2 id="about-h" className={h2}>Who builds QuizliAI</h2>
      <div className="ds-card mt-8 grid gap-6 p-6 md:grid-cols-[auto_1fr] md:gap-10 lg:p-10">
        <div>
          <Image
            src="/founder.jpg"
            alt="Ahmad Rasheed"
            width={144}
            height={144}
            sizes="144px"
            className="size-28 rounded-full object-cover md:size-36"
          />
          <p className="mt-4 text-title3 font-semibold text-label">Ahmad Rasheed</p>
          <p className="text-subheadline text-supporting">Founder</p>
        </div>
        <div className="max-w-[40rem] space-y-4 text-body text-label">
          <p>
            Ahmad has spent over a decade building technology products at {companies.slice(0, -1).join(", ")} and{" "}
            {companies[companies.length - 1]}.
          </p>
          <p>
            He built QuizliAI because his kids are in school and he wanted a better way to supplement their schooling at
            home. QuizliAI turns the links, PDFs and pages students already have into notes, flashcards and quizzes, so
            studying takes less setup and more practice.
          </p>
        </div>
      </div>
    </section>
  )
}

export function ClosingCta() {
  return (
    <section aria-labelledby="cta-h" className={`${section} pb-16 lg:pb-24`}>
      <div className="ds-card flex flex-col items-center gap-8 p-8 text-center lg:flex-row lg:justify-between lg:p-12 lg:text-left">
        <div>
          <h2 id="cta-h" className={h2}>Start with the lesson you have today</h2>
          <p className={lead}>Free to download. Android is coming soon.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <Primary />
            <Secondary href="/note">Continue on web</Secondary>
          </div>
        </div>
        <div className="hidden flex-col items-center gap-2 lg:flex">
          <Image src="/app-qr.svg" alt="QR code for QuizliAI on the App Store" width={112} height={112} unoptimized className="size-28 rounded-xl bg-paper p-2" />
          <p className="text-footnote text-supporting">Scan with your iPhone camera</p>
        </div>
      </div>
    </section>
  )
}
