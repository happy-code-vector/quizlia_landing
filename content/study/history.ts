import type { StudyPage } from "./pages"

// Facts checked against two sources each. Fact tables: QuizliAI Shorts/scripts/2026-11-16-<slug>-facts.md
export const historyPages: StudyPage[] = [
  {
    slug: "french-revolution-causes",
    alias: "frenchrev",
    status: "live",
    title: "Causes of the French Revolution",
    subject: "History",
    context:
      "The French Revolution is usually dated from 1789. France was close to bankruptcy. Government debt grew partly because France had helped the American Revolution. Bad harvests added to the hardship. The king called the Estates-General to meet on May 5, 1789. The Third Estate, which spoke for the commoners, wanted more power. Historians debate which cause mattered most.",
    flashcards: [
      { q: "What money problem pushed France toward revolution?", a: "The government was close to bankruptcy. Its debt grew partly from helping the American Revolution." },
      { q: "What was the Third Estate?", a: "The commoners. They were most of the people, and they wanted more power in the Estates-General." },
      { q: "Do historians agree on one cause of the French Revolution?", a: "No. Historians debate the exact causes and which mattered most." },
    ],
    quiz: [
      { q: "Which event helped push the French government into debt?", options: ["Its help for the American Revolution", "The Louisiana Purchase", "The Industrial Revolution", "The Cuban Missile Crisis"], answer: 0, why: "French support for the American Revolution left the government close to bankruptcy." },
      { q: "When was the Estates-General set to meet in 1789?", options: ["January 1", "July 4", "May 5", "December 25"], answer: 2, why: "The king called the Estates-General to meet on May 5, 1789." },
      { q: "Who made up the Third Estate?", options: ["Kings and queens", "Church leaders", "Nobles", "The commoners"], answer: 3, why: "The Third Estate was the commoners, who were most of the people." },
    ],
  },
  {
    slug: "cuban-missile-crisis",
    alias: "cubacrisis",
    status: "live",
    title: "Cuban Missile Crisis",
    subject: "History",
    context:
      "In October 1962, the United States and the Soviet Union came close to war. On October 14, a U-2 spy plane photographed Soviet missile sites in Cuba. On October 22, President Kennedy ordered a naval quarantine of Cuba. On October 28, Soviet leader Khrushchev agreed to remove the missiles. In return, the United States promised not to invade Cuba. It also secretly agreed to remove missiles from Turkey.",
    flashcards: [
      { q: "How did the United States find the missile sites?", a: "A U-2 spy plane photographed them on October 14, 1962." },
      { q: "What did Kennedy order on October 22, 1962?", a: "A naval quarantine of Cuba. He told the nation about it on television." },
      { q: "What did each side promise to end the crisis?", a: "The Soviets agreed to remove the missiles. The United States promised not to invade Cuba and secretly agreed to remove missiles from Turkey." },
    ],
    quiz: [
      { q: "What type of plane photographed the missile sites?", options: ["B-52", "U-2", "F-16", "SR-71"], answer: 1, why: "A U-2 spy plane took the photos on October 14, 1962." },
      { q: "On what date did Khrushchev agree to remove the missiles?", options: ["October 14", "October 22", "November 20", "October 28"], answer: 3, why: "Khrushchev agreed to remove the missiles on October 28." },
      { q: "What did the United States promise in return?", options: ["Not to invade Cuba", "To leave the United Nations", "To end all trade", "To give Cuba money"], answer: 0, why: "Kennedy promised the United States would not invade Cuba." },
    ],
  },
  {
    slug: "industrial-revolution",
    alias: "indrev",
    status: "live",
    title: "Industrial Revolution",
    subject: "History",
    context:
      "The Industrial Revolution began in Britain in the 18th century. Before it, most goods were made by hand at home or in small workshops. New machines, such as the spinning jenny and the power loom, made cloth faster. James Watt improved the steam engine. Factories replaced home work, and cities grew fast. Historians debate the exact dates. They also debate why it began in Britain.",
    flashcards: [
      { q: "Where did the Industrial Revolution begin?", a: "In Britain, in the 18th century." },
      { q: "Name two machines that sped up making cloth.", a: "The spinning jenny and the power loom." },
      { q: "What changed about where people worked?", a: "Factories replaced much of the work done at home and in small workshops. Cities grew fast." },
    ],
    quiz: [
      { q: "Which country was first to industrialize?", options: ["France", "Japan", "Britain", "Russia"], answer: 2, why: "The Industrial Revolution began in Britain in the 18th century." },
      { q: "Who greatly improved the steam engine?", options: ["Eli Whitney", "James Watt", "Samuel Morse", "Isaac Newton"], answer: 1, why: "James Watt greatly improved the steam engine." },
      { q: "Which statement is true?", options: ["Historians debate the exact dates", "Everyone agrees on one start year", "Cities got smaller", "Factories began in homes"], answer: 0, why: "Historians use different dates for the start and for the main period." },
    ],
  },
  {
    slug: "causes-of-the-american-revolution",
    alias: "amrev",
    status: "live",
    title: "Causes of the American Revolution",
    subject: "History",
    context:
      "Britain won the French and Indian War but owed a large debt. Parliament then taxed the colonies, including the Stamp Act of 1765. Colonists protested taxation without representation. In December 1773, colonists dumped tea into Boston Harbor. Parliament answered with the Intolerable Acts. Fighting began at Lexington and Concord on April 19, 1775. Congress adopted the Declaration of Independence on July 4, 1776.",
    flashcards: [
      { q: "Why did Britain tax the colonies after the French and Indian War?", a: "Britain owed a large war debt. Taxes were meant to raise money." },
      { q: "What did colonists mean by \"taxation without representation\"?", a: "They had no vote in Parliament, yet Parliament taxed them." },
      { q: "What happened at Lexington and Concord?", a: "The first fighting of the war began there on April 19, 1775." },
    ],
    quiz: [
      { q: "Which 1765 law raised money from the colonies and drew heated protest?", options: ["Tea Act", "Stamp Act", "Sugar Act", "Navigation Acts"], answer: 1, why: "Parliament passed the Stamp Act in 1765, and colonists protested it." },
      { q: "What happened in Boston Harbor in December 1773?", options: ["A naval battle", "A treaty signing", "Colonists dumped tea", "A fire"], answer: 2, why: "Colonists dumped chests of tea into the harbor." },
      { q: "What did Parliament pass after the Boston Tea Party?", options: ["The Intolerable Acts", "The Bill of Rights", "The Stamp Act", "The Declaration"], answer: 0, why: "The Intolerable Acts punished Massachusetts for the Tea Party." },
    ],
  },
  {
    slug: "treaty-of-versailles",
    alias: "versailles",
    status: "live",
    title: "Treaty of Versailles",
    subject: "History",
    context:
      "The Treaty of Versailles was signed on June 28, 1919. It ended World War 1 between Germany and the Allies. Article 231 made Germany accept responsibility for the war. Germany had to pay reparations. Germany lost land in Europe and all its colonies. Its army and navy were limited. The treaty also created the League of Nations. Historians debate how harsh it was.",
    flashcards: [
      { q: "When was the Treaty of Versailles signed?", a: "June 28, 1919." },
      { q: "What did Article 231 say?", a: "Germany had to accept responsibility for the war. People call it the war guilt clause." },
      { q: "What did Germany lose in the treaty?", a: "Land in Europe and all its overseas colonies." },
    ],
    quiz: [
      { q: "Which war did the Treaty of Versailles end?", options: ["World War 2", "The Korean War", "The Civil War", "World War 1"], answer: 3, why: "The treaty ended World War 1 between Germany and the Allies." },
      { q: "What international group did the treaty create?", options: ["The United Nations", "The League of Nations", "NATO", "The European Union"], answer: 1, why: "The treaty included the Covenant of the League of Nations." },
      { q: "Which statement is true?", options: ["Germany paid nothing", "Germany kept all its colonies", "Germany was told to pay reparations", "Germany could keep any army size"], answer: 2, why: "Germany had to pay reparations, and its army and navy were limited." },
    ],
  },
  {
    slug: "renaissance",
    alias: "renaissance",
    status: "live",
    title: "The Renaissance",
    subject: "History",
    context:
      "Renaissance is a French word that means \"rebirth.\" This period is generally said to have begun in Italy in the 14th century. People became interested again in the learning of ancient Greece and Rome. A movement called humanism grew. Wealthy families such as the Medici paid for art. Leonardo da Vinci and Michelangelo were leading artists. Historians debate exactly when it began.",
    flashcards: [
      { q: "What does \"Renaissance\" mean?", a: "Rebirth. It is a French word." },
      { q: "Where did the Renaissance begin?", a: "In Italy, generally dated to the 14th century." },
      { q: "Who were the Medici?", a: "A wealthy family in Florence that paid for art and learning." },
    ],
    quiz: [
      { q: "The Renaissance renewed interest in the learning of which cultures?", options: ["Ancient Greece and Rome", "Ancient Egypt only", "Viking lands", "Ancient China only"], answer: 0, why: "People revived the learning of ancient Greece and Rome." },
      { q: "Which movement focused on human achievement and classical learning?", options: ["Feudalism", "Humanism", "Industrialism", "Imperialism"], answer: 1, why: "Humanism grew first in Italy during the Renaissance." },
      { q: "Which two artists belong to the Renaissance?", options: ["Picasso and Warhol", "Monet and Van Gogh", "Leonardo da Vinci and Michelangelo", "Dali and Pollock"], answer: 2, why: "Leonardo da Vinci and Michelangelo were leading artists of the period." },
    ],
  },
  {
    slug: "civil-rights-movement",
    alias: "civilrights",
    status: "live",
    title: "Civil Rights Movement",
    subject: "History",
    context:
      "The civil rights movement of the 1950s and 1960s worked to end racial segregation. On May 17, 1954, the Supreme Court ruled that segregated public schools were unconstitutional. In 1955, Black residents of Montgomery began a bus boycott that lasted 381 days. President Johnson signed the Civil Rights Act on July 2, 1964. He signed the Voting Rights Act on August 6, 1965.",
    flashcards: [
      { q: "What did Brown v. Board of Education decide in 1954?", a: "Segregated public schools were unconstitutional. The vote was unanimous." },
      { q: "How long did the Montgomery bus boycott last?", a: "381 days, beginning in December 1955." },
      { q: "What did the Voting Rights Act of 1965 outlaw?", a: "Discriminatory voting practices. It also suspended literacy tests in places that had used them to block Black voters." },
    ],
    quiz: [
      { q: "On what date did the Supreme Court decide Brown v. Board of Education?", options: ["May 17, 1954", "July 2, 1964", "August 6, 1965", "December 1, 1955"], answer: 0, why: "The Court ruled on May 17, 1954." },
      { q: "How many days did the Montgomery bus boycott last?", options: ["28", "381", "100", "1,000"], answer: 1, why: "The boycott lasted 381 days." },
      { q: "Which law of July 2, 1964 banned discrimination in public places and jobs?", options: ["The Voting Rights Act", "The Stamp Act", "The Civil Rights Act", "The Fifteenth Amendment"], answer: 2, why: "President Johnson signed the Civil Rights Act on July 2, 1964." },
    ],
  },
  {
    slug: "great-depression-causes",
    alias: "depression",
    status: "live",
    title: "Causes of the Great Depression",
    subject: "History",
    context:
      "The Great Depression began in 1929 and lasted about a decade. The 1929 stock market crash was part of the early crisis. Historians say it was not the only cause. The Federal Reserve raised interest rates in 1928 and 1929. Banks failed in waves, and the money supply shrank. The gold standard helped spread the crisis to other countries. Historians and economists still debate how much each cause mattered.",
    flashcards: [
      { q: "When did the Great Depression begin?", a: "In 1929." },
      { q: "What did the Federal Reserve do in 1928 and 1929?", a: "It raised interest rates." },
      { q: "How did the gold standard affect the crisis?", a: "It helped spread the downturn to other countries." },
    ],
    quiz: [
      { q: "In which year did the Great Depression begin?", options: ["1914", "1939", "1945", "1929"], answer: 3, why: "The Depression began in 1929." },
      { q: "What happened to many banks in the early 1930s?", options: ["They grew rich", "They failed", "They merged into one", "They opened new branches in every town"], answer: 1, why: "Banking panics in 1930 and 1931 led to many bank failures." },
      { q: "Which statement is true?", options: ["Experts agree on one cause", "The crash alone explains everything", "Historians still debate the causes", "The gold standard had no effect"], answer: 2, why: "Researchers have debated the causes for decades." },
    ],
  },
  {
    slug: "reconstruction-after-the-civil-war",
    alias: "reconstruct",
    status: "live",
    title: "Reconstruction after the Civil War",
    subject: "History",
    context:
      "Reconstruction lasted from 1865 to 1877. The United States tried to rebuild the South and protect the rights of formerly enslaved people. The 13th Amendment ended slavery. The 14th Amendment gave citizenship and equal protection. The 15th Amendment, adopted in 1870, barred denying the vote because of race. Congress created the Freedmen's Bureau. Reconstruction ended in 1877. Historians have judged it in different ways.",
    flashcards: [
      { q: "When was Reconstruction?", a: "From 1865 to 1877, after the Civil War." },
      { q: "What did the 14th Amendment do?", a: "It gave citizenship to people born in the United States and promised equal protection of the laws." },
      { q: "What were the Black Codes?", a: "Southern laws that limited the rights and work choices of freed Black people." },
    ],
    quiz: [
      { q: "Which amendment ended slavery?", options: ["The 13th", "The 14th", "The 15th", "The 19th"], answer: 0, why: "The 13th Amendment abolished slavery." },
      { q: "Which amendment barred denying the vote because of race?", options: ["The 13th", "The 14th", "The 15th", "The 26th"], answer: 2, why: "The 15th Amendment was adopted in 1870." },
      { q: "What was the Freedmen's Bureau?", options: ["A bank", "A federal aid agency", "A Southern army", "A newspaper"], answer: 1, why: "Congress created it in 1865 to oversee the move from slavery to freedom." },
    ],
  },
]
