import { FounderAvatar } from "@/components/founder-avatar"

export function FounderSection() {
  return (
    <section id="about" aria-labelledby="about-h" className="w-full max-w-[1200px] mx-auto scroll-mt-4 px-5 md:px-10 pb-[110px]">

        <div className="text-center mb-14">
          <h2 id="about-h" className="mb-3 text-[clamp(40px,6vw,64px)] font-extrabold leading-[0.95] tracking-[-0.05em] text-c-ink">
            Meet the Founder
          </h2>
          <p className="text-c-muted">The person behind QuizliAI</p>
        </div>

        <div className="reveal bg-white border-2 border-c-soft rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-[1fr_2fr]">
            {/* Identity Panel */}
            <div className="bg-c-soft p-8 md:p-12 flex flex-col items-start gap-0">
              <FounderAvatar />
              <div className="text-2xl font-extrabold tracking-[-0.03em] text-c-ink leading-tight mb-1">
                Ahmad Rasheed
              </div>
              <div className="text-xs text-c-brand-ink font-bold tracking-wide mb-8">
                Founder &amp; Product Lead
              </div>

              <div className="flex flex-col gap-2.5 w-full">
                <div className="flex items-center gap-2.5 text-xs text-c-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-c-brand shrink-0" />
                  <span>Spotify</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-c-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-c-brand shrink-0" />
                  <span>Morgan Stanley</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-c-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-c-brand shrink-0" />
                  <span>NYSE / ICE</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-c-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-c-brand shrink-0" />
                  <span>City National Bank</span>
                </div>
              </div>
            </div>

            {/* Bio Panel */}
            <div className="p-8 md:p-12">
              <p className="text-c-ink leading-relaxed mb-5">
                Ahmad Rasheed has spent over a decade building technology products at <strong className="font-bold text-c-ink">Spotify</strong>, <strong className="font-bold text-c-ink">Morgan Stanley</strong>, <strong className="font-bold text-c-ink">City National Bank</strong>, and <strong className="font-bold text-c-ink">NYSE / Intercontinental Exchange</strong>.
              </p>
              <p className="text-c-ink leading-relaxed mb-5">
                He built QuizliAI because his kids are in school and he wanted a way to <strong className="font-bold text-c-ink">supplement their schooling</strong> at home. QuizliAI turns the links, PDFs and websites students already have into notes, flashcards and quizzes, so studying takes less setup and more practice.
              </p>
              <p className="text-c-ink leading-relaxed">
                Outside of work, he loves spending time with his family.
              </p>
            </div>
          </div>
        </div>
    </section>
  )
}
