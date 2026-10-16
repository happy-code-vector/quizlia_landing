// Server component on purpose: native <details> keeps every answer in the server-rendered HTML.
const faqs = [
  {
    question: "What does QuizliAI do?",
    answer:
      "Get detailed and organized notes from any lecture, meeting, or document. Get study materials made by AI including quizzes, practice exams, flashcards, podcasts, videos and more. QuizliAI helps you improve your grades by using AI that doesn't break your University's honor code.",
  },
  {
    question: "Is QuizliAI ok to use at my school?",
    answer:
      "Yes. QuizliAI only helps you learn and capture key details, it doesn't cheat for you. As long as your professor or teacher is cool with you audio recording the class (we've never seen someone who isn't), you're good to go!",
  },
  {
    question: "Is QuizliAI available for iPhone?",
    answer: "Yes, QuizliAI is available for iPhone! The app is free to download and use.",
  },
  {
    question: "Is QuizliAI available for Android?",
    answer:
      "Android is coming soon. Right now QuizliAI is available for iPhone and iPad, and the web app works in any browser at quizliai.com/note.",
  },
  {
    question: "Is QuizliAI free?",
    answer:
      "Yes, you can download and use QuizliAI for free to get started. For unlimited notes and study materials, you can upgrade to a QuizliAI premium plan at any time.",
  },
]

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
}

export function FAQSection() {
  return (
    <section id="faq" aria-labelledby="faq-h" className="mx-auto w-full max-w-[900px] scroll-mt-4 px-5 pb-[110px] md:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <h2
        id="faq-h"
        className="text-center text-[clamp(40px,6vw,64px)] font-extrabold leading-[0.95] tracking-[-0.05em] text-c-ink"
      >
        Questions, <span className="text-c-brand">answered.</span>
      </h2>
      <div className="mt-12 space-y-3">
        {faqs.map((f) => (
          <details key={f.question} className="reveal group rounded-[20px] border-2 border-c-soft bg-white">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-[18px] px-6 py-4 text-left text-[17px] font-bold text-c-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-brand [&::-webkit-details-marker]:hidden">
              {f.question}
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-c-lime text-[22px] font-bold leading-none text-c-ink transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <p className="px-6 pb-5 text-[16px] leading-relaxed text-c-muted">{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
