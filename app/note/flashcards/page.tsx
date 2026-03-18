"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContentViewModal } from "@/components/app/ContentViewModal";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { Tooltip } from "@/components/app/Tooltip";
import { Sidebar } from "@/components/app/Sidebar";
import { FlashcardStudyMode } from "@/components/app/FlashcardStudyMode";
import { ItemActionsMenu } from "@/components/app/ItemActionsMenu";
import { RenameModal } from "@/components/app/RenameModal";
import { MoveFolderModal } from "@/components/app/MoveFolderModal";
import { useToast } from "@/components/app/ToastContainer";

interface ContentItem {
  id: number;
  title: string;
  description: string;
  type: string;
  createdAt: string;
  data?: any;
  folderId?: string | null;
}

interface Folder {
  id: string;
  name: string;
  icon: string;
  itemCount?: number;
}

export default function FlashcardsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [flashcards, setFlashcards] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studyModeItem, setStudyModeItem] = useState<ContentItem | null>(null);
  const [itemToRename, setItemToRename] = useState<ContentItem | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState<ContentItem | null>(null);
  const [isMoveFolderOpen, setIsMoveFolderOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);

  const handleDeleteClick = (itemId: number) => {
    setDeleteItemId(itemId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteItemId === null) return;
    const updated = flashcards.filter((item) => item.id !== deleteItemId);
    setFlashcards(updated);
    if (profile && typeof window !== "undefined") {
      const storedContent = localStorage.getItem(`content_${profile.id}`);
      if (storedContent) {
        const allContent = JSON.parse(storedContent);
        const updatedContent = allContent.filter((item: ContentItem) => item.id !== deleteItemId);
        localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
      }
    }
    setDeleteItemId(null);
    showToast("Flashcards deleted successfully", "success");
  };

  const handleRename = (newTitle: string) => {
    if (!itemToRename || !profile) return;
    const storedContent = localStorage.getItem(`content_${profile.id}`);
    if (storedContent) {
      const allContent = JSON.parse(storedContent);
      const updatedContent = allContent.map((item: ContentItem) =>
        item.id === itemToRename.id ? { ...item, title: newTitle } : item
      );
      localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
      setFlashcards(updatedContent.filter((item: ContentItem) => item.type === "flashcards"));
    }
    showToast("Flashcards renamed successfully", "success");
    setItemToRename(null);
  };

  const handleMoveToFolder = (folderId: string | null) => {
    if (!itemToMove || !profile) return;
    const storedContent = localStorage.getItem(`content_${profile.id}`);
    if (storedContent) {
      const allContent = JSON.parse(storedContent);
      const updatedContent = allContent.map((item: ContentItem) =>
        item.id === itemToMove.id ? { ...item, folderId } : item
      );
      localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
      setFlashcards(updatedContent.filter((item: ContentItem) => item.type === "flashcards"));
    }
    const folderName = folderId ? folders.find((f) => f.id === folderId)?.name || "folder" : "General";
    showToast(`Moved to ${folderName}`, "success");
    setItemToMove(null);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentProfile = localStorage.getItem("currentProfile");
      if (!currentProfile) { router.push("/profile-selection"); return; }
      const profileData = JSON.parse(currentProfile);
      setProfile(profileData);
      const storedContent = localStorage.getItem(`content_${profileData.id}`);
      if (storedContent) {
        const allContent = JSON.parse(storedContent);
        setFlashcards(allContent.filter((item: ContentItem) => item.type === "flashcards"));
      }
      const storedFolders = localStorage.getItem(`folders_${profileData.id}`);
      if (storedFolders) {
        setFolders(JSON.parse(storedFolders));
      }
    }
  }, [router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (!profile) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-10 py-8 w-full max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">All Flashcards</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{flashcards.length} set{flashcards.length !== 1 ? "s" : ""} available</p>
          </div>

          {flashcards.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-7xl text-gray-400 dark:text-gray-600 mb-4">style</span>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Flashcards Yet</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Generate flashcards from your study materials</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {flashcards.map((item) => (
                <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-green-100 dark:bg-green-900/30 text-green-600 rounded-md p-1.5">
                        <span className="material-symbols-outlined">style</span>
                      </div>
                      <Tooltip content={item.title} className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold truncate text-gray-900 dark:text-white">{item.title}</h3>
                      </Tooltip>
                      <ItemActionsMenu
                        onRename={() => { setItemToRename(item); setIsRenameModalOpen(true); }}
                        onMove={() => { setItemToMove(item); setIsMoveFolderOpen(true); }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.description}</p>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(item.createdAt)}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setStudyModeItem(item)} className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 p-1 rounded" title="Study Mode">
                        <span className="material-symbols-outlined text-lg">school</span>
                      </button>
                      <button onClick={() => { setSelectedItem(item); setIsModalOpen(true); }} className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded" title="View">
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>
                      <button onClick={() => handleDeleteClick(item.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded" title="Delete">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <ContentViewModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedItem(null); }} content={selectedItem} />
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeleteItemId(null); }} onConfirm={handleDeleteConfirm} title="Delete Flashcards" message="Are you sure you want to delete these flashcards?" confirmText="Delete" cancelText="Cancel" type="danger" />
      <RenameModal isOpen={isRenameModalOpen} onClose={() => { setIsRenameModalOpen(false); setItemToRename(null); }} onRename={handleRename} currentTitle={itemToRename?.title || ""} itemType="flashcards" />
      <MoveFolderModal isOpen={isMoveFolderOpen} onClose={() => { setIsMoveFolderOpen(false); setItemToMove(null); }} onMove={handleMoveToFolder} folders={folders} currentFolderId={itemToMove?.folderId || null} />
      {studyModeItem && studyModeItem.data?.flashcards && <FlashcardStudyMode flashcards={studyModeItem.data.flashcards} onClose={() => setStudyModeItem(null)} />}
    </div>
  );
}
