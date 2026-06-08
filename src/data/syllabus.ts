export interface Unit {
  id: string;
  name: string;
  grade?: string;
}

export interface Theme {
  id: string;
  name: string;
  units: Unit[];
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
  color: string;
  gradient: string;
  themes: Theme[];
}

export const SYLLABUS: Subject[] = [
  {
    id: "biology",
    name: "Grade 9-12 Biology",
    shortName: "Biology",
    description: "Study of life, cell biology, microorganisms, human anatomy, genetics, and ecology.",
    iconName: "dna",
    color: "emerald",
    gradient: "from-emerald-500 to-teal-600",
    themes: [
      {
        id: "bio-intro",
        name: "Introductory Biology",
        units: [
          { id: "bio-tech-g9", name: "Biology and Technology", grade: "G9" },
          { id: "bio-subfields-g10", name: "Subfields of Biology", grade: "G10" },
          { id: "bio-tech-g11", name: "Biology and Technology", grade: "G11" },
          { id: "bio-app-g12", name: "Application of Biology", grade: "G12" }
        ]
      },
      {
        id: "bio-foundational",
        name: "Foundational Biology",
        units: [
          { id: "bio-cell-g9", name: "Cell Biology", grade: "G9" },
          { id: "bio-repro-g10-11", name: "Cell Reproduction", grade: "G10 and G11" },
          { id: "bio-respiration-g9-12", name: "Cell Respiration", grade: "G9 and G12" },
          { id: "bio-molecules-g10", name: "Biochemical Molecules", grade: "G10" },
          { id: "bio-enzymes-g11", name: "Enzymes", grade: "G11" }
        ]
      },
      {
        id: "bio-microorganisms",
        name: "Microorganisms",
        units: [
          { id: "bio-micro-diseases-g9", name: "Micro-organisms and Diseases", grade: "G9" },
          { id: "bio-micro-g12", name: "Micro-organisms", grade: "G12" }
        ]
      },
      {
        id: "bio-human",
        name: "Human Biology",
        units: [
          { id: "bio-human-health-g10-9", name: "Human Biology and Health", grade: "G10 and G9" },
          { id: "bio-musculoskeletal-g11", name: "Human Musculoskeletal System", grade: "G11" },
          { id: "bio-body-system-g12", name: "Human Body System", grade: "G12" }
        ]
      },
      {
        id: "bio-evolution",
        name: "Evolution and Genetics",
        units: [
          { id: "bio-genetics-g11", name: "Genetics", grade: "G11" },
          { id: "bio-evolution-g12", name: "Evolution", grade: "G12" },
          { id: "bio-classification-g9", name: "Classification", grade: "G9" }
        ]
      },
      {
        id: "bio-plants-animals",
        name: "Animals and Plants",
        units: [
          { id: "bio-plants-g10-12", name: "Plants", grade: "G10 and G12" },
          { id: "bio-animals-g11", name: "Animals", grade: "G11" }
        ]
      },
      {
        id: "bio-ecology",
        name: "Ecology",
        units: [
          { id: "bio-env-g9", name: "Environment", grade: "G9" },
          { id: "bio-eco-g10", name: "Ecological Interaction", grade: "G10" },
          { id: "bio-resources-g11", name: "Population and Natural Resources", grade: "G11" },
          { id: "bio-climate-g12", name: "Climate Change", grade: "G12" }
        ]
      }
    ]
  },
  {
    id: "mathematics",
    name: "Grade 9-12 Mathematics",
    shortName: "Mathematics",
    description: "The number system, relations & functions, coordinate geometry, linear algebra, and intro to calculus.",
    iconName: "binary",
    color: "indigo",
    gradient: "from-indigo-500 to-blue-600",
    themes: [
      {
        id: "math-foundational",
        name: "Foundational Mathematics",
        units: [
          { id: "math-numbers-g9", name: "The number system", grade: "G9" },
          { id: "math-equations-g9", name: "Solutions of equations", grade: "G9" },
          { id: "math-sets-g9", name: "Further on sets", grade: "G9" }
        ]
      },
      {
        id: "math-relations",
        name: "Relations and Functions",
        units: [
          { id: "math-rel-func-g9-10", name: "Relation and function", grade: "G9 and G10" },
          { id: "math-relations-g11", name: "Relations and functions", grade: "G11" },
          { id: "math-polynomials-g10", name: "Polynomial functions", grade: "G10" },
          { id: "math-rational-g11", name: "Rational Expressions and functions", grade: "G11" },
          { id: "math-exponential-g10", name: "Exponential and Log functions", grade: "G10" },
          { id: "math-trig-g10", name: "Trigonometric functions", grade: "G10" }
        ]
      },
      {
        id: "math-geometry",
        name: "Geometry and Measurement",
        units: [
          { id: "math-geom-meas-g9", name: "Geometry and measurement", grade: "G9" },
          { id: "math-circles-g10", name: "Circles", grade: "G10" },
          { id: "math-solids-g10", name: "Solid figures", grade: "G10" },
          { id: "math-coord-geom-g10", name: "Coordinate geometry", grade: "G10" }
        ]
      },
      {
        id: "math-algebra",
        name: "Linear Algebra",
        units: [
          { id: "math-vectors-2d-g9", name: "Vectors in two dimensions", grade: "G9" },
          { id: "math-vectors-g11", name: "Vectors", grade: "G11" },
          { id: "math-matrix-g11", name: "Matrix", grade: "G11" },
          { id: "math-determinants-g11", name: "Determinants and their properties", grade: "G11" },
          { id: "math-transformation-g11", name: "Transformation of the plane", grade: "G11" }
        ]
      },
      {
        id: "math-statistics",
        name: "Statistics and Probability",
        units: [
          { id: "math-stats-prob-g9", name: "Statistics and probability", grade: "G9" },
          { id: "math-stats-g11-12", name: "Statistics", grade: "G11 and G12" },
          { id: "math-prob-g11", name: "Probability", grade: "G11" }
        ]
      },
      {
        id: "math-calculus",
        name: "Calculus I",
        units: [
          { id: "math-sequence-g12", name: "Sequence and series", grade: "G12" },
          { id: "math-intro-calc-g12", name: "Intro to Calculus", grade: "G12" },
          { id: "math-linear-prog-g12", name: "Intro to linear programming", grade: "G12" },
          { id: "math-business-appl-g12", name: "Mathematical applications in business", grade: "G12" }
        ]
      }
    ]
  },
  {
    id: "physics",
    name: "Grade 9-12 Physics",
    shortName: "Physics",
    description: "Motion, forces, fluid mechanics, electromagnetism, wave motion, heat, and modern/nuclear physics.",
    iconName: "waves",
    color: "amber",
    gradient: "from-amber-505 to-orange-600",
    themes: [
      {
        id: "phys-intro",
        name: "Introductory Physics",
        units: [
          { id: "phys-society-g11", name: "Physics and Human Society", grade: "G11" },
          { id: "phys-app-g12", name: "Application of Physics", grade: "G12" }
        ]
      },
      {
        id: "phys-vectors",
        name: "Vectors",
        units: [
          { id: "phys-vectors-g10-9", name: "Vectors", grade: "G10 and G9" },
          { id: "phys-vectors-adv-g11", name: "Vectors Advanced", grade: "G11" }
        ]
      },
      {
        id: "phys-kinematics",
        name: "Kinematics",
        units: [
          { id: "phys-motion-line-g9", name: "Motion in Straight Line", grade: "G9" },
          { id: "phys-accelerated-g10", name: "Uniformly Accelerated Motion", grade: "G10" },
          { id: "phys-motion-1d-2d-g11", name: "Motion in 1D and 2D", grade: "G11" },
          { id: "phys-motion-2d-g12", name: "2D Motion", grade: "G12" }
        ]
      },
      {
        id: "phys-dynamics",
        name: "Dynamics",
        units: [
          { id: "phys-dyn-g9", name: "Dynamics", grade: "G9" },
          { id: "phys-elasticity-g10", name: "Elasticity and Plasticity of Rigid Bodies", grade: "G10" },
          { id: "phys-dyn-adv-g11", name: "Dynamics Advanced", grade: "G11" },
          { id: "phys-simple-machines-g9", name: "Simple Machines", grade: "G9" },
          { id: "phys-fluids-g9-12", name: "Fluid Statics and Mechanics", grade: "G9 and G12" }
        ]
      },
      {
        id: "phys-waves",
        name: "Waves and Oscillations",
        units: [
          { id: "phys-wave-sound-g9", name: "Wave Motion and Sound", grade: "G9" },
          { id: "phys-electromagnetic-g10", name: "Electromagnetic Waves and Geometrical Optics", grade: "G10" }
        ]
      },
      {
        id: "phys-electricity",
        name: "Electricity and Magnetism",
        units: [
          { id: "phys-static-current-g10", name: "Static and Current Electricity", grade: "G10" },
          { id: "phys-electrostatics-g11", name: "Electrostatics and Electric Circuits", grade: "G11" },
          { id: "phys-electronics-g12", name: "Basics of Electronics", grade: "G12" },
          { id: "phys-magnetism-g10", name: "Magnetism", grade: "G10" },
          { id: "phys-electromagnetism-g12", name: "Electromagnetism", grade: "G12" }
        ]
      },
      {
        id: "phys-thermo",
        name: "Thermodynamics and Nuclear Physics",
        units: [
          { id: "phys-temp-heat-g9", name: "Temperature and Heat", grade: "G9" },
          { id: "phys-conduction-calorimetry-g11", name: "Heat Conduction and Calorimetry", grade: "G11" },
          { id: "phys-nuclear-g11", name: "Nuclear Physics", grade: "G11" }
        ]
      }
    ]
  },
  {
    id: "chemistry",
    name: "Grade 9-12 Chemistry",
    shortName: "Chemistry",
    description: "Atomic structure, chemical bonding, kinetics, electrochemistry, inorganic / organic chemistry, and industrial compounds.",
    iconName: "flask",
    color: "sky",
    gradient: "from-sky-500 to-indigo-600",
    themes: [
      {
        id: "chem-foundational",
        name: "Foundational Chemistry",
        units: [
          { id: "chem-atom-struct-g9", name: "Structures of atoms", grade: "G9" },
          { id: "chem-periodic-g9", name: "Periodic classification", grade: "G9" },
          { id: "chem-periodic-adv-g11", name: "Atomic structure and periodic properties", grade: "G11" },
          { id: "chem-bonding-g9-11", name: "Chemical bonding", grade: "G9 and G11" },
          { id: "chem-matter-g9-11", name: "Physical states of matter", grade: "G9 and G11" }
        ]
      },
      {
        id: "chem-reactions",
        name: "Chemical Reactions and solutions",
        units: [
          { id: "chem-stoichiometry-g9-10", name: "Chemical Reactions and Stoichiometry", grade: "G9 and G10" },
          { id: "chem-solutions-g10", name: "Solutions", grade: "G10" },
          { id: "chem-kinetics-g9-11", name: "Chemical kinetics", grade: "G9 and G11" },
          { id: "chem-equilibrium-g9-11", name: "Chemical equilibrium", grade: "G9 and G11" }
        ]
      },
      {
        id: "chem-electrochem",
        name: "Energy Changes and Electrochemistry",
        units: [
          { id: "chem-energy-electrochem-g10-12", name: "Energy changes and Electrochemistry", grade: "G10 and G12" }
        ]
      },
      {
        id: "chem-inorganic",
        name: "Inorganic Compounds",
        units: [
          { id: "chem-inorganic-comp-g10", name: "Importance of some inorganic compounds", grade: "G10" },
          { id: "chem-acid-base-g12", name: "Acid-base equilibria", grade: "G12" },
          { id: "chem-metals-g10", name: "Metals and non-metals", grade: "G10" }
        ]
      },
      {
        id: "chem-organic",
        name: "Organic Compounds",
        units: [
          { id: "chem-hydrocarbons-g10", name: "Hydrocarbons and their natural resources", grade: "G10" },
          { id: "chem-oxygen-comp-g11", name: "Some important oxygen-containing compounds", grade: "G11" },
          { id: "chem-polymers-g12", name: "Polymers", grade: "G12" }
        ]
      },
      {
        id: "chem-environmental",
        name: "Environmental and Industrial Chemistry",
        units: [
          { id: "chem-industrial-g12", name: "Industrial Chemistry", grade: "G12" },
          { id: "chem-env-g12", name: "Environmental Chemistry", grade: "G12" }
        ]
      }
    ]
  },
  {
    id: "sat",
    name: "Scholastic Aptitude Test (SAT)",
    shortName: "SAT Prep",
    description: "Verbal reasoning, quantitative analysis, grammar mechanics, data comparison, word problems, and coordinate geometry.",
    iconName: "graduation-cap",
    color: "purple",
    gradient: "from-purple-500 to-pink-600",
    themes: [
      {
        id: "sat-grammar",
        name: "Grammar",
        units: [
          { id: "sat-sv-agreement", name: "Subject-verb agreement", grade: "Verbal Reasoning" },
          { id: "sat-tenses", name: "Verb tenses", grade: "Verbal Reasoning" },
          { id: "sat-pronoun", name: "Pronoun-antecedent agreement", grade: "Verbal Reasoning" },
          { id: "sat-idioms", name: "Prepositions and idiomatic usages", grade: "Verbal Reasoning" },
          { id: "sat-modifiers", name: "Parallel structuring and modifiers", grade: "Verbal Reasoning" },
          { id: "sat-determiners", name: "Articles and determiners", grade: "Verbal Reasoning" },
          { id: "sat-sentence-struct", name: "Sentence structure", grade: "Verbal Reasoning" }
        ]
      },
      {
        id: "sat-vocabulary",
        name: "Vocabulary",
        units: [
          { id: "sat-synonyms", name: "Synonyms", grade: "Verbal Reasoning" },
          { id: "sat-antonyms", name: "Antonyms", grade: "Verbal Reasoning" },
          { id: "sat-context-vocab", name: "Contextual vocabularies", grade: "Verbal Reasoning" },
          { id: "sat-word-sub", name: "Word substitution", grade: "Verbal Reasoning" },
          { id: "sat-sentence-comp", name: "Sentence completion", grade: "Verbal Reasoning" },
          { id: "sat-phrasal-verbs", name: "Phrasal verbs", grade: "Verbal Reasoning" }
        ]
      },
      {
        id: "sat-reading",
        name: "Reading Comprehension",
        units: [
          { id: "sat-purpose", name: "Main idea and purpose analysis", grade: "Verbal Reasoning" },
          { id: "sat-paraphrase", name: "Detail retrieval and paraphrasing", grade: "Verbal Reasoning" },
          { id: "sat-inference", name: "Inference and implied meaning", grade: "Verbal Reasoning" },
          { id: "sat-in-context-v", name: "In-context vocabularies", grade: "Verbal Reasoning" },
          { id: "sat-structure", name: "Passage structure and organization", grade: "Verbal Reasoning" },
          { id: "sat-tone", name: "Author's intent and tone", grade: "Verbal Reasoning" }
        ]
      },
      {
        id: "sat-logic",
        name: "Logical and Analytical Reasoning",
        units: [
          { id: "sat-logic-deductive", name: "Deductive and inductive logics", grade: "Verbal Reasoning" },
          { id: "sat-puzzles", name: "Puzzles and relationship mapping", grade: "Verbal Reasoning" },
          { id: "sat-analogies", name: "Analogies", grade: "Verbal Reasoning" },
          { id: "sat-classifications", name: "Classifications", grade: "Verbal Reasoning" }
        ]
      },
      {
        id: "sat-arithmetic",
        name: "Arithmetic Operations",
        units: [
          { id: "sat-decimals", name: "Fractions and decimals", grade: "Quantitative Reasoning" },
          { id: "sat-ratios", name: "Ratio and proportions", grade: "Quantitative Reasoning" },
          { id: "sat-num-theory", name: "Number theory", grade: "Quantitative Reasoning" },
          { id: "sat-exponents", name: "Exponents and Roots", grade: "Quantitative Reasoning" },
          { id: "sat-factors", name: "GCF and LCF", grade: "Quantitative Reasoning" }
        ]
      },
      {
        id: "sat-algebra",
        name: "Algebra and Functions",
        units: [
          { id: "sat-linear-eq", name: "Linear equations and inequities", grade: "Quantitative Reasoning" },
          { id: "sat-quadratic", name: "Quadratic equations and polynomials", grade: "Quantitative Reasoning" },
          { id: "sat-exp-log", name: "Exponential and logarithmic functions", grade: "Quantitative Reasoning" },
          { id: "sat-functions", name: "Functions and graphs", grade: "Quantitative Reasoning" }
        ]
      },
      {
        id: "sat-stats",
        name: "Statistics and Data analysis",
        units: [
          { id: "sat-statistics", name: "Statistics", grade: "Quantitative Reasoning" },
          { id: "sat-data-interpretation", name: "Data interpretation and analysis", grade: "Quantitative Reasoning" },
          { id: "sat-comparison", name: "Quantitative comparison", grade: "Quantitative Reasoning" },
          { id: "sat-probability", name: "Probability", grade: "Quantitative Reasoning" },
          { id: "sat-permutations", name: "Permutations and combinations", grade: "Quantitative Reasoning" }
        ]
      },
      {
        id: "sat-word-probs",
        name: "Word Problems & Real-World Applications",
        units: [
          { id: "sat-age", name: "Age problems", grade: "Quantitative Reasoning" },
          { id: "sat-calendar", name: "Calendar problems", grade: "Quantitative Reasoning" },
          { id: "sat-interest", name: "Interest and profits", grade: "Quantitative Reasoning" },
          { id: "sat-speed", name: "Time, speed and distance", grade: "Quantitative Reasoning" },
          { id: "sat-work-rate", name: "Work-rate problem", grade: "Quantitative Reasoning" },
          { id: "sat-alligations", name: "Alligations and mixtures", grade: "Quantitative Reasoning" }
        ]
      },
      {
        id: "sat-geom",
        name: "Geometry",
        units: [
          { id: "sat-geom-plane", name: "Plane Geometry", grade: "Quantitative Reasoning" },
          { id: "sat-geom-coord", name: "Coordinate Geometry", grade: "Quantitative Reasoning" },
          { id: "sat-geom-solid", name: "Solid Geometry", grade: "Quantitative Reasoning" },
          { id: "sat-trig", name: "Trigonometry", grade: "Quantitative Reasoning" }
        ]
      },
      {
        id: "sat-adv-math",
        name: "Advanced Mathematics",
        units: [
          { id: "sat-series", name: "Sequence and series", grade: "Quantitative Reasoning" },
          { id: "sat-linear-prog", name: "Linear programming", grade: "Quantitative Reasoning" }
        ]
      }
    ]
  },
  {
    id: "english",
    name: "English",
    shortName: "English",
    description: "Parts of speech, sentence coherence, spelling, punctuation, active/passive voice, and dialogue skills.",
    iconName: "book-open",
    color: "rose",
    gradient: "from-rose-500 to-pink-600",
    themes: [
      {
        id: "eng-language",
        name: "Language Focus",
        units: [
          { id: "eng-speech-parts", name: "Parts of speech" },
          { id: "eng-sentence-struct", name: "Sentence structure" },
          { id: "eng-tenses", name: "Tenses" },
          { id: "eng-sv-agreement", name: "Subject-verb agreement" },
          { id: "eng-questions", name: "Question formation" },
          { id: "eng-modals", name: "Modal verbs" },
          { id: "eng-conditionals", name: "Conditionals" },
          { id: "eng-voices", name: "Active and passive voices" },
          { id: "eng-speech-direct", name: "Direct and indirect speeches" },
          { id: "eng-comparisons", name: "Comparisons" },
          { id: "eng-gerunds", name: "Gerunds and Infinitives" },
          { id: "eng-articles", name: "Articles and Determiners" },
          { id: "eng-clauses-rel", name: "Relative clauses" },
          { id: "eng-clauses-adj", name: "Adjectives and adverbial clauses" }
        ]
      },
      {
        id: "eng-comprehension",
        name: "Comprehension",
        units: [
          { id: "eng-vocab-comp", name: "Vocabulary comprehensions" },
          { id: "eng-sentence-comp", name: "Sentence comprehension" },
          { id: "eng-reading-comp", name: "Reading comprehensions" }
        ]
      },
      {
        id: "eng-communicative",
        name: "Communicative Activities",
        units: [
          { id: "eng-comm-directions", name: "Asking for and Giving Directions/Locations" },
          { id: "eng-comm-opinions", name: "Asking for and Stating Opinions, Beliefs, and Ideas" },
          { id: "eng-comm-clarification", name: "Seeking Clarification and Explanations" },
          { id: "eng-comm-reasons", name: "Inquiring about Reasons and Causes" },
          { id: "eng-comm-agreements", name: "Expressing Agreement and Disagreement" },
          { id: "eng-comm-suggestions", name: "Making Suggestions and Giving Advice" },
          { id: "eng-comm-certainty", name: "Expressing Certainty and Doubt" },
          { id: "eng-comm-assistance", name: "Offering and Requesting Assistance" },
          { id: "eng-comm-sympathy", name: "Expressing Sympathy, Apology, and Gratitude" }
        ]
      },
      {
        id: "eng-writing",
        name: "Writing",
        units: [
          { id: "eng-spelling", name: "Word spelling" },
          { id: "eng-punctuations", name: "Punctuations and Capitalizations" },
          { id: "eng-jumbled", name: "Jumbled words" },
          { id: "eng-coherence", name: "Paragraph coherence" },
          { id: "eng-letter", name: "Letter Writing" }
        ]
      }
    ]
  }
];
