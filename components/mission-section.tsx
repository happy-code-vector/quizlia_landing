export function MissionSection() {
  return (
    <section id="mission" className="w-full max-w-[1200px] mx-auto px-4 mt-[100px] mb-[100px]">
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
            <p className="text-white/60 leading-relaxed">
              At QuizliAI, we start with a simple question: <em>does this actually help someone?</em> Not help in a superficial, engagement-bait kind of way — but real, lasting help. The kind that makes a student feel more confident before an exam, or helps a couple feel a little closer at the end of a long day. Every feature we ship, every design decision we make, and every line of code we write is filtered through that question.
            </p>
            <p className="text-white/60 leading-relaxed mt-4">
              We are a small, independent studio. That means we move carefully, we listen closely, and we take full responsibility for what we put into the world. We don&apos;t answer to outside investors or quarterly growth targets — we answer to the people who use our apps.
            </p>

            {/* Mission Pillars */}
            <div className="grid md:grid-cols-3 gap-6 mt-12 pt-12 border-t border-white/10">
              <div className="flex flex-col gap-2">
                <div className="text-2xl mb-1">🎯</div>
                <h4 className="text-sm font-semibold text-white font-rethink-sans">Purposeful Design</h4>
                <p className="text-xs text-white/50 leading-relaxed font-rethink-sans">
                  Every screen we build has a reason to exist. We cut what doesn&apos;t serve the user.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-2xl mb-1">🔒</div>
                <h4 className="text-sm font-semibold text-white font-rethink-sans">Privacy by Default</h4>
                <p className="text-xs text-white/50 leading-relaxed font-rethink-sans">
                  Your data belongs to you. We build with that as a foundation, not an afterthought.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-2xl mb-1">🌍</div>
                <h4 className="text-sm font-semibold text-white font-rethink-sans">Built to Last</h4>
                <p className="text-xs text-white/50 leading-relaxed font-rethink-sans">
                  We invest in quality and long-term maintenance, not quick launches and abandonment.
                </p>
              </div>
            </div>
          </div>
      </div>
    </section>
  )
}
