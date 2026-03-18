"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getAllStudyGuides, categoryColors, difficultyColors, StudyGuide } from "@/lib/studyGuide";

export default function NoteListPage() {
  const [guides, setGuides] = useState<StudyGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGuides() {
      const data = await getAllStudyGuides();
      setGuides(data);
      setLoading(false);
    }
    fetchGuides();
  }, []);

  const categories = Array.from(new Set(guides.map((g) => g.category)));

  const filteredGuides = selectedCategory
    ? guides.filter((g) => g.category === selectedCategory)
    : guides;

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <SiteHeader />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-source-serif-4">
              Study Guides
            </h1>
            <p className="text-white/50 text-lg max-w-2xl mx-auto font-rethink-sans">
              Free study guides with video summaries, cheat sheets, and interactive quizzes.
              Perfect for exam prep.
            </p>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === null
                    ? "bg-[#964CEE] text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                    selectedCategory === cat
                      ? "bg-[#964CEE] text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#964CEE]"></div>
              <p className="text-white/50 mt-4">Loading study guides...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && guides.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-semibold text-white mb-2">No Study Guides Yet</h2>
              <p className="text-white/50">Check back soon for new content!</p>
            </div>
          )}

          {/* Study Guides Grid */}
          {!loading && filteredGuides.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGuides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/note/${guide.slug}`}
                  className="group bg-[#111] border border-white/10 rounded-2xl overflow-hidden hover:border-[#964CEE]/50 transition-all duration-300"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-[#1a1a1a] overflow-hidden">
                    <img
                      src={`https://img.youtube.com/vi/${guide.youtubeId}/maxresdefault.jpg`}
                      alt={guide.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${guide.youtubeId}/hqdefault.jpg`;
                      }}
                    />
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-16 h-16 rounded-full bg-[#964CEE] flex items-center justify-center">
                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {/* Category badge */}
                    <div
                      className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${
                        categoryColors[guide.category] || "from-gray-500 to-gray-500"
                      } text-white`}
                    >
                      {guide.category}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#964CEE] transition-colors font-rethink-sans">
                      {guide.title}
                    </h3>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-white/50 mb-3">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        {guide.quiz.length} Quiz Questions
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border ${
                          difficultyColors[guide.difficulty] || "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {guide.difficulty}
                      </span>
                    </div>

                    {/* TL;DR Preview */}
                    {guide.tldr && guide.tldr[0] && (
                      <p className="text-sm text-white/40 line-clamp-2">{guide.tldr[0]}</p>
                    )}

                    {/* Source */}
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-white/30">by {guide.sourceChannel}</span>
                      <span className="text-xs text-[#964CEE] group-hover:underline">Read more →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
