// Topic-based data model - all materials grouped by source

export interface Topic {
  id: string;
  title: string;
  sourceType: "url" | "pdf" | "youtube" | "image";
  sourceUrl?: string;
  createdAt: string;
  folderId?: string | number;
  renamedTitle?: string;

  // Embedded materials (all generated from same source)
  note?: NoteData;
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
}

export interface NoteSection {
  title: string;
  content: string;
  keyTerms?: string[];
}

export interface NoteData {
  title: string;
  /** Best-fit subject area (history/biology/literature/math/science/community) */
  category?: string;
  /** easy | medium | hard — estimated at generation */
  difficulty?: string;
  quick_summary: string;
  key_findings: string[];
  important_notes?: string[];
  sections?: NoteSection[];
  /** Legacy flat detail text — superseded by sections; kept for old notes. */
  detailed_notes?: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

// Helper to get YouTube video ID
export function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Helper to get YouTube thumbnail
export function getYouTubeThumbnail(url: string): string | null {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
}

// Helper to get YouTube embed URL
export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

// Helper to get source icon
export function getSourceIcon(sourceType: string): string {
  switch (sourceType) {
    case "url": return "link";
    case "pdf": return "picture_as_pdf";
    case "youtube": return "play_circle";
    case "image": return "image";
    default: return "article";
  }
}

// The key a topic is grouped under: sourceId when present (per-note cloud
// sync era), else the synthetic legacy_<id> key for pre-sync items.
export function topicKey(item: { sourceId?: string; id: number | string }): string {
  return item.sourceId || `legacy_${item.id}`;
}

// Remove every content item belonging to one topic — a topic's note,
// flashcards, and quiz artifacts all share the topic key. Shared by every
// delete surface so the filter can never diverge from the grouping.
export function removeTopicItems(content: any[], topicId: string): any[] {
  if (!Array.isArray(content)) return [];
  return content.filter((item) => topicKey(item) !== topicId);
}

// Convert old ContentItem[] to new Topic[]
export function migrateContentToTopics(content: any[]): Topic[] {
  const topicMap = new Map<string, Topic>();

  for (const item of content) {
    const sourceId = topicKey(item);

    if (!topicMap.has(sourceId)) {
      topicMap.set(sourceId, {
        id: sourceId,
        title: item.sourceName || item.title || "Unknown",
        sourceType: item.sourceType || "url",
        sourceUrl: item.sourceType === "youtube" || item.sourceType === "url" ? item.sourceName : undefined,
        createdAt: item.createdAt,
      });
    }

    const topic = topicMap.get(sourceId)!;

    // Add content based on type
    if (item.type === "notes" && item.data) {
      topic.note = item.data;
      // Update title from note if better
      if (item.data.title && item.data.title.length > 10) {
        topic.title = item.data.title;
      }
    } else if (item.type === "flashcards" && item.data?.flashcards) {
      topic.flashcards = item.data.flashcards;
    } else if (item.type === "quiz" && item.data?.quizzes) {
      topic.quiz = item.data.quizzes;
    }
  }

  return Array.from(topicMap.values()).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Profile stored in localStorage "currentProfile" and rendered by the app UI
export interface Profile {
  id: number;
  name: string;
  type: string;
  avatar: string;
  email?: string;
  gradeLevel?: string;
  createdAt?: string;
}

// Legacy content item stored per profile (content_<profileId>)
export interface ContentItem {
  id: number;
  title: string;
  description: string;
  type: string;
  createdAt: string;
  data?: any;
  sourceId?: string;
  sourceName?: string;
  sourceType?: string;
  /** Full untruncated source URL for youtube/url items (dedupe spec
   *  2026-11-06) — sourceName is display-cut to 50 chars and cannot be
   *  used for matching. */
  sourceUrl?: string;
  folderId?: string;
  renamedTitle?: string;
}
