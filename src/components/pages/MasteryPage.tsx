"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock } from "lucide-react";
import { useScholar } from "@/components/providers/ScholarProvider";
import { Badge, Progress } from "@/components/ui";

const toneFor = (score: number) => score >= 4 ? "green" : score >= 2.5 ? "blue" : "gold";

export function MasteryPage() {
  const { state } = useScholar();
  const states = ["new", "exposed", "learning", "developing", "proficient", "mastered", "decaying"];
  return <div className="stack-xl">
    <section className="page-intro"><div><span className="eyebrow">Mastery is dynamic</span><h2>See what is strengthening—and what is fading.</h2><p>Mastery states reflect revision history and self-assessment. They support planning; they do not measure intelligence.</p></div></section>
    <section className="mastery-summary panel"><div className="mastery-ladder">{states.map((status) => { const count = state.concepts.filter((item) => item.mastery === status).length; return <div key={status} className={count ? "has-items" : ""}><strong>{count}</strong><span>{status}</span></div>; })}</div></section>
    <section className="concept-grid">{state.concepts.map((concept) => { const Trend = concept.trend === "up" ? ArrowUpRight : concept.trend === "down" ? ArrowDownRight : ArrowRight; return <article className="concept-card panel" key={concept.id}><div className="concept-head"><div><span className="eyebrow">{concept.module}</span><h3>{concept.name}</h3></div><Badge tone={toneFor(concept.score)}>{concept.mastery}</Badge></div><div className="score-line"><strong>{concept.score.toFixed(1)}<small>/5</small></strong><span className={`trend ${concept.trend}`}><Trend size={17} />{concept.trend}</span></div><Progress value={concept.score / 5 * 100} tone={concept.score >= 4 ? "teal" : concept.score >= 2.5 ? "blue" : "gold"} /><div className="concept-meta"><div><span>Attempts</span><strong>{concept.attempts}</strong></div><div><span>Sources</span><strong>{concept.sourceIds.length}</strong></div></div><div className="next-review"><CalendarClock size={17} /><span>Next review</span><strong>{new Date(concept.nextReview).toLocaleDateString()}</strong></div></article>; })}</section>
  </div>;
}
