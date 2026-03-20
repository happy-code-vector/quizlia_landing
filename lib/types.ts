// Topic-based data model - all materials grouped by source

export interface Topic {
  id: string;
  title: string;
  sourceType: "url" | "pdf" | "youtube" | "image";
  sourceUrl?: string;
  createdAt: string;

  // Embedded materials (all generated from same source)
  note?: NoteData;
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
}

export interface NoteData {
  title: string;
  quick_summary: string;
  key_findings: string[];
  detailed_notes: string;
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

// Convert old ContentItem[] to new Topic[]
export function migrateContentToTopics(content: any[]): Topic[] {
  const topicMap = new Map<string, Topic>();

  for (const item of content) {
    const sourceId = item.sourceId || `legacy_${item.id}`;

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
