import type { StudyPage } from "./pages"

export const videoDPages: StudyPage[] = [
  {
    slug: "relative-and-absolute-dating-of-rocks",
    video: { id: "mIIJd66Ycr8", title: "How old is the Earth?: Crash Course Geology #17", channel: "CrashCourse" },
    status: "live",
    title: "Relative and absolute dating of rocks",
    subject: "Earth science",
    context:
      "Geologists date rocks in two ways. Relative dating puts events in order from oldest to youngest. It does not give an age in years. In undisturbed layers, the oldest layer lies at the bottom. Absolute dating gives an age in years. Many methods use radioactive decay. A half-life is the time for half of the atoms in a sample to decay.",
    flashcards: [
      { q: "What does relative dating tell you?", a: "The order of events or rock layers, from oldest to youngest. It gives no age in years." },
      { q: "What is the law of superposition?", a: "In undisturbed rock layers, the oldest layer is at the bottom and the youngest is at the top." },
      { q: "What is a half-life?", a: "The time it takes for half of the atoms in a sample to decay." },
    ],
    quiz: [
      { q: "In undisturbed rock layers, where is the oldest layer?", options: ["At the top", "In the middle", "At the bottom", "It changes each year"], answer: 2, why: "The law of superposition says each layer is younger than the one below it." },
      { q: "Which kind of dating gives an age in years?", options: ["Absolute dating", "Relative dating", "Both give only an order", "Neither can give a number"], answer: 0, why: "Many absolute dating methods use radioactive decay to find an age in years. Relative dating gives only an order." },
      { q: "After one half-life, how much of the original parent atoms is left?", options: ["All of it", "One quarter", "None of it", "Half"], answer: 3, why: "A half-life is the time for half of the atoms to decay, so half remain." },
    ],
  },
  {
    slug: "how-fossils-form",
    video: { id: "iWUp2kMCv6o", title: "How Do Fossils Form?: Crash Course Geology #18", channel: "CrashCourse" },
    status: "live",
    title: "How fossils form",
    subject: "Earth science",
    context:
      "Fossils usually form when an organism is buried quickly in sediment. Quick burial protects the remains from decay. Soft parts usually decay, so hard parts such as bones, teeth and shells fossilize most often. In one common process, mineral-rich water fills empty spaces in the hard parts. Trace fossils, such as footprints and burrows, record the activity of an organism.",
    flashcards: [
      { q: "Why does quick burial help fossils form?", a: "Quick burial in sediment protects the remains from decay." },
      { q: "What is the difference between a mold and a cast?", a: "A mold is the hollow left when a shell or bone dissolves. A cast forms when minerals or sediment fill the hollow." },
      { q: "What is a trace fossil?", a: "Evidence of an organism's activity, such as a track or a burrow, instead of its body." },
    ],
    quiz: [
      { q: "Which body part is most likely to become a fossil?", options: ["Skin", "A tooth", "Muscle", "A fresh leaf"], answer: 1, why: "Hard parts such as teeth, bones and shells survive far better than soft tissue." },
      { q: "What is a cast?", options: ["A footprint in mud", "A hollow where a shell dissolved", "A fossil made when minerals or sediment fill a mold", "A piece of living bone"], answer: 2, why: "A cast forms inside a mold when it fills with minerals or sediment." },
      { q: "Which of these is a trace fossil?", options: ["A preserved shell", "A fossil tooth", "A fossil bone", "A fossil footprint"], answer: 3, why: "A footprint records what an animal did. It is not part of the body." },
    ],
  },
  {
    slug: "types-of-plate-boundaries",
    video: { id: "krXXSCb_P9Y", title: "What is Plate Tectonics: Crash Course Geology #10", channel: "CrashCourse" },
    status: "live",
    title: "The three types of plate boundaries",
    subject: "Earth science",
    context:
      "Earth's outer shell is broken into tectonic plates. They meet at three kinds of boundaries. At a divergent boundary, plates move apart, and new crust forms as magma rises. At a convergent boundary, plates come together. One plate may sink under the other, or the edges may buckle into mountains. At a transform boundary, plates slide past each other.",
    flashcards: [
      { q: "What happens at a divergent boundary?", a: "Two plates move apart. New crust forms as material from the mantle rises. The Mid-Atlantic Ridge is an example." },
      { q: "What happens at a convergent boundary?", a: "Two plates come together. One plate can sink under the other, or the plates can push up mountains." },
      { q: "What happens at a transform boundary?", a: "Two plates slide past each other. The San Andreas Fault in California is an example." },
    ],
    quiz: [
      { q: "Plates sliding past each other form which kind of boundary?", options: ["Transform", "Divergent", "Convergent", "Volcanic"], answer: 0, why: "Plates that slide past each other form a transform boundary." },
      { q: "The Mid-Atlantic Ridge is an example of which boundary?", options: ["Convergent", "Divergent", "Transform", "None of these"], answer: 1, why: "At the Mid-Atlantic Ridge, plates move apart and new oceanic crust forms." },
      { q: "What do plates do at a convergent boundary?", options: ["Move apart", "Slide past each other", "Come together", "Stop moving"], answer: 2, why: "Convergent means the plates move toward each other and collide." },
    ],
  },
  {
    slug: "how-magnets-and-magnetic-fields-work",
    video: { id: "jG7ULeWUfDw", title: "Do we actually know how magnets work? - Rachel Yang", channel: "TED-Ed" },
    status: "live",
    title: "How magnets and magnetic fields work",
    subject: "Physics",
    context:
      "Iron can become a magnet. Inside iron are small regions called domains. Each domain acts like a tiny magnet. In unmagnetized iron, the domains point in random directions. In a magnet, many domains line up. Every magnet has a north pole and a south pole. Outside a magnet, field lines run from the north pole to the south pole. Like poles repel, and unlike poles attract.",
    flashcards: [
      { q: "What is a magnetic domain?", a: "A small region in a magnetic material that acts like a tiny bar magnet." },
      { q: "How are domains arranged in a magnet and in unmagnetized iron?", a: "In unmagnetized iron, domains point in random directions. In a magnet, many domains line up." },
      { q: "What happens if you cut a magnet in half?", a: "Each piece has both a north pole and a south pole. No one has ever found a single pole on its own." },
    ],
    quiz: [
      { q: "What do like magnetic poles do?", options: ["Attract", "Repel", "Cancel out", "Join together"], answer: 1, why: "Like poles repel. Unlike poles attract." },
      { q: "Outside a magnet, field lines are drawn from where to where?", options: ["South pole to north pole", "Both poles to the middle", "The middle to both poles", "North pole to south pole"], answer: 3, why: "Outside a magnet, field lines run from a north pole to a south pole." },
      { q: "What are the domains in an unmagnetized piece of iron like?", options: ["Lined up in one direction", "Random in direction", "All gone", "Frozen in place"], answer: 1, why: "Domains point in random directions, so their effects largely cancel." },
    ],
  },
  {
    slug: "alexander-the-great-and-his-empire",
    video: { id: "bVjKL1zd-vQ", title: "Was Alexander the Great really that great? - Stephanie Honchell Smith", channel: "TED-Ed" },
    status: "live",
    title: "Alexander the Great and his empire",
    subject: "History",
    context:
      "Alexander the Great was king of Macedon. In 334 BCE he crossed into Asia and attacked the Persian Empire. He defeated the Persian king Darius III and took Babylon. He died in Babylon in 323 BCE. His generals then fought over the empire, and it split into separate kingdoms. Historians judge him in different ways. Some stress his skill as a general. Others stress his violence, including massacres.",
    flashcards: [
      { q: "What empire did Alexander attack in 334 BCE?", a: "The Persian Empire. He crossed from Europe into Asia that year." },
      { q: "When and where did Alexander die?", a: "In Babylon, in 323 BCE, after he fell ill." },
      { q: "What happened to his empire after he died?", a: "His generals, the Diadochi, fought for power. The empire split into separate kingdoms." },
    ],
    quiz: [
      { q: "In 334 BCE, Alexander crossed into Asia to attack which empire?", options: ["The Roman Empire", "The Persian Empire", "The Han Empire", "The Carthaginian Empire"], answer: 1, why: "Alexander began his conquest of the Persian Empire in 334 BCE." },
      { q: "Where did Alexander die in 323 BCE?", options: ["Athens", "Rome", "Carthage", "Babylon"], answer: 3, why: "He died in Babylon in 323 BCE." },
      { q: "Who fought over Alexander's empire after his death?", options: ["His generals, the Diadochi", "The Roman Senate", "The Egyptian priests", "The Spartan kings"], answer: 0, why: "His generals, called the Diadochi, fought for power and the empire split into kingdoms." },
    ],
  },
]
