import type { StudyPage } from "./pages"

export const sciencePages: StudyPage[] = [
  {
    slug: "photosynthesis-vs-cellular-respiration",
    alias: "photosynth",
    status: "live",
    title: "Photosynthesis vs cellular respiration",
    subject: "Biology",
    context:
      "Photosynthesis and cellular respiration work as a pair. Photosynthesis happens in the chloroplasts of plant and algae cells. It uses light energy, carbon dioxide and water to make glucose and oxygen. Aerobic cellular respiration breaks down glucose with oxygen. It makes carbon dioxide, water and ATP. In eukaryotic cells, the later stages happen in mitochondria. So photosynthesis makes glucose and oxygen, and respiration returns carbon dioxide and water.",
    flashcards: [
      { q: "What goes in and what comes out of photosynthesis?", a: "In: light energy, carbon dioxide and water. Out: glucose and oxygen." },
      { q: "Where does each process happen in a eukaryotic cell?", a: "Photosynthesis happens in chloroplasts. The later stages of cellular respiration happen in mitochondria." },
      { q: "What does cellular respiration make?", a: "Carbon dioxide, water and ATP. It uses glucose and oxygen." },
    ],
    quiz: [
      { q: "Which molecule is a product of photosynthesis?", options: ["Carbon dioxide", "Glucose", "Ammonia", "Nitrogen"], answer: 1, why: "Photosynthesis makes glucose and releases oxygen." },
      { q: "Which gas does cellular respiration use?", options: ["Nitrogen", "Carbon dioxide", "Helium", "Oxygen"], answer: 3, why: "Cellular respiration combines oxygen with glucose to release energy as ATP." },
      { q: "Where do the later stages of cellular respiration happen in eukaryotic cells?", options: ["Mitochondria", "Chloroplasts", "Ribosomes", "The nucleus"], answer: 0, why: "The later stages happen in mitochondria." },
    ],
  },
  {
    slug: "cell-organelles",
    alias: "organelles",
    status: "live",
    title: "Cell organelles",
    subject: "Biology",
    context:
      "Organelles are small structures inside a cell. Each one has a job. The nucleus holds most of the cell's DNA. Ribosomes make proteins. Mitochondria make ATP, a molecule that carries energy. Lysosomes digest materials and old cell parts. The rough endoplasmic reticulum has ribosomes and helps make proteins. The Golgi apparatus modifies proteins and lipids. Chloroplasts carry out photosynthesis in plants and some algae.",
    flashcards: [
      { q: "What does the nucleus do?", a: "It holds most of the cell's DNA." },
      { q: "What do mitochondria make?", a: "ATP, a molecule that carries energy for the cell." },
      { q: "Which organelle carries out photosynthesis?", a: "The chloroplast, in plant cells." },
    ],
    quiz: [
      { q: "Which organelle makes proteins?", options: ["Lysosome", "Ribosome", "Nucleus", "Mitochondrion"], answer: 1, why: "Ribosomes are the sites of protein synthesis." },
      { q: "Which organelle digests old cell parts?", options: ["Ribosome", "Chloroplast", "Nucleus", "Lysosome"], answer: 3, why: "Lysosomes digest large molecules and old cell parts." },
      { q: "Where does a eukaryotic cell keep most of its DNA?", options: ["Nucleus", "Lysosome", "Golgi apparatus", "Ribosome"], answer: 0, why: "The nucleus holds most of the cell's genetic material, which is DNA." },
    ],
  },
  {
    slug: "dna-replication",
    alias: "replicate",
    status: "live",
    title: "DNA replication",
    subject: "Biology",
    context:
      "DNA replication copies DNA before a cell divides. Each new DNA molecule has one old strand and one new strand. This is called semiconservative replication. The enzyme helicase unwinds the DNA. DNA polymerase adds new nucleotides only in the 5' to 3' direction. Primase first makes a short RNA primer. Bases pair in a set way: A with T, and C with G. Then DNA ligase seals gaps between fragments.",
    flashcards: [
      { q: "What does semiconservative mean in DNA replication?", a: "Each new DNA molecule has one old strand and one new strand." },
      { q: "What does helicase do?", a: "It unwinds the DNA helix and opens it." },
      { q: "Which base pairs with adenine, and which pairs with cytosine?", a: "Thymine pairs with adenine. Guanine pairs with cytosine." },
    ],
    quiz: [
      { q: "Which enzyme adds new nucleotides to a growing DNA strand?", options: ["DNA ligase", "Helicase", "DNA polymerase", "Lipase"], answer: 2, why: "DNA polymerase adds nucleotides, and only in the 5' to 3' direction." },
      { q: "What does DNA ligase do?", options: ["Seals gaps between DNA fragments", "Unwinds the helix", "Makes the RNA primer", "Turns DNA into protein"], answer: 0, why: "DNA ligase seals the gaps between fragments." },
      { q: "After replication, what does each new DNA molecule contain?", options: ["Two new strands", "Two old strands", "Only RNA", "One old strand and one new strand"], answer: 3, why: "Replication is semiconservative. Each molecule keeps one old strand." },
    ],
  },
  {
    slug: "natural-selection",
    alias: "darwin",
    status: "live",
    title: "Natural selection",
    subject: "Biology",
    context:
      "Natural selection needs three things. Individuals in a group must vary in their traits. Some of those traits must pass from parents to offspring. The environment cannot support every individual that is born, so some survive and reproduce more than others. Over many generations, traits that help survival and reproduction become more common in the population. Then the population has changed.",
    flashcards: [
      { q: "What three conditions does natural selection need?", a: "Variation in traits, heritable traits, and differences in survival and reproduction." },
      { q: "Which traits can natural selection act on?", a: "Traits that parents pass to offspring. Those traits have a genetic basis." },
      { q: "What changes over generations because of natural selection?", a: "The population. Helpful traits become more common in it." },
    ],
    quiz: [
      { q: "Which is one condition for natural selection?", options: ["All individuals are identical", "Traits can be inherited", "Every offspring survives", "The environment never changes"], answer: 1, why: "A trait must have a genetic basis so that it passes to the next generation." },
      { q: "What happens to a helpful, heritable trait over many generations?", options: ["It becomes more common in the population", "It always disappears", "It appears in every individual at once", "Nothing"], answer: 0, why: "Individuals with the trait survive and reproduce more, so the trait spreads." },
      { q: "Under natural selection, why do some individuals leave more offspring than others?", options: ["They are always larger", "They choose to change their traits", "They are always older", "Their traits help them survive and reproduce in their environment"], answer: 3, why: "Helpful inherited traits lead to more offspring." },
    ],
  },
  {
    slug: "ionic-vs-covalent-bonds",
    alias: "bonds",
    status: "live",
    title: "Ionic vs covalent bonds",
    subject: "Chemistry",
    context:
      "Atoms form two common bond types. In an ionic bond, one atom transfers electrons to another. This makes positive and negative ions that attract. Ionic bonds often form between metals and nonmetals, as in sodium chloride. In a covalent bond, atoms share one or more pairs of electrons. Covalent bonds usually form between nonmetal atoms. Identical atoms, like the two in H2, share equally. Different atoms usually share unequally.",
    flashcards: [
      { q: "What happens to electrons in an ionic bond?", a: "One atom transfers electrons to another atom. The atoms become ions." },
      { q: "What happens to electrons in a covalent bond?", a: "Atoms share one or more pairs of electrons. Sharing is usually unequal when the atoms differ." },
      { q: "Why can an ionic compound conduct electricity when melted or dissolved, but not as a solid?", a: "Its ions can move freely when melted or dissolved. In a solid, the ions stay in fixed places." },
    ],
    quiz: [
      { q: "Which pair most likely forms an ionic bond?", options: ["Two hydrogen atoms", "Sodium and chlorine", "Two oxygen atoms", "Nitrogen and hydrogen"], answer: 1, why: "Sodium is a metal and chlorine is a nonmetal. Sodium transfers an electron to chlorine." },
      { q: "What do atoms do in a covalent bond?", options: ["Share one or more pairs of electrons", "Transfer all their electrons", "Lose their nuclei", "Turn into metals"], answer: 0, why: "A covalent bond is a shared pair of electrons. Double and triple bonds share more." },
      { q: "Which statement is generally true?", options: ["Ionic compounds conduct electricity as solids", "Covalent bonds form between metals only", "Ionic bonds involve sharing electrons", "Ionic compounds usually have higher melting points than molecular compounds"], answer: 3, why: "Ionic bonds are strong, so ionic compounds generally melt at higher temperatures than molecular compounds." },
    ],
  },
  {
    slug: "periodic-table-trends",
    alias: "periodic",
    status: "live",
    title: "Periodic table trends",
    subject: "Chemistry",
    context:
      "Periodic trends are general patterns in the periodic table. Across a period, from left to right, atomic radius gets smaller. First ionization energy and electronegativity usually get larger. Down a group, atomic radius gets larger and electronegativity gets smaller. Exceptions exist. For example, boron has a lower first ionization energy than beryllium. Fluorine is the most electronegative element.",
    flashcards: [
      { q: "How does atomic radius change across a period?", a: "It gets smaller from left to right." },
      { q: "How does atomic radius change down a group?", a: "It gets larger." },
      { q: "Which element is the most electronegative?", a: "Fluorine." },
    ],
    quiz: [
      { q: "Which element has the smaller atomic radius, sodium or chlorine?", options: ["Sodium", "Chlorine", "They are equal", "It cannot be determined"], answer: 1, why: "Both are in the same period. Radius gets smaller from left to right, and chlorine is farther right." },
      { q: "How does electronegativity change down a group?", options: ["It increases", "It stays the same", "It decreases", "It doubles"], answer: 2, why: "Electronegativity decreases from top to bottom in a group." },
      { q: "Which statement about first ionization energy is true?", options: ["It generally increases across a period, with some exceptions", "It always decreases across a period", "It never has exceptions", "It is the same for all elements"], answer: 0, why: "The trend is general. For example, boron is lower than beryllium." },
    ],
  },
  {
    slug: "acids-bases-and-ph",
    alias: "phscale",
    status: "live",
    title: "Acids, bases and pH",
    subject: "Chemistry",
    context:
      "The pH scale shows how acidic or basic a solution is. A pH below 7 is acidic. A pH above 7 is basic. Pure water at 25 degrees Celsius has a pH of 7, which is neutral. In the Brønsted-Lowry model, an acid donates H+ ions and a base accepts them. Each whole pH step is a tenfold change in H+ concentration. Lower pH means more H+.",
    flashcards: [
      { q: "What pH is neutral at 25 degrees Celsius?", a: "pH 7." },
      { q: "What does a Brønsted-Lowry acid do?", a: "It donates a proton, which is an H+ ion." },
      { q: "How much does the H+ concentration change for each whole pH step?", a: "Tenfold. A solution at pH 3 has ten times more H+ than one at pH 4." },
    ],
    quiz: [
      { q: "A solution has a pH of 3. What is it?", options: ["Basic", "Neutral", "Acidic", "Pure water"], answer: 2, why: "A pH below 7 is acidic." },
      { q: "Which solution is more acidic?", options: ["pH 5", "pH 2", "They are equal", "pH 7"], answer: 1, why: "A lower pH means a more acidic solution." },
      { q: "In the Brønsted-Lowry model, what does a base do with H+ ions?", options: ["Accepts them", "Donates them", "Turns them into oxygen", "Ignores them"], answer: 0, why: "A Brønsted-Lowry base accepts a proton (H+)." },
    ],
  },
  {
    slug: "newtons-three-laws",
    alias: "newton",
    status: "live",
    title: "Newton's three laws",
    subject: "Physics",
    context:
      "The first law says an object keeps its motion unless a net force acts on it. Without a net force, a moving object keeps a steady speed in a straight line. The second law says net force equals mass times acceleration (F = ma). The third law says two objects push on each other with equal and opposite forces. The forces act on different objects, so they do not cancel.",
    flashcards: [
      { q: "What does Newton's first law say?", a: "An object keeps its state of motion unless a net force acts on it." },
      { q: "What is Newton's second law as an equation?", a: "F = ma, for an object of constant mass. Net force equals mass times acceleration." },
      { q: "What does Newton's third law say?", a: "Two interacting objects exert equal and opposite forces on each other. The forces act on different objects." },
    ],
    quiz: [
      { q: "A ball moves in space with no net force on it. Which law says it keeps moving at a steady speed in a straight line?", options: ["Third law", "Second law", "First law", "Law of gravity"], answer: 2, why: "The first law says motion stays the same unless a net force acts." },
      { q: "Which equation matches Newton's second law?", options: ["F = m + a", "F = ma", "F = m / a", "F = a / m"], answer: 1, why: "Net force equals mass times acceleration." },
      { q: "A skater pushes on a wall. What does the wall do?", options: ["Pushes back on the skater with equal force", "Pushes back with less force", "Does nothing", "Pushes back with more force"], answer: 0, why: "The third law says the forces are equal and opposite." },
    ],
  },
  {
    slug: "plate-tectonics",
    alias: "tectonics",
    video: { id: "krXXSCb_P9Y", title: "What is Plate Tectonics: Crash Course Geology #10", channel: "CrashCourse" },
    status: "live",
    title: "Plate tectonics",
    subject: "Earth science",
    context:
      "Earth's outer layer, the lithosphere, is broken into large pieces called plates. The plates move over a weaker layer called the asthenosphere. Plates meet at three kinds of boundaries. At divergent boundaries, plates move apart. At convergent boundaries, plates move together. At transform boundaries, plates slide past each other. Many earthquakes and volcanoes occur near plate boundaries.",
    flashcards: [
      { q: "What are the three types of plate boundaries?", a: "Divergent, convergent and transform." },
      { q: "What happens at a divergent boundary?", a: "Plates move apart. New crust forms." },
      { q: "What happens at a transform boundary?", a: "Plates slide past each other. The San Andreas Fault is an example." },
    ],
    quiz: [
      { q: "What do plates do at a convergent boundary?", options: ["Move apart", "Slide past each other", "Do not move", "Move together"], answer: 3, why: "Convergent means plates move toward each other." },
      { q: "What is the lithosphere?", options: ["Earth's rigid outer layer, broken into plates", "A layer of liquid iron", "The air around Earth", "A rock found only in oceans"], answer: 0, why: "The lithosphere is the rigid outer layer. It is broken into plates." },
      { q: "On which type of boundary does the San Andreas Fault lie?", options: ["Divergent", "Convergent", "Transform", "None of them"], answer: 2, why: "The San Andreas Fault is a transform boundary. Plates slide past each other there." },
    ],
  },
]
