import Image from "next/image"

export function FeaturesShowcaseSection() {
  const bentoFeatures = [
    {
      title: "Learn from any link",
      description: "Paste any link and instantly get notes and study materials",
      video: "/Learn_Anything_From_a_Link_version_1.mp4"
    },
    {
      title: "YouTube Summaries",
      description: "Get instant summaries from any YouTube video",
      video: "/Instant_YouTube_Summaries_version_1.mp4"
    },
    {
      title: "Quiz Yourself",
      description: "AI generates quizzes to test your knowledge instantly",
      video: "/Quiz_Yourself_Instantly_version_1.mp4"
    },
    // {
    //   title: "Upload anything",
    //   description: "Lectures • Meetings • PDFs • Documents • Videos • Links and more",
    //   image: "https://framerusercontent.com/images/HrUr6jkcwiRshv9bqe0BdHnyiWc.png?width=1024&height=1024"
    // },
    // {
    //   title: "Get beautiful notes",
    //   description: "Notes and transcripts, organized and instant",
    //   image: "https://framerusercontent.com/images/0OT8yImioQmdfXaBou5rErL2Bw.png?width=1024&height=1024"
    // },
    // {
    //   title: "AI Chat",
    //   description: "Ask your notes anything",
    //   image: "https://framerusercontent.com/images/6E6sZpvXNMk7gfxjkAycFfDGA.png?width=512&height=512"
    // }
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
        {/* First Row - 3 Cards with Videos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bentoFeatures.slice(0, 3).map((feature, index) => (
            <div
              key={index}
              className="bg-[#0D0D0D] rounded-[20px] border border-[#964CEE]/20 p-6 flex flex-col overflow-hidden relative group hover:bg-[#141414] hover:border-[#964CEE]/40 transition-all duration-500"
            >
              {feature.video ? (
                <div className="w-full aspect-[9/16] mb-6 rounded-[16px] overflow-hidden relative ring-1 ring-[#964CEE]/10 bg-black">
                  <video
                    src={feature.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square mb-6 rounded-[16px] overflow-hidden relative ring-1 ring-[#964CEE]/10">
                  <Image
                    src={feature.image || ""}
                    alt={feature.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <h3 className="text-white font-inter text-[20px] md:text-[24px] font-medium mb-2 tracking-[-0.02em]">
                {feature.title}
              </h3>
              <p className="text-white/50 font-rethink-sans text-[14px] md:text-[16px] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Second Row - 3 Cards with Images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bentoFeatures.slice(3, 6).map((feature, index) => (
            <div
              key={index}
              className="bg-[#0D0D0D] rounded-[20px] border border-[#964CEE]/20 p-6 flex flex-col overflow-hidden relative group hover:bg-[#141414] hover:border-[#964CEE]/40 transition-all duration-500"
            >
              {feature.video ? (
                <div className="w-full aspect-[9/16] mb-6 rounded-[16px] overflow-hidden relative ring-1 ring-[#964CEE]/10 bg-black">
                  <video
                    src={feature.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square mb-6 rounded-[16px] overflow-hidden relative ring-1 ring-[#964CEE]/10">
                  <Image
                    src={feature.image || ""}
                    alt={feature.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <h3 className="text-white font-inter text-[20px] md:text-[24px] font-medium mb-2 tracking-[-0.02em]">
                {feature.title}
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
