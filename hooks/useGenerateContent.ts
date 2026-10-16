"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/app/ToastContainer";
import { canGenerate, incrementUsage } from "@/lib/subscription";
import { persistProfileContent } from "@/lib/notesSync";
import { SHOW_APP_QR_EVENT, bumpGenerationCount, isOptedOut } from "@/lib/appPromo";
import { auth } from "@/lib/firebase";
import type { Profile, ContentItem, Topic } from "@/lib/types";
import { isAdminUser, publishNoteToLibrary } from "@/lib/publishNote";

interface UseGenerateContentOptions {
  profile: Profile | null;
  /** Folder the generated notes are filed into (undefined = Unsorted) */
  targetFolderId?: string;
  onGenerated?: (updatedContent: ContentItem[]) => void;
}

export function useGenerateContent({ profile, targetFolderId, onGenerated }: UseGenerateContentOptions) {
  const { showToast } = useToast();
  const router = useRouter();
  const [contentType, setContentType] = useState("url");
  const [contentInput, setContentInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [remainingGenerations, setRemainingGenerations] = useState(3);

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

      // One generation fans out to three requests (note/flashcards/quiz);
      // the shared setId makes the server meter it as a single generation
      // against the account's cross-platform budget.
      const setId = `gen_${Date.now().toString(36)}`;

      // The server's quota gate requires a signed-in caller; without a
      // session the requests would only ever 401 — prompt instead of firing.
      if (!auth?.currentUser) {
        showToast("Sign in to generate content — it's free.", "error");
        router.push("/auth/login");
        return;
      }

      // Generate all three types in parallel. Attach the Firebase ID token
      // so the server can enforce per-account quotas (see /api/generate).
      const authToken = await auth.currentUser.getIdToken();
      const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
      requestHeaders["Authorization"] = `Bearer ${authToken}`;

      const [noteResponse, flashcardResponse, quizResponse] = await Promise.all([
        fetch("/api/generate", {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({ ...requestBody, type: "note", setId }),
        }),
        fetch("/api/generate", {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({ ...requestBody, type: "flashcard", setId }),
        }),
        fetch("/api/generate", {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({ ...requestBody, type: "quiz", setId }),
        }),
      ]);

      const [noteResult, flashcardResult, quizResult] = await Promise.all([
        noteResponse.json().catch(() => ({ success: false, message: "Failed to parse notes response" })),
        flashcardResponse.json().catch(() => ({ success: false, message: "Failed to parse flashcards response" })),
        quizResponse.json().catch(() => ({ success: false, message: "Failed to parse quiz response" })),
      ]);

      // Check for HTTP errors
      if (!noteResponse.ok || !flashcardResponse.ok || !quizResponse.ok) {
        // Quota exhausted server-side (the shared budget may have been
        // spent on another device or the app) — paywall, not an error toast.
        if (
          noteResponse.status === 429 ||
          flashcardResponse.status === 429 ||
          quizResponse.status === 429
        ) {
          setIsPaywallOpen(true);
          return;
        }

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
          folderId: targetFolderId,
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
          folderId: targetFolderId,
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
          folderId: targetFolderId,
        });
      } else {
        errors.push(quizResult.message || "Quiz generation failed");
      }

      if (newItems.length === 0) {
        showToast(errors[0] || "Failed to generate any content. Please try again.", "error");
        return;
      }

      const storedContent: ContentItem[] =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem(`content_${profile.id}`) || "[]")
          : [];
      const updatedContent = [...newItems, ...storedContent];

      if (typeof window !== "undefined") {
        persistProfileContent(profile, updatedContent);
      }

      // Increment usage
      incrementUsage(profile.id);

      // Super admins: generation goes straight to the public library.
      // Failures never fail the generation itself.
      const noteItem = newItems.find((i) => i.type === "notes");
      if (noteItem && auth?.currentUser) {
        try {
          if (await isAdminUser()) {
            const flashcardItem = newItems.find((i) => i.type === "flashcards");
            const quizItem = newItems.find((i) => i.type === "quiz");
            const publishedTopic: Topic = {
              id: sourceId,
              title: noteItem.title,
              sourceType: contentType as Topic["sourceType"],
              createdAt: new Date().toISOString(),
              note: noteItem.data as Topic["note"],
              flashcards: flashcardItem?.data?.flashcards ?? [],
              quiz: quizItem?.data?.quizzes ?? [],
            };
            const { slug, url } = await publishNoteToLibrary(publishedTopic, auth.currentUser.uid);
            localStorage.setItem(`publishedSlug_${profile.id}_${sourceId}`, slug);
            try {
              await navigator.clipboard.writeText(url);
              showToast("Published to library — link copied", "success");
            } catch {
              showToast("Published to library", "success");
            }
          }
        } catch {
          showToast("Generated, but couldn't publish to the library", "error");
        }
      }

      // In-app App Store QR nudge: first generation and every 5th. The
      // counter always counts; the card itself respects the opt-out.
      const triggerCount = bumpGenerationCount(profile.id);
      if (triggerCount !== null && !isOptedOut(profile.id)) {
        window.dispatchEvent(new CustomEvent(SHOW_APP_QR_EVENT));
      }
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
      onGenerated?.(updatedContent);
    } catch (error) {
      console.error("Error generating content:", error);
      showToast("Failed to generate content. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    contentType,
    setContentType,
    contentInput,
    setContentInput,
    selectedFile,
    setSelectedFile,
    handleFileChange,
    generateContent,
    isProcessing,
    isPaywallOpen,
    setIsPaywallOpen,
    remainingGenerations,
  };
}
