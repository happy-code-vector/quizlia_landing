import type { StudyPage } from "./pages"

export const videoBPages: StudyPage[] = [
  {
    slug: "how-the-immune-system-works",
    video: { id: "lXfEK8G8CUI", title: "How The Immune System ACTUALLY Works - IMMUNE", channel: "Kurzgesagt" },
    status: "live",
    title: "How the immune system works",
    subject: "Biology",
    context:
      "The immune system defends your body against germs. It has two parts. The innate part includes barriers such as skin. It also includes phagocytes, which engulf and digest pathogens. The adaptive part is more specific to each pathogen and has memory. B cells give rise to antibodies. Antibodies are proteins that bind foreign substances and help remove them. Memory cells give long-term protection.",
    flashcards: [
      { q: "Name two parts of the innate immune system.", a: "Barriers such as skin, and phagocytes that engulf and digest pathogens." },
      { q: "What do B cells give rise to?", a: "Antibodies. These proteins bind foreign substances and help remove them." },
      { q: "What two traits set adaptive immunity apart?", a: "It is more specific to each pathogen, and it has memory." },
    ],
    quiz: [
      { q: "Which cells engulf and digest pathogens?", options: ["B cells", "Red blood cells", "Phagocytes", "Plasma proteins"], answer: 2, why: "Macrophages and neutrophils are phagocytes. They engulf and digest pathogens." },
      { q: "Which cells give rise to antibodies?", options: ["B cells", "Neutrophils", "Skin cells", "Platelets"], answer: 0, why: "B cells give rise to plasma cells, and plasma cells secrete antibodies." },
      { q: "Which feature marks adaptive immunity?", options: ["Skin as a barrier", "Fever", "Inflammation at a wound", "Memory of past pathogens"], answer: 3, why: "Adaptive immunity is specific and has memory. Skin, fever and inflammation belong to innate defense." },
    ],
  },
  {
    slug: "what-are-viruses-and-how-do-they-replicate",
    video: { id: "1-NxodiGPCU", title: "This Virus Shouldn't Exist (But it Does)", channel: "Kurzgesagt" },
    status: "live",
    title: "What are viruses and how do they replicate",
    subject: "Biology",
    context:
      "A virus is a tiny infectious particle. It has a piece of nucleic acid, either DNA or RNA, inside a protein coat. A virus cannot replicate alone. It must infect a cell and use components of the host cell to make copies of itself. The steps are attachment, entry, copying of viral parts, assembly of new virions, and release. Often the host cell dies.",
    flashcards: [
      { q: "What is inside a virus?", a: "A piece of nucleic acid, either DNA or RNA, surrounded by a protein coat." },
      { q: "Why can a virus not replicate alone?", a: "It must infect a cell and use components of the host cell to make copies of itself." },
      { q: "What are the main steps of viral replication?", a: "Attachment, entry, copying of viral parts, assembly of new virions, and release." },
    ],
    quiz: [
      { q: "What genetic material can a virus have?", options: ["Only DNA", "Either DNA or RNA", "Only RNA", "Neither DNA nor RNA"], answer: 1, why: "A virus has nucleic acid, and that nucleic acid is either DNA or RNA." },
      { q: "What does a virus use to make copies of itself?", options: ["Its own ribosomes", "Its own mitochondria", "Components of a host cell", "Sunlight"], answer: 2, why: "A virus lacks most cell parts, such as ribosomes. It uses the host cell's parts." },
      { q: "Which is the first step of viral replication?", options: ["Attachment to a host cell", "Release of new virions", "Assembly of new virions", "Copying of viral parts"], answer: 0, why: "The virus first attaches to a receptor on the host cell. The other steps follow." },
    ],
  },
  {
    slug: "protein-synthesis-transcription-and-translation",
    video: { id: "oefAI2x2CQM", title: "Protein Synthesis: Transcription and Translation (Updated)", channel: "Amoeba Sisters" },
    status: "live",
    title: "Protein synthesis: transcription and translation",
    subject: "Biology",
    context:
      "Cells build proteins in two steps. In transcription, the cell makes an RNA copy of a gene's DNA sequence. This copy is messenger RNA, or mRNA. In humans, most transcription happens in the nucleus. In translation, ribosomes read the mRNA in groups of three nucleotides called codons. Transfer RNA, or tRNA, links each codon to its amino acid. Amino acids join in a chain to form a protein.",
    flashcards: [
      { q: "What is transcription?", a: "The process of making an RNA copy of a gene's DNA sequence." },
      { q: "What is a codon?", a: "A sequence of three nucleotides in DNA or RNA. Most codons specify an amino acid." },
      { q: "What do ribosomes and tRNA do in translation?", a: "Ribosomes build the protein. tRNA links each mRNA codon to its amino acid." },
    ],
    quiz: [
      { q: "What does transcription make?", options: ["A finished protein", "An RNA copy of a gene's DNA sequence", "A new DNA strand", "A new ribosome"], answer: 1, why: "Transcription copies a gene's DNA sequence into mRNA." },
      { q: "How many nucleotides are in one codon?", options: ["2", "4", "3", "20"], answer: 2, why: "A codon is a sequence of three nucleotides." },
      { q: "Which molecule links an mRNA codon to its amino acid?", options: ["Transfer RNA (tRNA)", "A new DNA strand", "The cell wall", "ATP"], answer: 0, why: "tRNA works as an adaptor between the mRNA and the growing chain of amino acids." },
    ],
  },
  {
    slug: "path-of-blood-through-the-heart",
    video: { id: "_vZ0lefPg_0", title: "Circulatory System and Pathway of Blood Through the Heart", channel: "Amoeba Sisters" },
    status: "live",
    title: "Circulatory system and the path of blood through the heart",
    subject: "Biology",
    context:
      "The human heart has four chambers. The left and right sides each have one atrium and one ventricle. Oxygen-poor blood from the body enters the right atrium through the venae cavae. It moves to the right ventricle, then to the lungs. Pulmonary veins return oxygen-rich blood to the left atrium. It moves to the left ventricle, which pumps it to the whole body. Valves keep blood moving in one direction.",
    flashcards: [
      { q: "Which chamber receives oxygen-poor blood from the body?", a: "The right atrium, through the superior and inferior venae cavae." },
      { q: "What do the pulmonary veins carry?", a: "Oxygen-rich blood from the lungs to the left atrium." },
      { q: "What do heart valves do?", a: "They keep blood moving in one direction." },
    ],
    quiz: [
      { q: "Which chamber receives blood returning from the body?", options: ["Left ventricle", "Right atrium", "Left atrium", "Right ventricle"], answer: 1, why: "Blood from the venae cavae flows into the right atrium." },
      { q: "Which valve separates the right atrium and the right ventricle?", options: ["Mitral valve", "Aortic valve", "Pulmonary valve", "Tricuspid valve"], answer: 3, why: "The tricuspid valve sits between the right atrium and right ventricle." },
      { q: "Where does the left ventricle pump blood?", options: ["To the lungs", "To the right atrium", "To the whole body", "To the venae cavae"], answer: 2, why: "The left ventricle makes the high pressure that sends blood to the whole body." },
    ],
  },
  {
    slug: "prokaryotic-vs-eukaryotic-cells",
    video: { id: "Pxujitlv8wc", title: "Prokaryotic vs. Eukaryotic Cells (Updated)", channel: "Amoeba Sisters" },
    status: "live",
    title: "Prokaryotic vs eukaryotic cells",
    subject: "Biology",
    context:
      "Cells fall into two main types. Prokaryotic cells lack a nucleus and other membrane-bound organelles. Their DNA sits in a region called the nucleoid. Eukaryotic cells have a membrane-bound nucleus that houses the DNA. They also have many membrane-bound organelles. Prokaryotic cells are usually smaller than eukaryotic cells. Both types have ribosomes, which make proteins.",
    flashcards: [
      { q: "What do prokaryotic cells lack?", a: "A nucleus and other membrane-bound organelles." },
      { q: "Where is the DNA in a prokaryotic cell?", a: "In a region called the nucleoid." },
      { q: "Name one structure that both cell types have.", a: "Ribosomes, which make proteins." },
    ],
    quiz: [
      { q: "Which cell type has a membrane-bound nucleus?", options: ["Prokaryotic", "Eukaryotic", "Both types", "Neither type"], answer: 1, why: "Eukaryotic cells are defined by a nucleus surrounded by a membrane." },
      { q: "Where does a prokaryotic cell keep its DNA?", options: ["In a membrane-bound nucleus", "In mitochondria", "In the nucleoid region", "In the cell wall"], answer: 2, why: "Prokaryotic DNA is concentrated in the nucleoid region, with no nucleus around it." },
      { q: "Which structure do both cell types have?", options: ["Nucleus", "Mitochondria", "Endoplasmic reticulum", "Ribosomes"], answer: 3, why: "Both prokaryotic and eukaryotic cells use ribosomes to make proteins." },
    ],
  },
]
