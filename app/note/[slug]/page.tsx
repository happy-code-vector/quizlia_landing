import type { Metadata } from "next";
import { cache } from "react";
import { getStudyGuide } from "@/lib/studyGuide";
import { GuideClient } from "./GuideClient";

const SITE_URL = "https://www.quizliai.com";

// generateMetadata and the page body both need the guide — cache() shares
// one fetch per request instead of two identical Firestore reads.
const getGuide = cache(getStudyGuide);

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);

  if (!guide) {
    return {
      title: "Study Guide | QuizliAI",
      description: "AI-generated study guide with notes, flashcards, and quiz.",
      alternates: { canonical: `${SITE_URL}/note/${slug}` },
    };
  }

  const description =
    guide.tldr && guide.tldr.length > 0
      ? guide.tldr[0].slice(0, 160)
      : "AI-generated study guide with notes, flashcards, and quiz.";

  return {
    title: `${guide.title} | QuizliAI`,
    description,
    alternates: { canonical: `${SITE_URL}/note/${slug}` },
    openGraph: {
      title: guide.title,
      description,
      // maxres first; hq fallback for videos without a maxres thumbnail.
      ...(guide.youtubeId
        ? { images: [
            { url: `https://img.youtube.com/vi/${guide.youtubeId}/maxresdefault.jpg` },
            { url: `https://img.youtube.com/vi/${guide.youtubeId}/hqdefault.jpg` },
          ] }
        : {}),
    },
  };
}

export default async function PublicStudyGuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  return <GuideClient slug={slug} initialGuide={guide} />;
}
