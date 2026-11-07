import type { Profile, Topic } from "@/lib/types";
import type { ShellFolder } from "@/components/app/shell/AppShell";

// W-10 sample data: three profiles, two folders, five notes, one quiz in progress.
// Fixed dates and a fixed "now" keep screenshots deterministic.
export const FIXTURE_FAMILIES = ["home", "study", "people", "welcome", "paywall"] as const;
export type FixtureFamily = (typeof FIXTURE_FAMILIES)[number];

export const FIXTURE_NOW = new Date("2026-11-06T19:00:00Z");

export const FIXTURE_PROFILES: Profile[] = [
  { id: 101, name: "Maya", type: "student", avatar: "avatar-1" },
  { id: 102, name: "Yusuf", type: "student", avatar: "avatar-2" },
  { id: 103, name: "Parent", type: "parent", avatar: "avatar-3" },
];

export const FIXTURE_FOLDERS: ShellFolder[] = [
  { id: "f-science", name: "Science", count: 2 },
  { id: "f-history", name: "History", count: 1 },
];

const cards = (pairs: [string, string][]) => pairs.map(([question, answer]) => ({ question, answer }));

export const FIXTURE_TOPICS: Topic[] = [
  {
    id: "t-photo",
    title: "Photosynthesis basics",
    sourceType: "pdf",
    createdAt: "2026-11-06T15:10:00Z",
    folderId: "f-science",
    note: {
      title: "Photosynthesis basics",
      quick_summary: "Plants turn light, water and carbon dioxide into sugar and oxygen.",
      key_findings: ["Happens in chloroplasts", "Needs light, water and carbon dioxide", "Releases oxygen"],
    },
    flashcards: cards([
      ["What gas do plants take in from the air during photosynthesis?", "Carbon dioxide"],
      ["Where in the cell does photosynthesis happen?", "In the chloroplasts"],
    ]),
    quiz: [
      {
        question: "Which gas do plants release during photosynthesis?",
        options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"],
        correct_answer: "Oxygen",
        explanation: "Water molecules are split and oxygen is released as a by-product.",
      },
    ],
  },
  {
    id: "t-revolution",
    title: "American Revolution timeline",
    sourceType: "youtube",
    createdAt: "2026-11-05T18:00:00Z",
    folderId: "f-history",
    note: {
      title: "American Revolution timeline",
      quick_summary: "Key events from 1765 to 1783.",
      key_findings: ["Stamp Act 1765", "Declaration of Independence 1776", "Treaty of Paris 1783"],
    },
    flashcards: cards([["When was the Declaration of Independence signed?", "1776"]]),
  },
  {
    id: "t-fractions",
    title: "Adding fractions with unlike denominators",
    sourceType: "image",
    createdAt: "2026-11-02T14:30:00Z",
    note: {
      title: "Adding fractions with unlike denominators",
      quick_summary: "Find a common denominator, convert, then add the numerators.",
      key_findings: ["Use the least common multiple", "Simplify the result"],
    },
    flashcards: cards([["What is 1/2 + 1/3?", "5/6"]]),
    quiz: [
      {
        question: "What is 1/4 + 1/6?",
        options: ["5/12", "2/10", "1/5", "7/12"],
        correct_answer: "5/12",
        explanation: "The least common multiple of 4 and 6 is 12: 3/12 + 2/12 = 5/12.",
      },
    ],
  },
  {
    id: "t-water",
    title: "The water cycle",
    sourceType: "url",
    createdAt: "2026-10-30T16:00:00Z",
    folderId: "f-science",
    note: {
      title: "The water cycle",
      quick_summary: "Evaporation, condensation, precipitation and collection.",
      key_findings: ["The sun drives evaporation", "Clouds form by condensation"],
    },
  },
  {
    id: "t-spanish",
    title: "Spanish greetings",
    sourceType: "pdf",
    createdAt: "2026-10-28T13:00:00Z",
    flashcards: cards([["How do you say good morning?", "Buenos días"]]),
  },
];
