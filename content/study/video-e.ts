import type { StudyPage } from "./pages"

export const videoEPages: StudyPage[] = [
  {
    slug: "coulombs-law-and-electric-charge",
    video: { id: "lU8qZ0UyZUk", title: "Electric charge and electric force | AP Physics", channel: "Khan Academy" },
    status: "live",
    title: "Coulomb's law and electric charge",
    subject: "Physics",
    context:
      "Electric charge comes in two kinds. Like charges repel each other. Unlike charges attract each other. Coulomb's law gives the size of this force between two small charged objects. The force is proportional to the product of the two charges. It is inversely proportional to the square of the distance between them. If the distance doubles, the force becomes one fourth as large.",
    flashcards: [
      { q: "What does Coulomb's law describe?", a: "The electric force between two charged point objects. It depends on both charges and on the distance between them." },
      { q: "What happens to the electric force when the distance between two charges doubles?", a: "The force becomes one fourth as large. Coulomb's law is an inverse square law." },
      { q: "How do like charges and unlike charges act on each other?", a: "Like charges repel. Unlike charges attract." },
    ],
    quiz: [
      { q: "Two positive charges are close together. What does the electric force do?", options: ["It pulls them together", "It pushes them apart", "There is no force", "It makes them neutral"], answer: 1, why: "Like charges repel each other." },
      { q: "The distance between two charges doubles. What happens to the force?", options: ["It doubles", "It becomes half as large", "It stays the same", "It becomes one fourth as large"], answer: 3, why: "The force is inversely proportional to the square of the distance. Two squared is four." },
      { q: "One charge doubles. The other charge and the distance stay the same. What happens to the force?", options: ["It becomes twice as large", "It becomes half as large", "It becomes one fourth as large", "It stays the same"], answer: 0, why: "The force is proportional to the product of the two charges." },
    ],
  },
  {
    slug: "electric-fields-and-field-lines",
    video: { id: "D2Lh7Dlqn1o", title: "Electric fields (part 1) | AP Physics", channel: "Khan Academy" },
    status: "live",
    title: "Electric fields and field lines",
    subject: "Physics",
    context:
      "An electric field is the electric force per unit charge at a point in space. Its direction is the direction of the force on a positive test charge. Near a positive point charge, the field points away from the charge. Near a negative point charge, it points toward the charge. Field lines show this. They start on positive charges. They end on negative charges or at infinity.",
    flashcards: [
      { q: "What is the direction of an electric field at a point?", a: "The direction of the force on a positive test charge placed at that point." },
      { q: "Where do electric field lines start and end?", a: "They start on positive charges. They end on negative charges or at infinity." },
      { q: "What do field lines that are close together show?", a: "A strong field. Lines that are far apart show a weaker field." },
    ],
    quiz: [
      { q: "Which way does the electric field point near a negative point charge?", options: ["Away from the charge", "Toward the charge", "In circles around the charge", "It points nowhere"], answer: 1, why: "Fields point toward negative charges and away from positive charges." },
      { q: "In one region, the field lines are very close together. What does this show?", options: ["The field is weak", "The field is zero", "The field is strong", "The charge is negative"], answer: 2, why: "The closeness of the lines shows the strength of the field." },
      { q: "Why can two electric field lines never cross?", options: ["A field has only one direction at each point", "Field lines carry mass", "Charges repel the lines", "Crossing makes the charges neutral"], answer: 0, why: "A crossing would give two field directions at one point. That is not possible." },
    ],
  },
  {
    slug: "simple-pendulum-period",
    video: { id: "Dv5R543h3XM", title: "SHM of simple pendulums | AP Physics", channel: "Khan Academy" },
    status: "live",
    title: "The period of a simple pendulum",
    subject: "Physics",
    context:
      "A simple pendulum is a small mass on a light string that swings back and forth. The period is the time for one full swing. For small angles, the period depends only on the length of the string and on gravity. It does not depend on the mass of the bob. A longer pendulum has a longer period. Small angles means only a few degrees.",
    flashcards: [
      { q: "What two things set the period of a simple pendulum at small angles?", a: "The length of the pendulum and the acceleration due to gravity." },
      { q: "Does the mass of the bob change the period?", a: "No. The period does not depend on the mass of the bob." },
      { q: "What is the period formula for a simple pendulum, and when does it hold?", a: "T = 2π√(L/g). It holds for small angles, only a few degrees." },
    ],
    quiz: [
      { q: "Which change makes the period of a simple pendulum longer?", options: ["A shorter string", "A longer string", "A lighter bob", "A heavier bob"], answer: 1, why: "The period grows with the square root of the length." },
      { q: "A heavier bob replaces a lighter bob. The length and the small swing stay the same. What happens to the period?", options: ["It gets longer", "It gets shorter", "It becomes zero", "It stays the same"], answer: 3, why: "The period does not depend on mass." },
      { q: "The formula T = 2π√(L/g) assumes which condition?", options: ["Small swing angles, only a few degrees", "Swing angles near 90 degrees", "A bob heavier than 1 kg", "A string longer than 1 m"], answer: 0, why: "The formula uses the small angle approximation." },
    ],
  },
  {
    slug: "elements-of-a-story",
    video: { id: "JOs-q7rXqdk", title: "4 ways to tell a great story", channel: "TED-Ed" },
    status: "live",
    title: "The elements of a story",
    subject: "English",
    context:
      "Stories share common elements, such as these five. Characters are the people or other beings in the story. Setting is the time and place. Conflict is the problem the characters face. Plot is the sequence of events, from exposition to climax to resolution. Theme is the central idea or message of the story. Writers use these elements together. Readers use them to analyze a story.",
    flashcards: [
      { q: "What is the setting of a story?", a: "The time and place where the story happens." },
      { q: "What is conflict? Name two types.", a: "Conflict is the problem or struggle a character faces. Two types are character vs. self and character vs. nature." },
      { q: "What are the five parts of a common plot structure, in order?", a: "Exposition, rising action, climax, falling action and resolution." },
    ],
    quiz: [
      { q: "Which element is the time and place of a story?", options: ["Theme", "Plot", "Setting", "Conflict"], answer: 2, why: "Setting is the time and location of the story." },
      { q: "A character fights to survive a storm. Which type of conflict is this?", options: ["Character vs. nature", "Character vs. self", "Character vs. society", "Character vs. character"], answer: 0, why: "The character struggles against weather, a force of nature." },
      { q: "What happens at the climax of a plot?", options: ["The characters are introduced", "The final outcome is shown", "The events after the turning point play out", "The turning point comes, and tension is highest"], answer: 3, why: "The climax is the turning point, where the tension of the conflict is highest." },
    ],
  },
  {
    slug: "major-animal-phyla",
    video: { id: "JrkWv5Xsz8k", title: "A Brief Summary of Every Single Animal Phylum", channel: "Professor Dave Explains" },
    status: "live",
    title: "Major animal phyla",
    subject: "Biology",
    context:
      "Biologists group animals into phyla. Sponges (Porifera) have pores and filter food from water. Cnidarians have stinging cells. Arthropods have jointed legs and an exoskeleton made mainly of chitin. Chordates have a notochord, a dorsal nerve cord, pharyngeal slits and a post-anal tail at some stage of life. Vertebrates are chordates, but not all chordates are vertebrates.",
    flashcards: [
      { q: "What special cells do cnidarians have?", a: "Stinging cells called cnidocytes. They fire nematocysts." },
      { q: "Name two traits of arthropods.", a: "Jointed appendages and an exoskeleton made mainly of chitin." },
      { q: "Name four key features of chordates.", a: "A notochord, a dorsal nerve cord, pharyngeal slits and a post-anal tail. Each one appears at some stage of life." },
    ],
    quiz: [
      { q: "Which phylum has stinging cells?", options: ["Porifera", "Arthropoda", "Cnidaria", "Chordata"], answer: 2, why: "Cnidarians have stinging cells." },
      { q: "How does a sponge get its food?", options: ["It filters food from water drawn through pores", "It stings prey with poison", "It chews food with jointed mouthparts", "It absorbs sunlight"], answer: 0, why: "Sponges pull water through pores and filter out food." },
      { q: "Which statement is correct?", options: ["Sponges are chordates", "Arthropods are vertebrates", "All chordates are vertebrates", "All vertebrates are chordates"], answer: 3, why: "Vertebrates belong to the phylum Chordata. Some chordates are not vertebrates." },
    ],
  },
]
