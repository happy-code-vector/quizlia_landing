"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { FlashcardStudyMode } from "@/components/app/FlashcardStudyMode";
import { QuizStudyMode } from "@/components/app/QuizStudyMode";
import { getStudyGuide, StudyGuide, categoryColors, difficultyColors } from "@/lib/studyGuide";

type TabType = "summary" | "cheatsheet" | "quiz";

export default function PublicStudyGuidePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [guide, setGuide] = useState<StudyGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("summary");
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
    async function loadGuide() {
      const data = await getStudyGuide(slug);
      setGuide(data);
      setLoading(false);
    }
    loadGuide();
  }, [slug]);

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

    if (guide.tldr && guide.tldr.length > 0) {
      context += `TL;DR:\n${guide.tldr.join("\n")}\n\n`;
    }

    if (guide.sections && guide.sections.length > 0) {
      context += `Cheat Sheet Sections:\n`;
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
        body: JSON.stringify({ question: inputText, context }),
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
      setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "ai", text: "Error: Failed to send message." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 items-center justify-center flex-col gap-4">
        <span className="material-symbols-outlined text-6xl text-gray-400">error</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Study guide not found</h1>
        <Link href="/note/notes" className="text-blue-600 hover:underline">
          Browse all study guides
        </Link>
      </div>
    );
  }

  // Study mode overlays
  if (studyMode === "quiz" && guide.quiz) {
    return <QuizStudyMode quizzes={guide.quiz} onClose={() => setStudyMode(null)} />;
  }

  const youtubeEmbedUrl = `https://www.youtube.com/embed/${guide.youtubeId}`;

  // Convert quiz to flashcard format for study mode
  const quizAsFlashcards = guide.quiz?.map(q => ({
    question: q.question,
    answer: `${q.correct_answer}\n\n${q.explanation || ""}`
  })) || [];

  const tabs: { id: TabType; label: string; icon: string; count?: number }[] = [
    { id: "summary", label: "Summary", icon: "summarize" },
    { id: "cheatsheet", label: "Cheat Sheet", icon: "menu_book", count: guide.sections?.length },
    { id: "quiz", label: "Quiz", icon: "quiz", count: guide.quiz?.length },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col">
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex gap-3 items-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center rounded-lg w-10 h-10">
                <span className="material-symbols-outlined">auto_stories</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">QuizliAI</h1>
            </Link>

            <nav className="flex flex-col gap-1 mt-4">
              <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                <span className="material-symbols-outlined">home</span>
                <p className="text-sm font-medium">Home</p>
              </Link>
              <Link href="/note/notes" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <span className="material-symbols-outlined">description</span>
                <p className="text-sm font-medium">Study Guides</p>
              </Link>
              <Link href="/note" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                <span className="material-symbols-outlined">app_shortcut</span>
                <p className="text-sm font-medium">Open App</p>
              </Link>
            </nav>
          </div>

          <Link href="/note" className="btn-primary text-center">
            Get Started Free
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-start gap-4">
                <Link
                  href="/note/notes"
                  className="mt-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-md p-1.5">
                      <span className="material-symbols-outlined">play_circle</span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 uppercase">Public Study Guide</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r ${categoryColors[guide.category] || "from-gray-500 to-gray-500"} text-white`}>
                      {guide.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${difficultyColors[guide.difficulty] || "bg-gray-100 text-gray-600"}`}>
                      {guide.difficulty}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {guide.title}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    by {guide.sourceChannel}
                  </p>
                </div>
              </div>

              {/* YouTube Video Player */}
              <div className="mt-4 ml-14">
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-w-lg">
                  <iframe
                    src={youtubeEmbedUrl}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full aspect-video"
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-4 sm:px-6 lg:px-8 border-t border-gray-100 dark:border-gray-800 ml-14">
              <div className="flex items-center gap-1 overflow-x-auto">
                {tabs.map((tab) => (
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
          <div className="p-4 sm:p-6 lg:p-8 max-w-4xl ml-14">
            {/* Summary Tab */}
            {activeTab === "summary" && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-500">summarize</span>
                  TL;DR
                </h2>
                <ul className="space-y-3">
                  {guide.tldr.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cheat Sheet Tab */}
            {activeTab === "cheatsheet" && guide.sections && (
              <div className="space-y-6">
                {guide.sections.map((section, sIndex) => (
                  <div
                    key={sIndex}
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
                  >
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-500">folder</span>
                      {section.title}
                    </h3>
                    {section.content && (
                      <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                        {section.content}
                      </p>
                    )}
                    {section.keyTerms && section.keyTerms.length > 0 && (
                      <ul className="space-y-2">
                        {section.keyTerms.map((term: string, iIndex: number) => (
                          <li key={iIndex} className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-green-500 text-sm mt-1">check_circle</span>
                            <span className="text-gray-700 dark:text-gray-300">{term}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quiz Tab */}
            {activeTab === "quiz" && guide.quiz && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {guide.quiz.length} Questions
                  </h2>
                  <button
                    onClick={() => setStudyMode("quiz")}
                    className="btn-primary flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">school</span>
                    Take Quiz
                  </button>
                </div>

                <div className="space-y-4">
                  {guide.quiz.map((question, qIndex) => (
                    <div
                      key={qIndex}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-sm font-medium px-2 py-1 rounded">
                          Q{qIndex + 1}
                        </span>
                        <p className="font-medium text-gray-900 dark:text-white flex-1">
                          {question.question}
                        </p>
                      </div>
                      <div className="space-y-2 ml-8">
                        {question.options.map((option, oIndex) => (
                          <div
                            key={oIndex}
                            className={`p-3 rounded-lg text-sm ${
                              option === question.correct_answer
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <span className="font-medium mr-2">{String.fromCharCode(65 + oIndex)}.</span>
                            {option}
                            {option === question.correct_answer && (
                              <span className="material-symbols-outlined text-green-600 text-sm ml-2 align-middle">check</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {question.explanation && (
                        <div className="mt-3 ml-8 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                          <span className="font-medium">Explanation:</span> {question.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Chat Panel */}
        <div className="w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1.5">
                <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
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
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{message.text}</p>
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
