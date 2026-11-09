"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { useToast } from "@/components/app/ToastContainer";
import { FlashcardStudyMode } from "@/components/app/FlashcardStudyMode";
import { QuizStudyMode } from "@/components/app/QuizStudyMode";
import { GamePicker } from "@/components/app/GamePicker";
import { Topic, removeTopicItems } from "@/lib/types";
import { persistProfileContent, loadProfileContent, tombstoneIOSNoteIfAny } from "@/lib/notesSync";
import { db, auth } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { isAdminUser, publishNoteToLibrary } from "@/lib/publishNote";
import { recordQuizAttempt } from "@/lib/quizAttempts";
import { readStudyPosition, writeStudyPosition } from "@/lib/studyPosition";
import { AppShell } from "@/components/app/shell/AppShell";
import { NoteView } from "@/components/app/note/NoteView";
import { useNoteChat } from "@/components/app/note/useNoteChat";

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
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [studyMode, setStudyMode] = useState<"flashcards" | "quiz" | null>(null);
  const [flashStart, setFlashStart] = useState(0);
  const studyLinkHandled = useRef(false);
  const [playOpen, setPlayOpen] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const adminUid = auth?.currentUser?.uid;

  useEffect(() => {
    if (!adminUid) return;
    let cancelled = false;
    isAdminUser().then((v) => { if (!cancelled) setIsAdmin(v); });
    return () => { cancelled = true; };
  }, [adminUid]);

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
      if (!storedContent) {
        // First visit on this device: pull content synced from other
        // devices / the iOS app, cache it, and reload once to display.
        loadProfileContent(profileData).then((cloud) => {
          if (cloud) window.location.reload();
        });
      }

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

        }
      }

      setLoading(false);
    }
  }, [router, topicId]);

  // Home's Continue links here with ?study=flashcards: open study mode at the saved card.
  useEffect(() => {
    if (studyLinkHandled.current || !topic || !profile) return;
    if (searchParams?.get("study") !== "flashcards" || !topic.flashcards?.length) return;
    studyLinkHandled.current = true;
    setFlashStart(readStudyPosition(profile.id, topicId)?.index ?? 0);
    setStudyMode("flashcards");
  }, [topic, profile, searchParams, topicId]);

  const closeStudy = () => {
    setStudyMode(null);
    setFlashStart(0);
    if (searchParams?.get("study")) router.replace(`/note/topic/${topicId}`, { scroll: false });
  };

  const handleDeleteTopic = () => {
    if (!profile || typeof window === "undefined") return;

    const storedContent = localStorage.getItem(`content_${profile.id}`);
    if (storedContent) {
      const content = JSON.parse(storedContent);
      // Handles both sourceId-keyed and legacy_<id>-keyed items.
      const updatedContent = removeTopicItems(content, topicId);
      persistProfileContent(profile, updatedContent);
      // App-origin note: tombstone so it stays deleted on iOS too.
      tombstoneIOSNoteIfAny(profile, topicId);
    }

    showToast("Note deleted", "success");
    router.push("/note");
  };

  const handleRenameTopic = (newTitle: string) => {
    if (!profile || !topic || typeof window === "undefined") return;

    const storedContent = localStorage.getItem(`content_${profile.id}`);
    if (storedContent) {
      const content = JSON.parse(storedContent);
      const updatedContent = content.map((item: any) =>
        item.sourceId === topicId
          ? { ...item, title: newTitle, data: item.data ? { ...item.data, title: newTitle } : item.data }
          : item
      );
      persistProfileContent(profile, updatedContent);
    }
    setTopic({ ...topic, title: newTitle });
    showToast("Note renamed", "success");
  };

  const handleShareTopic = async () => {
    if (!topic) return;
    const text = `${topic.title}\n\n${topic.note?.quick_summary ?? "My study notes on QuizliAI"}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: topic.title, text });
        return;
      } catch {
        // user cancelled the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard", "success");
    } catch {
      showToast("Sharing isn't available in this browser", "error");
    }
  };

  // Publish straight into the public library (super admins only — the
  // button renders just for admins; Firestore rules enforce the write).
  // Unpublish removes the guide; owners of legacy guides keep that too.
  const publishedKey = profile ? `publishedSlug_${profile.id}_${topicId}` : "";

  useEffect(() => {
    if (publishedKey && typeof window !== "undefined") {
      setPublishedSlug(localStorage.getItem(publishedKey));
    }
  }, [publishedKey]);

  const handlePublish = async () => {
    if (!topic || isPublishing || !auth?.currentUser) {
      if (!auth?.currentUser) showToast("Sign in to publish a note", "error");
      return;
    }
    setIsPublishing(true);
    try {
      const { slug, url } = await publishNoteToLibrary(topic, auth.currentUser.uid);
      localStorage.setItem(publishedKey, slug);
      setPublishedSlug(slug);
      try {
        await navigator.clipboard.writeText(url);
        showToast("Published to library — link copied", "success");
      } catch {
        showToast("Published to library", "success");
      }
    } catch {
      showToast("Couldn't publish this note", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!publishedSlug || isPublishing || !db) return;
    setIsPublishing(true);
    try {
      await deleteDoc(doc(db, "notes", publishedSlug));
      localStorage.removeItem(publishedKey);
      setPublishedSlug(null);
      showToast("Note unpublished", "success");
    } catch {
      showToast("Couldn't unpublish", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const copyPublishedLink = async () => {
    if (!publishedSlug) return;
    const url = `${window.location.origin}/note/${publishedSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard", "success");
    } catch {
      showToast(url, "info");
    }
  };

  const chat = useNoteChat(profile?.id ?? null, topicId, topic);

  // The note's Flashcards chip resumes at the saved card too, same as Home's Continue.
  const openFlashcards = () => {
    if (!profile) return;
    setFlashStart(readStudyPosition(profile.id, topicId)?.index ?? 0);
    setStudyMode("flashcards");
  };

  if (loading || !profile) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div aria-hidden="true" className="family-surface family-study" />
        <p role="status" className="text-callout text-supporting">Loading the note…</p>
      </div>
    );
  }

  if (!topic) {
    return (
      <AppShell profile={profile} family="study">
        <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <CircleAlert aria-hidden="true" strokeWidth={1.75} className="size-12 text-supporting" />
          <h1 tabIndex={-1} className="text-title font-semibold">We couldn&apos;t find this note</h1>
          <p className="text-callout text-supporting">It may have been deleted on another device.</p>
          <Link href="/note" className="btn-primary">Go to Home</Link>
        </main>
      </AppShell>
    );
  }

  // Study mode overlays (full screen)
  if (studyMode === "flashcards" && topic.flashcards) {
    return (
      <FlashcardStudyMode
        flashcards={topic.flashcards}
        startIndex={flashStart}
        onIndexChange={(i) => profile && writeStudyPosition(profile.id, topicId, i)}
        onClose={closeStudy}
        deckTitle={topic.title}
        onQuiz={topic.quiz?.length ? () => setStudyMode("quiz") : undefined}
      />
    );
  }

  if (studyMode === "quiz" && topic.quiz) {
    return (
      <QuizStudyMode
        quizzes={topic.quiz}
        topicTitle={topic.title}
        onClose={closeStudy}
        onComplete={(result) => {
          if (profile) {
            void recordQuizAttempt(profile, { noteId: topicId, noteTitle: topic.title, ...result });
          }
        }}
      />
    );
  }

  return (
    <AppShell profile={profile} family="study">
      <NoteView
        topic={topic}
        chat={chat}
        onStudyFlashcards={openFlashcards}
        onQuiz={() => setStudyMode("quiz")}
        onPlay={() => setPlayOpen(true)}
        menu={{
          onShare: handleShareTopic,
          onRename: handleRenameTopic,
          onDelete: handleDeleteTopic,
          publishedSlug,
          isAdmin,
          isPublishing,
          onPublish: handlePublish,
          onUnpublish: handleUnpublish,
          onCopyLink: copyPublishedLink,
        }}
      />
      <GamePicker noteId={topicId} profileId={profile.id} open={playOpen} onClose={() => setPlayOpen(false)} />
    </AppShell>
  );
}
