export type Domain = "academic" | "work" | "personal" | "system";
export type Priority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "not-started" | "in-progress" | "waiting" | "blocked" | "completed";
export type RiskState = "normal" | "watch" | "at-risk" | "critical" | "overdue";
export type MasteryState = "new" | "exposed" | "learning" | "developing" | "proficient" | "mastered" | "decaying";
export type SourceType = "pdf" | "docx" | "txt" | "markdown" | "transcript" | "note" | "journal" | "assignment";

export interface Source {
  id: string;
  title: string;
  sourceType: SourceType;
  course?: string;
  module?: string;
  topic?: string;
  author?: string;
  lecture?: string;
  tags: string[];
  content: string;
  uploadedAt: string;
  sourceDate?: string;
  status: "ready" | "processing" | "failed";
  demo?: boolean;
}

export interface Task {
  id: string;
  domain: "academic" | "work";
  title: string;
  type: string;
  parent?: string;
  course?: string;
  deadline: string;
  priority: Priority;
  estimatedMinutes: number;
  actualMinutes: number;
  status: TaskStatus;
  progress: number;
  notes?: string;
  demo?: boolean;
}

export interface Concept {
  id: string;
  name: string;
  course: string;
  module: string;
  mastery: MasteryState;
  score: number;
  attempts: number;
  lastReviewed?: string;
  nextReview: string;
  trend: "up" | "flat" | "down";
  importance: number;
  sourceIds: string[];
}

export interface CourseTopic {
  id: string;
  title: string;
  conceptIds: string[];
}

export interface CourseLecture {
  id: string;
  title: string;
  lecturer?: string;
  scheduledAt?: string;
  topics: CourseTopic[];
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  lectures: CourseLecture[];
}

export interface Course {
  id: string;
  code?: string;
  title: string;
  description?: string;
  modules: CourseModule[];
  demo?: boolean;
}

export interface RevisionQuestion {
  id: string;
  conceptId: string;
  prompt: string;
  answer: string;
  sourceId: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface RevisionAttempt {
  id: string;
  questionId: string;
  conceptId: string;
  answer: string;
  score: number;
  completedAt: string;
  nextReview: string;
}

export interface AvailabilitySettings {
  weekdayStudyMinutes: number;
  weekendStudyMinutes: number;
  workdayMinutes: number;
  planningUtilization: number;
  preferredRevisionPeriod: string;
}

export interface ScholarState {
  courses: Course[];
  sources: Source[];
  tasks: Task[];
  concepts: Concept[];
  questions: RevisionQuestion[];
  attempts: RevisionAttempt[];
  settings: AvailabilitySettings;
}

export interface Recommendation {
  taskId: string;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  score: number;
  reasons: string[];
  domain: "academic" | "work";
}

export interface RiskAssessment {
  state: RiskState;
  remainingMinutes: number;
  availableMinutes: number;
  deficitMinutes: number;
  reasons: string[];
}
