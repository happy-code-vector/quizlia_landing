"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProcessingModal } from "@/components/app/ProcessingModal";
import { useToast } from "@/components/app/ToastContainer";
import { ContentViewModal } from "@/components/app/ContentViewModal";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { Tooltip } from "@/components/app/Tooltip";
import { CreateFolderModal } from "@/components/app/CreateFolderModal";
import { MoveFolderModal } from "@/components/app/MoveFolderModal";
import { DeleteFolderModal } from "@/components/app/DeleteFolderModal";
import { FlashcardStudyMode } from "@/components/app/FlashcardStudyMode";
import { QuizStudyMode } from "@/components/app/QuizStudyMode";
import { RenameModal } from "@/components/app/RenameModal";
import { ItemActionsMenu } from "@/components/app/ItemActionsMenu";
import { PaywallModal } from "@/components/app/PaywallModal";
import { UsageIndicator } from "@/components/app/UsageIndicator";
import { canGenerate, incrementUsage } from "@/lib/subscription";
import { syncSubscriptionFromFirebase, createOrUpdateFirebaseUser } from "@/lib/firebaseSubscription";

const avatarColors: Record<string, string> = {
  "avatar-1": "from-blue-400 to-purple-400",
  "avatar-2": "from-green-400 to-teal-400",
  "avatar-3": "from-orange-400 to-red-400",
  "avatar-4": "from-pink-400 to-rose-400",
  "avatar-5": "from-yellow-400 to-orange-400",
  "avatar-6": "from-indigo-400 to-blue-400",
};

const contentIcons: Record<string, string> = {
  notes: "description",
  flashcards: "style",
  quiz: "quiz",
};

interface Profile {
  id: number;
  name: string;
  type: string;
  avatar: string;
}

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
  folderId?: string | null; // Add folder support
}

interface Folder {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  itemCount: number;
}

// Document structure matching iOS app
interface Document {
  id: number;
  title: string;
  contentType: string; // youtube, pdf, image, url
  contentPath: string; // URL or file path
  note?: any; // NoteResponse data
  flashcards?: Array<{ question: string; answer: string }>;
  quizzes?: any[];
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [contentType, setContentType] = useState("url");
  const [contentInput, setContentInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"folder" | "material" | "item">("folder"); // Three view modes
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isViewingFolderContents, setIsViewingFolderContents] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isMoveFolderOpen, setIsMoveFolderOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState<ContentItem | null>(null);
  const [sourceToMove, setSourceToMove] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [studyModeItem, setStudyModeItem] = useState<ContentItem | null>(null);
  const [itemToRename, setItemToRename] = useState<ContentItem | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [remainingGenerations, setRemainingGenerations] = useState(3);

  // Toggle sidebar and persist state
  const toggleSidebar = () => {
    const newState = !sidebarExpanded;
    setSidebarExpanded(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebarExpanded", String(newState));
    }
  };

  const handleDeleteClick = (itemId: number) => {
    setDeleteItemId(itemId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteItemId === null) return;

    // Check if it's a source ID (string) or item ID (number)
    if (typeof deleteItemId === "string") {
      // Delete all items from this source
      const sourceItems = groupedBySource[deleteItemId];
      if (!sourceItems) return;

      const itemCount = sourceItems.items.length;
      const updatedContent = content.filter((item) => item.sourceId !== deleteItemId);
      setContent(updatedContent);

      if (profile && typeof window !== "undefined") {
        localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
      }

      showToast(`Deleted ${itemCount} item${itemCount !== 1 ? 's' : ''} from source`, "success");
    } else {
      // Delete single item
      const updatedContent = content.filter((item) => item.id !== deleteItemId);
      setContent(updatedContent);

      if (profile && typeof window !== "undefined") {
        localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
      }

      showToast("Item deleted successfully", "success");
    }

    setDeleteItemId(null);
  };

  // Rename item
  const handleRename = (newTitle: string) => {
    if (!itemToRename || !profile) return;

    const updatedContent = content.map((item) =>
      item.id === itemToRename.id ? { ...item, title: newTitle } : item
    );

    setContent(updatedContent);

    if (typeof window !== "undefined") {
      localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
    }

    showToast("Item renamed successfully", "success");
    setItemToRename(null);
  };

  // Share item
  const handleShare = async (item: ContentItem) => {
    const shareData = {
      title: item.title,
      text: `Check out my ${item.type}: ${item.title}\n\n${item.description}`,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showToast("Shared successfully!", "success");
      } else {
        // Fallback: copy to clipboard
        const textToCopy = `${item.title}\n\n${item.description}`;
        await navigator.clipboard.writeText(textToCopy);
        showToast("Copied to clipboard!", "success");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        showToast("Failed to share", "error");
      }
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      if (typeof window !== "undefined") {
        const currentProfile = localStorage.getItem("currentProfile");
        if (!currentProfile) {
          router.push("/profile-selection");
          return;
        }
        const profileData = JSON.parse(currentProfile);
        setProfile(profileData);

        // Sync subscription from Firebase
        const email = profileData.email || "demo@example.com";
        try {
          await createOrUpdateFirebaseUser(email);
          await syncSubscriptionFromFirebase(email, profileData.id);
        } catch (error) {
          console.log("Firebase sync skipped:", error);
        }

        const storedContent = localStorage.getItem(`content_${profileData.id}`);
        if (storedContent) {
          setContent(JSON.parse(storedContent));
        }

        // Load sidebar state
        const storedSidebarState = localStorage.getItem("sidebarExpanded");
        if (storedSidebarState !== null) {
          setSidebarExpanded(storedSidebarState === "true");
        }

        // Load folders
        const storedFolders = localStorage.getItem(`folders_${profileData.id}`);
        if (storedFolders) {
          setFolders(JSON.parse(storedFolders));
        }
      }
    };

    initializeDashboard();
  }, [router]);

  // Create folder
  const handleCreateFolder = (folderName: string, folderIcon: string) => {
    if (!profile) return;

    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name: folderName,
      icon: folderIcon,
      createdAt: new Date().toISOString(),
      itemCount: 0,
    };

    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);

    if (typeof window !== "undefined") {
      localStorage.setItem(`folders_${profile.id}`, JSON.stringify(updatedFolders));
    }

    showToast(`Folder "${folderName}" created successfully!`, "success");
  };

  // Move item(s) to folder
  const handleMoveToFolder = (folderId: string | null) => {
    if (!profile) return;

    let updatedContent;
    let itemCount = 0;

    // Check if moving a single item or all items from a source
    if (sourceToMove) {
      // Move all items from this source
      updatedContent = content.map((item) =>
        item.sourceId === sourceToMove ? { ...item, folderId } : item
      );
      itemCount = content.filter((item) => item.sourceId === sourceToMove).length;
    } else if (itemToMove) {
      // Move single item
      updatedContent = content.map((item) =>
        item.id === itemToMove.id ? { ...item, folderId } : item
      );
      itemCount = 1;
    } else {
      return;
    }

    setContent(updatedContent);

    if (typeof window !== "undefined") {
      localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
    }

    // Update folder item counts
    updateFolderCounts(updatedContent);

    const folderName = folderId
      ? folders.find((f) => f.id === folderId)?.name || "folder"
      : "General";

    showToast(
      `Moved ${itemCount} item${itemCount !== 1 ? 's' : ''} to ${folderName}`,
      "success"
    );
    setItemToMove(null);
    setSourceToMove(null);
  };

  // Update folder item counts
  const updateFolderCounts = (contentList: ContentItem[]) => {
    const updatedFolders = folders.map((folder) => ({
      ...folder,
      itemCount: contentList.filter((item) => item.folderId === folder.id).length,
    }));

    setFolders(updatedFolders);

    if (profile && typeof window !== "undefined") {
      localStorage.setItem(`folders_${profile.id}`, JSON.stringify(updatedFolders));
    }
  };

  // Delete folder - move items to General
  const handleDeleteFolderKeepItems = (folderId: string) => {
    if (!profile) return;

    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    const itemCount = content.filter((item) => item.folderId === folderId).length;

    // Move all items in this folder to General (null)
    const updatedContent = content.map((item) =>
      item.folderId === folderId ? { ...item, folderId: null } : item
    );

    setContent(updatedContent);

    // Remove folder
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    setFolders(updatedFolders);

    if (typeof window !== "undefined") {
      localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
      localStorage.setItem(`folders_${profile.id}`, JSON.stringify(updatedFolders));
    }

    showToast(`Folder deleted, ${itemCount} item${itemCount !== 1 ? 's' : ''} moved to General`, "success");
    setSelectedFolderId(null);
  };

  // Delete folder and all its contents
  const handleDeleteFolderAndContents = (folderId: string) => {
    if (!profile) return;

    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    const itemCount = content.filter((item) => item.folderId === folderId).length;

    // Delete all items in this folder
    const updatedContent = content.filter((item) => item.folderId !== folderId);

    setContent(updatedContent);

    // Remove folder
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    setFolders(updatedFolders);

    if (typeof window !== "undefined") {
      localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
      localStorage.setItem(`folders_${profile.id}`, JSON.stringify(updatedFolders));
    }

    showToast(`Folder and ${itemCount} item${itemCount !== 1 ? 's' : ''} deleted permanently`, "success");
    setSelectedFolderId(null);
  };

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
    showToast("Starting content generation...", "info");

    try {
      const source = selectedFile || contentInput;
      const sourceText = selectedFile ? selectedFile.name : contentInput;

      let contentToAnalyze = contentInput;
      let fileData: string | null = null;
      let fileMimeType: string | null = null;

      // Prepare content based on type
      if (selectedFile) {
        if (contentType === "image" || contentType === "pdf") {
          // For images and PDFs, convert to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1]; // Remove data:...;base64, prefix
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
        // For URLs and YouTube, add context
        if (contentType === "url") {
          contentToAnalyze = `Analyze the following link: ${contentInput}`;
        } else if (contentType === "youtube") {
          // YouTube videos use File API with video URI
          contentToAnalyze = `Analyze the following link: ${contentInput}`;
          fileMimeType = "video/youtube"; // Special marker for YouTube
        }
      }

      // Prepare request body
      const requestBody = {
        type: "",
        content: contentToAnalyze,
        ...(fileMimeType && { 
          mimeType: fileMimeType
        }),
        ...(fileData && { 
          fileData
        })
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

      // Parse all responses
      const [noteResult, flashcardResult, quizResult] = await Promise.all([
        noteResponse.json().catch(() => ({ success: false, message: "Failed to parse notes response" })),
        flashcardResponse.json().catch(() => ({ success: false, message: "Failed to parse flashcards response" })),
        quizResponse.json().catch(() => ({ success: false, message: "Failed to parse quiz response" })),
      ]);

      // Check for HTTP errors first
      if (!noteResponse.ok || !flashcardResponse.ok || !quizResponse.ok) {
        const errorMessages = [];
        if (!noteResponse.ok) {
          errorMessages.push(noteResult.message || noteResult.error || `Notes: HTTP ${noteResponse.status}`);
        }
        if (!flashcardResponse.ok) {
          errorMessages.push(flashcardResult.message || flashcardResult.error || `Flashcards: HTTP ${flashcardResponse.status}`);
        }
        if (!quizResponse.ok) {
          errorMessages.push(quizResult.message || quizResult.error || `Quiz: HTTP ${quizResponse.status}`);
        }

        showToast(errorMessages[0] || "Failed to generate content. Please try again.", "error");
        return;
      }

      // Create content items with generated data
      const timestamp = Date.now();
      const sourceLabel = contentType.toUpperCase();
      const sourceId = `source_${timestamp}`;
      const sourceName = sourceText.length > 50 ? sourceText.substring(0, 50) + "..." : sourceText;

      const newItems: ContentItem[] = [];
      const errors: string[] = [];

      // Validate and add notes
      if (noteResult.success && noteResult.data) {
        // Check if data has required fields and is not an error
        if (noteResult.data.error) {
          errors.push(noteResult.data.message || "Notes: Content not accessible");
        } else if (noteResult.data.title && noteResult.data.key_findings && noteResult.data.quick_summary) {
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
            folderId: selectedFolderId, // Save to current folder
          });
        } else {
          errors.push("Notes: Invalid content structure");
        }
      } else {
        errors.push(noteResult.message || "Notes generation failed");
      }

      // Validate and add flashcards
      if (flashcardResult.success && flashcardResult.data) {
        // Check if data has flashcards array and is not an error
        if (flashcardResult.data.error) {
          errors.push(flashcardResult.data.message || "Flashcards: Content not accessible");
        } else if (flashcardResult.data.flashcards && Array.isArray(flashcardResult.data.flashcards) && flashcardResult.data.flashcards.length > 0) {
          newItems.push({
            id: timestamp + 1,
            title: `Flashcards: ${sourceText.substring(0, 30)}...`,
            description: `${flashcardResult.data.flashcards.length} flashcards from ${sourceLabel}`,
            type: "flashcards",
            createdAt: new Date().toISOString(),
            sourceId,
            sourceName,
            sourceType: contentType,
            data: flashcardResult.data,
            folderId: selectedFolderId, // Save to current folder
          });
        } else {
          errors.push("Flashcards: No valid flashcards generated");
        }
      } else {
        errors.push(flashcardResult.message || "Flashcards generation failed");
      }

      // Validate and add quizzes
      if (quizResult.success && quizResult.data) {
        // Check if data has quizzes array and is not an error
        if (quizResult.data.error) {
          errors.push(quizResult.data.message || "Quiz: Content not accessible");
        } else if (quizResult.data.quizzes && Array.isArray(quizResult.data.quizzes) && quizResult.data.quizzes.length > 0) {
          newItems.push({
            id: timestamp + 2,
            title: `Quiz: ${sourceText.substring(0, 30)}...`,
            description: `${quizResult.data.quizzes.length} questions from ${sourceLabel}`,
            type: "quiz",
            createdAt: new Date().toISOString(),
            data: quizResult.data,
            sourceId,
            sourceName,
            sourceType: contentType,
            folderId: selectedFolderId, // Save to current folder
          });
        } else {
          errors.push("Quiz: No valid questions generated");
        }
      } else {
        errors.push(quizResult.message || "Quiz generation failed");
      }

      // If no items were generated, show first error
      if (newItems.length === 0) {
        showToast(errors[0] || "Failed to generate any content. Please try again.", "error");
        return;
      }

      const updatedContent = [...newItems, ...content];
      setContent(updatedContent);

      if (profile && typeof window !== "undefined") {
        localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
      }

      // Increment usage count after successful generation
      if (newItems.length > 0) {
        incrementUsage(profile.id);
        const newUsage = canGenerate(profile.id);
        setRemainingGenerations(newUsage.remaining);
      }

      // Show success with warning if some failed
      if (errors.length > 0) {
        showToast(`Generated ${newItems.length} materials, but ${errors.length} failed`, "warning");
      } else {
        showToast(`Successfully generated ${newItems.length} study materials!`, "success");
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
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Filter content based on context:
  // - At folder grid: show ALL content
  // - Inside a folder: show only that folder's content (for all views)
  const folderContent = isViewingFolderContents
    ? content.filter((item) => item.folderId === selectedFolderId)
    : content;

  // Group content by source material
  const groupedBySource = folderContent.reduce((acc, item) => {
    const sourceId = item.sourceId || "unknown";
    if (!acc[sourceId]) {
      acc[sourceId] = {
        sourceId,
        sourceName: item.sourceName || "Unknown Source",
        sourceType: item.sourceType || "url",
        items: [],
        createdAt: item.createdAt,
      };
    }
    acc[sourceId].items.push(item);
    return acc;
  }, {} as Record<string, { sourceId: string; sourceName: string; sourceType: string; items: ContentItem[]; createdAt: string }>);

  const sources = Object.values(groupedBySource);

  // Get items to display based on view mode (filtered by folder)
  const displayItems = viewMode === "item" 
    ? folderContent 
    : selectedSourceId 
      ? groupedBySource[selectedSourceId]?.items || []
      : [];

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "url": return "link";
      case "pdf": return "picture_as_pdf";
      case "youtube": return "play_circle";
      case "image": return "image";
      default: return "article";
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
        <div className="relative hidden md:flex flex-shrink-0">
          <aside className={`${sidebarExpanded ? "w-64" : "w-20"} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300`}>
            <div className="flex h-full flex-col justify-between p-4">
              <div className="flex flex-col gap-4">
                <div className="flex gap-3 items-center">
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center rounded-lg w-10 h-10">
                    <span className="material-symbols-outlined">auto_stories</span>
                  </div>
                  {sidebarExpanded && <h1 className="text-lg font-bold text-gray-900 dark:text-white">QuickNote</h1>}
                </div>

                <Link 
                  href="/profile-selection" 
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    sidebarExpanded 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-800" 
                      : "justify-center"
                  }`} 
                  title="Switch Profile"
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[profile.avatar]} shrink-0 ${!sidebarExpanded ? "hover:ring-2 hover:ring-purple-400 transition-all" : ""}`} />
                  {sidebarExpanded && (
                    <div className="flex flex-col flex-1 min-w-0">
                      <h1 className="text-sm font-medium text-gray-900 dark:text-white truncate">{profile.name}</h1>
                      <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">{profile.type}</p>
                    </div>
                  )}
                  {sidebarExpanded && (
                    <span className="material-symbols-outlined text-gray-400 text-sm">swap_horiz</span>
                  )}
                </Link>

                <nav className="flex flex-col gap-1 mt-4">
                  <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                    <span className="material-symbols-outlined fill">home</span>
                    {sidebarExpanded && <p className="text-sm font-medium">Dashboard</p>}
                  </Link>
                  <Link href="/notes" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined">description</span>
                    {sidebarExpanded && <p className="text-sm font-medium">All Notes</p>}
                  </Link>
                  <Link href="/flashcards" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined">style</span>
                    {sidebarExpanded && <p className="text-sm font-medium">All Flashcards</p>}
                  </Link>
                  <Link href="/quizzes" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined">quiz</span>
                    {sidebarExpanded && <p className="text-sm font-medium">All Quizzes</p>}
                  </Link>
                </nav>
              </div>

              <div className="flex flex-col gap-4">
                {sidebarExpanded && profile && (
                  <UsageIndicator profileId={profile.id} onUpgradeClick={() => setIsPaywallOpen(true)} />
                )}
                <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined">settings</span>
                  {sidebarExpanded && <p className="text-sm font-medium">Settings</p>}
                </Link>
              </div>
            </div>
          </aside>
          
          {/* Collapse/Expand toggle button - centered on the border line */}
          <button
            onClick={toggleSidebar}
            className="absolute top-1/2 -translate-y-1/2 -right-3 z-10 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md transition-all group"
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span className="material-symbols-outlined text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
              {sidebarExpanded ? "chevron_left" : "chevron_right"}
            </span>
          </button>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-10 py-8 w-full max-w-6xl mx-auto">
            <div className="flex flex-wrap justify-between gap-3 p-4 mb-6">
              <div className="flex min-w-72 flex-col gap-3">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">What do you want to learn today?</h1>
                <p className="text-gray-600 dark:text-gray-400">Generate notes, flashcards, and quizzes from any content</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 mb-8 border border-gray-200 dark:border-gray-800">
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
                      className="flex items-center justify-between w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors"
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

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Library</h2>
                {/* Current Folder Indicator (shown when viewing folder contents in any mode) */}
                {isViewingFolderContents && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <span className="text-lg">
                      {selectedFolderId === null ? "📂" : folders.find((f) => f.id === selectedFolderId)?.icon}
                    </span>
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      {selectedFolderId === null ? "General" : folders.find((f) => f.id === selectedFolderId)?.name}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {/* View Mode Toggle - Show Folders option only when not viewing folder contents */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 h-11">
                  {!isViewingFolderContents && (
                    <button
                      onClick={() => {
                        setViewMode("folder");
                        setSelectedSourceId(null);
                        setIsViewingFolderContents(false);
                      }}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === "folder"
                          ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">folder</span>
                        Folders
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setViewMode("material");
                      setSelectedSourceId(null);
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "material"
                        ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">source</span>
                      Sources
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setViewMode("item");
                      setSelectedSourceId(null);
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "item"
                        ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">grid_view</span>
                      Items
                    </span>
                  </button>
                </div>
                <div className="w-full sm:w-64">
                  <div className="flex items-center h-11 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 pl-3">search</span>
                    <input type="text" placeholder="Search your library..." className="flex-1 px-3 py-2 bg-transparent text-gray-900 dark:text-white focus:outline-none text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Folder View - Show Folders */}
            {viewMode === "folder" && !isViewingFolderContents && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Create Folder Card */}
                <button
                  onClick={() => setIsCreateFolderOpen(true)}
                  className="group bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl p-6 hover:border-purple-500 dark:hover:border-purple-500 transition-all min-h-[180px] flex items-center justify-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-3xl">add</span>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">Create Folder</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Organize your content</p>
                  </div>
                </button>

                {/* General Folder */}
                <button
                  onClick={() => {
                    setSelectedFolderId(null);
                    setIsViewingFolderContents(true);
                    setViewMode("item"); // Switch to Items view when entering folder
                  }}
                  className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-lg min-h-[180px]"
                >
                  <div className="flex flex-col items-center gap-3 h-full justify-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                      📂
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">General</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {content.filter((item) => !item.folderId).length} items
                    </p>
                  </div>
                </button>

                {/* User Folders */}
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-lg relative min-h-[180px]"
                  >
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderToDelete(folder);
                        setIsDeleteFolderModalOpen(true);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 z-10"
                      title="Delete folder"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        setIsViewingFolderContents(true);
                        setViewMode("item"); // Switch to Items view when entering folder
                      }}
                      className="w-full h-full"
                    >
                      <div className="flex flex-col items-center gap-3 h-full justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl flex items-center justify-center text-3xl border border-purple-200 dark:border-purple-800 group-hover:scale-110 transition-transform">
                          {folder.icon}
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white truncate max-w-full px-2">{folder.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {content.filter((item) => item.folderId === folder.id).length} items
                        </p>
                      </div>
                    </button>
                  </div>
                ))}

                {/* Empty State */}
                {folders.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <div className="text-gray-400 dark:text-gray-600 mb-4">
                      <span className="material-symbols-outlined text-6xl">folder_off</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">No custom folders yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Click "Create Folder" to organize your content</p>
                  </div>
                )}
              </div>
            )}

            {/* Folder View - Show Items in Selected Folder */}
            {viewMode === "folder" && isViewingFolderContents && (
              <div>
                {/* Breadcrumb */}
                <button
                  onClick={() => {
                    setIsViewingFolderContents(false);
                    setViewMode("folder");
                  }}
                  className="mb-6 flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back to Folders
                </button>

                {/* Items in Folder */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {content
                    .filter((item) => item.folderId === selectedFolderId)
                    .map((item) => (
                      <div key={item.id} className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
                        {/* More Actions Menu - Top Right */}
                        <div className="absolute top-3 right-3 z-10">
                          <ItemActionsMenu
                            onRename={() => {
                              setItemToRename(item);
                              setIsRenameModalOpen(true);
                            }}
                            onMove={() => {
                              setItemToMove(item);
                              setIsMoveFolderOpen(true);
                            }}
                            showMove={true}
                          />
                        </div>
                        <div className="p-5 pr-12">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-md p-1.5">
                              <span className="material-symbols-outlined">{contentIcons[item.type]}</span>
                            </div>
                            <Tooltip content={item.title} className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold truncate text-gray-900 dark:text-white">{item.title}</h3>
                            </Tooltip>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.description}</p>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex justify-between items-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(item.createdAt)}</span>
                          <div className="flex gap-2">
                            {(item.type === "flashcards" || item.type === "quiz") && (
                              <button
                                onClick={() => setStudyModeItem(item)}
                                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                title="Study Mode"
                              >
                                <span className="material-symbols-outlined text-lg">school</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedContent(item);
                                setIsViewModalOpen(true);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                              title="View"
                            >
                              <span className="material-symbols-outlined text-lg">visibility</span>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Empty Folder State */}
                {content.filter((item) => item.folderId === selectedFolderId).length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-gray-400 dark:text-gray-600 mb-4">
                      <span className="material-symbols-outlined text-7xl">folder_open</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {selectedFolderId === null ? "General folder is empty" : "This folder is empty"}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      Generate study materials and they'll appear here, or move existing items to this folder
                    </p>
                    <button
                      onClick={() => (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus()}
                      className="btn-primary"
                    >
                      Generate Content
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Material View - Show Sources */}
            {viewMode === "material" && !selectedSourceId && (
              <div>
                {/* Back to Folders button when viewing folder contents */}
                {isViewingFolderContents && (
                  <button
                    onClick={() => {
                      setIsViewingFolderContents(false);
                      setViewMode("folder");
                    }}
                    className="mb-6 flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Back to Folders
                  </button>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sources.map((source) => (
                  <div
                    key={source.sourceId}
                    className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all hover:border-blue-500 dark:hover:border-blue-500 relative"
                  >
                    {/* Action buttons - absolute positioned */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                      {isViewingFolderContents && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSourceToMove(source.sourceId);
                            setIsMoveFolderOpen(true);
                          }}
                          className="bg-purple-500 hover:bg-purple-600 text-white rounded-full p-2 shadow-lg"
                          title="Move all items from this source to another folder"
                        >
                          <span className="material-symbols-outlined text-lg">drive_file_move</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteItemId(source.sourceId as any);
                          setIsDeleteModalOpen(true);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg"
                        title="Delete all items from this source"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>

                    <div className="p-5 cursor-pointer" onClick={() => setSelectedSourceId(source.sourceId)}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-md p-1.5">
                          <span className="material-symbols-outlined">{getSourceIcon(source.sourceType)}</span>
                        </div>
                        <Tooltip content={source.sourceName} className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold truncate text-gray-900 dark:text-white">
                            {source.sourceName}
                          </h3>
                        </Tooltip>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {source.items.map((item) => (
                          <span key={item.id} className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                            {item.type}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex justify-between items-center cursor-pointer" onClick={() => setSelectedSourceId(source.sourceId)}>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(source.createdAt)}</span>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {source.items.length} item{source.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
                </div>

                {/* Empty State for Sources */}
                {sources.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-gray-400 dark:text-gray-600 mb-4">
                      <span className="material-symbols-outlined text-7xl">source</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No study materials yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      Start by generating notes, flashcards, or quizzes from URLs, PDFs, images, or YouTube videos
                    </p>
                    <button
                      onClick={() => (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus()}
                      className="btn-primary"
                    >
                      Generate Content
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Material View - Show Items from Selected Source */}
            {viewMode === "material" && selectedSourceId && (
              <div>
                <button
                  onClick={() => setSelectedSourceId(null)}
                  className="mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back to Materials
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayItems.map((item) => (
                    <div key={item.id} className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
                      {/* More Actions Menu - Top Right */}
                      <div className="absolute top-3 right-3 z-10">
                        <ItemActionsMenu
                          onRename={() => {
                            setItemToRename(item);
                            setIsRenameModalOpen(true);
                          }}
                          onMove={() => {
                            setItemToMove(item);
                            setIsMoveFolderOpen(true);
                          }}
                          showMove={isViewingFolderContents}
                        />
                      </div>
                      <div className="p-5 pr-12">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-md p-1.5">
                            <span className="material-symbols-outlined">{contentIcons[item.type]}</span>
                          </div>
                          <Tooltip content={item.title} className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold truncate text-gray-900 dark:text-white">{item.title}</h3>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.description}</p>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex justify-between items-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(item.createdAt)}</span>
                        <div className="flex gap-2">
                          {(item.type === "flashcards" || item.type === "quiz") && (
                            <button
                              onClick={() => setStudyModeItem(item)}
                              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 p-1 rounded"
                              title="Study Mode"
                            >
                              <span className="material-symbols-outlined text-lg">school</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedContent(item);
                              setIsViewModalOpen(true);
                            }}
                            className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded"
                            title="View"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item.id)}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Item View - Show All Items */}
            {viewMode === "item" && (
              <div>
                {/* Back to Folders button when viewing folder contents */}
                {isViewingFolderContents && (
                  <button
                    onClick={() => {
                      setIsViewingFolderContents(false);
                      setViewMode("folder");
                    }}
                    className="mb-6 flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Back to Folders
                  </button>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {folderContent.map((item) => (
                  <div key={item.id} className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
                    {/* More Actions Menu - Top Right */}
                    <div className="absolute top-3 right-3 z-10">
                      <ItemActionsMenu
                        onRename={() => {
                          setItemToRename(item);
                          setIsRenameModalOpen(true);
                        }}
                        onMove={() => {
                          setItemToMove(item);
                          setIsMoveFolderOpen(true);
                        }}
                        showMove={isViewingFolderContents}
                      />
                    </div>
                    <div className="p-5 pr-12">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-md p-1.5">
                          <span className="material-symbols-outlined">{contentIcons[item.type]}</span>
                        </div>
                        <Tooltip content={item.title} className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold truncate text-gray-900 dark:text-white">{item.title}</h3>
                        </Tooltip>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(item.createdAt)}</span>
                      <div className="flex gap-2">
                        {(item.type === "flashcards" || item.type === "quiz") && (
                          <button
                            onClick={() => setStudyModeItem(item)}
                            className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 p-1 rounded"
                            title="Study Mode"
                          >
                            <span className="material-symbols-outlined text-lg">school</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedContent(item);
                            setIsViewModalOpen(true);
                          }}
                          className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded"
                          title="View"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                </div>

                {/* Empty State for Items */}
                {folderContent.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-gray-400 dark:text-gray-600 mb-4">
                      <span className="material-symbols-outlined text-7xl">grid_view</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No items found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      {isViewingFolderContents 
                        ? "This folder is empty. Generate content and move it here to organize your study materials."
                        : "Start creating study materials from your content to see them here"}
                    </p>
                    {!isViewingFolderContents && (
                      <button
                        onClick={() => (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus()}
                        className="btn-primary"
                      >
                        Generate Content
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <ContentViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedContent(null);
        }}
        content={selectedContent}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteItemId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={typeof deleteItemId === "string" ? "Delete Source Material" : "Delete Item"}
        message={
          typeof deleteItemId === "string"
            ? `Are you sure you want to delete all items from this source? This will delete ${groupedBySource[deleteItemId]?.items.length || 0} item(s). This action cannot be undone.`
            : "Are you sure you want to delete this item? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Folder Management Modals */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      <MoveFolderModal
        isOpen={isMoveFolderOpen}
        onClose={() => {
          setIsMoveFolderOpen(false);
          setItemToMove(null);
          setSourceToMove(null);
        }}
        folders={folders}
        currentFolderId={
          itemToMove?.folderId !== undefined
            ? itemToMove.folderId
            : sourceToMove
            ? content.find((item) => item.sourceId === sourceToMove)?.folderId || null
            : null
        }
        onMoveToFolder={handleMoveToFolder}
      />

      {/* Delete Folder Modal with Options */}
      <DeleteFolderModal
        isOpen={isDeleteFolderModalOpen}
        onClose={() => {
          setIsDeleteFolderModalOpen(false);
          setFolderToDelete(null);
        }}
        onMoveToGeneral={() => {
          if (folderToDelete) {
            handleDeleteFolderKeepItems(folderToDelete.id);
          }
          setFolderToDelete(null);
        }}
        onDeleteAll={() => {
          if (folderToDelete) {
            handleDeleteFolderAndContents(folderToDelete.id);
          }
          setFolderToDelete(null);
        }}
        folderName={folderToDelete?.name || ""}
        itemCount={folderToDelete ? content.filter((item) => item.folderId === folderToDelete.id).length : 0}
      />

      {/* Study Mode Overlays */}
      {studyModeItem && studyModeItem.type === "flashcards" && studyModeItem.data?.flashcards && (
        <FlashcardStudyMode
          flashcards={studyModeItem.data.flashcards}
          onClose={() => setStudyModeItem(null)}
        />
      )}

      {studyModeItem && studyModeItem.type === "quiz" && studyModeItem.data?.quizzes && (
        <QuizStudyMode
          quizzes={studyModeItem.data.quizzes}
          onClose={() => setStudyModeItem(null)}
        />
      )}

      {/* Rename Modal */}
      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => {
          setIsRenameModalOpen(false);
          setItemToRename(null);
        }}
        onRename={handleRename}
        currentTitle={itemToRename?.title || ""}
        itemType={itemToRename?.type || "item"}
      />

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        remainingGenerations={remainingGenerations}
        profileId={profile?.id || 0}
      />
    </>
  );
}
