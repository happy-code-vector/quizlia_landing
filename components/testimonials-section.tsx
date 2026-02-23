import Image from "next/image"

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah Chen",
      handle: "@sarahstudies",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop",
      quote: "I didn't expect much when I downloaded the app but tracking my progress was surprisingly easy. Quizli helped me ace my finals. By following the AI-generated study materials my grades improved and I feel more confident."
    },
    {
      name: "Michael Torres",
      handle: "@miketorres",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
      quote: "At first I doubted how accurate an AI note-taker could be. But after using it for a few months I was shocked at how accurate it was. The app considers my learning patterns and habits, making it feel personalized rather than random."
    },
    {
      name: "Emma Rodriguez",
      handle: "@emmarodriguez",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop",
      quote: "The AI chat feature is a game changer. It's not just about taking notes but it's about learning from them effectively. Asking questions and getting instant answers keeps me motivated. QuizliAI has made a huge difference in my studies."
    }
  ]

  return (
    <section className="w-full max-w-[1200px] mx-auto px-4 mt-[120px] md:mt-[180px]">
      {/* Section Header */}
      <header className="text-left mb-8">
        <span className="text-[16px] text-[#964CEE] font-rethink-sans border border-[#964CEE]/30 px-4 py-2 rounded-full bg-[#964CEE]/10 shadow-[inset_0px_1px_10px_0px_rgba(150,76,238,0.1)] inline-block mb-[10px]">
          Users feedback
        </span>
        <h2 className="mt-4 text-[26px] md:text-[40px] font-bold text-white font-rethink-sans leading-[35px] md:leading-[45px] flex flex-col">
          <span>There's a reason thousands rely on our app to</span>
          <div className="flex flex-col md:flex-row md:gap-2">
            <span>optimize their learning,</span>
            <span className="text-white/40">try it yourself.</span>
          </div>
        </h2>
        <p className="mt-4 text-[18px] text-white/50 w-full max-w-[734px]">
          It's not a miracle fix, but for many QuizliAI has helped them take real, measurable steps toward maximizing their learning potential and that's what truly matters.
        </p>
      </header>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 items-start mt-[60px]">
        {testimonials.map((testimonial, index) => (
          <article 
            key={index}
            className="w-full flex flex-col justify-between bg-[#0D0D0D] rounded-[20px] p-6 border border-[#964CEE]/20 hover:border-[#964CEE]/40 transition-all duration-300"
          >
            <blockquote>
              <p className="text-white/60 font-rethink-sans text-[16px] md:text-[18px] font-normal leading-[29.333px] mb-6">
                {testimonial.quote}
              </p>
            </blockquote>
            <footer>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                  <Image
                      alt={`Profile picture of ${testimonial.name}`}
                      width={40}
                      height={40}
                      className="rounded-full ring-2 ring-[#964CEE]/30"
                      src={testimonial.avatar}
                  />
                </div>
                <div>
                    <p className="text-white font-medium font-rethink-sans">
                      {testimonial.name}
                    </p>
                    <p className="text-white/50 text-sm font-rethink-sans">
                      {testimonial.handle}
                    </p>
                </div>
                </div>
              </div>
              <div className="flex gap-1 mt-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-[#964CEE]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </footer>
          </article>
        ))}
      </div>
    </section>
  )
}