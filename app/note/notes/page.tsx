"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/app/Sidebar";
import { useToast } from "@/components/app/ToastContainer";
import { getAllStudyGuides, categoryColors, difficultyColors, StudyGuide } from "@/lib/studyGuide";
import { Topic, getYouTubeThumbnail, getSourceIcon } from "@/lib/types";

export default function NotesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [studyGuidesLoading, setStudyGuidesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentProfile = localStorage.getItem("currentProfile");
      if (!currentProfile) {
        router.push("/note/profile-selection");
        return;
      }
      const profileData = JSON.parse(currentProfile);
      setProfile(profileData);

      // Load content and convert to topics
      const storedContent = localStorage.getItem(`content_${profileData.id}`);
      if (storedContent) {
        const content = JSON.parse(storedContent);
        const topicMap = new Map<string, Topic>();

        for (const item of content) {
          const sourceId = item.sourceId || `legacy_${item.id}`;

          if (!topicMap.has(sourceId)) {
            topicMap.set(sourceId, {
              id: sourceId,
              title: item.sourceName || item.title || "Unknown",
              sourceType: item.sourceType || "url",
              sourceUrl: item.sourceType === "youtube" || item.sourceType === "url" ? item.sourceName : undefined,
              createdAt: item.createdAt,
            });
          }

          const topic = topicMap.get(sourceId)!;
          if (item.type === "notes" && item.data) {
            topic.note = item.data;
            if (item.data.title && item.data.title.length > 10) {
              topic.title = item.data.title;
            }
          } else if (item.type === "flashcards" && item.data?.flashcards) {
            topic.flashcards = item.data.flashcards;
          } else if (item.type === "quiz" && item.data?.quizzes) {
            topic.quiz = item.data.quizzes;
          }
        }

        // Filter to only topics that have notes
        const topicsWithNotes = Array.from(topicMap.values())
          .filter(t => t.note)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setTopics(topicsWithNotes);
      }
    }
  }, [router]);

  // Fetch public study guides
  useEffect(() => {
    async function fetchStudyGuides() {
      const data = await getAllStudyGuides();
      setStudyGuides(data);
      setStudyGuidesLoading(false);
    }
    fetchStudyGuides();
  }, []);

  const handleDeleteTopic = (topicId: string) => {
    if (!profile || typeof window === "undefined") return;

    const storedContent = localStorage.getItem(`content_${profile.id}`);
    if (storedContent) {
      const content = JSON.parse(storedContent);
      const updatedContent = content.filter((item: any) => item.sourceId !== topicId);
      localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));

      // Update topics
      setTopics(topics.filter(t => t.id !== topicId));
    }
    showToast("Topic deleted", "success");
  };

  const categories = Array.from(new Set(studyGuides.map((g) => g.category)));
  const filteredGuides = selectedCategory
    ? studyGuides.filter((g) => g.category === selectedCategory)
    : studyGuides;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!profile) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-10 py-8 w-full max-w-6xl mx-auto">
          {/* My Topics Section */}
          <div className="mb-12">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Notes</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {topics.length} topic{topics.length !== 1 ? "s" : ""} with notes
              </p>
            </div>

            {topics.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">description</span>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Notes Yet</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Generate study materials to create your first topic</p>
                <Link href="/note" className="btn-primary inline-flex items-center gap-2">
                  <span className="material-symbols-outlined">add</span>
                  Generate Content
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topics.map((topic) => {
                  const thumbnail = topic.sourceType === "youtube" && topic.sourceUrl
                    ? getYouTubeThumbnail(topic.sourceUrl)
                    : null;

                  return (
                    <div
                      key={topic.id}
                      className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all hover:border-blue-500 dark:hover:border-blue-500 relative overflow-hidden"
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteTopic(topic.id);
                        }}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-2 z-10 shadow-lg"
                        title="Delete topic"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>

                      <Link href={`/note/topic/${topic.id}`} className="block">
                        {thumbnail && (
                          <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
                            <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                          </div>
                        )}

                        <div className="p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-md p-1.5">
                              <span className="material-symbols-outlined">{getSourceIcon(topic.sourceType)}</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                              {topic.sourceType}
                            </span>
                          </div>

                          <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 mb-3">
                            {topic.title}
                          </h3>

                          {/* Material Indicators */}
                          <div className="flex flex-wrap gap-2">
                            {topic.note && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                <span className="material-symbols-outlined text-xs">description</span>
                                Notes
                              </span>
                            )}
                            {topic.flashcards && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                <span className="material-symbols-outlined text-xs">style</span>
                                {topic.flashcards.length}
                              </span>
                            )}
                            {topic.quiz && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                <span className="material-symbols-outlined text-xs">quiz</span>
                                {topic.quiz.length}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex justify-between items-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(topic.createdAt)}</span>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            View <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </span>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Public Study Guides Section */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-12">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg p-2">
                  <span className="material-symbols-outlined">public</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Public Study Guides</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Curated study materials with video summaries and interactive quizzes
                  </p>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === null
                      ? "bg-[#964CEE] text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
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
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Loading State */}
            {studyGuidesLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#964CEE]"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4">Loading study guides...</p>
              </div>
            )}

            {/* Study Guides Grid */}
            {!studyGuidesLoading && filteredGuides.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGuides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/note/${guide.slug}`}
                    className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-[#964CEE]/50 transition-all duration-300"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      {guide.youtubeId ? (
                        <img
                          src={`https://img.youtube.com/vi/${guide.youtubeId}/maxresdefault.jpg`}
                          alt={guide.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src.includes("maxresdefault")) {
                              target.src = `https://img.youtube.com/vi/${guide.youtubeId}/hqdefault.jpg`;
                            } else if (target.src.includes("hqdefault")) {
                              target.src = `https://img.youtube.com/vi/${guide.youtubeId}/mqdefault.jpg`;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#964CEE]/20 to-[#964CEE]/5">
                          <span className="material-symbols-outlined text-4xl text-[#964CEE]">menu_book</span>
                        </div>
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-[#964CEE] flex items-center justify-center">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
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
                    <div className="p-4">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-[#964CEE] transition-colors line-clamp-2">
                        {guide.title}
                      </h3>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          {guide.quiz.length} Quiz
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
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{guide.tldr[0]}</p>
                      )}

                      {/* Source */}
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs text-gray-400 dark:text-gray-500">by {guide.sourceChannel}</span>
                        <span className="text-xs text-[#964CEE] group-hover:underline">View →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!studyGuidesLoading && studyGuides.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-5xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Study Guides Yet</h3>
                <p className="text-gray-500 dark:text-gray-400">Check back soon for new content!</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
