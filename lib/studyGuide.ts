// Study Guide types and fetch functions
import { db } from "./firebase";
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";

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
  // Real note fields carried by user-published notes. Seeded guides only
  // have tldr/sections — these stay undefined there and the UI falls back.
  quick_summary?: string;
  key_findings?: string[];
  important_notes?: string[];
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

export async function getAllStudyGuides(): Promise<StudyGuide[]> {
  if (!db) {
    console.warn("Firebase not initialized");
    return [];
  }

  try {
    const notesRef = collection(db, "notes");
    const q = query(notesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const guides: StudyGuide[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as StudyGuide & { listed?: boolean };
      // Unlisted docs are user-published notes shared by direct link —
      // they stay out of the browsable library unless an admin flips
      // listed to true. Seeded guides have no `listed` field → shown.
      if (data.listed === false) return;
      guides.push(data);
    });

    return guides;
  } catch (error) {
    console.error("Error fetching study guides:", error);
    return [];
  }
}

// Every note reachable at /note/<slug> — listed AND unlisted (SEO sitemap
// scope; the listed flag gates only the browsable library, not access).
export async function getAllNotesForSitemap(): Promise<
  Array<{ slug: string; lastModified: string | null }>
> {
  if (!db) {
    console.warn("Firebase not initialized");
    return [];
  }

  try {
    const notesRef = collection(db, "notes");
    const querySnapshot = await getDocs(query(notesRef));
    return querySnapshot.docs
      .map((d) => {
        const data = d.data() as StudyGuide;
        return {
          slug: data.slug || d.id,
          lastModified: data.updatedAt ?? data.createdAt ?? null,
        };
      })
      .filter((n) => n.slug);
  } catch (error) {
    console.error("Error fetching notes for sitemap:", error);
    return [];
  }
}

export async function getStudyGuidesByCategory(category: string): Promise<StudyGuide[]> {
  if (!db) {
    console.warn("Firebase not initialized");
    return [];
  }

  try {
    const notesRef = collection(db, "notes");
    const q = query(notesRef, where("category", "==", category), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const guides: StudyGuide[] = [];
    querySnapshot.forEach((doc) => {
      guides.push(doc.data() as StudyGuide);
    });

    return guides;
  } catch (error) {
    console.error("Error fetching study guides by category:", error);
    return [];
  }
}

// Category colors for badges
export const categoryColors: Record<string, string> = {
  community: "from-purple-500 to-pink-500",
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
