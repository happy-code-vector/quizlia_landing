import Link from "next/link"
import Image from "next/image"

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="container max-w-[1200px] mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <Image 
                src="/logo.png" 
                alt="QuizliAI Logo" 
                width={120} 
                height={40}
                className="h-8 w-auto"
              />
              <span className="text-xl font-semibold text-white font-rethink-sans">QuizliAI</span>
            </Link>
            <p className="text-sm text-white/50 font-rethink-sans">
              Your smartest assistant for notes, transcripts, and AI-powered learning.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white font-rethink-sans">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#features" className="text-sm text-white/50 hover:text-white transition-colors font-rethink-sans">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="text-sm text-white/50 hover:text-white transition-colors font-rethink-sans">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white font-rethink-sans">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-white/50 hover:text-white transition-colors font-rethink-sans">
                  About
                </Link>
              </li>
            </ul>
          </div>


          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white font-rethink-sans">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="https://sites.google.com/view/quizliai-privacy/home" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-white transition-colors font-rethink-sans">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="https://sites.google.com/view/quizliai-terms/home" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-white transition-colors font-rethink-sans">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t border-white/10 pt-6 text-center">
          <p className="text-sm text-white/40 font-rethink-sans">
            © {new Date().getFullYear()} QuizliAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}