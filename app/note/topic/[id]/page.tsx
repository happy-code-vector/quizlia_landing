"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/app/ToastContainer";
import { FlashcardStudyMode } from "@/components/app/FlashcardStudyMode";
import { QuizStudyMode } from "@/components/app/QuizStudyMode";
import { Topic, getYouTubeThumbnail, getSourceIcon } from "@/lib/types";
import { Sidebar } from "@/components/app/Sidebar";

type TabType = "note" | "flashcards" | "quiz";

interface Profile {
  id: number;
  name: string;
  type: string;
  avatar: string;
}

export default function TopicDetailPage() {
  const router = useRouter();
  const params = useParams();
  const topicId = params.id as string;
  const { showToast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("note");
  const [studyMode, setStudyMode] = useState<"flashcards" | "quiz" | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: "user" | "ai" | "typing" | "default";
    text: string;
  }>>([
    { id: "default", sender: "default", text: "Ask me anything about this topic!" },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentProfile = localStorage.getItem("currentProfile");
      if (!currentProfile) {
        router.push("/note/profile-selection");
        return;
      }

      const profileData = JSON.parse(currentProfile);
      setProfile(profileData);

      const storedContent = localStorage.getItem(`content_${profileData.id}`);

      if (storedContent) {
        const content = JSON.parse(storedContent);
        const sourceItems = content.filter((item: any) => item.sourceId === topicId);

        if (sourceItems.length > 0) {
          const firstItem = sourceItems[0];
          const constructedTopic: Topic = {
            id: topicId,
            title: firstItem.sourceName || firstItem.title || "Unknown Topic",
            sourceType: firstItem.sourceType || "url",
            sourceUrl: firstItem.sourceType === "youtube" || firstItem.sourceType === "url"
              ? firstItem.sourceName
              : undefined,
            createdAt: firstItem.createdAt,
          };

          for (const item of sourceItems) {
            if (item.type === "notes" && item.data) {
              constructedTopic.note = item.data;
              if (item.data.title && item.data.title.length > 10) {
                constructedTopic.title = item.data.title;
              }
            } else if (item.type === "flashcards" && item.data?.flashcards) {
              constructedTopic.flashcards = item.data.flashcards;
            } else if (item.type === "quiz" && item.data?.quizzes) {
              constructedTopic.quiz = item.data.quizzes;
            }
          }

          setTopic(constructedTopic);

          if (constructedTopic.note) {
            setActiveTab("note");
          } else if (constructedTopic.flashcards) {
            setActiveTab("flashcards");
          } else if (constructedTopic.quiz) {
            setActiveTab("quiz");
          }
        }
      }

      setLoading(false);
    }
  }, [router, topicId]);

  const handleDeleteTopic = () => {
    if (!profile || typeof window === "undefined") return;

    const storedContent = localStorage.getItem(`content_${profile.id}`);
    if (storedContent) {
      const content = JSON.parse(storedContent);
      const updatedContent = content.filter((item: any) => item.sourceId !== topicId);
      localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
    }

    showToast("Topic deleted successfully", "success");
    router.push("/note");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Chat functions
  const buildContext = () => {
    let context = "Here is the study material:\n\n";

    if (topic) {
      if (topic.title) {
        context += `Title: ${topic.title}\n\n`;
      }
      if (topic.note) {
        if (topic.note.quick_summary) {
          context += `Summary:\n${topic.note.quick_summary}\n\n`;
        }
        if (topic.note.key_findings && topic.note.key_findings.length > 0) {
          context += `Key Findings:\n${topic.note.key_findings.map((f: string) => `- ${f}`).join("\n")}\n\n`;
        }
        if (topic.note.detailed_notes) {
          context += `Detailed Notes:\n${topic.note.detailed_notes}\n\n`;
        }
      }
      if (topic.flashcards && topic.flashcards.length > 0) {
        context += `Flashcards:\n`;
        topic.flashcards.forEach((card, index) => {
          context += `${index + 1}. Q: ${card.question}\n   A: ${card.answer}\n`;
        });
        context += "\n";
      }
      if (topic.quiz && topic.quiz.length > 0) {
        context += `Quiz Questions:\n`;
        topic.quiz.forEach((q, index) => {
          context += `${index + 1}. ${q.question}\n`;
          context += `   Correct Answer: ${q.correct_answer}\n`;
        });
      }
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

    const typingMessage = {
      id: "typing",
      sender: "typing" as const,
      text: "",
    };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      const context = buildContext();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: inputText,
          context: context,
        }),
      });

      const result = await response.json();
      setMessages((prev) => prev.filter((msg) => msg.id !== "typing"));

      if (result.success || result.answer) {
        const aiMessage = {
          id: Date.now().toString(),
          sender: "ai" as const,
          text: result.answer,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const errorMessage = {
          id: Date.now().toString(),
          sender: "ai" as const,
          text: `Error: ${result.error || "Failed to get response"}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== "typing"));
      const errorMessage = {
        id: Date.now().toString(),
        sender: "ai" as const,
        text: "Error: Failed to send message. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  if (loading || !profile) {
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Topic not found</h1>
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
        onClose={() => setStudyMode(null)}
      />
    );
  }

  const youtubeThumbnail = topic.sourceType === "youtube" && topic.sourceUrl
    ? getYouTubeThumbnail(topic.sourceUrl)
    : null;

  const tabs: { id: TabType; label: string; icon: string; available: boolean; count?: number }[] = [
    { id: "note", label: "Notes", icon: "description", available: !!topic.note },
    { id: "flashcards", label: "Flashcards", icon: "style", available: !!topic.flashcards, count: topic.flashcards?.length },
    { id: "quiz", label: "Quiz", icon: "quiz", available: !!topic.quiz, count: topic.quiz?.length },
  ];

  const availableTabs = tabs.filter(t => t.available);

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
                    href="/note"
                    className="mt-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-md p-1.5">
                        <span className="material-symbols-outlined">{getSourceIcon(topic.sourceType)}</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 uppercase">{topic.sourceType}</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                      {topic.title}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Created {formatDate(topic.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDeleteTopic}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                  title="Delete topic"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>

              {/* YouTube Thumbnail */}
              {youtubeThumbnail && (
                <div className="mt-4 ml-14">
                  <img
                    src={youtubeThumbnail}
                    alt="Video thumbnail"
                    className="rounded-lg max-w-xs border border-gray-200 dark:border-gray-700"
                  />
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
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {topic.note.quick_summary}
                    </p>
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

                {topic.note.detailed_notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Detailed Notes
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {topic.note.detailed_notes}
                      </p>
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
                    className="btn-primary flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">school</span>
                    Study Mode
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topic.flashcards.map((card, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
                    >
                      <div className="text-xs text-gray-400 mb-2">Card {index + 1}</div>
                      <div className="font-medium text-gray-900 dark:text-white mb-3">
                        {card.question}
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div className="text-xs text-gray-400 mb-1">Answer</div>
                        <div className="text-gray-700 dark:text-gray-300">
                          {card.answer}
                        </div>
                      </div>
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
                    className="btn-primary flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">school</span>
                    Take Quiz
                  </button>
                </div>

                <div className="space-y-4">
                  {topic.quiz.map((question, qIndex) => (
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
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1.5">
                <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ask about this topic</p>
              </div>
            </div>
          </div>

          {/* Messages */}
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

          {/* Chat Input */}
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
