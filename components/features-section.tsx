import { Upload, MessageSquare, Brain, Smartphone, Globe, Zap } from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: Upload,
      title: "Upload",
      description: "Use anything — links, videos, documents, websites, YouTube videos, PDFs."
    },
    {
      icon: Brain,
      title: "Get beautiful notes",
      description: "Notes and transcripts, organized and instant"
    },
    {
      icon: MessageSquare,
      title: "AI Chat",
      description: "Ask your notes anything"
    },
    {
      icon: Globe,
      title: "Learn in multiple languages",
      description: "Translate and learn in multiple languages"
    },
    {
      icon: Zap,
      title: "Quizzes & Flashcards",
      description: "Let AI generate study materials for you"
    },
    {
      icon: Zap,
      title: "Study Games",
      description: "Make studying more fun with short games that help you learn",
      comingSoon: true
    }
  ]

  return (
    <section id="features" className="md:pb-20 mt-[120px] md:mt-[180px]">
      <div className="container px-4 md:px-6 max-w-[1200px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-white font-rethink-sans text-[26px] md:text-[32px] font-bold leading-[46.8px] mb-4">
            Capture, organize, and learn 10x faster
            </h2>
          <p className="mx-auto px-4 md:px-0 max-w-[280px] md:max-w-[500px] text-center font-rethink-sans text-[16px] md:text-[18px] font-medium leading-[1.3] md:leading-[22.4px] tracking-[0.32px] text-white/50">
            Everything you need to turn any content into organized notes and study materials
            </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-0 max-w-[1200px] mx-auto relative w-full before:hidden md:before:block before:content-[''] before:absolute before:top-[50%] before:left-0 before:w-full before:h-px before:bg-[linear-gradient(90deg,rgba(150,76,238,0.00)_0%,rgba(150,76,238,0.20)_50%,rgba(150,76,238,0.00)_100%)]">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const isLastRow = index >= 3
            const isLastColumn = (index + 1) % 3 === 0

            return (
              <article 
                key={index}
                className={`px-0 py-8 md:p-8 relative ${
                  !isLastColumn ? 'after:hidden md:after:block after:content-[""] after:absolute after:top-0 after:right-0 after:w-px after:h-full after:bg-[linear-gradient(180deg,rgba(150,76,238,0.00)_0%,rgba(150,76,238,0.20)_100%)]' : ''
                } ${
                  !isLastRow ? 'before:md:hidden before:block before:content-[""] before:absolute before:bottom-0 before:left-0 before:w-full before:h-px before:bg-[linear-gradient(90deg,rgba(150,76,238,0.00)_0%,rgba(150,76,238,0.20)_50%,rgba(150,76,238,0.00)_100%)]' : ''
                }`}
              >
                <div className="mb-4">
                  <Icon className="w-5 h-5 text-[#964CEE]" />
                </div>
                <h3 className="text-white font-rethink-sans text-[18px] font-semibold leading-[22.4px] tracking-[0.32px] mb-2 flex items-center gap-2">
                  {feature.title}
                  {feature.comingSoon && (
                    <span className="text-xs px-3 py-1 rounded-full border border-[#964CEE]/50 bg-[#964CEE]/10 text-[#964CEE]">
                      Coming Soon
                    </span>
                  )}
                </h3>
                <p className="text-white/50 font-rethink-sans text-[14px] font-medium leading-[22.4px] tracking-[0.32px]">
                  {feature.description}
              </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}