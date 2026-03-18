// Study Guide types and fetch functions
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export interface Quiz {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface Section {
  title: string;
  content: string;
  keyTerms?: string[];
}

export interface CTA {
  headline: string;
  features: string[];
}

export interface StudyGuide {
  slug: string;
  title: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  sourceChannel: string;
  youtubeId: string;
  createdAt?: string;
  updatedAt?: string;
  tldr: string[];
  sections: Section[];
  quiz: Quiz[];
  flashcards?: Flashcard[];
  cta?: CTA;
}

export async function getStudyGuide(slug: string): Promise<StudyGuide | null> {
  if (!db) {
    console.warn("Firebase not initialized");
    return null;
  }

  try {
    const docRef = doc(db, "notes", slug);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as StudyGuide;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching study guide:", error);
    return null;
  }
}

// Category colors for badges
export const categoryColors: Record<string, string> = {
  history: "from-amber-500 to-orange-500",
  biology: "from-green-500 to-emerald-500",
  literature: "from-purple-500 to-violet-500",
  math: "from-blue-500 to-cyan-500",
  science: "from-pink-500 to-rose-500",
};

// Difficulty badge colors
export const difficultyColors: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
};
