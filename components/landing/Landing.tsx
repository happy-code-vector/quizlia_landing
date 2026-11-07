import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HeroDemo } from "@/components/landing/hero"
import { Audiences, ClosingCta, Faq, Founder, HowItWorks } from "@/components/landing/sections"

// Landing page `/` on the welcome family (standards section 11, PR 6 of 6).
export function Landing() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <div aria-hidden="true" className="family-surface family-welcome" />
      <SiteHeader />
      <main id="main">
        <HeroDemo />
        <HowItWorks />
        <Audiences />
        <Faq />
        <Founder />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  )
}
