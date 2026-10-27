"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/app/Sidebar";
import { FlashcardStudyMode } from "@/components/app/FlashcardStudyMode";
import { QuizStudyMode } from "@/components/app/QuizStudyMode";
import { getStudyGuide, StudyGuide } from "@/lib/studyGuide";
import { Topic, getSourceIcon } from "@/lib/types";
import { MarkdownText } from "@/components/app/MarkdownText";

type TabType = "note" | "flashcards" | "quiz";

// Public guides are seeded in the StudyGuide schema; the app renders notes
// in the Topic shape — convert so both look identical.
function guideToTopic(guide: StudyGuide): Topic {
  return {
    id: guide.slug,
    title: guide.title,
    sourceType: guide.youtubeId ? "youtube" : "url",
    sourceUrl: guide.youtubeId ? `https://www.youtube.com/watch?v=${guide.youtubeId}` : undefined,
    createdAt: guide.createdAt ?? "",
    note: {
      title: guide.title,
      quick_summary: guide.quick_summary ?? (guide.tldr || []).join("\n\n"),
      key_findings: guide.key_findings ?? [],
      important_notes: guide.important_notes ?? [],
      sections: guide.sections ?? [],
    },
    flashcards: guide.flashcards ?? [],
    quiz: guide.quiz ?? [],
  };
}

export function GuideClient({ slug, initialGuide }: { slug: string; initialGuide: StudyGuide | null }) {

  const [profile, setProfile] = useState<any>(null);
  const [topic, setTopic] = useState<Topic | null>(initialGuide ? guideToTopic(initialGuide) : null);
  // Seeded by the server wrapper (which fetched the guide for metadata) —
  // initializing topic/loading from the seed puts the content in the SSR
  // HTML instead of a loading flash. The fetch below stays as the fallback
  // for null/error cases.
  const [guide, setGuide] = useState<StudyGuide | null>(initialGuide);
  const [loading, setLoading] = useState(!initialGuide);
  const [activeTab, setActiveTab] = useState<TabType>("note");
  const [studyMode, setStudyMode] = useState<"flashcards" | "quiz" | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: "user" | "ai" | "typing" | "default";
    text: string;
  }>>([
    { id: "default", sender: "default", text: "Ask me anything about this study guide!" },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!initialGuide) {
      async function loadGuide() {
        const data = await getStudyGuide(slug);
        setGuide(data);
        if (data) setTopic(guideToTopic(data));
        setLoading(false);
      }
      loadGuide();
    }

    if (typeof window !== "undefined") {
      const current = localStorage.getItem("currentProfile");
      setProfile(
        current
          ? JSON.parse(current)
          : { id: 0, name: "Guest", type: "student", avatar: "avatar-1" }
      );
    }
  }, [slug, initialGuide]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Chat functions
  const buildContext = () => {
    if (!guide) return "";

    let context = `Study Guide: ${guide.title}\n\n`;

    if (topic?.note?.quick_summary) {
      context += `Summary:\n${topic.note.quick_summary}\n\n`;
    } else if (guide.tldr && guide.tldr.length > 0) {
      context += `Summary:\n${guide.tldr.join("\n")}\n\n`;
    }

    if (topic?.note?.key_findings && topic.note.key_findings.length > 0) {
      context += `Key Findings:\n${topic.note.key_findings.map((f: string) => `- ${f}`).join("\n")}\n\n`;
    }

    if (topic?.note?.important_notes && topic.note.important_notes.length > 0) {
      context += `Important Notes:\n${topic.note.important_notes.map((n: string) => `- ${n}`).join("\n")}\n\n`;
    }

    if (guide.sections && guide.sections.length > 0) {
      context += `Sections:\n`;
      guide.sections.forEach((section) => {
        context += `\n## ${section.title}\n`;
        if (section.content) {
          context += `${section.content}\n`;
        }
        if (section.keyTerms && section.keyTerms.length > 0) {
          section.keyTerms.forEach((term: string) => {
            context += `- ${term}\n`;
          });
        }
      });
    }

    if (guide.quiz && guide.quiz.length > 0) {
      context += `\nQuiz Questions:\n`;
      guide.quiz.forEach((q, i) => {
        context += `${i + 1}. ${q.question}\nCorrect: ${q.correct_answer}\n`;
      });
    }

    return context;
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: "user" as const,
      text: inputText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    const typingMessage = { id: "typing", sender: "typing" as const, text: "" };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      const context = buildContext();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage.text, context }),
      });

      const result = await response.json();
      setMessages((prev) => prev.filter((msg) => msg.id !== "typing"));

      if (result.success || result.answer) {
        setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "ai", text: result.answer }]);
      } else {
        setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "ai", text: `Error: ${result.error || "Failed to get response"}` }]);
      }
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => msg.id !== "typing"));
      setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "ai", text: "Error: Could not reach the assistant." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/note/${slug}`;
    const text = topic ? `${topic.title}` : "QuizliAI study guide";
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        // share sheet cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard unavailable
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar profile={profile} />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-6xl text-gray-400">error</span>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Guide not found</h1>
          <Link href="/note" className="text-blue-600 hover:underline">
            Go back to dashboard
          </Link>
        </main>
      </div>
    );
  }

  // Study mode overlays (full screen)
  if (studyMode === "flashcards" && topic.flashcards) {
    return (
      <FlashcardStudyMode
        flashcards={topic.flashcards}
        onClose={() => setStudyMode(null)}
      />
    );
  }

  if (studyMode === "quiz" && topic.quiz) {
    return (
      <QuizStudyMode
        quizzes={topic.quiz}
        topicTitle={topic.title}
        onClose={() => setStudyMode(null)}
      />
    );
  }

  // Published YouTube guides keep their video — the unified layout
  // (e312b77) dropped the old page's embed and orphaned VideoEmbed, so
  // guides rendered note-only even with youtubeId present.
  const youtubeEmbedUrl = guide?.youtubeId
    ? `https://www.youtube.com/embed/${guide.youtubeId}`
    : null;

  const tabs: { id: TabType; label: string; icon: string; available: boolean; count?: number }[] = [
    { id: "note", label: "Notes", icon: "description", available: !!topic.note },
    { id: "flashcards", label: "Flashcards", icon: "style", available: !!topic.flashcards, count: topic.flashcards?.length },
    { id: "quiz", label: "Quiz", icon: "quiz", available: !!topic.quiz, count: topic.quiz?.length },
  ];

  const availableTabs = tabs.filter((t) => t.available);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar profile={profile} />

      <main className="flex-1 flex overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <Link
                    href="/note/notes"
                    className="mt-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-md p-1.5">
                        <span className="material-symbols-outlined">{getSourceIcon(topic.sourceType)}</span>
                      </div>
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">
                        Public study guide
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                      {topic.title}
                    </h1>
                  </div>
                </div>
                <button
                  onClick={handleShare}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
                  title="Share guide"
                >
                  <span className="material-symbols-outlined">share</span>
                </button>
              </div>

              {/* Original source video (mirrors the topic page's player) */}
              {youtubeEmbedUrl && (
                <div className="mt-4 ml-14">
                  <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-w-md">
                    <iframe
                      src={youtubeEmbedUrl}
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full aspect-video"
                    />
                  </div>
                  {topic.sourceUrl && (
                    <a
                      href={topic.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                      Watch on YouTube
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="px-4 sm:px-6 lg:px-8 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1 overflow-x-auto">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
            {/* Note Tab */}
            {activeTab === "note" && topic.note && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {topic.note.title}
                </h2>

                {topic.note.quick_summary && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Quick Summary
                    </h3>
                    <MarkdownText
                      text={topic.note.quick_summary}
                      className="text-gray-700 dark:text-gray-300 leading-relaxed"
                    />
                  </div>
                )}

                {topic.note.key_findings && topic.note.key_findings.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Key Findings
                    </h3>
                    <ul className="space-y-2">
                      {topic.note.key_findings.map((finding, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-blue-500 text-sm mt-1">check_circle</span>
                          <span className="text-gray-700 dark:text-gray-300">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {topic.note.important_notes && topic.note.important_notes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Important Notes
                    </h3>
                    <ul className="space-y-2">
                      {topic.note.important_notes.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-yellow-500 text-sm mt-1">warning</span>
                          <span className="text-gray-700 dark:text-gray-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {topic.note.sections && topic.note.sections.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Cheat Sheet
                    </h3>
                    <div className="space-y-4">
                      {topic.note.sections.map((section, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                        >
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {section.title}
                          </h4>
                          <MarkdownText
                            text={section.content}
                            className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                          />
                          {section.keyTerms && section.keyTerms.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {section.keyTerms.map((term, tIndex) => (
                                <span
                                  key={tIndex}
                                  className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                >
                                  {term}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {topic.note.detailed_notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Detailed Notes
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <MarkdownText
                        text={topic.note.detailed_notes}
                        className="text-gray-700 dark:text-gray-300 leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Flashcards Tab */}
            {activeTab === "flashcards" && topic.flashcards && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {topic.flashcards.length} Flashcards
                  </h2>
                  <button
                    onClick={() => setStudyMode("flashcards")}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">style</span>
                    Study Mode
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topic.flashcards.map((card, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
                    >
                      <p className="font-medium text-gray-900 dark:text-white mb-2">{card.question}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{card.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quiz Tab */}
            {activeTab === "quiz" && topic.quiz && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {topic.quiz.length} Questions
                  </h2>
                  <button
                    onClick={() => setStudyMode("quiz")}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">quiz</span>
                    Start Quiz
                  </button>
                </div>
                <div className="space-y-4">
                  {topic.quiz.map((q, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
                    >
                      <p className="font-medium text-gray-900 dark:text-white mb-2">
                        {index + 1}. {q.question}
                      </p>
                      <ul className="space-y-1 text-sm">
                        {q.options.map((option, oIndex) => (
                          <li
                            key={oIndex}
                            className={`px-3 py-1.5 rounded-lg ${
                              option === q.correct_answer
                                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {String.fromCharCode(65 + oIndex)}. {option}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Chat Panel */}
        <div className="hidden lg:flex w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-2">
                <span className="material-symbols-outlined text-white">smart_toy</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ask about this guide</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.sender === "default" && (
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-3 max-w-[85%] border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-gray-900 dark:text-white text-center">{message.text}</p>
                  </div>
                )}

                {message.sender === "user" && (
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl rounded-br-sm p-3 max-w-[85%]">
                    <p className="text-sm text-white">{message.text}</p>
                  </div>
                )}

                {message.sender === "ai" && (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl rounded-bl-sm p-3 max-w-[85%]">
                    <MarkdownText text={message.text} className="text-sm text-gray-900 dark:text-white" />
                  </div>
                )}

                {message.sender === "typing" && (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl rounded-bl-sm p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Press Enter to send
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
