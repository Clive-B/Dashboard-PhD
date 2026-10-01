"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createDemoState } from "@/lib/demo-data";
import { masteryFromScore, nextRevisionDate } from "@/lib/algorithms";
import type { Course, RevisionAttempt, ScholarState, Source, Task } from "@/lib/types";

const STORAGE_KEY = "aic-scholar-first-edition";

interface ScholarContextValue {
  state: ScholarState;
  hydrated: boolean;
  addCourse(course: Pick<Course, "title" | "code" | "description">): void;
  deleteCourse(id: string): void;
  addCourseModule(courseId: string, title: string, description?: string): void;
  addCourseLecture(courseId: string, moduleId: string, title: string, lecturer?: string, scheduledAt?: string): void;
  addCourseTopic(courseId: string, moduleId: string, lectureId: string, title: string): void;
  addCourseConcept(courseId: string, moduleId: string, lectureId: string, topicId: string, name: string, importance: number): void;
  addSource(source: Omit<Source, "id" | "uploadedAt" | "status">): void;
  deleteSource(id: string): void;
  addTask(task: Omit<Task, "id" | "actualMinutes" | "progress">): void;
  updateTask(id: string, patch: Partial<Task>): void;
  deleteTask(id: string): void;
  recordAttempt(questionId: string, answer: string, score: number): void;
  updateSettings(settings: ScholarState["settings"]): void;
  resetDemo(): void;
  clearDemoData(): void;
}

const ScholarContext = createContext<ScholarContextValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function ScholarProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ScholarState>(createDemoState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ScholarState>;
        const demo = createDemoState();
        setState({ ...demo, ...parsed, courses: parsed.courses || demo.courses } as ScholarState);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const addCourse = useCallback((course: Pick<Course, "title" | "code" | "description">) => {
    setState((current) => ({ ...current, courses: [...current.courses, { ...course, id: makeId("course"), modules: [] }] }));
  }, []);

  const deleteCourse = useCallback((id: string) => {
    setState((current) => {
      const course = current.courses.find((item) => item.id === id);
      const conceptIds = new Set(course?.modules.flatMap((module) => module.lectures.flatMap((lecture) => lecture.topics.flatMap((topic) => topic.conceptIds))) || []);
      return {
        ...current,
        courses: current.courses.filter((item) => item.id !== id),
        concepts: current.concepts.filter((concept) => !conceptIds.has(concept.id)),
        questions: current.questions.filter((question) => !conceptIds.has(question.conceptId)),
        attempts: current.attempts.filter((attempt) => !conceptIds.has(attempt.conceptId))
      };
    });
  }, []);

  const addCourseModule = useCallback((courseId: string, title: string, description?: string) => {
    setState((current) => ({ ...current, courses: current.courses.map((course) => course.id === courseId ? { ...course, modules: [...course.modules, { id: makeId("module"), title, description, lectures: [] }] } : course) }));
  }, []);

  const addCourseLecture = useCallback((courseId: string, moduleId: string, title: string, lecturer?: string, scheduledAt?: string) => {
    setState((current) => ({ ...current, courses: current.courses.map((course) => course.id === courseId ? { ...course, modules: course.modules.map((module) => module.id === moduleId ? { ...module, lectures: [...module.lectures, { id: makeId("lecture"), title, lecturer, scheduledAt, topics: [] }] } : module) } : course) }));
  }, []);

  const addCourseTopic = useCallback((courseId: string, moduleId: string, lectureId: string, title: string) => {
    setState((current) => ({ ...current, courses: current.courses.map((course) => course.id === courseId ? { ...course, modules: course.modules.map((module) => module.id === moduleId ? { ...module, lectures: module.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, topics: [...lecture.topics, { id: makeId("topic"), title, conceptIds: [] }] } : lecture) } : module) } : course) }));
  }, []);

  const addCourseConcept = useCallback((courseId: string, moduleId: string, lectureId: string, topicId: string, name: string, importance: number) => {
    setState((current) => {
      const course = current.courses.find((item) => item.id === courseId);
      const module = course?.modules.find((item) => item.id === moduleId);
      if (!course || !module) return current;
      const conceptId = makeId("concept");
      const nextReview = new Date(); nextReview.setDate(nextReview.getDate() + 1);
      return {
        ...current,
        concepts: [...current.concepts, { id: conceptId, name, course: course.title, module: module.title, mastery: "new", score: 0, attempts: 0, nextReview: nextReview.toISOString(), trend: "flat", importance, sourceIds: [] }],
        courses: current.courses.map((item) => item.id === courseId ? { ...item, modules: item.modules.map((courseModule) => courseModule.id === moduleId ? { ...courseModule, lectures: courseModule.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, topics: lecture.topics.map((topic) => topic.id === topicId ? { ...topic, conceptIds: [...topic.conceptIds, conceptId] } : topic) } : lecture) } : courseModule) } : item)
      };
    });
  }, []);

  const addSource = useCallback((source: Omit<Source, "id" | "uploadedAt" | "status">) => {
    setState((current) => ({
      ...current,
      sources: [{ ...source, id: makeId("source"), uploadedAt: new Date().toISOString(), status: "ready" }, ...current.sources]
    }));
  }, []);

  const deleteSource = useCallback((id: string) => {
    setState((current) => ({ ...current, sources: current.sources.filter((source) => source.id !== id) }));
  }, []);

  const addTask = useCallback((task: Omit<Task, "id" | "actualMinutes" | "progress">) => {
    setState((current) => ({
      ...current,
      tasks: [{ ...task, id: makeId(task.domain), actualMinutes: 0, progress: 0 }, ...current.tasks]
    }));
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, ...patch } : task) }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  }, []);

  const recordAttempt = useCallback((questionId: string, answer: string, score: number) => {
    setState((current) => {
      const question = current.questions.find((item) => item.id === questionId);
      if (!question) return current;
      const concept = current.concepts.find((item) => item.id === question.conceptId);
      if (!concept) return current;
      const nextReview = nextRevisionDate(score, concept.attempts);
      const attempt: RevisionAttempt = {
        id: makeId("attempt"), questionId, conceptId: concept.id, answer, score,
        completedAt: new Date().toISOString(), nextReview
      };
      const weightedScore = Number(((concept.score * concept.attempts + score) / (concept.attempts + 1)).toFixed(1));
      return {
        ...current,
        attempts: [attempt, ...current.attempts],
        concepts: current.concepts.map((item) => item.id === concept.id ? {
          ...item,
          attempts: item.attempts + 1,
          score: weightedScore,
          mastery: masteryFromScore(weightedScore, item.attempts + 1),
          lastReviewed: attempt.completedAt,
          nextReview,
          trend: score >= item.score ? "up" : "down"
        } : item)
      };
    });
  }, []);

  const updateSettings = useCallback((settings: ScholarState["settings"]) => setState((current) => ({ ...current, settings })), []);
  const resetDemo = useCallback(() => setState(createDemoState()), []);
  const clearDemoData = useCallback(() => setState((current) => ({
    ...current,
    sources: current.sources.filter((item) => !item.demo),
    tasks: current.tasks.filter((item) => !item.demo),
    concepts: current.concepts.filter((item) => !item.id.startsWith("concept-")),
    questions: current.questions.filter((item) => !item.id.startsWith("question-")),
    courses: current.courses.filter((item) => !item.demo),
    attempts: []
  })), []);

  const value = useMemo(() => ({ state, hydrated, addCourse, deleteCourse, addCourseModule, addCourseLecture, addCourseTopic, addCourseConcept, addSource, deleteSource, addTask, updateTask, deleteTask, recordAttempt, updateSettings, resetDemo, clearDemoData }), [state, hydrated, addCourse, deleteCourse, addCourseModule, addCourseLecture, addCourseTopic, addCourseConcept, addSource, deleteSource, addTask, updateTask, deleteTask, recordAttempt, updateSettings, resetDemo, clearDemoData]);
  return <ScholarContext.Provider value={value}>{children}</ScholarContext.Provider>;
}

export function useScholar() {
  const context = useContext(ScholarContext);
  if (!context) throw new Error("useScholar must be used within ScholarProvider");
  return context;
}
