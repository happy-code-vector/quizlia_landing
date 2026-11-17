import type { StudyPage } from "./pages"

export const englishPages: StudyPage[] = [
  {
    slug: "semicolon-vs-colon",
    alias: "semicolon",
    status: "live",
    title: "Semicolon vs colon",
    subject: "English",
    context:
      "A semicolon joins two full sentences that are closely related. Example: \"The test was hard; I studied more.\" A colon introduces something. It can start a list or an explanation. The words before a colon should be a full sentence. Example: \"I packed three things: a pen, a book, and water.\" Use a semicolon to join ideas. Use a colon to point to what comes next.",
    flashcards: [
      { q: "What is a main use of a semicolon?", a: "It joins two closely related full sentences." },
      { q: "What should come before a colon?", a: "A full sentence. The colon then introduces a list or an explanation." },
      { q: "What punctuation goes with \"however\" between two full sentences?", a: "A semicolon before it and a comma after it." },
    ],
    quiz: [
      { q: "Which sentence uses a semicolon correctly?", options: ["I like tea; and coffee.", "The bus was late; I walked to school.", "When the bus was late; I walked.", "I bought: apples, pears, and plums."], answer: 1, why: "A semicolon can join two closely related full sentences." },
      { q: "Which sentence uses a colon correctly?", options: ["I need: a pen, paper, and a ruler.", "I need three things; a pen, paper, and a ruler.", "I need three things: a pen, paper, and a ruler.", "I need three things, a pen: paper, and a ruler."], answer: 2, why: "A full sentence comes before the colon. The list comes after it." },
      { q: "Which sentence is correct?", options: ["The game ended, however, we had fun.", "The game ended, however; we had fun.", "The game ended however, we had fun.", "The game ended; however, we had fun."], answer: 3, why: "Use a semicolon before \"however\" and a comma after it." },
    ],
  },
  {
    slug: "subject-verb-agreement",
    alias: "subverb",
    status: "live",
    title: "Subject-verb agreement",
    subject: "English",
    context:
      "A verb must match its subject in number. Singular subjects take singular verbs. Plural subjects take plural verbs. Example: \"The dog barks. The dogs bark.\" Do not let extra words between the subject and the verb mislead you. Example: \"The box of pencils is on the desk.\" The subject is \"box,\" not \"pencils.\" Two separate subjects joined by \"and\" usually take a plural verb: \"Maria and Jon are ready.\"",
    flashcards: [
      { q: "What does \"agree in number\" mean?", a: "A singular subject takes a singular verb. A plural subject takes a plural verb." },
      { q: "In \"The box of pencils is on the desk,\" what is the subject?", a: "Box. The phrase \"of pencils\" does not change the verb." },
      { q: "What kind of verb usually goes with two subjects joined by \"and\"?", a: "A plural verb. Example: Maria and Jon are ready." },
    ],
    quiz: [
      { q: "Which sentence is correct?", options: ["The books on the shelf is old.", "The books on the shelf are old.", "The books on the shelf was old.", "The book on the shelf are old."], answer: 1, why: "The subject is \"books,\" which is plural, so use \"are.\"" },
      { q: "Which sentence is correct?", options: ["Her book and her purse is on the table.", "Her book and her purse was on the table.", "Her book and her purse are on the table.", "Her book and her purse has been on the table."], answer: 2, why: "Two subjects joined by \"and\" usually take a plural verb." },
      { q: "Choose the correct verb: \"Istanbul, a very large city, ___ founded long ago.\"", options: ["was", "were", "are", "have been"], answer: 0, why: "The subject is \"Istanbul,\" which is singular. The phrase between the commas does not change the verb." },
    ],
  },
  {
    slug: "its-vs-its",
    alias: "itsvsits",
    status: "live",
    title: "Its vs it's",
    subject: "English",
    context:
      "Its and it's look alike, but they do different jobs. It's means \"it is\" or \"it has.\" The apostrophe shows that letters are missing. Example: \"It's raining.\" Its means \"belonging to it.\" It has no apostrophe, just like his and her. Example: \"The dog wagged its tail.\" To check, try \"it is\" or \"it has\" in the sentence. If one fits, use it's.",
    flashcards: [
      { q: "What does it's mean?", a: "It is or it has. The apostrophe replaces the missing letters." },
      { q: "What does its (no apostrophe) mean?", a: "Belonging to it. Example: The dog wagged its tail." },
      { q: "How can you test which one to use?", a: "Try \"it is\" or \"it has\" in the sentence. If one fits, use it's. If not, use its." },
    ],
    quiz: [
      { q: "Which sentence is correct?", options: ["The cat licked it's paw.", "The cat licked its paw.", "The cat licked its' paw.", "The cat licked it paw's."], answer: 1, why: "Its with no apostrophe shows that the paw belongs to the cat." },
      { q: "Which sentence is correct?", options: ["Its a sunny day.", "Its' a sunny day.", "It's a sunny day.", "Its is a sunny day."], answer: 2, why: "\"It is a sunny day\" makes sense, so use the contraction it's." },
      { q: "Which sentence uses both words correctly?", options: ["It's clear that the team lost its best player.", "Its clear that the team lost it's best player.", "It's clear that the team lost it's best player.", "Its clear that the team lost its best player."], answer: 0, why: "\"It is clear\" needs it's. \"Belonging to the team\" needs its." },
    ],
  },
  {
    slug: "how-to-write-a-thesis-statement",
    alias: "thesis",
    status: "live",
    title: "How to write a thesis statement",
    subject: "English",
    context:
      "A thesis statement is the main claim of your essay. It is usually one sentence near the end of your first paragraph. A strong thesis answers the question, takes a position that others could argue against, and is specific. Weak: \"Social media has good and bad effects.\" Better: \"Social media makes people more careful readers, because not every post is reliable.\" The rest of the essay gives evidence.",
    flashcards: [
      { q: "What is a thesis statement?", a: "The main claim of an essay, usually in one sentence." },
      { q: "Where does a thesis usually go?", a: "Near the beginning, often at the end of the first paragraph." },
      { q: "Name two traits of a strong thesis.", a: "It takes a position that others could argue against, and it is specific." },
    ],
    quiz: [
      { q: "Which is the strongest thesis?", options: ["Dogs are animals.", "This essay is about dogs.", "Dogs are great.", "City leaders should build more dog parks, because parks improve dog health and bring neighbors together."], answer: 3, why: "It takes a clear position, it is specific, and it gives reasons." },
      { q: "Where does a thesis usually appear?", options: ["In the title only", "At the end of the first paragraph", "In the middle of the last paragraph", "After the sources list"], answer: 1, why: "A thesis usually sits near the beginning, often at the end of the first paragraph." },
      { q: "Why is \"Pizza is a food that people eat\" a weak thesis?", options: ["It is too long.", "It uses the word pizza.", "It is a plain fact that no one would argue against.", "It has no comma."], answer: 2, why: "A strong thesis takes a position that others could challenge." },
    ],
  },
  {
    slug: "ethos-pathos-and-logos",
    alias: "ethos",
    status: "live",
    title: "Ethos, pathos and logos",
    subject: "English",
    context:
      "Ethos, pathos, and logos are three ways to persuade. Ethos appeals to trust. The writer shows credibility, such as expert knowledge. Pathos appeals to emotion. The writer wants the reader to feel something. Logos appeals to logic. The writer uses facts, statistics, and clear reasoning. Example: a doctor says, \"I have treated this illness for 20 years.\" That sentence uses ethos.",
    flashcards: [
      { q: "What is ethos?", a: "An appeal to the writer's credibility or trustworthiness." },
      { q: "What is pathos?", a: "An appeal to the reader's emotions." },
      { q: "What is logos?", a: "An appeal to logic, using facts and clear reasoning." },
    ],
    quiz: [
      { q: "A speaker says, \"Studies show this plan cut costs by 15 percent.\" Which appeal is this?", options: ["Ethos", "Pathos", "Logos", "None of these"], answer: 2, why: "Facts and statistics appeal to logic." },
      { q: "An ad shows a lonely puppy and asks you to donate. Which appeal is this?", options: ["Logos", "Pathos", "Ethos", "None of these"], answer: 1, why: "The ad aims at the reader's feelings." },
      { q: "A teacher says, \"With 20 years of experience, I know this method works.\" Which appeal is this?", options: ["Ethos", "Pathos", "Logos", "Humor"], answer: 0, why: "The speaker builds trust through experience and credibility." },
    ],
  },
  {
    slug: "figurative-language",
    alias: "figurative",
    status: "live",
    title: "Figurative language",
    subject: "English",
    context:
      "Figurative language does not use words in their usual, literal meaning. It can help readers picture ideas. A simile usually compares two things with \"like\" or \"as.\" A metaphor compares them directly, without those words. Hyperbole is a big exaggeration. Example: \"I am so hungry I could eat a horse.\" This is hyperbole. The speaker does not plan to eat a horse.",
    flashcards: [
      { q: "What is figurative language?", a: "Language that does not use words in their ordinary, literal meaning." },
      { q: "What is hyperbole?", a: "An extreme exaggeration used for emphasis." },
      { q: "How do a simile and a metaphor differ?", a: "A simile usually uses \"like\" or \"as.\" A metaphor does not." },
    ],
    quiz: [
      { q: "Which sentence is figurative?", options: ["The test has 20 questions.", "My backpack weighs a ton.", "The bus arrives at 8:00.", "She wrote her name."], answer: 1, why: "A backpack cannot weigh a ton. It is an exaggeration." },
      { q: "\"I have told you a million times.\" Which type is this?", options: ["Simile", "Metaphor", "Hyperbole", "Literal language"], answer: 2, why: "A million times is an extreme exaggeration." },
      { q: "Which sentence is a simile?", options: ["Her smile was the sun.", "Her smile lit up the entire planet.", "Her smile was nice.", "Her smile was as bright as the sun."], answer: 3, why: "It compares two things with \"as.\"" },
    ],
  },
  {
    slug: "metaphor-vs-simile",
    alias: "metaphor",
    status: "live",
    title: "Metaphor vs simile",
    subject: "English",
    context:
      "Both similes and metaphors compare two different things. A simile usually uses \"like\" or \"as.\" Example: \"She runs like the wind.\" A metaphor says one thing is another thing, or treats it as if it were. It does not use \"like\" or \"as.\" Example: \"Time is a thief.\" Both are figures of speech. A quick test is to look for \"like\" or \"as\" in the comparison. Most similes have one.",
    flashcards: [
      { q: "What is a simile?", a: "A comparison that usually uses \"like\" or \"as.\"" },
      { q: "What is a metaphor?", a: "A comparison that says one thing is another, without \"like\" or \"as.\"" },
      { q: "Which is a metaphor: \"He runs like a cheetah\" or \"He is a cheetah on the track\"?", a: "\"He is a cheetah on the track.\" It has no \"like\" or \"as.\"" },
    ],
    quiz: [
      { q: "Which sentence is a simile?", options: ["The classroom was a zoo.", "Her voice was as smooth as silk.", "Life is a journey.", "My brother is a night owl."], answer: 1, why: "It compares with \"as ... as.\"" },
      { q: "Which sentence is a metaphor?", options: ["He swims like a fish.", "She is as sharp as a tack.", "The world is a stage.", "They fought like cats and dogs."], answer: 2, why: "It says one thing is another, with no \"like\" or \"as.\"" },
      { q: "What is the key difference between them?", options: ["A simile usually uses \"like\" or \"as.\" A metaphor does not.", "A metaphor uses \"like\" or \"as.\" A simile does not.", "A simile is always longer.", "A metaphor only appears in poems."], answer: 0, why: "Similes signal the comparison with \"like\" or \"as.\"" },
    ],
  },
  {
    slug: "active-vs-passive-voice",
    alias: "passive",
    status: "live",
    title: "Active vs passive voice",
    subject: "English",
    context:
      "In active voice, the subject does the action. Example: \"The goalie blocked the shot.\" In passive voice, the subject receives the action. Example: \"The shot was blocked by the goalie.\" Passive voice often uses a form of \"be\" plus a past participle, like \"was blocked.\" Active voice is usually shorter and clearer. Passive voice helps when the doer is unknown or unimportant.",
    flashcards: [
      { q: "In active voice, what does the subject do?", a: "The subject does the action." },
      { q: "How can you spot passive voice?", a: "Look for a form of \"be\" plus a past participle, such as \"was blocked.\"" },
      { q: "When is passive voice useful?", a: "When the doer is unknown or unimportant, or when the result matters most." },
    ],
    quiz: [
      { q: "Which sentence is in the passive voice?", options: ["The chef cooked the meal.", "The meal was cooked by the chef.", "The chef is cooking.", "The chef cooks every day."], answer: 1, why: "The subject, \"meal,\" receives the action." },
      { q: "Which sentence is the active version of \"The window was broken by Sam\"?", options: ["The window broke Sam.", "The window has been broken.", "Sam broke the window.", "Sam was broken the window."], answer: 2, why: "In active voice, Sam is the subject and does the action." },
      { q: "Why might a writer choose passive voice?", options: ["Passive voice is always shorter.", "Active voice is always wrong.", "A passive sentence has no verb.", "The person who did the action is unknown."], answer: 3, why: "Passive voice works when the doer is unknown or does not matter." },
    ],
  },
  {
    slug: "theme-vs-main-idea",
    alias: "theme",
    status: "live",
    title: "Theme vs main idea",
    subject: "English",
    context:
      "A main idea is what a text is mostly about. It is specific to that text. A theme is a message about life or the world that a story reveals. Many people can relate to a theme. In many reading lessons, a theme is stated as a full sentence, not one word. Example: \"kindness\" is a topic. \"Simple acts of kindness can have a big impact\" is a theme statement.",
    flashcards: [
      { q: "What is a main idea?", a: "What a text is mostly about. It is specific to that text." },
      { q: "What is a theme in a story?", a: "A message about life or the world that a story reveals." },
      { q: "Is \"kindness\" a theme statement?", a: "No. \"Kindness\" is a topic. A theme statement is a full sentence, such as \"Simple acts of kindness can have a big impact.\"" },
    ],
    quiz: [
      { q: "Which is written as a theme statement?", options: ["Kindness", "A boy finds a lost dog", "Simple acts of kindness can have a big impact", "Chapter 3"], answer: 2, why: "A theme statement is a full sentence about life, not one word or one event." },
      { q: "A theme is best described as which of these?", options: ["A summary of every event", "A message about life that many people can relate to", "The name of the main character", "The place where the story happens"], answer: 1, why: "A theme is a message about life or the world." },
      { q: "Which statement is true?", options: ["A theme is a message that can apply to people beyond the story.", "A theme is always one word.", "A main idea is a message about the whole world.", "A main idea does not come from the text."], answer: 0, why: "A theme is universal. A main idea is specific to the text." },
    ],
  },
]
