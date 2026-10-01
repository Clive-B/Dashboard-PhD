import test from "node:test";
import assert from "node:assert/strict";
import { buildAicHandoffPrompt } from "../src/lib/aic-governance";

test("AIC handoff preserves provenance and human authorship", () => {
  const prompt = buildAicHandoffPrompt({
    goal: "Methodology alignment",
    request: "Check the fit between my question and method.",
    course: "Research Methods",
    sources: [{
      id: "source-1",
      title: "Lecture notes",
      sourceType: "note",
      tags: [],
      content: "The research question must align with the method.",
      uploadedAt: "2026-09-29T00:00:00.000Z",
      status: "ready"
    }]
  });

  assert.match(prompt, /\[Source 1\] Lecture notes/);
  assert.match(prompt, /do not produce submission-ready work/i);
  assert.match(prompt, /I remain the author/i);
  assert.doesNotMatch(prompt, /work task/i);
});
