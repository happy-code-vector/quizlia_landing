export type SampleKind = "video" | "PDF" | "page"

export type Sample = {
  id: "yt" | "pdf" | "web"
  label: string
  url: string
  kind: SampleKind
  title: string
  notes: [label: string, text: string][]
  cards: [question: string, answer: string][]
  quiz: { q: string; options: string[]; answer: number }
}

// Pre-written samples for the landing demo (no backend). v2 could accept a pasted
// link and hand off to /note?url=...
export const demoSamples: Sample[] = [
  {
    id: "yt",
    label: "▶ YouTube · Photosynthesis in 8 min",
    url: "youtube.com/watch?v=photosynthesis-explained",
    kind: "video",
    title: "Photosynthesis, explained",
    notes: [
      ["Big idea", "Plants turn light, water and CO₂ into glucose and oxygen."],
      ["Where", "In the chloroplasts, mainly in leaf cells."],
      ["Two stages", "Light-dependent reactions (thylakoids) → Calvin cycle (stroma)."],
    ],
    cards: [
      ["Where does photosynthesis happen?", "In the chloroplasts"],
      ["What are the two stages?", "Light-dependent reactions and the Calvin cycle"],
    ],
    quiz: {
      q: "Which gas do plants release during photosynthesis?",
      options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"],
      answer: 1,
    },
  },
  {
    id: "pdf",
    label: "PDF · Econ 101, ch. 3",
    url: "Econ101_Chapter3_Supply_Demand.pdf",
    kind: "PDF",
    title: "Supply & demand",
    notes: [
      ["Law of demand", "When price goes up, the quantity demanded goes down."],
      ["Equilibrium", "Where the supply and demand curves meet."],
      ["Shifts", "Income, tastes and the prices of related goods shift the demand curve."],
    ],
    cards: [
      ["What is market equilibrium?", "The price where quantity supplied equals quantity demanded"],
      ["A price ceiling below equilibrium causes…?", "A shortage"],
    ],
    quiz: {
      q: "If demand rises and supply stays the same, the price will…",
      options: ["Fall", "Stay the same", "Rise", "Go to zero"],
      answer: 2,
    },
  },
  {
    id: "web",
    label: "Website · The Roman Empire",
    url: "en.wikipedia.org/wiki/Roman_Empire",
    kind: "page",
    title: "The Roman Empire",
    notes: [
      ["Start", "27 BC, when Augustus becomes the first emperor."],
      ["Peak", "Under Trajan (117 AD): about 5 million km²."],
      ["Split", "Divided into East and West in 395 AD."],
    ],
    cards: [
      ["Who was the first Roman emperor?", "Augustus"],
      ["When did the Western empire fall?", "476 AD"],
    ],
    quiz: {
      q: "Who was the first Roman emperor?",
      options: ["Julius Caesar", "Nero", "Augustus", "Trajan"],
      answer: 2,
    },
  },
]
