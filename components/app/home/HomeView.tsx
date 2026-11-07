"use client";

import Link from "next/link";
import { Tooltip } from "@/components/app/Tooltip";
import { AppShell, type ShellFolder } from "@/components/app/shell/AppShell";
import { GenerateContentForm } from "@/components/app/GenerateContentForm";
import { Topic, getYouTubeThumbnail, getSourceIcon, ContentItem, Profile } from "@/lib/types";
import { Icon } from "@/components/app/Icon";

export interface HomeViewProps {
  profile: Profile;
  topics: Topic[];
  onDeleteTopic: (topicId: string) => void;
  onGenerated: (updatedContent: ContentItem[]) => void;
  /** Reference time for relative dates; fixtures pass a fixed value so screenshots are deterministic. */
  now?: Date;
  /** Fixture routes pass folders directly; the real page lets the shell read the local cache. */
  folders?: ShellFolder[];
  hideUsage?: boolean;
}

/**
 * Home view (data in, markup out). Data loading lives in app/note/page.tsx so the
 * dev fixture route can render this with sample data (W-10). Restyle lands in PR 2.
 */
export function HomeView({ profile, topics, onDeleteTopic, onGenerated, now = new Date(), folders, hideUsage }: HomeViewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };


  return (
    <AppShell profile={profile} family="home" folders={folders} hideUsage={hideUsage}>

      {/* Main Content */}
      <main id="main" className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-10 py-8 w-full max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              What do you want to learn today?
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Generate notes, flashcards, and quizzes from any content
            </p>
          </div>

          {/* Input Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 mb-8 border border-gray-200 dark:border-gray-800">
            <GenerateContentForm profile={profile} onGenerated={onGenerated} />
          </div>

          {/* Topics Section */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Topics</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {topics.length} topic{topics.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Topics Grid */}
          {topics.length > 0 ? (
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
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteTopic(topic.id);
                      }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-2 z-10 shadow-lg"
                      title="Delete topic"
                    >
                      <Icon name="delete" className="text-sm" />
                    </button>

                    <Link href={`/note/topic/${topic.id}`} className="block">
                      {/* YouTube Thumbnail */}
                      {thumbnail && (
                        <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
                          <img
                            src={thumbnail}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        </div>
                      )}

                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-md p-1.5">
                            <Icon name={getSourceIcon(topic.sourceType)} />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                            {topic.sourceType}
                          </span>
                        </div>

                        <Tooltip content={topic.title} className="block mb-3">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2">
                            {topic.title}
                          </h3>
                        </Tooltip>

                        {/* Material Indicators */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {topic.note && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              <Icon name="description" className="text-xs" />
                              Notes
                            </span>
                          )}
                          {topic.flashcards && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              <Icon name="style" className="text-xs" />
                              {topic.flashcards.length} cards
                            </span>
                          )}
                          {topic.quiz && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                              <Icon name="quiz" className="text-xs" />
                              {topic.quiz.length} Q
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex justify-between items-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {formatDate(topic.createdAt)}
                        </span>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          View
                          <Icon name="arrow_forward" className="text-sm" />
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="text-gray-400 dark:text-gray-600 mb-4">
                <Icon name="auto_stories" className="text-7xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No topics yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Start by generating study materials from URLs, PDFs, images, or YouTube videos.
                Each generation creates a topic with notes, flashcards, and quiz.
              </p>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
