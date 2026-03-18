"use client";

import { useEffect, useState, useRef } from "react";
import { FlashcardStudyMode } from "./FlashcardStudyMode";
import { QuizStudyMode } from "./QuizStudyMode";

interface ContentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    id: number;
    title: string;
    description: string;
    type: string;
    createdAt: string;
    data?: any;
  } | null;
}

export function ContentViewModal({ isOpen, onClose, content }: ContentViewModalProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: "user" | "ai" | "typing" | "default";
    text: string;
  }>>([
    {
      id: "default",
      sender: "default",
      text: "Ask me anything about your study content!",
    },
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
    if (isChatOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Reset chat and study mode when modal opens
      setIsChatOpen(false);
      setIsStudyMode(false);
      setMessages([
        {
          id: "default",
          sender: "default",
          text: "Ask me anything about your study content!",
        },
      ]);
      setInputText("");
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const buildContext = () => {
    let context = "Here is the study material:\n\n";

    if (content?.data) {
      // For notes
      if (content.data.title) {
        context += `Title: ${content.data.title}\n\n`;
      }
      if (content.data.key_findings && content.data.key_findings.length > 0) {
        context += `Key Findings:\n${content.data.key_findings.map((f: string) => `- ${f}`).join("\n")}\n\n`;
      }
      if (content.data.important_notes && content.data.important_notes.length > 0) {
        context += `Important Notes:\n${content.data.important_notes.map((n: string) => `- ${n}`).join("\n")}\n\n`;
      }
      if (content.data.quick_summary) {
        context += `Summary:\n${content.data.quick_summary}\n\n`;
      }

      // For flashcards
      if (content.data.flashcards && content.data.flashcards.length > 0) {
        context += `Flashcards:\n`;
        content.data.flashcards.forEach((card: any, index: number) => {
          context += `${index + 1}. Q: ${card.question}\n   A: ${card.answer}\n`;
        });
        context += "\n";
      }

      // For quizzes
      if (content.data.quizzes && content.data.quizzes.length > 0) {
        context += `Quiz Questions:\n`;
        content.data.quizzes.forEach((quiz: any, index: number) => {
          context += `${index + 1}. ${quiz.question}\n`;
          context += `   Options: ${quiz.options.join(", ")}\n`;
          context += `   Correct Answer: ${quiz.correct_answer}\n`;
          context += `   Explanation: ${quiz.explanation}\n\n`;
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

    // Add typing indicator
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

      // Remove typing indicator
      setMessages((prev) => prev.filter((msg) => msg.id !== "typing"));

      if (result.success) {
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
          text: `⚠️ Error: ${result.error || "Failed to get response"}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== "typing"));
      const errorMessage = {
        id: Date.now().toString(),
        sender: "ai" as const,
        text: "⚠️ Error: Failed to send message. Please try again.",
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

  if (!isOpen || !content) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getIcon = () => {
    switch (content.type) {
      case "notes":
        return "description";
      case "flashcards":
        return "style";
      case "quiz":
        return "quiz";
      default:
        return "article";
    }
  };

  const getColorClasses = () => {
    switch (content.type) {
      case "notes":
        return {
          header: "bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/30",
          icon: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
        };
      case "flashcards":
        return {
          header: "bg-green-50 dark:bg-green-950/30 border-b border-green-100 dark:border-green-900/30",
          icon: "bg-green-100 dark:bg-green-900/30 text-green-600",
        };
      case "quiz":
        return {
          header: "bg-purple-50 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900/30",
          icon: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
        };
      default:
        return {
          header: "bg-gray-50 dark:bg-gray-950/30 border-b border-gray-100 dark:border-gray-900/30",
          icon: "bg-gray-100 dark:bg-gray-900/30 text-gray-600",
        };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 transition-all duration-300 ${isChatOpen ? "max-w-7xl" : "max-w-4xl"
        }`}>
        {/* Header */}
        <div className={`${colorClasses.header} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`${colorClasses.icon} rounded-lg p-2`}>
                <span className="material-symbols-outlined">{getIcon()}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{content.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{content.type}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
        </div>

        {/* Main Content Area - Flex container for content and chat */}
        <div className="flex h-[calc(90vh-180px)]">
          {/* Content Panel */}
          <div className={`overflow-y-auto p-6 transition-all duration-300 ${isChatOpen ? "w-1/2 border-r border-gray-200 dark:border-gray-800" : "w-full"
            }`}>
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Description
              </h3>
              <p className="text-gray-700 dark:text-gray-300">{content.description}</p>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Created
              </h3>
              <p className="text-gray-700 dark:text-gray-300">{formatDate(content.createdAt)}</p>
            </div>

            {content.type === "notes" && content.data && (
              <div className="space-y-6">
                {/* Quick Summary */}
                {content.data.quick_summary && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-6 border border-blue-200 dark:border-blue-900/30">
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Summary</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{content.data.quick_summary}</p>
                  </div>
                )}

                {/* Key Findings */}
                {content.data.key_findings && content.data.key_findings.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Findings</h3>
                    <ul className="space-y-2">
                      {content.data.key_findings.map((finding: string, index: number) => (
                        <li key={index} className="flex gap-3">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                          <span className="text-gray-700 dark:text-gray-300">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Important Notes */}
                {content.data.important_notes && content.data.important_notes.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-6 border border-yellow-200 dark:border-yellow-900/30">
                    <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-4">Important Notes</h3>
                    <ul className="space-y-2">
                      {content.data.important_notes.map((note: string, index: number) => (
                        <li key={index} className="flex gap-3">
                          <span className="text-yellow-600 dark:text-yellow-400 mt-1">⚠</span>
                          <span className="text-gray-700 dark:text-gray-300">{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {content.type === "flashcards" && content.data?.flashcards && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Flashcards ({content.data.flashcards.length})
                </h3>
                {content.data.flashcards.map((flashcard: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase">
                        Question {index + 1}
                      </span>
                      <p className="text-gray-900 dark:text-white font-medium mt-1">
                        {flashcard.question}
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Answer</span>
                      <p className="text-gray-700 dark:text-gray-300 mt-1">
                        {flashcard.answer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {content.type === "quiz" && content.data?.quizzes && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quiz Questions ({content.data.quizzes.length})
                </h3>
                {content.data.quizzes.map((quiz: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-900 dark:text-white font-medium mb-3">
                      {index + 1}. {quiz.question}
                    </p>
                    <div className="space-y-2 mb-3">
                      {quiz.options.map((option: string, optIndex: number) => (
                        <div
                          key={optIndex}
                          className={`flex items-center gap-2 p-2 rounded ${option === quiz.correct_answer
                              ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
                              : "bg-white dark:bg-gray-900"
                            }`}
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            {String.fromCharCode(65 + optIndex)}. {option}
                          </span>
                          {option === quiz.correct_answer && (
                            <span className="ml-auto text-green-600 dark:text-green-400 text-sm font-semibold">✓ Correct</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {quiz.explanation && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">Explanation</span>
                        <p className="text-gray-700 dark:text-gray-300 mt-1 text-sm">
                          {quiz.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Panel - Accordion style */}
          <div className={`flex flex-col bg-gray-50 dark:bg-gray-800/50 transition-all duration-300 ease-in-out ${isChatOpen ? "w-1/2 opacity-100" : "w-0 opacity-0 overflow-hidden"
            }`}>
            {isChatOpen && (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1.5">
                      <span className="material-symbols-outlined text-white text-sm">chat</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Chat with AI</h3>
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
                        <div className="bg-white dark:bg-gray-800 rounded-xl rounded-bl-sm p-3 max-w-[85%] border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{message.text}</p>
                        </div>
                      )}

                      {message.sender === "typing" && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl rounded-bl-sm p-3 border border-gray-200 dark:border-gray-700">
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
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
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
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-lg">send</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    Press Enter to send
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isChatOpen
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                  }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {isChatOpen ? "chat_bubble" : "chat"}
                </span>
                {isChatOpen ? "Hide Chat" : "Chat with AI"}
              </button>

              {/* Study Mode Button - Only for flashcards and quiz */}
              {(content.type === "flashcards" || content.type === "quiz") && (
                <button
                  onClick={() => setIsStudyMode(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">school</span>
                  Study Mode
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Study Mode Overlays */}
      {isStudyMode && content.type === "flashcards" && content.data?.flashcards && (
        <FlashcardStudyMode
          flashcards={content.data.flashcards}
          onClose={() => setIsStudyMode(false)}
        />
      )}

      {isStudyMode && content.type === "quiz" && content.data?.quizzes && (
        <QuizStudyMode
          quizzes={content.data.quizzes}
          onClose={() => setIsStudyMode(false)}
        />
      )}
    </div>
  );
}
