"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProcessingModal } from "@/components/app/ProcessingModal";
import { useToast } from "@/components/app/ToastContainer";
import { Tooltip } from "@/components/app/Tooltip";
import { PaywallModal } from "@/components/app/PaywallModal";
import { Sidebar } from "@/components/app/Sidebar";
import { canGenerate, incrementUsage, getSubscription, UserSubscription } from "@/lib/subscription";
import { syncSubscriptionFromFirebase, createOrUpdateFirebaseUser } from "@/lib/firebaseSubscription";
import {
  syncTopicsFromFirebase,
  saveTopicToFirebase,
  deleteTopicFromFirebase,
  saveTopicsToLocalStorage,
  getTopicsFromLocalStorage,
} from "@/lib/firebaseTopics";
import { Topic, getYouTubeThumbnail, getSourceIcon, migrateContentToTopics } from "@/lib/types";

interface Profile {
  id: number;
  name: string;
  type: string;
  avatar: string;
}

// Legacy content item for backward compatibility
interface ContentItem {
  id: number;
  title: string;
  description: string;
  type: string;
  createdAt: string;
  data?: any;
  sourceId?: string;
  sourceName?: string;
  sourceType?: string;
}

export default function NotePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [contentType, setContentType] = useState("url");
  const [contentInput, setContentInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [remainingGenerations, setRemainingGenerations] = useState(3);

  useEffect(() => {
    const initializeDashboard = async () => {
      if (typeof window !== "undefined") {
        const currentProfile = localStorage.getItem("currentProfile");
        if (!currentProfile) {
          router.push("/note/profile-selection");
          return;
        }
        const profileData = JSON.parse(currentProfile);
        setProfile(profileData);

        // Get email from Firebase auth or profile
        const storedUser = localStorage.getItem("firebaseUser");
        const firebaseUser = storedUser ? JSON.parse(storedUser) : null;
        const email = firebaseUser?.email || profileData.email || "demo@example.com";

        try {
          await createOrUpdateFirebaseUser(email);
          const syncedSubscription = await syncSubscriptionFromFirebase(email, profileData.id);
          // Update subscription state with synced data
          if (syncedSubscription) {
            setSubscription(syncedSubscription);
          }

          // Sync topics from Firebase (full data: notes, flashcards, quizzes)
          const firebaseTopics = await syncTopicsFromFirebase(email, profileData.id);
          if (firebaseTopics.length > 0) {
            setTopics(firebaseTopics);
          } else {
            // Fall back to local topics
            const localTopics = getTopicsFromLocalStorage(profileData.id);
            if (localTopics.length > 0) {
              setTopics(localTopics);
            } else {
              // Try legacy content migration
              const storedContent = localStorage.getItem(`content_${profileData.id}`);
              if (storedContent) {
                const parsedContent = JSON.parse(storedContent);
                setContent(parsedContent);
                const migratedTopics = migrateContentToTopics(parsedContent);
                setTopics(migratedTopics);
                // Save migrated topics
                saveTopicsToLocalStorage(profileData.id, migratedTopics);
              }
            }
          }
        } catch (error) {
          console.log("Firebase sync skipped:", error);
          // Fall back to local
          const localTopics = getTopicsFromLocalStorage(profileData.id);
          if (localTopics.length > 0) {
            setTopics(localTopics);
          } else {
            const storedContent = localStorage.getItem(`content_${profileData.id}`);
            if (storedContent) {
              const parsedContent = JSON.parse(storedContent);
              setContent(parsedContent);
              setTopics(migrateContentToTopics(parsedContent));
            }
          }
        }
      }
    };

    initializeDashboard();
  }, [router]);

  // Update subscription state when profile changes
  useEffect(() => {
    if (profile) {
      const sub = getSubscription(profile.id);
      setSubscription(sub);
    }
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setContentInput(file.name);
    }
  };

  const generateContent = async () => {
    if (!contentInput.trim() && !selectedFile) return;
    if (!profile) return;

    // Check usage limits
    const usageCheck = canGenerate(profile.id);
    setRemainingGenerations(usageCheck.remaining);

    if (!usageCheck.allowed) {
      setIsPaywallOpen(true);
      return;
    }

    setIsProcessing(true);
    showToast("Generating your study materials...", "info");

    try {
      const sourceText = selectedFile ? selectedFile.name : contentInput;

      let contentToAnalyze = contentInput;
      let fileData: string | null = null;
      let fileMimeType: string | null = null;

      // Prepare content based on type
      if (selectedFile) {
        if (contentType === "image" || contentType === "pdf") {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });

          try {
            fileData = await base64Promise;
            fileMimeType = selectedFile.type || (contentType === "pdf" ? "application/pdf" : "image/jpeg");
            contentToAnalyze = contentType === "image"
              ? "Analyze this image and extract all relevant information."
              : "Analyze this PDF document and extract all relevant information.";
          } catch (error) {
            showToast(`Failed to read ${contentType} file`, "error");
            setIsProcessing(false);
            return;
          }
        }
      } else {
        if (contentType === "url") {
          contentToAnalyze = `Analyze the following link: ${contentInput}`;
        } else if (contentType === "youtube") {
          contentToAnalyze = `Analyze the following link: ${contentInput}`;
          fileMimeType = "video/youtube";
        }
      }

      const requestBody = {
        type: "",
        content: contentToAnalyze,
        ...(fileMimeType && { mimeType: fileMimeType }),
        ...(fileData && { fileData })
      };

      // Generate all three types in parallel
      const [noteResponse, flashcardResponse, quizResponse] = await Promise.all([
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestBody, type: "note" }),
        }),
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestBody, type: "flashcard" }),
        }),
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestBody, type: "quiz" }),
        }),
      ]);

      const [noteResult, flashcardResult, quizResult] = await Promise.all([
        noteResponse.json().catch(() => ({ success: false, message: "Failed to parse notes response" })),
        flashcardResponse.json().catch(() => ({ success: false, message: "Failed to parse flashcards response" })),
        quizResponse.json().catch(() => ({ success: false, message: "Failed to parse quiz response" })),
      ]);

      // Check for HTTP errors
      if (!noteResponse.ok || !flashcardResponse.ok || !quizResponse.ok) {
        const errorMessages = [];
        if (!noteResponse.ok) errorMessages.push(noteResult.message || noteResult.error || `Notes: HTTP ${noteResponse.status}`);
        if (!flashcardResponse.ok) errorMessages.push(flashcardResult.message || flashcardResult.error || `Flashcards: HTTP ${flashcardResponse.status}`);
        if (!quizResponse.ok) errorMessages.push(quizResult.message || quizResult.error || `Quiz: HTTP ${quizResponse.status}`);
        showToast(errorMessages[0] || "Failed to generate content. Please try again.", "error");
        return;
      }

      // Create content items
      const timestamp = Date.now();
      const sourceId = `source_${timestamp}`;
      const sourceName = sourceText.length > 50 ? sourceText.substring(0, 50) + "..." : sourceText;
      const sourceLabel = contentType.toUpperCase();

      const newItems: ContentItem[] = [];
      const errors: string[] = [];

      // Add notes
      if (noteResult.success && noteResult.data && !noteResult.data.error && noteResult.data.title) {
        newItems.push({
          id: timestamp,
          title: noteResult.data.title,
          description: `AI-generated notes from ${sourceLabel}`,
          type: "notes",
          createdAt: new Date().toISOString(),
          data: noteResult.data,
          sourceId,
          sourceName,
          sourceType: contentType,
        });
      } else {
        errors.push(noteResult.message || "Notes generation failed");
      }

      // Add flashcards
      if (flashcardResult.success && flashcardResult.data?.flashcards?.length > 0) {
        newItems.push({
          id: timestamp + 1,
          title: `Flashcards: ${sourceText.substring(0, 30)}...`,
          description: `${flashcardResult.data.flashcards.length} flashcards`,
          type: "flashcards",
          createdAt: new Date().toISOString(),
          sourceId,
          sourceName,
          sourceType: contentType,
          data: flashcardResult.data,
        });
      } else {
        errors.push(flashcardResult.message || "Flashcards generation failed");
      }

      // Add quiz
      if (quizResult.success && quizResult.data?.quizzes?.length > 0) {
        newItems.push({
          id: timestamp + 2,
          title: `Quiz: ${sourceText.substring(0, 30)}...`,
          description: `${quizResult.data.quizzes.length} questions`,
          type: "quiz",
          createdAt: new Date().toISOString(),
          sourceId,
          sourceName,
          sourceType: contentType,
          data: quizResult.data,
        });
      } else {
        errors.push(quizResult.message || "Quiz generation failed");
      }

      if (newItems.length === 0) {
        showToast(errors[0] || "Failed to generate any content. Please try again.", "error");
        return;
      }

      const updatedContent = [...newItems, ...content];
      setContent(updatedContent);
      setTopics(migrateContentToTopics(updatedContent));

      if (profile && typeof window !== "undefined") {
        localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
      }

      // Increment usage
      incrementUsage(profile.id);
      const newUsage = canGenerate(profile.id);
      setRemainingGenerations(newUsage.remaining);

      const successCount = newItems.length;
      if (errors.length > 0) {
        showToast(`Generated ${successCount} materials, ${errors.length} failed`, "warning");
      } else {
        showToast(`Successfully generated notes, flashcards & quiz!`, "success");
      }

      setContentInput("");
      setSelectedFile(null);
    } catch (error) {
      console.error("Error generating content:", error);
      showToast("Failed to generate content. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
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

  const handleDeleteTopic = async (topicId: string) => {
    if (!profile || typeof window === "undefined") return;

    const updatedTopics = topics.filter((t) => t.id !== topicId);
    setTopics(updatedTopics);
    saveTopicsToLocalStorage(profile.id, updatedTopics);
    showToast("Topic deleted", "success");

    // Delete from Firebase
    const storedUser = localStorage.getItem("firebaseUser");
    const firebaseUser = storedUser ? JSON.parse(storedUser) : null;
    if (firebaseUser?.email) {
      await deleteTopicFromFirebase(firebaseUser.email, profile.id, topicId);
    }
  };

  if (!profile) return null;

  return (
    <>
      <ProcessingModal
        isOpen={isProcessing}
        message="Analyzing your content and generating study materials..."
      />

      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <Sidebar profile={profile} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
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

            {/* Pro Upgrade Banner - shows for non-Pro users */}
            {subscription?.planId === "free" && (
              <div className="mb-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                      <span className="material-symbols-outlined text-white">cloud_sync</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Sync your notes across all devices
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Upgrade to Pro for cloud sync, unlimited generations, and more
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/note/pricing"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">workspace_premium</span>
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            )}

            {/* Input Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 mb-8 border border-gray-200 dark:border-gray-800">
              {/* Content Type Tabs */}
              <div className="flex flex-col sm:flex-row h-auto sm:h-14 w-full items-center rounded-xl bg-gray-100 dark:bg-gray-800 p-1.5 gap-2 sm:gap-1 mb-6">
                {[
                  { type: "url", icon: "link", label: "URL" },
                  { type: "pdf", icon: "picture_as_pdf", label: "PDF" },
                  { type: "youtube", icon: "play_circle", label: "YouTube" },
                  { type: "image", icon: "image", label: "Image" },
                ].map(({ type, icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setContentType(type)}
                    className={`flex cursor-pointer h-full grow items-center justify-center gap-2 rounded-lg px-4 py-2 w-full text-sm font-medium transition-all ${
                      contentType === type
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* Input Field */}
              <div className="flex flex-col sm:flex-row gap-3">
                {contentType === "url" || contentType === "youtube" ? (
                  <input
                    type="text"
                    value={contentInput}
                    onChange={(e) => setContentInput(e.target.value)}
                    placeholder={contentType === "url" ? "Paste URL here..." : "Paste YouTube URL here..."}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="flex-1 relative">
                    <input
                      type="file"
                      id="file-upload"
                      accept={contentType === "pdf" ? ".pdf" : "image/*"}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex items-center justify-between w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-blue-500 cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">upload_file</span>
                        <span className="text-sm">
                          {selectedFile ? selectedFile.name : `Click to upload ${contentType.toUpperCase()}`}
                        </span>
                      </span>
                      {selectedFile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedFile(null);
                            setContentInput("");
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      )}
                    </label>
                  </div>
                )}
                <button
                  onClick={generateContent}
                  disabled={!contentInput.trim() && !selectedFile}
                  className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate
                </button>
              </div>
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
                          handleDeleteTopic(topic.id);
                        }}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-2 z-10 shadow-lg"
                        title="Delete topic"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
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
                              <span className="material-symbols-outlined">{getSourceIcon(topic.sourceType)}</span>
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
                                <span className="material-symbols-outlined text-xs">description</span>
                                Notes
                              </span>
                            )}
                            {topic.flashcards && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                <span className="material-symbols-outlined text-xs">style</span>
                                {topic.flashcards.length} cards
                              </span>
                            )}
                            {topic.quiz && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                <span className="material-symbols-outlined text-xs">quiz</span>
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
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
                  <span className="material-symbols-outlined text-7xl">auto_stories</span>
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
      </div>

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        remainingGenerations={remainingGenerations}
        profileId={profile?.id || 0}
      />
    </>
  );
}
