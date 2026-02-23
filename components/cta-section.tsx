import Link from "next/link"

export function CTASection() {
  return (
    <section className="w-full max-w-[1200px] mx-auto px-4 mt-32 mb-20">
      <div className="w-full rounded-[30px] border border-white/10 bg-gradient-to-b from-[#0B0B0B] to-[#150B1D] p-12 md:p-16 text-center relative overflow-hidden">
        {/* Content */}
        <h2 className="text-[24px] md:text-[26px] font-bold text-white mb-4 font-rethink-sans">
          Ready to learn 10x faster?
            </h2>
        <p className="text-white/60 text-base md:text-lg mb-8 max-w-[500px] mx-auto font-rethink-sans">
          Join thousands of students and professionals who are already using QuizliAI to supercharge their learning.
            </p>
        
        {/* Download Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
          <Link 
            href="https://apps.apple.com/us/app/quizliai/id6751740981" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded-full hover:opacity-90 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] font-rethink-sans"
          >
            <svg className="w-4 h-5" viewBox="0 0 814 1000" fill="currentColor">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
            </svg>
            <span>Apple</span>
            </Link>
          <div 
            className="flex items-center justify-center gap-2 bg-transparent text-white/40 px-8 py-3 rounded-full border border-white/10 font-rethink-sans cursor-not-allowed relative"
          >
            <svg className="w-5 h-5" viewBox="0 0 512 512" fill="currentColor">
              <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/>
            </svg>
            <span>Android</span>
            <span className="ml-2 text-[11px] px-2 py-0.5 bg-[#964CEE]/20 text-[#964CEE] rounded-full border border-[#964CEE]/30">
              Coming Soon
            </span>
          </div>
        </div>

        {/* Gradient Background Effect */}
        <div className="absolute bottom-0 left-0 w-full h-[200px] bg-gradient-to-t from-[#964CEE]/20 to-transparent pointer-events-none" />
      </div>
    </section>
  )
}