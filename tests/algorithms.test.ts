import assert from "node:assert/strict";
import test from "node:test";
import { assessRisk, calculateCapacity, nextRevisionDate, taskPriorityScore } from "../src/lib/algorithms";
import type { Task } from "../src/lib/types";
import { buildPodcastEpisode } from "../src/lib/podcast";

const task = (patch: Partial<Task> = {}): Task => ({ id:"t1",domain:"work",title:"Report",type:"Deliverable",deadline:"2026-10-01T17:00:00.000Z",priority:"high",estimatedMinutes:420,actualMinutes:120,status:"in-progress",progress:35,...patch });

test("capacity respects planning utilization", () => assert.equal(calculateCapacity(240,.7),168));
test("poor recall schedules sooner than effortless recall", () => {
  const from = new Date("2026-09-28T00:00:00Z");
  assert.ok(new Date(nextRevisionDate(1,2,from)) < new Date(nextRevisionDate(5,2,from)));
});
test("watchdog reports capacity deficit before deadline", () => {
  const risk = assessRisk(task(),240,new Date("2026-09-28T12:00:00Z"));
  assert.equal(risk.state,"at-risk"); assert.equal(risk.deficitMinutes,60);
});
test("completed tasks are excluded from recommendation scores", () => assert.equal(taskPriorityScore(task({status:"completed"}),new Date("2026-09-28T12:00:00Z")).score,-1));
test("podcast episodes preserve source provenance", () => {
  const episode = buildPodcastEpisode([{
    id:"source-1",title:"Research Philosophy",sourceType:"transcript",course:"Research Methods",tags:["ontology"],
    content:"Ontology asks what exists and how reality is understood in a research design.",uploadedAt:"2026-09-28T00:00:00Z",status:"ready"
  }],{title:"Ontology briefing",style:"briefing",targetMinutes:3},new Date("2026-09-28T00:00:00Z"));
  assert.deepEqual(episode.sourceIds,["source-1"]);
  assert.ok(episode.segments.some((item) => item.sourceTitle === "Research Philosophy"));
  assert.match(episode.segments[0].text,/original sources remain authoritative/i);
});
