import Image from "next/image"
import { Upload } from "lucide-react"

export function FeaturesShowcaseSection() {
  const bentoFeatures = [
    {
      title: "Upload anything",
      description: "Lectures • Meetings • PDFs • Documents • Videos • YouTube • Links and more",
      image: "https://framerusercontent.com/images/HrUr6jkcwiRshv9bqe0BdHnyiWc.png?width=1024&height=1024"
    },
    {
      title: "Get beautiful notes",
      description: "Notes and transcripts, organized and instant",
      image: "https://framerusercontent.com/images/0OT8yImioQmdfXaBou5rErL2Bw.png?width=1024&height=1024"
    },
    {
      title: "AI Chat",
      description: "Ask your notes anything",
      image: "https://framerusercontent.com/images/6E6sZpvXNMk7gfxjkAycFfDGA.png?width=512&height=512"
    },
    {
      title: "Learn in multiple languages",
      description: "Translate and learn in multiple languages",
      image: "https://framerusercontent.com/images/AFKMgwrfTwIKnvcJ4wShUb7H55w.png?width=512&height=512"
    },
    {
      title: "Quizzes & Flashcards",
      description: "Let AI generate study materials for you",
      image: "https://framerusercontent.com/images/r2UBuO436CTVXH0mtCfQ8AyYmVg.png?width=512&height=512"
    },
    {
      title: "Study Games",
      description: "Make studying more fun with short games that help you learn",
      image: "https://framerusercontent.com/images/PpaEVFbJGnqxnRZW6xiJZpEHlrc.png?width=495&height=494",
      comingSoon: true
    }
  ]

  return (
    <section className="w-full max-w-[1200px] mx-auto px-4 mt-[120px] md:mt-[180px] mb-[100px]">
      {/* Section Header */}
      <div className="text-center mb-12">
        <div className="inline-block mb-4">
          <span className="text-[16px] text-[#964CEE] font-rethink-sans border border-[#964CEE]/30 px-4 py-2 rounded-[8px] bg-[#964CEE]/10 inline-block">
            Features
          </span>
        </div>
        <h2 className="text-[32px] md:text-[64px] font-medium text-white font-inter tracking-[-0.06em] leading-[120%]">
          Capture, organize, and learn 10x faster
        </h2>
      </div>

      {/* Bento Grid */}
      <div className="space-y-6">
        {/* First Row - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bentoFeatures.slice(0, 3).map((feature, index) => (
            <div 
              key={index}
              className="bg-[#0D0D0D] rounded-[20px] border border-[#964CEE]/20 p-8 flex flex-col items-center text-center overflow-hidden relative group hover:bg-[#141414] hover:border-[#964CEE]/40 transition-all duration-500 hover:-rotate-1 hover:scale-105"
            >
              {index === 0 ? (
                <div className="w-full aspect-square mb-6 rounded-[16px] flex items-center justify-center bg-gradient-to-br from-[#964CEE]/20 to-[#964CEE]/5 ring-1 ring-[#964CEE]/10">
                  <Upload className="w-32 h-32 text-[#964CEE]" strokeWidth={1.5} />
                </div>
              ) : (
                <div className="w-full aspect-square mb-6 rounded-[16px] overflow-hidden relative ring-1 ring-[#964CEE]/10">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <h3 className="text-white font-inter text-[24px] md:text-[28px] font-medium mb-3 tracking-[-0.02em] flex items-center gap-2 flex-wrap justify-center">
                {feature.title}
                {feature.comingSoon && (
                  <span className="text-xs px-3 py-1 rounded-full border border-[#964CEE]/50 bg-[#964CEE]/10 text-[#964CEE]">
                    Coming Soon
                  </span>
                )}
              </h3>
              <p className="text-white/50 font-rethink-sans text-[14px] md:text-[16px] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Second Row - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bentoFeatures.slice(3, 6).map((feature, index) => (
            <div 
              key={index}
              className="bg-[#0D0D0D] rounded-[20px] border border-[#964CEE]/20 p-8 flex flex-col items-center text-center overflow-hidden relative group hover:bg-[#141414] hover:border-[#964CEE]/40 transition-all duration-500 hover:-rotate-1 hover:scale-105"
            >
              <div className="w-full aspect-square mb-6 rounded-[16px] overflow-hidden relative ring-1 ring-[#964CEE]/10">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-white font-inter text-[24px] md:text-[28px] font-medium mb-3 tracking-[-0.02em] flex items-center gap-2 flex-wrap justify-center">
                {feature.title}
                {feature.comingSoon && (
                  <span className="text-xs px-3 py-1 rounded-full border border-[#964CEE]/50 bg-[#964CEE]/10 text-[#964CEE]">
                    Coming Soon
                  </span>
                )}
              </h3>
              <p className="text-white/50 font-rethink-sans text-[14px] md:text-[16px] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

