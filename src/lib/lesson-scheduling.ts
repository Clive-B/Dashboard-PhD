import { addDays } from "date-fns";

export function lessonRecommendedAt(lectureAt: Date | string, calendarDays = 3): string {
  const lecture = typeof lectureAt === "string" ? new Date(lectureAt) : new Date(lectureAt);
  if (Number.isNaN(lecture.getTime())) throw new Error("A valid lecture date is required");
  return addDays(lecture, calendarDays).toISOString();
}

export function lessonSessionLabel(earlyStartedAt?: string | null) {
  return earlyStartedAt ? "Day 3 retention checkpoint" : "Day 3 guided lesson";
}

export function lessonIsAvailable() {
  return true;
}
