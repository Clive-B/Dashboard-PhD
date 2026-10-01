import type { ScholarState } from "./types";

const daysFromNow = (days: number, hour = 17) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export function createDemoState(): ScholarState {
  return {
    courses: [
      {
        id: "course-research-methods",
        code: "RM-001",
        title: "Research Methods",
        description: "Philosophical foundations, research design and methodological alignment.",
        demo: true,
        modules: [
          {
            id: "module-research-philosophy",
            title: "Research Philosophy",
            description: "The assumptions that shape research questions, evidence and interpretation.",
            lectures: [
              {
                id: "lecture-philosophical-foundations",
                title: "Lecture 1 — Philosophical Foundations",
                lecturer: "Demo Lecturer",
                scheduledAt: daysFromNow(-7),
                topics: [
                  { id: "topic-foundations", title: "Foundations", conceptIds: ["concept-ontology", "concept-epistemology", "concept-axiology"] }
                ]
              }
            ]
          }
        ]
      }
    ],
    sources: [
      {
        id: "source-research-philosophy",
        title: "Research Philosophy — Lecture 1",
        sourceType: "transcript",
        course: "Research Methods",
        module: "Research Philosophy",
        topic: "Foundations",
        author: "Demo Lecturer",
        lecture: "Lecture 1",
        tags: ["ontology", "epistemology", "axiology"],
        content: "Ontology asks what exists and what reality is. Epistemology examines how knowledge can be known and justified. Axiology concerns the role of values and ethics in research. These assumptions shape methodology and interpretation.",
        uploadedAt: daysFromNow(-5),
        sourceDate: daysFromNow(-7),
        status: "ready",
        demo: true
      },
      {
        id: "source-methodology-notes",
        title: "Personal Notes — Methodology Alignment",
        sourceType: "note",
        course: "Research Methods",
        module: "Research Design",
        topic: "Alignment",
        author: "Clive",
        tags: ["methodology", "research-design"],
        content: "A defensible research design aligns the research question, philosophical assumptions, methodology, methods, evidence and claims. Misalignment weakens validity and makes conclusions difficult to defend.",
        uploadedAt: daysFromNow(-2),
        status: "ready",
        demo: true
      }
    ],
    tasks: [
      { id: "academic-reading", domain: "academic", title: "Read research philosophy chapter", type: "Reading", course: "Research Methods", deadline: daysFromNow(2), priority: "high", estimatedMinutes: 120, actualMinutes: 25, status: "in-progress", progress: 25, notes: "Capture key assumptions and examples.", demo: true },
      { id: "academic-proposal", domain: "academic", title: "Draft initial research-interest statement", type: "Research task", course: "PhD Foundations", deadline: daysFromNow(8), priority: "high", estimatedMinutes: 240, actualMinutes: 45, status: "in-progress", progress: 15, notes: "Keep scope exploratory for the first supervisor discussion.", demo: true },
      { id: "work-report", domain: "work", title: "Complete quarterly performance report", type: "Deliverable", parent: "Professional Project Alpha", deadline: daysFromNow(1), priority: "critical", estimatedMinutes: 420, actualMinutes: 120, status: "in-progress", progress: 35, notes: "Waiting for one departmental input.", demo: true },
      { id: "work-briefing", domain: "work", title: "Prepare leadership briefing", type: "Task", parent: "Professional Project Alpha", deadline: daysFromNow(4), priority: "high", estimatedMinutes: 150, actualMinutes: 0, status: "not-started", progress: 0, demo: true }
    ],
    concepts: [
      { id: "concept-ontology", name: "Ontology", course: "Research Methods", module: "Research Philosophy", mastery: "developing", score: 3.1, attempts: 3, lastReviewed: daysFromNow(-4), nextReview: daysFromNow(-1), trend: "up", importance: 5, sourceIds: ["source-research-philosophy"] },
      { id: "concept-epistemology", name: "Epistemology", course: "Research Methods", module: "Research Philosophy", mastery: "learning", score: 2.2, attempts: 2, lastReviewed: daysFromNow(-6), nextReview: daysFromNow(0), trend: "flat", importance: 5, sourceIds: ["source-research-philosophy"] },
      { id: "concept-axiology", name: "Axiology", course: "Research Methods", module: "Research Philosophy", mastery: "exposed", score: 1.4, attempts: 1, lastReviewed: daysFromNow(-8), nextReview: daysFromNow(0), trend: "down", importance: 4, sourceIds: ["source-research-philosophy"] }
    ],
    questions: [
      { id: "question-ontology", conceptId: "concept-ontology", prompt: "In your own words, what does ontology ask in research?", answer: "Ontology asks what exists, the nature of reality, and what assumptions a researcher makes about that reality.", sourceId: "source-research-philosophy", difficulty: "medium" },
      { id: "question-epistemology", conceptId: "concept-epistemology", prompt: "How does epistemology influence a research design?", answer: "It determines what counts as knowledge, how knowledge can be justified, and therefore which evidence and methods are appropriate.", sourceId: "source-research-philosophy", difficulty: "medium" },
      { id: "question-axiology", conceptId: "concept-axiology", prompt: "What is the role of axiology in research?", answer: "Axiology addresses values and ethics, including how the researcher's values influence choices and interpretation.", sourceId: "source-research-philosophy", difficulty: "easy" }
    ],
    attempts: [],
    settings: {
      weekdayStudyMinutes: 120,
      weekendStudyMinutes: 300,
      workdayMinutes: 480,
      planningUtilization: 0.7,
      preferredRevisionPeriod: "19:00–21:00"
    }
  };
}
