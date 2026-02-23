import Image from "next/image"

export function MostLovedSection() {
  return (
    <section className="w-full py-16 md:py-20">
      <div className="container max-w-[1200px] mx-auto px-4">
        {/* Title */}
        <h1 className="text-center font-source-serif-4 text-[28px] md:text-[32px] font-normal tracking-[-0.08em] leading-[120%] text-white mb-12">
          The most-loved <br className="md:hidden" />AI Notetaker on Earth
        </h1>

        {/* Review Card Image */}
        <div className="max-w-[280px] md:max-w-[320px] mx-auto">
          <div className="relative rounded-[20px] overflow-hidden border border-[#964CEE]/20 hover:border-[#964CEE]/40 transition-all duration-300 shadow-lg hover:shadow-[#964CEE]/20">
            <Image
              src="https://framerusercontent.com/images/AmoV7s57QZK2IY6s5gFkmbwpRDk.png?scale-down-to=512&width=1876&height=1204"
              alt="User Review - 6 stars if I could"
              width={320}
              height={205}
              className="w-full h-auto"
              priority
            />
            {/* 5.0 Rating Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white font-bold text-[48px] md:text-[56px] font-rethink-sans drop-shadow-lg">
                5.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

