import { SiteHeader } from "@/components/site-header"
import { HeroSection } from "@/components/hero-section"
import { LiveDemo } from "@/components/landing/live-demo"
import { DemoCta } from "@/components/landing/demo-cta"
import { FeaturesShowcaseSection } from "@/components/features-showcase-section"
import { FAQSection } from "@/components/faq-section"
import { FounderSection } from "@/components/founder-section"
import { CTASection } from "@/components/cta-section"
import { SiteFooter } from "@/components/site-footer"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-c-page text-c-ink">
      <a
        href="#demo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-c-ink"
      >
        Skip to the demo
      </a>
      {/* Purple top section: nav + hero. The demo card below overlaps its bottom padding. */}
      <div className="relative overflow-hidden bg-c-brand pb-[150px] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -left-[140px] top-[120px] h-[420px] w-[420px] rounded-full bg-white/[0.08] anim-drift" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-[80px] -top-[60px] h-[300px] w-[300px] rounded-full bg-white/[0.08] anim-drift [animation-direction:alternate-reverse]" />
        <SiteHeader />
        <HeroSection />
      </div>
      <main id="main" className="flex-1">
        <section id="demo" aria-label="Live demo" className="scroll-mt-4 px-4 md:px-10">
          <div className="reveal"><LiveDemo /></div>
          <DemoCta />
        </section>
        <FeaturesShowcaseSection />
        <FAQSection />
        <FounderSection />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  )
}
