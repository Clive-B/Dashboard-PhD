import test from "node:test";
import assert from "node:assert/strict";
import { lessonIsAvailable, lessonRecommendedAt, lessonSessionLabel } from "../src/lib/lesson-scheduling";

test("lesson recommendation is three calendar days after the lecture", () => {
  assert.equal(lessonRecommendedAt("2026-10-05T18:00:00.000Z"), "2026-10-08T18:00:00.000Z");
});

test("early access remains available and preserves a Day 3 checkpoint", () => {
  assert.equal(lessonIsAvailable(), true);
  assert.equal(lessonSessionLabel("2026-10-06T09:00:00.000Z"), "Day 3 retention checkpoint");
  assert.equal(lessonSessionLabel(null), "Day 3 guided lesson");
});
