import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative pt-20 md:pt-32 pb-16 overflow-hidden" style={{ backgroundColor: '#070014' }}>
      <div className="container px-4 md:px-6 max-w-[1200px] mx-auto">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Hero Heading */}
          <h1 className="mt-[80px] text-center font-inter font-semibold text-[40px] md:text-[50px] leading-[1.1] md:leading-[1.1] max-w-[600px] w-[95%] mx-auto tracking-[-1px] md:tracking-[-2.53px] bg-gradient-to-b from-white from-10% to-[#9844FF] to-75% bg-clip-text text-transparent pb-8 md:pb-8 [@media(max-width:768px)]:text-[32px] [@media(max-width:768px)]:font-manrope [@media(max-width:768px)]:pb-3 [@media(max-width:768px)]:max-w-[350px]">
            Study Smarter & Ace<br />Every Test with QuizliAI
              </h1>
          
          {/* Subtitle */}
          <p className="flex flex-col justify-center max-w-[364px] w-[90%] mx-auto text-center font-rethink-sans text-[18px] font-medium leading-[1.2] md:leading-[22.4px] tracking-[0.32px] text-white/50 [@media(max-width:768px)]:text-[16px] [@media(max-width:768px)]:max-w-[300px]">
            QuizliAI is your smartest study assistant. Get instant notes, transcripts, and study materials from anything.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            {/* Download Button */}
            <Link
              href="https://apps.apple.com/us/app/quizliai/id6751740981"
              target="_blank"
              rel="noopener noreferrer"
              className="relative flex justify-center items-center w-[192px] h-[50px] px-[15px] py-[2px] gap-[10px] rounded-[200px] transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(150,76,238,0.5)]"
            >
              {/* Static inner border */}
              <span className="absolute inset-0 rounded-[200px] border border-white/10"></span>

              {/* Animated gradient border */}
              <span className="absolute inset-0 rounded-[200px] overflow-hidden">
                <span className="absolute inset-[-2px] rounded-[200px] bg-gradient-to-r from-[#964CEE] via-[#C77DFF] to-[#964CEE] bg-[length:200%_100%] animate-gradient-rotate opacity-50"></span>
              </span>

              {/* Button content */}
              <span className="absolute inset-[2px] rounded-[200px] bg-gradient-to-r from-[#0B0B0B] to-[#191919] flex items-center justify-center z-10">
                <span className="text-white font-rethink-sans">Download QuizliAI</span>
              </span>
            </Link>

            {/* Continue on Web Button */}
            <Link
              href="/note"
              className="flex justify-center items-center w-[192px] h-[50px] px-[15px] py-[2px] gap-[8px] rounded-[200px] border border-white/20 bg-white/5 text-white font-rethink-sans transition-all duration-300 ease-out hover:bg-white/10 hover:border-white/30 hover:scale-[1.02]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Continue on Web
            </Link>
          </div>

          {/* Hero Image */}
          <div className="mt-[30px] w-full md:w-[100%] lg:w-full max-w-[1000px] mx-auto px-4">
              <Image 
                src="/Poster.jpg" 
              alt="QuizliAI app interface showing AI-powered study materials"
              width={1000}
              height={600}
              className="w-full h-auto rounded-[20px]"
                priority
              />
          </div>

          {/* Trusted By Section */}
       
        </div>
      </div>
    </section>
  )
}