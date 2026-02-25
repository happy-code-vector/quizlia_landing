import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export const metadata = {
  title: 'About — QuizliAI',
  description: 'Learn about our mission and the founder behind QuizliAI.',
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <SiteHeader />
      <main className="flex-1 pt-16">
        {/* Page Hero */}
        <section className="max-w-3xl mx-auto px-4 py-16 md:py-24 text-center">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#964CEE] mb-5">
            Our Story
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5 font-source-serif-4">
            Built with Purpose,<br />Designed with Care
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            We believe the best apps are the ones that quietly make your life a little better every day.
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-[#964CEE] to-[#f15bb5] rounded-full mx-auto mt-8" />
        </section>

        {/* Mission Section */}
        <section className="max-w-4xl mx-auto px-4 pb-20">
          <div className="bg-[#111] border border-white/10 rounded-3xl p-8 md:p-16 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(150,76,238,0.1)_0%,transparent_60%)] pointer-events-none" />

            {/* Decorative quote mark */}
            <div className="absolute top-6 right-12 text-[10rem] leading-none font-source-serif-4 bg-gradient-to-r from-[#964CEE] to-[#f15bb5] bg-clip-text text-transparent opacity-15 pointer-events-none hidden md:block">
              &ldquo;
            </div>

            <div className="relative z-10">
              <span className="text-xs font-bold tracking-widest uppercase bg-gradient-to-r from-[#964CEE] to-[#f15bb5] bg-clip-text text-transparent block mb-6">
                Our Mission
              </span>
              <p className="text-2xl md:text-3xl text-white leading-relaxed mb-8 font-source-serif-4">
                To build mobile experiences that are genuinely useful — thoughtful tools that help people learn more deeply, connect more meaningfully, and live more intentionally.
              </p>
              <p className="text-white/60 leading-relaxed max-w-2xl">
                At QuizliAI, we start with a simple question: <em>does this actually help someone?</em> Not help in a superficial, engagement-bait kind of way — but real, lasting help. The kind that makes a student feel more confident before an exam, or helps a couple feel a little closer at the end of a long day. Every feature we ship, every design decision we make, and every line of code we write is filtered through that question.
              </p>
              <p className="text-white/60 leading-relaxed max-w-2xl mt-4">
                We are a small, independent studio. That means we move carefully, we listen closely, and we take full responsibility for what we put into the world. We don&apos;t answer to outside investors or quarterly growth targets — we answer to the people who use our apps.
              </p>

              {/* Mission Pillars */}
              <div className="grid md:grid-cols-3 gap-6 mt-12 pt-12 border-t border-white/10">
                <div className="flex flex-col gap-2">
                  <div className="text-2xl mb-1">🎯</div>
                  <h4 className="text-sm font-semibold text-white">Purposeful Design</h4>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Every screen we build has a reason to exist. We cut what doesn&apos;t serve the user.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-2xl mb-1">🔒</div>
                  <h4 className="text-sm font-semibold text-white">Privacy by Default</h4>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Your data belongs to you. We build with that as a foundation, not an afterthought.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-2xl mb-1">🌍</div>
                  <h4 className="text-sm font-semibold text-white">Built to Last</h4>
                  <p className="text-xs text-white/50 leading-relaxed">
                    We invest in quality and long-term maintenance, not quick launches and abandonment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Founder Section */}
        <section className="max-w-4xl mx-auto px-4 pb-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-source-serif-4">
              Meet the Founder
            </h2>
            <p className="text-white/50">The person behind the products</p>
          </div>

          <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
            <div className="grid md:grid-cols-[1fr_2fr]">
              {/* Identity Panel */}
              <div className="bg-[#161616] border-b md:border-b-0 md:border-r border-white/10 p-8 md:p-12 flex flex-col items-start gap-0">
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] flex items-center justify-center text-3xl text-white font-source-serif-4 mb-6 shrink-0">
                  A
                </div>
                <div className="text-2xl text-white font-source-serif-4 leading-tight mb-1">
                  Ahmad Rasheed
                </div>
                <div className="text-xs text-[#964CEE] font-semibold tracking-wide mb-8">
                  Founder &amp; Product Lead
                </div>

                <div className="flex flex-col gap-2.5 w-full">
                  <div className="flex items-center gap-2.5 text-xs text-white/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] shrink-0" />
                    <span>Spotify</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] shrink-0" />
                    <span>Morgan Stanley</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] shrink-0" />
                    <span>NYSE / ICE</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] shrink-0" />
                    <span>City National Bank</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] shrink-0" />
                    <span>New York, USA</span>
                  </div>
                </div>
              </div>

              {/* Bio Panel */}
              <div className="p-8 md:p-12">
                <p className="text-white/80 leading-relaxed mb-5">
                  Ahmad Rasheed is a product builder with over a decade of experience designing and launching technology products at some of the world&apos;s most demanding institutions. His career spans companies including <strong className="text-white font-medium">Spotify</strong>, <strong className="text-white font-medium">Morgan Stanley</strong>, <strong className="text-white font-medium">City National Bank</strong>, and <strong className="text-white font-medium">NYSE / Intercontinental Exchange</strong> — environments where the margin for error is small, standards are high, and the products built serve millions of people daily.
                </p>
                <p className="text-white/80 leading-relaxed mb-5">
                  Across those roles, Ahmad has worked at the intersection of <strong className="text-white font-medium">consumer technology and financial infrastructure</strong> — building 0-to-1 products, scaling messaging systems, and shipping revenue-generating platforms used at enterprise scale. That experience shapes everything about how QuizliAI operates: thoughtful scoping, disciplined execution, and a deep respect for the people on the other side of the screen.
                </p>
                <p className="text-white/80 leading-relaxed mb-5">
                  Ahmad founded QuizliAI out of a conviction that <strong className="text-white font-medium">great consumer software is still rare</strong>. Most apps are built to maximize screen time. His goal is different: to build tools that people actually reach for because they&apos;re genuinely useful, beautifully designed, and respectful of the people who use them.
                </p>
                <p className="text-white/80 leading-relaxed">
                  Outside of product work, Ahmad is the creator of an <strong className="text-white font-medium">Islamic educational YouTube channel with over 107,000 subscribers</strong> — a platform he built from the ground up to make meaningful religious education more accessible through animated, long-form content. Growing that audience gave Ahmad firsthand experience in every dimension of building a digital product: content strategy, audience development, retention, and the patience it takes to earn trust with real people over time. That perspective directly informs how he thinks about the apps he builds — not as software, but as ongoing relationships with users. He is based in <strong className="text-white font-medium">New York</strong>, where he lives with his family.
                </p>
              </div>
            </div>

            {/* Tags Footer */}
            <div className="border-t border-white/10 px-8 py-7 flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5">
                📱 Product Management
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5">
                🏦 Fintech
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5">
                🎵 Consumer Tech
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5">
                🤖 AI Applications
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5">
                📍 New York
              </span>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
