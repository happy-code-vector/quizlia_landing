import type { Profile, Topic } from "@/lib/types";
import type { ShellFolder } from "@/components/app/shell/AppShell";
import type { StudyPositions } from "@/lib/studyPosition";
import type { SketchPreview } from "@/components/app/home/SketchedCard";

// W-10 sample data: three profiles, two folders, five notes, one quiz in progress.
// Fixed dates and a fixed "now" keep screenshots deterministic.
// Study family states for /dev/fixtures/study?state=...
export const STUDY_STATES = ["note", "flashcards", "quiz", "arcade"] as const;

// People family states for /dev/fixtures/people?state=...
export const PEOPLE_STATES = ["picker", "edit", "signin", "create", "settings"] as const;

// Welcome family states for /dev/fixtures/welcome?state=...
export const WELCOME_STATES = ["login", "signup", "forgot", "forgot-sent", "success", "processing"] as const;

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
      sections: [
        {
          title: "Light reactions",
          content: "Happen in the **thylakoid membranes**. Chlorophyll absorbs light, water is split and oxygen is released.",
          keyTerms: ["Chlorophyll", "Thylakoid"],
        },
        {
          title: "Calvin cycle",
          content: "Happens in the **stroma**. The plant uses carbon dioxide and the energy from the light reactions to make glucose.",
          keyTerms: ["Stroma", "Glucose"],
        },
      ],
      important_notes: ["Most leaves look green because chlorophyll reflects green light.", "Stomata open and close to let gases in and out."],
      detailed_notes: "Photosynthesis has two stages. The light reactions capture energy from sunlight. The Calvin cycle uses that energy to build sugar from carbon dioxide.",
    },
    flashcards: cards([
      ["What is photosynthesis?", "The process plants use to turn light energy into chemical energy stored in sugar"],
      ["Where in the cell does photosynthesis happen?", "In the chloroplasts"],
      ["Which pigment absorbs light for photosynthesis?", "Chlorophyll"],
      ["What gas do plants take in from the air during photosynthesis?", "Carbon dioxide"],
      ["Which gas do plants release during photosynthesis?", "Oxygen"],
      ["Where do plants get the water they use?", "From the soil, through their roots"],
      ["What sugar does photosynthesis make?", "Glucose"],
      ["What are the two stages of photosynthesis?", "The light reactions and the Calvin cycle"],
      ["Where do the light reactions happen?", "In the thylakoid membranes"],
      ["Where does the Calvin cycle happen?", "In the stroma"],
      ["What tiny pores let gases in and out of a leaf?", "Stomata"],
      ["Why are most leaves green?", "Chlorophyll reflects green light"],
    ]),
    quiz: [
      {
        question: "Which gas do plants release during photosynthesis?",
        options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"],
        correct_answer: "Oxygen",
        explanation: "Water molecules are split and oxygen is released as a by-product.",
      },
      {
        question: "Where in the cell does photosynthesis happen?",
        options: ["Nucleus", "Chloroplast", "Mitochondrion", "Cell wall"],
        correct_answer: "Chloroplast",
        explanation: "Chloroplasts hold the chlorophyll that captures light.",
      },
      {
        question: "Which pigment absorbs light for photosynthesis?",
        options: ["Melanin", "Hemoglobin", "Chlorophyll", "Keratin"],
        correct_answer: "Chlorophyll",
        explanation: "Chlorophyll absorbs red and blue light and reflects green.",
      },
      {
        question: "Where does the Calvin cycle happen?",
        options: ["Stroma", "Thylakoid membrane", "Stomata", "Roots"],
        correct_answer: "Stroma",
        explanation: "The Calvin cycle runs in the stroma, the fluid around the thylakoids.",
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
    flashcards: cards([
      ["When was the Declaration of Independence signed?", "1776"],
      ["What tax did the Stamp Act of 1765 create?", "A tax on printed paper"],
      ["What happened at the Boston Tea Party?", "Colonists dumped British tea into Boston Harbor"],
      ["In what year was the Boston Tea Party?", "1773"],
      ["Where were the first shots of the war fired?", "Lexington and Concord"],
      ["Who led the Continental Army?", "George Washington"],
      ["Who wrote most of the Declaration of Independence?", "Thomas Jefferson"],
      ["Which battle is called the turning point of the war?", "Saratoga"],
      ["Which country became an ally of the colonies after Saratoga?", "France"],
      ["Where did the army spend the winter of 1777 to 1778?", "Valley Forge"],
      ["Who wrote the pamphlet Common Sense?", "Thomas Paine"],
      ["What were the Intolerable Acts?", "British laws that punished Massachusetts after the Tea Party"],
      ["Where did the British surrender in 1781?", "Yorktown"],
      ["Which treaty ended the war?", "The Treaty of Paris"],
      ["In what year was the Treaty of Paris signed?", "1783"],
      ["What did colonists mean by no taxation without representation?", "They had no vote in the Parliament that taxed them"],
      ["Who rode to warn that the British were coming?", "Paul Revere"],
      ["What was the Second Continental Congress?", "The colonies' governing body during the war"],
    ]),
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
    flashcards: cards([
      ["What is 1/2 + 1/3?", "5/6"],
      ["What is a common denominator?", "A number both denominators divide into"],
      ["What is the least common multiple of 4 and 6?", "12"],
      ["What is 1/4 + 1/6?", "5/12"],
      ["What is 2/3 + 1/4?", "11/12"],
      ["What is 3/5 + 1/10?", "7/10"],
      ["Do you add the denominators?", "No, only the numerators once the denominators match"],
      ["What is 1/3 + 1/6, simplified?", "1/2"],
      ["What is 5/8 + 1/4?", "7/8"],
      ["How do you simplify 6/8?", "Divide top and bottom by 2 to get 3/4"],
    ]),
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

// Home hero: Maya stopped on card 4 of Photosynthesis basics this evening.
export const FIXTURE_POSITIONS: StudyPositions = {
  "t-photo": { index: 3, updatedAt: "2026-11-06T18:30:00Z" },
};

// Sketched card (view-only, made on iPhone). Static placeholder image for screenshots.
export const FIXTURE_SKETCH: SketchPreview = {
  noteId: "t-photo",
  noteTitle: "Photosynthesis basics",
  imageUrl: "/dev-fixtures/sketched-photosynthesis.svg",
  count: 2,
};
