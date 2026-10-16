import { FounderAvatar } from "@/components/founder-avatar"

export function FounderSection() {
  return (
    <section id="about" aria-labelledby="about-h" className="w-full max-w-[1200px] mx-auto scroll-mt-4 px-5 md:px-10 pb-[110px]">

        <div className="text-center mb-14">
          <h2 id="about-h" className="mb-3 text-[clamp(40px,6vw,64px)] font-extrabold leading-[0.95] tracking-[-0.05em] text-c-ink">
            Meet the Founder
          </h2>
          <p className="text-c-muted">The person behind the products</p>
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
                <div className="flex items-center gap-2.5 text-xs text-c-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-c-brand shrink-0" />
                  <span>New York, USA</span>
                </div>
              </div>
            </div>

            {/* Bio Panel */}
            <div className="p-8 md:p-12">
              <p className="text-c-ink leading-relaxed mb-5">
                Ahmad Rasheed is a product builder with over a decade of experience designing and launching technology products at some of the world&apos;s most demanding institutions. His career spans companies including <strong className="font-bold text-c-ink">Spotify</strong>, <strong className="font-bold text-c-ink">Morgan Stanley</strong>, <strong className="font-bold text-c-ink">City National Bank</strong>, and <strong className="font-bold text-c-ink">NYSE / Intercontinental Exchange</strong>, environments where the margin for error is small, standards are high, and the products built serve millions of people daily.
              </p>
              <p className="text-c-ink leading-relaxed mb-5">
                Across those roles, Ahmad has worked at the intersection of <strong className="font-bold text-c-ink">consumer technology and financial infrastructure</strong>, building 0-to-1 products, scaling messaging systems, and shipping revenue-generating platforms used at enterprise scale. That experience shapes everything about how QuizliAI operates: thoughtful scoping, disciplined execution, and a deep respect for the people on the other side of the screen.
              </p>
              <p className="text-c-ink leading-relaxed mb-5">
                Ahmad founded QuizliAI out of a conviction that <strong className="font-bold text-c-ink">great consumer software is still rare</strong>. Most apps are built to maximize screen time. His goal is different: to build tools that people actually reach for because they&apos;re genuinely useful, beautifully designed, and respectful of the people who use them.
              </p>
              <p className="text-c-ink leading-relaxed">
                Outside of product work, Ahmad is the creator of an <strong className="font-bold text-c-ink">Islamic educational YouTube channel with over 107,000 subscribers</strong>, a platform he built from the ground up to make meaningful religious education more accessible through animated, long-form content. Growing that audience gave Ahmad firsthand experience in every dimension of building a digital product: content strategy, audience development, retention, and the patience it takes to earn trust with real people over time. That perspective directly informs how he thinks about the apps he builds: not as software, but as ongoing relationships with users. He is based in <strong className="font-bold text-c-ink">New York</strong>, where he lives with his family.
              </p>
            </div>
          </div>

          {/* Tags Footer */}
          <div className="border-t-2 border-c-soft px-8 py-7 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-c-muted bg-c-page border border-c-soft rounded-full px-3.5 py-1.5">
              📱 Product Management
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-c-muted bg-c-page border border-c-soft rounded-full px-3.5 py-1.5">
              🏦 Fintech
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-c-muted bg-c-page border border-c-soft rounded-full px-3.5 py-1.5">
              🎵 Consumer Tech
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-c-muted bg-c-page border border-c-soft rounded-full px-3.5 py-1.5">
              🤖 AI Applications
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-c-muted bg-c-page border border-c-soft rounded-full px-3.5 py-1.5">
              📍 New York
            </span>
          </div>
        </div>
    </section>
  )
}
