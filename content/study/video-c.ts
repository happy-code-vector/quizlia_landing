import type { StudyPage } from "./pages"

export const videoCPages: StudyPage[] = [
  {
    slug: "entropy-and-the-second-law-of-thermodynamics",
    video: { id: "DxL2HoqLbyA", title: "The Most Misunderstood Concept in Physics", channel: "Veritasium" },
    status: "live",
    title: "Entropy and the second law of thermodynamics",
    subject: "Physics",
    context:
      "Entropy measures how many ways the particles in a system can be arranged. More possible arrangements mean higher entropy. People often call this disorder. The second law of thermodynamics says the entropy of an isolated system never decreases. In real processes it increases. Heat flows from hot objects to cold objects for this reason. One part of a system can lose entropy if the total entropy still rises.",
    flashcards: [
      { q: "What does the second law of thermodynamics say about entropy?", a: "The entropy of an isolated system never decreases. In real processes it increases." },
      { q: "Why does heat flow on its own from hot objects to cold objects?", a: "This flow raises the total entropy. Flow from cold to hot would lower it, so it does not happen on its own." },
      { q: "Can the entropy of one part of a system decrease?", a: "Yes. It can, if the total entropy of the whole system still increases." },
    ],
    quiz: [
      { q: "Which statement matches the second law of thermodynamics?", options: ["The entropy of an isolated system always decreases", "The entropy of an isolated system never decreases", "The entropy of an isolated system always stays the same", "An isolated system creates new energy"], answer: 1, why: "The second law says the entropy of an isolated system never decreases." },
      { q: "Ice melts into liquid water. What happens to the entropy of the water?", options: ["It decreases", "It stays exactly the same", "It becomes zero", "It increases"], answer: 3, why: "Liquid water has more possible arrangements than an ice crystal. Its entropy is higher." },
      { q: "Two objects at different temperatures touch. Which way does heat flow on its own?", options: ["From the hot object to the cold object", "From the cold object to the hot object", "Equally in both directions", "It does not flow"], answer: 0, why: "Heat flow from hot to cold raises the total entropy." },
    ],
  },
  {
    slug: "haber-bosch-process",
    video: { id: "EvknN89JoWo", title: "The Man Who Killed Millions and Saved Billions", channel: "Veritasium" },
    status: "live",
    title: "Haber-Bosch process",
    subject: "Chemistry",
    context:
      "The Haber-Bosch process makes ammonia from nitrogen gas and hydrogen gas. The reaction is N2 + 3H2 ⇌ 2NH3. It uses high pressure, high temperature and an iron-based catalyst. The reaction releases heat. A lower temperature gives more ammonia, but it also makes the reaction slower. Industry uses the ammonia to make nitrogen fertilizer. Farmers use this fertilizer to help crops grow.",
    flashcards: [
      { q: "What does the Haber-Bosch process make, and from what?", a: "It makes ammonia (NH3) from nitrogen gas (N2) and hydrogen gas (H2)." },
      { q: "What does the iron-based catalyst do?", a: "It speeds up the reaction. It does not change the amount of ammonia at equilibrium." },
      { q: "Why does the process use high pressure?", a: "Four moles of gas react to make two moles of gas. High pressure favors the side with fewer gas molecules, so it gives more ammonia." },
    ],
    quiz: [
      { q: "Which product is made from the ammonia of this process?", options: ["Table salt", "Window glass", "Nitrogen fertilizer", "Aluminum foil"], answer: 2, why: "Industry uses ammonia to make nitrogen fertilizer." },
      { q: "What is the job of the iron-based catalyst?", options: ["It makes the reaction faster", "It supplies the hydrogen gas", "It changes the equilibrium constant", "It removes the ammonia as a solid"], answer: 0, why: "A catalyst speeds up a reaction. It does not change the equilibrium." },
      { q: "Why does high pressure give more ammonia?", options: ["It melts the catalyst", "It cools the gases", "It turns hydrogen into nitrogen", "The reaction goes from four moles of gas to two moles of gas"], answer: 3, why: "High pressure favors the side with fewer moles of gas. That side is ammonia." },
    ],
  },
  {
    slug: "terminal-velocity-and-air-resistance",
    video: { id: "16Ci_2bN_zc", title: "How Dangerous is a Penny Dropped From a Skyscraper?", channel: "Veritasium" },
    status: "live",
    title: "Terminal velocity and air resistance",
    subject: "Physics",
    context:
      "A falling object speeds up because of gravity. Air pushes back on the object. This force is drag, or air resistance. Drag grows as the object moves faster. At one speed, drag equals the weight. The net force is zero, so the speed stops changing. This speed is the terminal velocity. With other factors equal, a larger area gives a lower terminal velocity. A greater weight gives a higher one.",
    flashcards: [
      { q: "What is terminal velocity?", a: "The constant speed a falling object reaches when drag equals its weight." },
      { q: "What is the net force on an object at terminal velocity?", a: "Zero. The object falls at a constant speed." },
      { q: "How does a larger area change terminal velocity?", a: "At the same speed, a larger area gives more drag. So the terminal velocity is lower." },
    ],
    quiz: [
      { q: "What is true when an object reaches terminal velocity?", options: ["Gravity stops acting on the object", "Drag is zero", "The object keeps speeding up", "Drag equals the weight of the object"], answer: 3, why: "At terminal velocity, drag balances weight. The net force is zero." },
      { q: "A skydiver spreads out her arms and legs. What happens to her terminal velocity?", options: ["It increases", "It decreases", "It becomes zero", "It does not depend on area"], answer: 1, why: "More area means more drag. The terminal velocity is lower." },
      { q: "Two objects have the same size and shape. One is heavier. Which has the higher terminal velocity?", options: ["Both are the same", "The lighter object", "The heavier object", "Neither reaches one"], answer: 2, why: "A heavier object needs more drag to balance its weight. It must fall faster." },
    ],
  },
  {
    slug: "age-of-the-earth-and-radiometric-dating",
    video: { id: "S7TUe5w6RHo", title: "4.5 Billion Years in 1 Hour", channel: "Kurzgesagt" },
    status: "live",
    title: "Age of the Earth and radiometric dating",
    subject: "Earth science",
    context:
      "Earth is about 4.5 billion years old. Scientists find this age with radiometric dating. Some atoms are radioactive. They decay into other atoms at a constant rate. The half-life is the time for half of the atoms in a sample to decay. Scientists measure the amounts of parent and daughter atoms, such as uranium and lead. They also date meteorites, because meteorites formed with the solar system.",
    flashcards: [
      { q: "What is a half-life?", a: "The time for half of the radioactive atoms in a sample to decay." },
      { q: "Why do scientists date meteorites to find the age of Earth?", a: "Meteorites formed when the solar system formed. Scientists assume Earth formed at about the same time." },
      { q: "What do the oldest rocks and crystals on Earth tell us?", a: "They give a minimum age. Earth is at least as old as they are." },
    ],
    quiz: [
      { q: "About how old is Earth?", options: ["About 4.5 million years", "About 450 million years", "About 4.5 billion years", "About 45 billion years"], answer: 2, why: "Scientists estimate that Earth is about 4.5 billion years old." },
      { q: "What is a half-life?", options: ["The time for a rock to cool", "The time for half of the atoms in a sample to decay", "Half of the age of Earth", "Half of the mass of an atom"], answer: 1, why: "A half-life is the time for half of the atoms in a sample to decay." },
      { q: "What do scientists measure in radiometric dating?", options: ["The ratio of parent atoms to daughter atoms", "The color of the rock", "The size of the crystals", "The temperature of the rock today"], answer: 0, why: "The ratio of parent atoms to daughter atoms shows how much decay has happened." },
    ],
  },
  {
    slug: "native-american-societies-and-the-columbian-exchange",
    video: { id: "fTv4S1q7p_c", title: "APUSH Unit 1 REVIEW [Period 1: 1491-1607]", channel: "Heimler's History" },
    status: "live",
    title: "Native American societies before 1492 and the Columbian Exchange",
    subject: "History",
    context:
      "Before 1492, Native peoples in the Americas lived in many kinds of societies. Some lived in small villages. Others built large cities, such as Cahokia near present-day St. Louis. Many farmed maize. Voyages that began in 1492 linked the Americas with Europe and Africa. The Columbian Exchange moved plants, animals and diseases between them. Diseases such as smallpox killed many Native people. Estimates of how many died vary widely.",
    flashcards: [
      { q: "What was the Columbian Exchange?", a: "The movement of plants, animals and diseases between the Americas and Europe and Africa after 1492." },
      { q: "Name two plants and two animals in the Columbian Exchange.", a: "Maize and potatoes went from the Americas to Europe. Horses and cattle came to the Americas." },
      { q: "What was Cahokia?", a: "A large Native city near present-day St. Louis. Estimates for its peak population range widely, from several thousand to about 40,000." },
    ],
    quiz: [
      { q: "Which Native city stood near present-day St. Louis?", options: ["Tenochtitlán", "Cahokia", "Teotihuacan", "Chaco Canyon"], answer: 1, why: "Cahokia was a large Mississippian city near present-day St. Louis." },
      { q: "Which of these went from the Americas to Europe in the Columbian Exchange?", options: ["Horses", "Smallpox", "Wheat", "Potatoes"], answer: 3, why: "Potatoes came from the Americas. Horses, smallpox and wheat came from the Old World." },
      { q: "Which statement about Native population loss after 1492 is true?", options: ["Estimates of the loss vary widely", "Everyone agrees on one exact number", "Native peoples had already faced smallpox before 1492", "Native populations grew in the years after 1492"], answer: 0, why: "Estimates of the loss vary widely, so the exact size is not known." },
    ],
  },
]
