import Link from "next/link"
import Image from "next/image"
import { APP_STORE_URL } from "@/lib/constants"

export function CTASection() {
  return (
    <section aria-labelledby="cta-h" className="relative overflow-hidden bg-c-brand text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -left-[140px] top-[60px] h-[420px] w-[420px] rounded-full bg-white/[0.08] anim-drift" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-[80px] -top-[60px] h-[300px] w-[300px] rounded-full bg-white/[0.08] anim-drift [animation-direction:alternate-reverse]" />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center px-5 py-[110px] text-center md:px-10">
        <Image
          src="/mascot/quizliai_mascot_celebrate.webp"
          alt=""
          width={523}
          height={640}
          className="anim-float mb-6 h-auto w-[150px] md:w-[180px]"
        />
        <h2 id="cta-h" className="reveal text-[clamp(48px,8vw,96px)] font-extrabold leading-[0.9] tracking-[-0.055em]">
          Ace the next one.
        </h2>
        <Link
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex min-h-12 items-center justify-center rounded-full bg-c-lime px-6 text-[15px] font-bold text-c-ink transition-transform duration-150 motion-safe:hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Download QuizliAI, it&apos;s free
        </Link>
        <p className="mt-4 text-[14px] font-semibold">
          Android is coming soon.{" "}
          <Link href="/note" className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Use the web app
          </Link>{" "}
          on any device until then.
        </p>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-8 hidden flex-col items-center gap-2 md:flex"
        >
          <span className="rounded-2xl bg-white p-2.5">
            <Image src="/app-qr.svg" alt="QR code to download QuizliAI on the App Store" width={96} height={96} unoptimized className="block h-24 w-24" />
          </span>
          <span className="text-xs font-semibold">Scan to download on the App Store</span>
        </a>
      </div>
    </section>
  )
}
