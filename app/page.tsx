import type { Metadata } from "next"
import { Landing } from "@/components/landing/Landing"
import { APP_STORE_URL } from "@/lib/constants"

// Standards section 11 (SEO): title <= 60 with QuizliAI, description 120 to 160, canonical, OG and Twitter card.
const title = "QuizliAI: AI Notes, Flashcards and Quizzes for Families"
const description =
  "Turn a YouTube video, PDF, web page or photo of a page into notes, flashcards and a quiz. One family account covers up to four kids. Free on iPhone."

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "https://quizliai.com/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "QuizliAI",
    title,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "QuizliAI: Paste anything. Get quizzed." }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
}

// No aggregateRating: there are no real, current numbers to publish (section 11).
const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "QuizliAI",
  operatingSystem: "iOS",
  applicationCategory: "EducationalApplication",
  description,
  url: "https://quizliai.com/",
  downloadUrl: APP_STORE_URL,
  installUrl: APP_STORE_URL,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd).replace(/</g, "\\u003c") }}
      />
      <Landing />
    </>
  )
}
