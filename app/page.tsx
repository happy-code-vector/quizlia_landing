import { SiteHeader } from "@/components/site-header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { FeaturesShowcaseSection } from "@/components/features-showcase-section"
import { FAQSection } from "@/components/faq-section"
import { MissionSection } from "@/components/mission-section"
import { FounderSection } from "@/components/founder-section"
import { CTASection } from "@/components/cta-section"
import { SiteFooter } from "@/components/site-footer"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <SiteHeader />
      <main className="flex-1 pt-16">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FeaturesShowcaseSection />
        <FAQSection />
        <MissionSection />
        <FounderSection />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
}