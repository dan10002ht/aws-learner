export type CourseId =
  | "TECH-101" | "PROGRAMMING" | "WEB" | "SQL" | "GIT"
  | "FOUNDATIONS" | "ENGINEER" | "BACKEND" | "CS" | "DSA" | "SECURITY" | "DEVOPS" | "SRE" | "AIML" | "FRONTEND" | "CAPSTONE" | "BLOCKCHAIN"
  | "CLF-C02" | "SAA-C03" | "DVA-C02" | "SOA-C02" | "SAP-C02"
  | "SYSTEM-DESIGN";

/** Learning-path stage used to group courses on the home page. */
export type CourseCategory = "starter" | "systems" | "software" | "certification" | "architecture";
export type CourseLevel = "Nhập môn" | "Nền tảng" | "Foundational" | "Associate" | "Professional";

// Backwards-compat alias for code that referenced Certification
export type Certification = CourseId;

export type QuestionType = "single" | "multi";

export interface Course {
  id: CourseId;
  code: string;          // "CLF-C02"
  title: string;         // "AWS Certified Cloud Practitioner"
  shortTitle: string;    // "Cloud Practitioner"
  level: CourseLevel;
  description: string;
  hint: string;          // who-it's-for, in 1 line
  durationHours: number; // estimated study hours
  passingScore: number;  // 0-100
  examMinutes: number;
  examQuestions: number;
  prerequisites?: CourseId[];
  accentColor: string;   // hex
  order: number;
  status: "available" | "coming-soon";
  /** "knowledge" = theory track with lessons only (no exam/practice). Default: certification. */
  kind?: "certification" | "knowledge";
  category: CourseCategory;
}

export interface Question {
  id: string;
  courseId: CourseId;
  lesson: string;           // lesson slug (within course)
  certifications: CourseId[]; // legacy: which courses this question can show up in
  difficulty: "easy" | "medium" | "hard";
  type: QuestionType;
  question: string;
  options: string[];
  correctIndices: number[];
  explanation: string;
  domain?: 1 | 2 | 3 | 4;  // CLF-C02 content domain (blueprint)
  mock?: number;           // fixed mock set number this question belongs to
}

export interface Lesson {
  slug: string;
  courseId: CourseId;
  title: string;
  shortTitle: string;
  chapter: string;
  description: string;
  file: string;        // relative to ../lessons (course-prefixed for non-CLF)
  order: number;
  available: boolean;  // whether markdown content exists
}

export interface Chapter {
  id: string;
  courseId: CourseId;
  title: string;
  lessonSlugs: string[];
  category: string;    // category color key (compute, storage, ...)
}

export type Mode = "practice" | "exam";

export interface AnswerRecord {
  questionId: string;
  selected: number[];
  correct: boolean;
  timeSpentMs?: number;
}

export interface AttemptSummary {
  id: string;
  courseId: CourseId;
  setKey: string;
  setLabel: string;
  mode: Mode;
  startedAt: number;
  finishedAt: number;
  totalQuestions: number;
  correctCount: number;
  score: number;
  durationMs: number;
  answers: AnswerRecord[];
}

export interface WrongQuestionEntry {
  questionId: string;
  wrongCount: number;
  lastWrongAt: number;
}

export interface ProgressState {
  xp: number;
  streakDays: number;
  lastActiveDate: string; // yyyy-mm-dd
  lessonsCompleted: string[]; // lesson slugs (course-qualified: "CLF-C02:01-cloud-concepts")
}
