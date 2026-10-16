import Link from "next/link"
import { APP_STORE_URL } from "@/lib/constants"
import { ProofLine } from "@/components/landing/proof-line"

export function DemoCta() {
  return (
    <div className="reveal mx-auto flex w-full max-w-[900px] flex-col items-center px-5 pt-10 text-center md:px-0">
      <p className="text-[17px] font-semibold text-c-ink">Works on your own lectures, videos and PDFs.</p>
      <Link
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-c-lime px-6 text-[15px] font-bold text-c-ink transition-transform duration-150 motion-safe:hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-brand"
      >
        Download QuizliAI, it&apos;s free
      </Link>
      <ProofLine />
    </div>
  )
}
