"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/app/Sidebar";
import { useToast } from "@/components/app/ToastContainer";
import { getAllStudyGuides, categoryColors, difficultyColors, StudyGuide } from "@/lib/studyGuide";
import { persistProfileContent, loadProfileContent, mergeIOSNotesIntoContent, pullRemoteChats, tombstoneIOSNoteIfAny } from "@/lib/notesSync";
import { syncProfileFolders } from "@/lib/folderSync";
import { CreateFolderModal } from "@/components/app/CreateFolderModal";
import { RenameModal } from "@/components/app/RenameModal";
import { MoveFolderModal } from "@/components/app/MoveFolderModal";
import { ItemActionsMenu } from "@/components/app/ItemActionsMenu";
import { GenerateContentSheet } from "@/components/app/GenerateContentSheet";
import { FolderTile } from "@/components/app/notes/FolderTile";
import { TopicCard } from "@/components/app/notes/TopicCard";
import { Topic, ContentItem, Profile } from "@/lib/types";

interface Folder {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  clientOrigin?: "web" | "ios";
}

// Group stored content items into note-bearing topics (keeps folderId)
function buildTopics(content: ContentItem[]): Topic[] {
  const topicMap = new Map<string, Topic>();

  for (const item of content) {
    const sourceId = item.sourceId || `legacy_${item.id}`;

    if (!topicMap.has(sourceId)) {
      topicMap.set(sourceId, {
        id: sourceId,
        title: item.renamedTitle || item.sourceName || item.title || "Unknown",
        renamedTitle: item.renamedTitle,
        sourceType: (item.sourceType as Topic["sourceType"]) || "url",
        sourceUrl: item.sourceType === "youtube" || item.sourceType === "url" ? item.sourceName : undefined,
        createdAt: item.createdAt,
        folderId: item.folderId,
      });
    }

    const topic = topicMap.get(sourceId)!;
    if (item.type === "notes" && item.data) {
      topic.note = item.data;
      if (!topic.renamedTitle && item.data.title && item.data.title.length > 10) {
        topic.title = item.data.title;
      }
    } else if (item.type === "flashcards" && item.data?.flashcards) {
      topic.flashcards = item.data.flashcards;
    } else if (item.type === "quiz" && item.data?.quizzes) {
      topic.quiz = item.data.quizzes;
    }
  }

  return Array.from(topicMap.values())
    .filter((t) => t.note)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// useSearchParams requires a Suspense boundary during prerendering in this
// Next.js version — see node_modules/next/dist/docs/ (use-search-params.md).
export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesExplorer />
    </Suspense>
  );
}

function NotesExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [studyGuidesLoading, setStudyGuidesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Toolbar + modal state
  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameFolderTarget, setRenameFolderTarget] = useState<Folder | null>(null);
  const [renameTopicTarget, setRenameTopicTarget] = useState<Topic | null>(null);
  const [moveTopicTarget, setMoveTopicTarget] = useState<Topic | null>(null);

  // Tombstoned (remote-deleted) folders stay in state but are hidden by the UI.
  const visibleFolders = folders.filter((f) => !f.deletedAt);

  // Folder view resolution from the URL (?folder=all|none|<id>)
  const folderParam = searchParams.get("folder");
  const isSpecialView = folderParam === "all" || folderParam === "none";
  const activeFolder = !folderParam || isSpecialView
    ? null
    : visibleFolders.find((f) => f.id === folderParam) || null;
  const isRootView = !activeFolder && !isSpecialView;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentProfile = localStorage.getItem("currentProfile");
      if (!currentProfile) {
        router.push("/note/profile-selection");
        return;
      }
      const profileData = JSON.parse(currentProfile);
      setProfile(profileData);
      // Folders follow the account: local cache first, then cloud merge.
      syncProfileFolders(profileData).then(setFolders);

      // Load content and convert to topics
      const storedContent = localStorage.getItem(`content_${profileData.id}`);
      if (!storedContent) {
        // First visit on this device: pull content synced from other
        // devices / the iOS app, cache it, and reload once to display.
        loadProfileContent(profileData).then((cloud) => {
          if (cloud) window.location.reload();
        });
      }
      if (storedContent) {
        setTopics(buildTopics(JSON.parse(storedContent)));
      }
    }
  }, [router]);

  // Fetch public study guides
  useEffect(() => {
    async function fetchStudyGuides() {
      const data = await getAllStudyGuides();
      setStudyGuides(data);
      setStudyGuidesLoading(false);
    }
    fetchStudyGuides();
  }, []);

  // Per-visit cloud sync (signed-in only; each piece no-ops when signed out
  // or unchanged): folder registry (remote tombstones unsort via the hook),
  // the idempotent iOS-notes merge, and web↔web chat reconciliation.
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    const stripFolderFromContent = (folderId: string) => {
      if (!profile || typeof window === "undefined") return;
      const storedContent = localStorage.getItem(`content_${profile.id}`);
      if (storedContent) {
        const content = JSON.parse(storedContent).map((item: ContentItem) =>
          item.folderId === folderId ? { ...item, folderId: undefined } : item
        );
        persistProfileContent(profile, content);
      }
      setTopics((prev) =>
        prev.map((t) => (t.folderId === folderId ? { ...t, folderId: undefined } : t))
      );
    };

    (async () => {
      // pullRemoteChats' result is intentionally unused here: chat lives in
      // its own keys and is read fresh by the topic page on open.
      const [mergedFolders, notesAdded] = await Promise.all([
        syncProfileFolders(profile, { onRemoteDelete: stripFolderFromContent }),
        mergeIOSNotesIntoContent(profile),
        pullRemoteChats(profile),
      ]);
      if (cancelled) return;
      setFolders(mergedFolders as Folder[]);
      if (notesAdded && typeof window !== "undefined") {
        const stored = localStorage.getItem(`content_${profile.id}`);
        if (stored) {
          try {
            setTopics(buildTopics(JSON.parse(stored)));
          } catch {
            // leave the current list in place
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  // Folders (parity with the iOS app's folder organization)
  const persistFolders = (next: Folder[]) => {
    setFolders(next);
    if (profile && typeof window !== "undefined") {
      localStorage.setItem(`folders_${profile.id}`, JSON.stringify(next));
      syncProfileFolders(profile).catch(() => {});
    }
  };

  const handleCreateFolder = (name: string, icon: string) => {
    persistFolders([
      ...folders,
      {
        id: String(Date.now()),
        name,
        icon,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clientOrigin: "web",
      },
    ]);
    showToast(`Folder "${name}" created`, "success");
  };

  const handleRenameFolder = (newName: string) => {
    if (!renameFolderTarget) return;
    persistFolders(
      folders.map((f) =>
        f.id === renameFolderTarget.id ? { ...f, name: newName, updatedAt: new Date().toISOString() } : f
      )
    );
    setRenameFolderTarget(null);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!profile || typeof window === "undefined") return;
    if (!window.confirm("Delete this folder? Its topics move back to Unsorted.")) return;

    // Tombstone (kept in the array, hidden by the UI) so the delete syncs.
    persistFolders(
      folders.map((f) =>
        f.id === folderId ? { ...f, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : f
      )
    );
    if (folderParam === folderId) router.replace("/note/notes");

    const storedContent = localStorage.getItem(`content_${profile.id}`);
    if (storedContent) {
      const content = JSON.parse(storedContent).map((item: ContentItem) =>
        item.folderId === folderId ? { ...item, folderId: undefined } : item
      );
      persistProfileContent(profile, content);
    }
    setTopics((prev) => prev.map((t) => (t.folderId === folderId ? { ...t, folderId: undefined } : t)));
  };

  const handleMoveTopic = (topicId: string, folderId: string | null) => {
    if (!profile || typeof window === "undefined") return;

    const storedContent = localStorage.getItem(`content_${profile.id}`);
    if (storedContent) {
      const content = JSON.parse(storedContent).map((item: ContentItem) =>
        item.sourceId === topicId || `legacy_${item.id}` === topicId
          ? { ...item, folderId: folderId ?? undefined }
          : item
      );
      persistProfileContent(profile, content);
    }
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, folderId: folderId ?? undefined } : t))
    );
  };

  const handleRenameTopic = (newName: string) => {
    if (!renameTopicTarget || !profile || typeof window === "undefined") return;

    const storedContent = localStorage.getItem(`content_${profile.id}`);
    if (storedContent) {
      const content = JSON.parse(storedContent).map((item: ContentItem) =>
        item.sourceId === renameTopicTarget.id || `legacy_${item.id}` === renameTopicTarget.id
          ? { ...item, title: newName, renamedTitle: newName }
          : item
      );
      persistProfileContent(profile, content);
    }
    setTopics((prev) =>
      prev.map((t) => (t.id === renameTopicTarget.id ? { ...t, title: newName, renamedTitle: newName } : t))
    );
    setRenameTopicTarget(null);
    showToast("Topic renamed", "success");
  };

  const handleDeleteTopic = (topicId: string) => {
    if (!profile || typeof window === "undefined") return;
    if (!window.confirm("Delete this topic?")) return;

    const storedContent = localStorage.getItem(`content_${profile.id}`);
    if (storedContent) {
      const content = JSON.parse(storedContent);
      const updatedContent = content.filter((item: ContentItem) => item.sourceId !== topicId && `legacy_${item.id}` !== topicId);
      persistProfileContent(profile, updatedContent);
      // App-origin note: tombstone so it stays deleted on iOS too.
      tombstoneIOSNoteIfAny(profile, topicId);

      setTopics((prev) => prev.filter((t) => t.id !== topicId));
    }
    showToast("Topic deleted", "success");
  };

  const categories = Array.from(new Set(studyGuides.map((g) => g.category)));
  const filteredGuides = selectedCategory
    ? studyGuides.filter((g) => g.category === selectedCategory)
    : studyGuides;

  const unsortedCount = topics.filter((t) => !t.folderId).length;
  const countForFolder = (id: string) => topics.filter((t) => String(t.folderId) === id).length;

  const visibleTopics = activeFolder
    ? topics.filter((t) => String(t.folderId) === activeFolder.id)
    : folderParam === "none"
      ? topics.filter((t) => !t.folderId)
      : topics;

  if (!profile) return null;

  const viewTitle = activeFolder
    ? `${activeFolder.icon} ${activeFolder.name}`
    : folderParam === "none"
      ? "Unsorted"
      : "All Notes";

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-10 py-8 w-full max-w-6xl mx-auto">
          {isRootView ? (
            <>
              {/* Header + toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Notes</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {topics.length} topic{topics.length !== 1 ? "s" : ""} · {visibleFolders.length} folder{visibleFolders.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGenerateSheetOpen(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">add</span>
                    Generate Content
                  </button>
                  <button
                    onClick={() => setCreateFolderOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                  >
                    <span className="material-symbols-outlined text-base">create_new_folder</span>
                    New Folder
                  </button>
                </div>
              </div>

              {/* Folder tile grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                <FolderTile href="/note/notes?folder=all" materialIcon="library_books" name="All Notes" count={topics.length} />
                <FolderTile href="/note/notes?folder=none" materialIcon="inbox" name="Unsorted" count={unsortedCount} />
                {visibleFolders.map((f) => (
                  <FolderTile
                    key={f.id}
                    href={`/note/notes?folder=${f.id}`}
                    icon={f.icon}
                    name={f.name}
                    count={countForFolder(f.id)}
                  />
                ))}
              </div>
              {visibleFolders.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-12">
                  Create a folder to organize your notes.
                </p>
              )}
              {topics.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-12">
                  Generate study materials to create your first topic.
                </p>
              )}
            </>
          ) : (
            <>
              {/* Folder view */}
              <div className="mb-8">
                <Link
                  href="/note/notes"
                  className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  My Notes
                </Link>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{viewTitle}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      {visibleTopics.length} topic{visibleTopics.length !== 1 ? "s" : ""} with notes
                    </p>
                  </div>
                  {activeFolder && (
                    <ItemActionsMenu
                      onRename={() => setRenameFolderTarget(activeFolder)}
                      showMove={false}
                      onDelete={() => handleDeleteFolder(activeFolder.id)}
                      buttonClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
                    />
                  )}
                </div>
              </div>

              {visibleTopics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {visibleTopics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      onDelete={handleDeleteTopic}
                      onRename={(t) => setRenameTopicTarget(t)}
                      onMove={(t) => setMoveTopicTarget(t)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 mb-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">description</span>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No notes {activeFolder ? `in ${activeFolder.name}` : "yet"}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {activeFolder
                      ? `Generate study materials straight into ${activeFolder.name}`
                      : "Generate study materials to create your first topic"}
                  </p>
                  <button onClick={() => setGenerateSheetOpen(true)} className="btn-primary inline-flex items-center gap-2">
                    <span className="material-symbols-outlined">add</span>
                    Generate Content
                  </button>
                </div>
              )}
            </>
          )}

          {/* Modals */}
          <CreateFolderModal
            isOpen={createFolderOpen}
            onClose={() => setCreateFolderOpen(false)}
            onCreateFolder={handleCreateFolder}
          />
          <RenameModal
            isOpen={!!renameFolderTarget}
            onClose={() => setRenameFolderTarget(null)}
            onRename={handleRenameFolder}
            currentTitle={renameFolderTarget?.name || ""}
            itemType="folder"
          />
          <RenameModal
            isOpen={!!renameTopicTarget}
            onClose={() => setRenameTopicTarget(null)}
            onRename={handleRenameTopic}
            currentTitle={renameTopicTarget?.title || ""}
            itemType="topic"
          />
          <MoveFolderModal
            isOpen={!!moveTopicTarget}
            onClose={() => setMoveTopicTarget(null)}
            folders={visibleFolders.map((f) => ({ ...f, itemCount: countForFolder(f.id) }))}
            currentFolderId={moveTopicTarget?.folderId ? String(moveTopicTarget.folderId) : null}
            onMove={(folderId) => moveTopicTarget && handleMoveTopic(moveTopicTarget.id, folderId)}
          />
          <GenerateContentSheet
            isOpen={generateSheetOpen}
            onClose={() => setGenerateSheetOpen(false)}
            profile={profile}
            targetFolderId={activeFolder?.id}
            targetFolderName={activeFolder?.name}
            onGenerated={(updatedContent) => {
              setTopics(buildTopics(updatedContent));
              setGenerateSheetOpen(false);
            }}
          />

          {/* Public Study Guides Section (root only) */}
          {isRootView && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-12">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg p-2">
                    <span className="material-symbols-outlined">public</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Public Study Guides</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Curated study materials with video summaries and interactive quizzes
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
                        {guide.youtubeId ? (
                          <img
                            src={`https://img.youtube.com/vi/${guide.youtubeId}/maxresdefault.jpg`}
                            alt={guide.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src.includes("maxresdefault")) {
                                target.src = `https://img.youtube.com/vi/${guide.youtubeId}/hqdefault.jpg`;
                              } else if (target.src.includes("hqdefault")) {
                                target.src = `https://img.youtube.com/vi/${guide.youtubeId}/mqdefault.jpg`;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#964CEE]/20 to-[#964CEE]/5">
                            <span className="material-symbols-outlined text-4xl text-[#964CEE]">menu_book</span>
                          </div>
                        )}
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
          )}
        </div>
      </main>
    </div>
  );
}
