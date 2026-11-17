// One entry per 30-second video. Source of truth for /study/<slug>.
// status "draft": noindex, not in the sitemap. Set "live" only after the fact table is checked and AR approves.
export type StudyPage = {
  slug: string
  alias?: string // short spoken address (own videos only); the map lives in aliases.js
  video?: { id: string; title: string; channel: string } // companion YouTube video (SEO pages)
  status: "draft" | "live"
  title: string
  subject: string // eyebrow, e.g. "Biology"
  context: string // one short paragraph
  flashcards: { q: string; a: string }[] // exactly 3
  quiz: { q: string; options: string[]; answer: number; why: string }[] // exactly 3
}

import { historyPages } from "./history"
import { englishPages } from "./english"
import { sciencePages } from "./science"
import { videoAPages } from "./video-a"
import { videoBPages } from "./video-b"
import { videoCPages } from "./video-c"
import { videoDPages } from "./video-d"
import { videoEPages } from "./video-e"
import { videoFPages } from "./video-f"

const pilotPages: StudyPage[] = [
  {
    slug: "mitosis-vs-meiosis",
    alias: "mitosis",
    status: "live",
    title: "Mitosis vs meiosis",
    subject: "Biology",
    context:
      "Cells divide in two ways. Mitosis makes two genetically identical cells. Your body uses it to grow and to repair itself. Meiosis makes four genetically different cells, and each one has half the usual number of chromosomes. Your body uses it to make sperm and egg cells. A human body cell has 46 chromosomes. A cell made by meiosis has 23.",
    flashcards: [
      { q: "How many cells does mitosis make?", a: "Two. They are genetically identical to the parent cell." },
      { q: "How many cells does meiosis make, and how many chromosomes does each human cell have?", a: "Four cells. Each has 23 chromosomes." },
      { q: "What makes the cells from meiosis different from each other?", a: "Crossing over, when matching chromosomes swap pieces, and the random shuffling of chromosomes." },
    ],
    quiz: [
      { q: "Which process makes two genetically identical cells?", options: ["Mitosis", "Meiosis", "Both", "Neither"], answer: 0, why: "Mitosis copies a cell into two genetically identical cells." },
      { q: "How many chromosomes does a human cell made by meiosis have?", options: ["46", "23", "92", "2"], answer: 1, why: "Meiosis halves the number from 46 to 23." },
      { q: "What makes meiosis cells different from each other?", options: ["Crossing over and shuffling of chromosomes", "Copying errors only", "Extra cell growth", "Mitosis"], answer: 0, why: "Crossing over and shuffling mix the genes in every new cell." },
    ],
  },
  {
    slug: "causes-of-world-war-1",
    alias: "ww1",
    status: "live",
    title: "Causes of World War 1",
    subject: "History",
    context:
      "World War 1 began in 1914. Historians often name long-term pressures such as militarism, rival alliances, imperial rivalry and nationalism. The spark came on June 28, 1914. Archduke Franz Ferdinand of Austria-Hungary was shot in Sarajevo. Within weeks, ultimatums, mobilizations and alliance ties drew the great powers into war. Historians still debate which cause mattered most.",
    flashcards: [
      { q: "Name four long-term pressures that historians often link to World War 1.", a: "Militarism, rival alliances, imperial rivalry and nationalism." },
      { q: "What event sparked the war?", a: "The assassination of Archduke Franz Ferdinand in Sarajevo on June 28, 1914." },
      { q: "Do these long-term pressures fully explain the war?", a: "No. Decisions in July 1914 also mattered. Historians still debate which cause mattered most." },
    ],
    quiz: [
      { q: "Which of these is often named as a long-term pressure before World War 1?", options: ["Rival alliances", "The Great Depression", "The Cold War", "The atomic bomb"], answer: 0, why: "Rival alliance blocs were one long-term pressure. The other three came after the war." },
      { q: "In which city was Archduke Franz Ferdinand shot in June 1914?", options: ["Berlin", "Sarajevo", "Paris", "Vienna"], answer: 1, why: "He was shot in Sarajevo on June 28, 1914." },
      { q: "Which statement is true?", options: ["Historians agree on one single cause", "The war had no long-term causes", "Only alliances mattered", "Historians still debate which cause mattered most"], answer: 3, why: "Historians weigh the causes in different ways." },
    ],
  },
  {
    slug: "comma-splice",
    alias: "commasplice",
    status: "live",
    title: "Comma splice",
    subject: "English",
    context:
      "A comma splice joins two full sentences with only a comma. Example: \"I studied all night, I still felt nervous.\" Each part can stand alone, so a comma is too weak. You can fix it in several ways. Use a period. Use a semicolon. Or add a comma and a word like and, but or so. Watch out for \"however\". A comma before it does not fix the error.",
    flashcards: [
      { q: "What is a comma splice?", a: "Two full sentences joined by only a comma." },
      { q: "Name three common ways to fix a comma splice.", a: "Use a period, use a semicolon, or add a comma and a word like and, but or so." },
      { q: "Does a comma before \"however\" fix a comma splice?", a: "No. Use a semicolon before \"however\" and a comma after it. A period also works." },
    ],
    quiz: [
      { q: "Which sentence has a comma splice?", options: ["I studied all night, I still felt nervous.", "I studied all night, and I still felt nervous.", "I studied all night; I still felt nervous.", "I studied all night. I still felt nervous."], answer: 0, why: "Two full sentences are joined by only a comma." },
      { q: "Which fix works for this sentence? The test was hard, it was long.", options: ["The test was hard; it was long.", "The test was hard, it was long too.", "The test was hard, however it was long.", "The test was hard it was long."], answer: 0, why: "A semicolon can join two closely related full sentences." },
      { q: "Which sentence is correct?", options: ["I finished the essay, however, I missed the deadline.", "I finished the essay; however, I missed the deadline.", "I finished the essay however I missed the deadline.", "I finished the essay, however I missed the deadline."], answer: 1, why: "Use a semicolon before \"however\" and a comma after it." },
    ],
  },
]

export const studyPages: StudyPage[] = [...pilotPages, ...historyPages, ...englishPages, ...sciencePages, ...videoAPages, ...videoBPages, ...videoCPages, ...videoDPages, ...videoEPages, ...videoFPages]

export const getStudyPage = (slug: string) => studyPages.find((p) => p.slug === slug)
