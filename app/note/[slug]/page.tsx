import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StudyGuideHeader } from "@/components/study-guide/StudyGuideHeader";
import { TldrSection } from "@/components/study-guide/TldrSection";
import { VideoEmbed } from "@/components/study-guide/VideoEmbed";
import { CheatSheetSection } from "@/components/study-guide/CheatSheetSection";
import { InteractiveQuiz } from "@/components/study-guide/InteractiveQuiz";
import { CtaBanner } from "@/components/study-guide/CtaBanner";
import { getStudyGuideServer, getAllStudyGuideSlugsServer } from "@/lib/firebase-server";
import { StudyGuide } from "@/lib/studyGuide";

// Revalidate every hour (ISR)
export const revalidate = 3600;

// Generate static params for all study guides
export async function generateStaticParams() {
  const slugs = await getAllStudyGuideSlugsServer();

  // If no slugs from Firebase, return a placeholder for build
  if (slugs.length === 0) {
    return [{ slug: "french-revolution-summary" }];
  }

  return slugs.map((slug) => ({ slug }));
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getStudyGuideServer(slug);

  if (!guide) {
    return {
      title: "Study Guide Not Found | QuizliAI",
      description: "The requested study guide could not be found.",
    };
  }

  const title = `${guide.title} | QuizliAI Study Guide`;
  const description = guide.tldr.join(" ");
  const url = `https://quizliai.com/note/${guide.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "QuizliAI",
      type: "article",
      images: [
        {
          url: `https://img.youtube.com/vi/${guide.youtubeId}/maxresdefault.jpg`,
          width: 1280,
          height: 720,
          alt: guide.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`https://img.youtube.com/vi/${guide.youtubeId}/maxresdefault.jpg`],
    },
    alternates: {
      canonical: url,
    },
    other: {
      // JSON-LD structured data for SEO
      "script:type": "application/ld+json",
    },
  };
}

// JSON-LD Structured Data Component
function StructuredData({ guide }: { guide: StudyGuide }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.tldr.join(" "),
    author: {
      "@type": "Organization",
      name: "QuizliAI",
      url: "https://quizliai.com",
    },
    publisher: {
      "@type": "Organization",
      name: "QuizliAI",
      logo: {
        "@type": "ImageObject",
        url: "https://quizliai.com/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://quizliai.com/note/${guide.slug}`,
    },
    video: {
      "@type": "VideoObject",
      embedUrl: `https://www.youtube.com/embed/${guide.youtubeId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${guide.youtubeId}/maxresdefault.jpg`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default async function StudyGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await getStudyGuideServer(slug);

  if (!guide) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black">
      <StructuredData guide={guide} />
      <SiteHeader />
      <main className="pt-20">
        <article className="max-w-4xl mx-auto px-4 py-12">
          <StudyGuideHeader
            title={guide.title}
            category={guide.category}
            difficulty={guide.difficulty}
            sourceChannel={guide.sourceChannel}
          />

          <TldrSection items={guide.tldr} />

          <VideoEmbed youtubeId={guide.youtubeId} title={guide.title} />

          <CheatSheetSection sections={guide.sections} />

          <InteractiveQuiz quizzes={guide.quiz} />

          <CtaBanner headline={guide.cta?.headline} features={guide.cta?.features} />
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
