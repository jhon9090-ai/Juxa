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

// Freshman module syllabus. Each module chapter/unit is represented as a unit;
// detailed subtopics are intentionally not included in this navigation outline.
export const SYLLABUS: Subject[] = [
  {
    id: "mathematics",
    name: "Mathematics for Natural Sciences",
    shortName: "Mathematics",
    description: "Freshman course syllabus.",
    iconName: "binary",
    color: "indigo",
    gradient: "from-indigo-500 to-blue-600",
    themes: [{
      id: "math-course-units",
      name: "Course Units",
      units: [
        { id: "math-chapter-1", name: "Chapter 1: Propositional Logic and Set Theory" },
        { id: "math-chapter-2", name: "Chapter 2: The Real and Complex Number Systems" },
        { id: "math-chapter-3", name: "Chapter 3: Functions" },
        { id: "math-chapter-4", name: "Chapter 4: Analytic Geometry" }
      ]
    }]
  },
  {
    id: "physics",
    name: "General Physics (PHYS 1011)",
    shortName: "Physics",
    description: "Freshman course syllabus.",
    iconName: "waves",
    color: "amber",
    gradient: "from-amber-500 to-orange-600",
    themes: [{
      id: "physics-course-units",
      name: "Course Units",
      units: [
        { id: "physics-chapter-1", name: "Chapter 1: Preliminaries" },
        { id: "physics-chapter-2", name: "Chapter 2: Kinematics in one Dimensions" },
        { id: "physics-chapter-3", name: "Chapter 3: Kinematics in Two Dimensions" },
        { id: "physics-chapter-4", name: "Chapter 4: Dynamics" },
        { id: "physics-chapter-5", name: "Chapter 5: Gravitation and Kepler’s Laws of Motion" },
        { id: "physics-chapter-6", name: "Chapter 6: Work and Energy" },
        { id: "physics-chapter-7", name: "Chapter 7: Linear Momentum" },
        { id: "physics-chapter-8", name: "Chapter 8: Fluid mechanics" },
        { id: "physics-chapter-9", name: "Chapter 9: Heat and Thermodynamics" },
        { id: "physics-chapter-10", name: "Chapter 10: Oscillations and Waves" },
        { id: "physics-chapter-11", name: "Chapter 11: Electromagnetism and Electronics" },
        { id: "physics-chapter-12", name: "Chapter 12: Geometrical Optics" },
        { id: "physics-chapter-13", name: "Chapter 13: Cross-Cutting Application of Physics" }
      ]
    }]
  },
  {
    id: "psychology",
    name: "General Psychology (PSYC 1011)",
    shortName: "Psychology",
    description: "Freshman course syllabus.",
    iconName: "brain",
    color: "purple",
    gradient: "from-purple-500 to-pink-600",
    themes: [{
      id: "psychology-course-units",
      name: "Course Units",
      units: [
        { id: "psychology-chapter-1", name: "Chapter One: Essence of Psychology" },
        { id: "psychology-chapter-2", name: "Chapter Two: Sensation and Perception" },
        { id: "psychology-chapter-3", name: "Chapter Three: Learning and Theories of Learning" },
        { id: "psychology-chapter-4", name: "Chapter Four: Memory and Forgetting" },
        { id: "psychology-chapter-5", name: "Chapter Five: Motivation and Emotions" },
        { id: "psychology-chapter-6", name: "Chapter Six: Personality" },
        { id: "psychology-chapter-7", name: "Chapter Seven: Psychological Disorders and Treatment Techniques" },
        { id: "psychology-chapter-8", name: "Chapter Eight: Introduction to Life Skills" },
        { id: "psychology-chapter-9", name: "Chapter Nine: Intra-personal and Interpersonal Skills" },
        { id: "psychology-chapter-10", name: "Chapter Ten: Academic Skills" },
        { id: "psychology-chapter-11", name: "Chapter Eleven: Social Skills" }
      ]
    }]
  },
  {
    id: "geography",
    name: "Geography of Ethiopia and the Horn",
    shortName: "Geography",
    description: "Freshman course syllabus.",
    iconName: "globe",
    color: "emerald",
    gradient: "from-emerald-500 to-teal-600",
    themes: [{
      id: "geography-course-units",
      name: "Course Units",
      units: [
        { id: "geography-chapter-1", name: "Chapter One: Introduction" },
        { id: "geography-chapter-2", name: "Chapter Two: The Geology of Ethiopia and the Horn" },
        { id: "geography-chapter-3", name: "Chapter Three: The Topography of Ethiopia and the Horn" },
        { id: "geography-chapter-4", name: "Chapter Four: Drainage Systems and Water Resources of Ethiopia and the Horn" },
        { id: "geography-chapter-5", name: "Chapter Five: The Climate of Ethiopia and the Horn" },
        { id: "geography-chapter-6", name: "Chapter Six: Soils, Natural Vegetation and Wildlife Resources of Ethiopia and the Horn" },
        { id: "geography-chapter-7", name: "Chapter Seven: Population of Ethiopia and the Horn" },
        { id: "geography-chapter-8", name: "Chapter Eight: Economic Activities in Ethiopia" }
      ]
    }]
  },
  {
    id: "history",
    name: "History of Ethiopia and the Horn (HIST 102)",
    shortName: "History",
    description: "Freshman course syllabus.",
    iconName: "graduation-cap",
    color: "orange",
    gradient: "from-orange-500 to-amber-600",
    themes: [{
      id: "history-course-units",
      name: "Course Units",
      units: [
        { id: "history-unit-1", name: "Unit One: Introduction" },
        { id: "history-unit-2", name: "Unit Two: Peoples and Cultures in Ethiopia and the Horn" },
        { id: "history-unit-3", name: "Unit Three: Politics, Economy and Society in Ethiopia and the Horn to the End of the Thirteenth Century" },
        { id: "history-unit-4", name: "Unit Four: Politics, Economy and Society from the Late Thirteenth to the Beginning of the Sixteenth Centuries" },
        { id: "history-unit-5", name: "Unit Five: Politics, Economy and Social Processes from the Early Sixteenth to the End of the Eighteenth Centuries" },
        { id: "history-unit-6", name: "Unit Six: Internal Developments and External Relations of Ethiopia and the Horn, 1800–1941" },
        { id: "history-unit-7", name: "Unit Seven: Internal Developments and External Relations, 1941–1995" }
      ]
    }]
  },
  {
    id: "logic",
    name: "Logic and Critical Thinking (PHIL 101)",
    shortName: "Logic",
    description: "Freshman course syllabus.",
    iconName: "book",
    color: "cyan",
    gradient: "from-cyan-500 to-blue-600",
    themes: [{
      id: "logic-course-units",
      name: "Course Units",
      units: [
        { id: "logic-chapter-1", name: "Chapter One: Introducing Philosophy" },
        { id: "logic-chapter-2", name: "Chapter Two: Basic Concepts of Logic" },
        { id: "logic-chapter-3", name: "Chapter Three: Logic and Language" },
        { id: "logic-chapter-4", name: "Chapter Four: Basic Concepts of Critical Thinking" },
        { id: "logic-chapter-5", name: "Chapter Five: Informal Fallacies" },
        { id: "logic-chapter-6", name: "Chapter Six: Categorical Propositions" }
      ]
    }]
  },
  {
    id: "english",
    name: "Communicative English I (FLEn 1011)",
    shortName: "English",
    description: "Freshman course syllabus.",
    iconName: "book",
    color: "sky",
    gradient: "from-sky-500 to-indigo-600",
    themes: [{
      id: "english-course-units",
      name: "Course Units",
      units: [
        { id: "english-unit-1", name: "Unit 1: Study Skills" },
        { id: "english-unit-2", name: "Unit 2: Health and Fitness" },
        { id: "english-unit-3", name: "Unit 3: Cultural Values" },
        { id: "english-unit-4", name: "Unit 4: Wild Animals" },
        { id: "english-unit-5", name: "Unit 5: Population" }
      ]
    }]
  },
  {
    id: "physical-fitness",
    name: "Physical Fitness (SpSc 1011)",
    shortName: "Physical Fitness",
    description: "Freshman course syllabus.",
    iconName: "activity",
    color: "rose",
    gradient: "from-rose-500 to-red-600",
    themes: [{
      id: "fitness-course-units",
      name: "Course Units",
      units: [
        { id: "fitness-unit-1", name: "Unit 1: Concepts of Physical Fitness" },
        { id: "fitness-unit-2", name: "Unit 2: The Health Benefits of Physical Activity" },
        { id: "fitness-unit-3", name: "Unit 3: Making Well-Informed Food Choices" },
        { id: "fitness-unit-4", name: "Unit 4: Health Related Components of Fitness and Principles of Exercise Prescription" },
        { id: "fitness-unit-5", name: "Unit 5: Assessment of Fitness Components" }
      ]
    }]
  }
];
