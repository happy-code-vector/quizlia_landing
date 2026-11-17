import type { StudyPage } from "./pages"

export const videoFPages: StudyPage[] = [
  {
    slug: "what-defines-a-bird",
    video: { id: "6Y_UaK1-Q00", title: "Avian Diversity", channel: "Professor Dave Explains" },
    status: "live",
    title: "What defines a bird",
    subject: "Biology",
    context:
      "Scientists place birds in the class Aves. Feathers are the main trait that sets birds apart from all other living animals. Birds are warm-blooded. They have a beak with no teeth, and they lay eggs with hard shells. Many bird bones are light and have air spaces inside. Most birds use their wings to fly. Most birds also keep a steady body temperature.",
    flashcards: [
      { q: "Which trait sets birds apart from all other living animals?", a: "Feathers. No other living animal group has them." },
      { q: "How do birds reproduce?", a: "Birds lay eggs with hard shells." },
      { q: "In which class do scientists place birds?", a: "Class Aves." },
    ],
    quiz: [
      { q: "Among living animals, which body covering do only birds have?", options: ["Fur", "Gills", "Feathers", "Fins"], answer: 2, why: "Among living animals, feathers set birds apart from all other animals." },
      { q: "How do birds reproduce?", options: ["They give birth to live young", "They lay hard-shelled eggs", "They split in two", "They grow from seeds"], answer: 1, why: "Birds lay eggs with hard shells." },
      { q: "What is the scientific class of birds?", options: ["Aves", "Mammalia", "Insecta", "Amphibia"], answer: 0, why: "Birds belong to the class Aves. The other three names are classes of other animals." },
    ],
  },
  {
    slug: "apollo-program-and-the-moon-landings",
    video: { id: "d5jOYIbt6Rk", title: "Introduction to the Apollo Program", channel: "Professor Dave Explains" },
    status: "live",
    title: "The Apollo program and the Moon landings",
    subject: "History",
    context:
      "Apollo was a NASA program of the 1960s and 1970s. President John F. Kennedy set its goal in May 1961. The goal was to land people on the Moon. Apollo 11 reached that goal on July 20, 1969. In all, six Apollo missions landed crews on the Moon. They were Apollo 11, 12, 14, 15, 16 and 17. Apollo 17 flew the last one in December 1972.",
    flashcards: [
      { q: "What was the main goal of the Apollo program?", a: "To land people on the Moon. President Kennedy set this goal in May 1961." },
      { q: "When did Apollo 11 land on the Moon?", a: "On July 20, 1969." },
      { q: "How many Apollo missions landed crews on the Moon?", a: "Six: Apollo 11, 12, 14, 15, 16 and 17. Apollo 17 was the last, in December 1972." },
    ],
    quiz: [
      { q: "On what date did Apollo 11 land on the Moon?", options: ["May 25, 1961", "July 20, 1969", "December 1972", "January 1, 1970"], answer: 1, why: "Apollo 11 landed on July 20, 1969. May 1961 is when Kennedy set the goal." },
      { q: "How many Apollo missions landed crews on the Moon?", options: ["Two", "Four", "Six", "Twelve"], answer: 2, why: "Six missions landed: Apollo 11, 12, 14, 15, 16 and 17." },
      { q: "Which Apollo mission flew the last Moon landing?", options: ["Apollo 11", "Apollo 12", "Apollo 14", "Apollo 17"], answer: 3, why: "Apollo 17 flew the last landing, in December 1972." },
    ],
  },
  {
    slug: "power-rule-for-derivatives",
    video: { id: "gaEteTSpdeE", title: "How to Find the Instantaneous Rate of Change ... Power Rule - First Derivative", channel: "The Organic Chemistry Tutor" },
    status: "live",
    title: "The power rule for derivatives",
    subject: "Math",
    context:
      "The derivative of a function gives its instantaneous rate of change. It also gives the slope of the tangent line at a point. The power rule finds the derivative of a power. If f(x) = x^n, then f'(x) = n x^(n-1). Bring the exponent down as a factor. Then subtract 1 from the exponent. A constant factor stays in front. For example, the derivative of 3x^2 is 6x.",
    flashcards: [
      { q: "What is the power rule?", a: "If f(x) = x^n, then f'(x) = n x^(n-1). Bring the exponent down, then subtract 1 from it." },
      { q: "What does the derivative of a function tell you?", a: "It gives the slope of the tangent line. It is also the instantaneous rate of change." },
      { q: "How does a constant factor work in a derivative?", a: "It stays in front. The derivative of k f(x) is k times f'(x). For example, d/dx of 3x^2 is 3(2x) = 6x." },
    ],
    quiz: [
      { q: "What is the derivative of x^7?", options: ["x^6", "7x^6", "7x^7", "6x^7"], answer: 1, why: "Bring down the exponent 7, then subtract 1: 7x^6." },
      { q: "What is the derivative of 4x^3?", options: ["12x^2", "4x^2", "12x^3", "7x^2"], answer: 0, why: "The constant 4 stays. The derivative of x^3 is 3x^2. So 4 times 3x^2 is 12x^2." },
      { q: "What is the slope of the tangent line to y = x^2 at x = 3?", options: ["3", "9", "12", "6"], answer: 3, why: "The derivative is 2x. At x = 3, the slope is 2(3) = 6. The number 9 is the value of y, not the slope." },
    ],
  },
  {
    slug: "evaluating-limits-by-factoring",
    video: { id: "Zxic_ru_JWg", title: "Evaluating Limits by Factoring the GCF With Difference of Squares", channel: "The Organic Chemistry Tutor" },
    status: "live",
    title: "Evaluating limits by factoring",
    subject: "Math",
    context:
      "Sometimes direct substitution in a limit gives 0/0. That result does not give the answer yet. For polynomials, factor the top and the bottom. Then cancel the common factor. The difference of squares helps: a^2 - b^2 = (a - b)(a + b). After you cancel, substitute the number again. For example, the limit of (x^2 - 9)/(x - 3) as x goes to 3 is 6.",
    flashcards: [
      { q: "What should you try when direct substitution gives 0/0?", a: "Factor the top and the bottom. Cancel any common factor. Then substitute again." },
      { q: "What is the difference of squares formula?", a: "a^2 - b^2 = (a - b)(a + b). For example, x^2 - 16 = (x - 4)(x + 4)." },
      { q: "Why can you cancel a common factor in a limit?", a: "The original function and the simplified function agree for every x except at the limit point. So their limits are equal." },
    ],
    quiz: [
      { q: "What is the limit of (x^2 - 4)/(x - 2) as x goes to 2?", options: ["0", "2", "4", "It does not exist"], answer: 2, why: "Factor: (x - 2)(x + 2)/(x - 2) = x + 2. At x = 2, that is 4." },
      { q: "What is the limit of (x^2 - 25)/(x - 5) as x goes to 5?", options: ["10", "5", "25", "0"], answer: 0, why: "Factor: (x - 5)(x + 5)/(x - 5) = x + 5. At x = 5, that is 10." },
      { q: "What is the limit of (x^2 - 16)/(x^2 - 4x) as x goes to 4?", options: ["0", "4", "8", "2"], answer: 3, why: "Factor: (x - 4)(x + 4)/[x(x - 4)] = (x + 4)/x. At x = 4, that is 8/4 = 2." },
    ],
  },
  {
    slug: "related-rates-in-calculus",
    video: { id: "wLzl8qyOW-w", title: "Related Rates - Water Flows into a Cylindrical Tank", channel: "The Organic Chemistry Tutor" },
    status: "live",
    title: "Related rates in calculus",
    subject: "Math",
    context:
      "In a related rates problem, two quantities change with time. You know one rate and want another. First, name the variables. Write an equation that links them. For a cylinder, V = pi r^2 h. Differentiate both sides with respect to time, using the chain rule. Put in the known values after you differentiate. If the radius is constant, then dV/dt = pi r^2 dh/dt.",
    flashcards: [
      { q: "What are the steps to solve a related rates problem?", a: "Name the variables and state what is given and wanted. Write an equation that links them. Differentiate both sides with respect to time. Substitute the known values and solve." },
      { q: "When do you substitute the known numbers?", a: "After you differentiate with respect to time." },
      { q: "A cylinder has a constant radius r. How are dV/dt and dh/dt related?", a: "Since V = pi r^2 h and r is constant, dV/dt = pi r^2 dh/dt." },
    ],
    quiz: [
      { q: "A cylinder has radius 2 m. Its volume grows at 8 pi m^3 per minute. How fast does the height rise?", options: ["4 m/min", "1 m/min", "2 m/min", "16 m/min"], answer: 2, why: "dV/dt = pi r^2 dh/dt gives 8 pi = pi(4) dh/dt. So dh/dt = 2 m/min." },
      { q: "For V = pi r^2 h with constant r, what is dV/dt?", options: ["2 pi r h", "pi r^2 dh/dt", "pi h dr/dt", "pi r^2 h"], answer: 1, why: "The factor pi r^2 is constant. So the derivative of pi r^2 h with respect to t is pi r^2 dh/dt." },
      { q: "A tank has radius 3 ft. The water height rises at 0.5 ft/min. How fast does the volume grow?", options: ["4.5 pi ft^3/min", "9 pi ft^3/min", "0.5 pi ft^3/min", "27 pi ft^3/min"], answer: 0, why: "dV/dt = pi r^2 dh/dt = pi(9)(0.5) = 4.5 pi ft^3/min." },
    ],
  },
]
