export function FounderSection() {
  return (
    <section id="about" className="w-full max-w-[1200px] mx-auto px-4 mt-[100px] mb-[100px]">

        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-source-serif-4">
            Meet the Founder
          </h2>
          <p className="text-white/50 font-rethink-sans">The person behind the products</p>
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
              <div className="text-xs text-[#964CEE] font-semibold tracking-wide mb-8 font-rethink-sans">
                Founder &amp; Product Lead
              </div>

              <div className="flex flex-col gap-2.5 w-full">
                <div className="flex items-center gap-2.5 text-xs text-white/50 font-rethink-sans">
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] shrink-0" />
                  <span>Spotify</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-white/50 font-rethink-sans">
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] shrink-0" />
                  <span>Morgan Stanley</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-white/50 font-rethink-sans">
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] shrink-0" />
                  <span>NYSE / ICE</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-white/50 font-rethink-sans">
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] shrink-0" />
                  <span>City National Bank</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-white/50 font-rethink-sans">
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] shrink-0" />
                  <span>New York, USA</span>
                </div>
              </div>
            </div>

            {/* Bio Panel */}
            <div className="p-8 md:p-12">
              <p className="text-white/80 leading-relaxed mb-5 font-rethink-sans">
                Ahmad Rasheed is a product builder with over a decade of experience designing and launching technology products at some of the world&apos;s most demanding institutions. His career spans companies including <strong className="text-white font-medium">Spotify</strong>, <strong className="text-white font-medium">Morgan Stanley</strong>, <strong className="text-white font-medium">City National Bank</strong>, and <strong className="text-white font-medium">NYSE / Intercontinental Exchange</strong> — environments where the margin for error is small, standards are high, and the products built serve millions of people daily.
              </p>
              <p className="text-white/80 leading-relaxed mb-5 font-rethink-sans">
                Across those roles, Ahmad has worked at the intersection of <strong className="text-white font-medium">consumer technology and financial infrastructure</strong> — building 0-to-1 products, scaling messaging systems, and shipping revenue-generating platforms used at enterprise scale. That experience shapes everything about how QuizliAI operates: thoughtful scoping, disciplined execution, and a deep respect for the people on the other side of the screen.
              </p>
              <p className="text-white/80 leading-relaxed mb-5 font-rethink-sans">
                Ahmad founded QuizliAI out of a conviction that <strong className="text-white font-medium">great consumer software is still rare</strong>. Most apps are built to maximize screen time. His goal is different: to build tools that people actually reach for because they&apos;re genuinely useful, beautifully designed, and respectful of the people who use them.
              </p>
              <p className="text-white/80 leading-relaxed font-rethink-sans">
                Outside of product work, Ahmad is the creator of an <strong className="text-white font-medium">Islamic educational YouTube channel with over 107,000 subscribers</strong> — a platform he built from the ground up to make meaningful religious education more accessible through animated, long-form content. Growing that audience gave Ahmad firsthand experience in every dimension of building a digital product: content strategy, audience development, retention, and the patience it takes to earn trust with real people over time. That perspective directly informs how he thinks about the apps he builds — not as software, but as ongoing relationships with users. He is based in <strong className="text-white font-medium">New York</strong>, where he lives with his family.
              </p>
            </div>
          </div>

          {/* Tags Footer */}
          <div className="border-t border-white/10 px-8 py-7 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 font-rethink-sans">
              📱 Product Management
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 font-rethink-sans">
              🏦 Fintech
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 font-rethink-sans">
              🎵 Consumer Tech
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 font-rethink-sans">
              🤖 AI Applications
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 font-rethink-sans">
              📍 New York
            </span>
          </div>
        </div>
    </section>
  )
}
