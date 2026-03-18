# Study Guide Pages Design

## Overview
Create SEO-optimized study guide pages that target popular educational YouTube videos. Each page provides notes, summaries, and interactive quizzes to capture students searching for explanations and funnel them to the QuizliAI app.

## Strategy: Parasite SEO
Target high-volume educational videos that students are already assigned to watch. Provide value through structured notes and interactive quizzes.

## Decisions

| Decision | Choice |
|----------|--------|
| Route | `/note/[slug]` |
| Firebase Collection | `notes/{slug}` |
| Content Storage | Firebase (client-side fetch) |
| Header/Footer | Same as landing page |
| Quiz Style | Gamified (progress, streaks, points, confetti) |
| SEO | Dynamic meta tags + JSON-LD |

## Data Structure (Firebase)

**Collection:** `notes/{slug}`

```json
{
  "slug": "french-revolution-summary",
  "title": "The French Revolution Study Guide",
  "category": "history",
  "difficulty": "medium",
  "sourceChannel": "OverSimplified",
  "youtubeId": "l5IygD9UaJE",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",

  "tldr": [
    "The Cause: France was broke due to helping the American Revolution",
    "The Conflict: The Third Estate paid all taxes but had 0 power",
    "The Result: Storming of the Bastille, execution of Louis XVI, Rise of Napoleon"
  ],

  "sections": [
    {
      "title": "The Three Estates",
      "content": "France was divided into three unequal groups...",
      "keyTerms": ["First Estate", "Second Estate", "Third Estate", "Estates General"]
    }
  ],

  "quiz": [
    {
      "question": "Which Estate paid the majority of taxes in pre-revolution France?",
      "options": ["First Estate (Clergy)", "Second Estate (Nobility)", "Third Estate (Commoners)", "Split evenly"],
      "correct_answer": "Third Estate (Commoners)",
      "explanation": "Only the commoners paid taxes. The clergy and nobility were exempt."
    }
  ],

  "flashcards": [
    {
      "question": "What was the Tennis Court Oath?",
      "answer": "A pledge by the Third Estate to not disband until France had a new constitution"
    }
  ],

  "cta": {
    "headline": "Master History on Your Phone",
    "features": ["Flashcards for every date", "AI Tutor to explain concepts", "Practice quizzes for exams"]
  }
}
```

## Page Layout

```
┌─────────────────────────────────────────┐
│  Header (same as main landing page)     │
├─────────────────────────────────────────┤
│  Breadcrumb: Home > Category > [Title]  │
├─────────────────────────────────────────┤
│  H1: [Topic] Study Guide                │
│  Meta: Topic | Source | Difficulty      │
├─────────────────────────────────────────┤
│  🚀 TL;DR (3 bullet cards)              │
├─────────────────────────────────────────┤
│  📺 YouTube Video Embed                 │
├─────────────────────────────────────────┤
│  📝 Cheat Sheet Notes                   │
│  (Sections with key terms highlighted)  │
├─────────────────────────────────────────┤
│  🧠 Interactive Quiz (Gamified)         │
│  - Progress bar                         │
│  - Streak counter                       │
│  - Points system                        │
│  - Confetti on completion               │
├─────────────────────────────────────────┤
│  📱 CTA Banner - Download QuizliAI      │
├─────────────────────────────────────────┤
│  Footer (same as main landing page)     │
└─────────────────────────────────────────┘
```

## File Structure

```
app/
├── note/
│   └── [slug]/
│       └── page.tsx              # Dynamic study guide page
├── lib/
│   ├── firebase.ts               # Firebase config
│   └── studyGuide.ts             # Fetch functions
components/
├── study-guide/
│   ├── StudyGuideHeader.tsx      # Title, breadcrumb, meta
│   ├── TldrSection.tsx           # 3 bullet cards
│   ├── VideoEmbed.tsx            # YouTube embed
│   ├── CheatSheetSection.tsx     # Notes sections
│   ├── InteractiveQuiz.tsx       # Gamified quiz
│   └── CtaBanner.tsx             # Download app CTA
```

## Quiz Gamification Features

- Progress bar showing completion percentage
- Streak counter for consecutive correct answers
- Points per correct answer (+10)
- Visual feedback (green/red) on answer selection
- Explanation reveal after answering
- Confetti animation on quiz completion
- Final score summary with:
  - Percentage score
  - Correct/Wrong count
  - Time taken
  - Try Again / Exit options

## SEO Implementation

### Meta Tags
- Dynamic title: "[Topic] Study Guide | QuizliAI"
- Description from TL;DR
- Open Graph tags for social sharing
- Canonical URL

### Structured Data (JSON-LD)
- Article schema for study guide
- HowTo schema if applicable
- FAQ schema for quiz questions

## Initial 15 Study Guides (Phase 1)

### History
1. WW2 - OverSimplified (Part 1)
2. The French Revolution - OverSimplified
3. The Cold War - OverSimplified
4. The Great Depression - Crash Course US History
5. The Civil War - Crash Course US History
6. Agricultural Revolution - Crash Course World History

### Biology
7. Mitosis - Crash Course Biology
8. DNA Structure and Replication - Crash Course Biology
9. Photosynthesis - Crash Course Biology
10. Protein Synthesis - Amoeba Sisters

### Literature
11. The Great Gatsby - Crash Course Literature
12. How and Why We Read - Crash Course Literature
13. 1984 - Crash Course Literature

### Math/Science
14. Essence of Calculus - 3Blue1Brown
15. Introduction to Limits - Organic Chemistry Tutor

## Implementation Steps

1. [ ] Set up Firebase config in landing page project
2. [ ] Create `/note/[slug]` dynamic route with loading state
3. [ ] Build StudyGuideHeader component with breadcrumb
4. [ ] Build TldrSection component (3 bullet cards)
5. [ ] Build VideoEmbed component (YouTube iframe)
6. [ ] Build CheatSheetSection component (notes + key terms)
7. [ ] Build InteractiveQuiz component with gamification
8. [ ] Build CtaBanner component
9. [ ] Add dynamic SEO meta tags
10. [ ] Add JSON-LD structured data
11. [ ] Test with first study guide content
12. [ ] Create remaining 14 study guides in Firebase
