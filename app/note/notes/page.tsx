"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ContentViewModal } from "@/components/app/ContentViewModal";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { Tooltip } from "@/components/app/Tooltip";
import { Sidebar } from "@/components/app/Sidebar";
import { ItemActionsMenu } from "@/components/app/ItemActionsMenu";
import { RenameModal } from "@/components/app/RenameModal";
import { MoveFolderModal } from "@/components/app/MoveFolderModal";
import { useToast } from "@/components/app/ToastContainer";
import { getAllStudyGuides, categoryColors, difficultyColors, StudyGuide } from "@/lib/studyGuide";

interface ContentItem {
  id: number;
  title: string;
  description: string;
  type: string;
  createdAt: string;
  data?: any;
}

interface Folder {
  id: string;
  name: string;
  icon: string;
  itemCount?: number;
}

export default function NotesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [notes, setNotes] = useState<ContentItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<ContentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<ContentItem | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState<ContentItem | null>(null);
  const [isMoveFolderOpen, setIsMoveFolderOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);

  // Public study guides from Firebase
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [studyGuidesLoading, setStudyGuidesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleDeleteClick = (itemId: number) => {
    setDeleteItemId(itemId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteItemId === null) return;
    const updatedNotes = notes.filter((note) => note.id !== deleteItemId);
    setNotes(updatedNotes);
    if (profile && typeof window !== "undefined") {
      const storedContent = localStorage.getItem(`content_${profile.id}`);
      if (storedContent) {
        const allContent = JSON.parse(storedContent);
        const updatedContent = allContent.filter((item: ContentItem) => item.id !== deleteItemId);
        localStorage.setItem(`content_${profile.id}`, JSON.stringify(updatedContent));
      }
    }
    setDeleteItemId(null);
    showToast("Note deleted successfully", "success");
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
      setNotes(updatedContent.filter((item: ContentItem) => item.type === "notes"));
    }
    showToast("Note renamed successfully", "success");
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
      setNotes(updatedContent.filter((item: ContentItem) => item.type === "notes"));
    }
    const folderName = folderId ? folders.find((f) => f.id === folderId)?.name || "folder" : "General";
    showToast(`Moved to ${folderName}`, "success");
    setItemToMove(null);
  };

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
        const allContent = JSON.parse(storedContent);
        setNotes(allContent.filter((item: ContentItem) => item.type === "notes"));
      }
      const storedFolders = localStorage.getItem(`folders_${profileData.id}`);
      if (storedFolders) {
        setFolders(JSON.parse(storedFolders));
      }
    }
  }, [router]);

  // Fetch public study guides from Firebase
  useEffect(() => {
    async function fetchStudyGuides() {
      const data = await getAllStudyGuides();
      setStudyGuides(data);
      setStudyGuidesLoading(false);
    }
    fetchStudyGuides();
  }, []);

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
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (!profile) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-10 py-8 w-full max-w-6xl mx-auto">
          {/* My Notes Section */}
          <div className="mb-12">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">My Notes</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">description</span>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Notes Yet</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Generate notes from your study materials</p>
                <Link href="/note" className="btn-primary inline-flex items-center gap-2">
                  <span className="material-symbols-outlined">add</span>
                  Generate Content
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes.map((note) => (
                  <div key={note.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-md p-1.5">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <Tooltip content={note.title} className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold truncate text-gray-900 dark:text-white">{note.title}</h3>
                        </Tooltip>
                        <ItemActionsMenu
                          onRename={() => { setItemToRename(note); setIsRenameModalOpen(true); }}
                          onMove={() => { setItemToMove(note); setIsMoveFolderOpen(true); }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{note.description}</p>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(note.createdAt)}</span>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedNote(note); setIsModalOpen(true); }} className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded" title="View">
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        <button onClick={() => handleDeleteClick(note.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded" title="Delete">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
                    Curated study materials with video summaries, cheat sheets, and interactive quizzes
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
                      <img
                        src={`https://img.youtube.com/vi/${guide.youtubeId}/maxresdefault.jpg`}
                        alt={guide.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${guide.youtubeId}/hqdefault.jpg`;
                        }}
                      />
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
      <ContentViewModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedNote(null); }} content={selectedNote} />
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeleteItemId(null); }} onConfirm={handleDeleteConfirm} title="Delete Note" message="Are you sure you want to delete this note?" confirmText="Delete" cancelText="Cancel" type="danger" />
      <RenameModal isOpen={isRenameModalOpen} onClose={() => { setIsRenameModalOpen(false); setItemToRename(null); }} onRename={handleRename} currentTitle={itemToRename?.title || ""} itemType="note" />
      <MoveFolderModal isOpen={isMoveFolderOpen} onClose={() => { setIsMoveFolderOpen(false); setItemToMove(null); }} onMove={handleMoveToFolder} folders={folders} currentFolderId={(itemToMove as any)?.folderId || null} />
    </div>
  );
}
