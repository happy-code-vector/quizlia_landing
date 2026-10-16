import Link from "next/link"
import Image from "next/image"
import { APP_STORE_URL } from "@/lib/constants"

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-c-soft bg-c-page">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-10 md:py-16">
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
              <span className="text-xl font-extrabold tracking-[-0.03em] text-c-ink">QuizliAI</span>
            </Link>
            <p className="text-sm text-c-muted">
              Your smart assistant for notes, transcripts, and AI-powered learning.
            </p>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 pt-2"
            >
              <span className="rounded-lg border border-c-soft bg-white p-1.5">
                <Image src="/app-qr.svg" alt="QR code to download QuizliAI on the App Store" width={56} height={56} unoptimized className="block h-14 w-14" />
              </span>
              <span className="text-xs text-c-muted group-hover:text-c-ink transition-colors">
                Get the iOS app
              </span>
            </a>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="font-bold text-c-ink">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#demo" className="text-sm text-c-muted hover:text-c-ink transition-colors">
                  Try the demo
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="text-sm text-c-muted hover:text-c-ink transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h3 className="font-bold text-c-ink">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#about" className="text-sm text-c-muted hover:text-c-ink transition-colors">
                  About
                </Link>
              </li>
            </ul>
          </div>


          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="font-bold text-c-ink">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="https://sites.google.com/view/quizliai-privacy/home" target="_blank" rel="noopener noreferrer" className="text-sm text-c-muted hover:text-c-ink transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="https://sites.google.com/view/quizliai-terms/home" target="_blank" rel="noopener noreferrer" className="text-sm text-c-muted hover:text-c-ink transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t-2 border-c-soft pt-6 text-center">
          <p className="text-sm text-c-muted">
            © {new Date().getFullYear()} QuizliAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}