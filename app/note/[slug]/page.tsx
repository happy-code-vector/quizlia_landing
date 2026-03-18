"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StudyGuide, getStudyGuide } from "@/lib/studyGuide";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StudyGuideHeader } from "@/components/study-guide/StudyGuideHeader";
import { TldrSection } from "@/components/study-guide/TldrSection";
import { VideoEmbed } from "@/components/study-guide/VideoEmbed";
import { CheatSheetSection } from "@/components/study-guide/CheatSheetSection";
import { InteractiveQuiz } from "@/components/study-guide/InteractiveQuiz";
import { CtaBanner } from "@/components/study-guide/CtaBanner";

export default function StudyGuidePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [guide, setGuide] = useState<StudyGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchGuide() {
      try {
        const data = await getStudyGuide(slug);
        if (data) {
          setGuide(data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching study guide:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchGuide();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <SiteHeader />
        <main className="pt-20">
          <div className="max-w-4xl mx-auto px-4 py-20">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-white/10 rounded w-3/4" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
              <div className="h-64 bg-white/10 rounded-2xl" />
              <div className="h-32 bg-white/10 rounded-2xl" />
              <div className="h-32 bg-white/10 rounded-2xl" />
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-black">
        <SiteHeader />
        <main className="pt-20">
          <div className="max-w-4xl mx-auto px-4 py-20 text-center">
            <div className="text-6xl mb-6">📚</div>
            <h1 className="text-3xl font-bold text-white mb-4 font-source-serif-4">
              Study Guide Not Found
            </h1>
            <p className="text-white/60 mb-8 font-rethink-sans">
              Sorry, we couldn&apos;t find the study guide you&apos;re looking for.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#964CEE] text-white rounded-xl font-medium hover:bg-[#964CEE]/90 transition-colors font-rethink-sans"
            >
              ← Back to Home
            </a>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
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
