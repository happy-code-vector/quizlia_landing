"use client"

import Link from "next/link"
import Image from "next/image"

export function SiteHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-lg">
      <div className="container max-w-[1200px] mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image 
            src="/logo.png" 
            alt="QuizliAI Logo" 
            width={120} 
            height={40}
            className="h-8 w-auto"
          />
          <span className="font-bold text-xl text-white font-rethink-sans">QuizliAI</span>
          </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-white/70 hover:text-white transition-colors font-rethink-sans">
            Features
          </Link>
          <Link href="#how-it-works" className="text-sm font-medium text-white/70 hover:text-white transition-colors font-rethink-sans">
            How It Works
          </Link>
          <Link href="#faq" className="text-sm font-medium text-white/70 hover:text-white transition-colors font-rethink-sans">
            FAQ
          </Link>
          <Link href="/about" className="text-sm font-medium text-white/70 hover:text-white transition-colors font-rethink-sans">
            About
          </Link>
        </nav>

        {/* Download Button */}
        <Link 
          href="https://apps.apple.com/us/app/quizliai/id6751740981"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 bg-[#964CEE] hover:bg-[#964CEE]/90 text-white rounded-full text-sm font-medium transition-all duration-300 hover:scale-[1.02] font-rethink-sans"
        >
          Download
          </Link>
      </div>
    </header>
  )
}