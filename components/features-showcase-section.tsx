import { LazyVideo } from "@/components/landing/lazy-video"

const tiles = [
  {
    title: "Learn from any link",
    description: "Paste any link and get notes and study materials right away.",
    video: "/Learn_Anything_From_a_Link_version_1.mp4",
    poster: "/posters/Learn_Anything_From_a_Link.jpg",
    bg: "bg-c-soft",
  },
  {
    title: "YouTube summaries",
    description: "That 2-hour lecture becomes a 5-minute read.",
    video: "/Instant_YouTube_Summaries_version_1.mp4",
    poster: "/posters/Instant_YouTube_Summaries.jpg",
    bg: "bg-c-mint",
  },
  {
    title: "Quiz yourself",
    description: "QuizliAI writes the questions, so you find the gaps before the test does.",
    video: "/Quiz_Yourself_Instantly_version_1.mp4",
    poster: "/posters/Quiz_Yourself_Instantly.jpg",
    bg: "bg-c-peach",
  },
]

export function FeaturesShowcaseSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-h"
      className="mx-auto w-full max-w-[1200px] scroll-mt-4 px-5 pb-[130px] pt-[110px] md:px-10"
    >
      <h2
        id="how-h"
        className="reveal text-center text-[clamp(40px,6vw,64px)] font-extrabold leading-[0.95] tracking-[-0.05em] text-c-ink"
      >
        Your whole study set,
        <br />
        <span className="text-c-brand">from one link.</span>
      </h2>

      <ul className="mt-14 grid gap-5 md:grid-cols-3">
        {tiles.map((t) => (
          <li
            key={t.title}
            className={`reveal ${t.bg} rounded-[24px] px-[14px] pb-6 pt-[14px] transition-transform duration-200 motion-safe:hover:-translate-y-1.5 motion-safe:hover:-rotate-1`}
          >
            <LazyVideo src={t.video} poster={t.poster} label={`${t.title}: demo video`} />
            <h3 className="mt-5 px-2 text-[24px] font-extrabold tracking-[-0.03em] text-c-ink">{t.title}</h3>
            <p className="mt-1.5 px-2 text-[16px] leading-snug text-c-muted">{t.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
