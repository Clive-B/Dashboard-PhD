import { differenceInCalendarDays, isBefore, parseISO } from "date-fns";
import type { Concept, Recommendation, RiskAssessment, ScholarState, Task } from "./types";

const priorityWeight = { low: 1, medium: 2, high: 4, critical: 6 } as const;

export function nextRevisionDate(score: number, previousAttempts: number, from = new Date()): string {
  const intervals = score <= 1 ? 1 : score === 2 ? 2 : score === 3 ? 4 : score === 4 ? 8 : 14;
  const maturityBonus = Math.min(previousAttempts, 4) * (score >= 4 ? 2 : 0);
  const result = new Date(from);
  result.setDate(result.getDate() + intervals + maturityBonus);
  return result.toISOString();
}

export function masteryFromScore(score: number, attempts: number): Concept["mastery"] {
  if (attempts === 0) return "new";
  if (score < 1.5) return "exposed";
  if (score < 2.5) return "learning";
  if (score < 3.5) return "developing";
  if (score < 4.4) return "proficient";
  return attempts >= 4 ? "mastered" : "proficient";
}

export function taskPriorityScore(task: Task, now = new Date()): { score: number; reasons: string[] } {
  if (task.status === "completed") return { score: -1, reasons: ["Already completed"] };
  const deadline = parseISO(task.deadline);
  const days = differenceInCalendarDays(deadline, now);
  const remaining = Math.max(0, task.estimatedMinutes - task.actualMinutes);
  const reasons: string[] = [];
  let score = priorityWeight[task.priority] * 10;

  if (days < 0) { score += 80; reasons.push("overdue"); }
  else if (days === 0) { score += 65; reasons.push("due today"); }
  else if (days <= 2) { score += 48; reasons.push(`due in ${days} day${days === 1 ? "" : "s"}`); }
  else if (days <= 7) { score += 28; reasons.push(`due within ${days} days`); }
  else { score += Math.max(0, 14 - days); }

  if (task.priority === "critical" || task.priority === "high") reasons.push(`${task.priority} priority`);
  if (task.progress > 0 && task.progress < 100) { score += 5; reasons.push("already in progress"); }
  if (remaining <= 45) { score += 8; reasons.push("fits a focused work block"); }
  if (task.status === "blocked") { score -= 20; reasons.push("currently blocked"); }
  return { score, reasons };
}

export function recommendNext(state: ScholarState, now = new Date()): Recommendation | null {
  const tasks = state.tasks
    .map((task) => ({ task, ...taskPriorityScore(task, now) }))
    .filter((item) => item.score >= 0);

  const dueConcepts = state.concepts
    .filter((concept) => !isBefore(now, parseISO(concept.nextReview)))
    .map((concept) => ({
      task: {
        id: `revision:${concept.id}`,
        title: `Review ${concept.name}`,
        domain: "academic" as const,
        estimatedMinutes: 35,
        course: concept.course
      },
      score: 42 + (5 - concept.score) * 8 + concept.importance * 3,
      reasons: ["revision due", `${concept.mastery} mastery`, "spaced-revision priority"]
    }));

  const candidates = [...tasks, ...dueConcepts].sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return null;
  return {
    taskId: best.task.id,
    title: best.task.title,
    subtitle: "course" in best.task ? best.task.course || "Academic" : best.task.parent || best.task.type,
    estimatedMinutes: best.task.estimatedMinutes,
    score: Math.round(best.score),
    reasons: best.reasons,
    domain: best.task.domain
  };
}

export function assessRisk(task: Task, availableMinutes: number, now = new Date()): RiskAssessment {
  const deadline = parseISO(task.deadline);
  const remainingMinutes = Math.max(0, task.estimatedMinutes - task.actualMinutes);
  const deficitMinutes = Math.max(0, remainingMinutes - availableMinutes);
  const days = differenceInCalendarDays(deadline, now);
  const reasons: string[] = [];
  let state: RiskAssessment["state"] = "normal";

  if (days < 0 && task.status !== "completed") { state = "overdue"; reasons.push("deadline has passed"); }
  else if (deficitMinutes > 0 && days <= 2) { state = "critical"; reasons.push("capacity deficit before near deadline"); }
  else if (deficitMinutes > 0) { state = "at-risk"; reasons.push("remaining effort exceeds available capacity"); }
  else if (days <= 3 || task.priority === "critical") { state = "watch"; reasons.push("deadline or priority needs attention"); }
  else reasons.push("workload fits estimated capacity");

  if (task.status === "blocked") reasons.push("task is blocked");
  return { state, remainingMinutes, availableMinutes, deficitMinutes, reasons };
}

export function calculateCapacity(freeMinutes: number, utilization: number): number {
  return Math.max(0, Math.round(freeMinutes * Math.min(1, Math.max(0, utilization))));
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}
