"use client";

import { useState } from "react";
import { BookOpen, BrainCircuit, ChevronRight, Lightbulb, RotateCcw } from "lucide-react";
import { useScholar } from "@/components/providers/ScholarProvider";
import { Badge, EmptyState, SectionHeading } from "@/components/ui";

type Mode = "quick" | "test" | "teach";

export function RevisionPage() {
  const { state, recordAttempt } = useScholar();
  const [mode, setMode] = useState<Mode>("quick");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [complete, setComplete] = useState(false);
  const question = state.questions[index % Math.max(1, state.questions.length)];
  const concept = state.concepts.find((item) => item.id === question?.conceptId);
  const source = state.sources.find((item) => item.id === question?.sourceId);

  function score(value: number) {
    if (!question) return;
    recordAttempt(question.id, answer, value);
    if (index + 1 >= state.questions.length) setComplete(true);
    else { setIndex((current) => current + 1); setAnswer(""); setRevealed(false); }
  }

  function restart() { setIndex(0); setAnswer(""); setRevealed(false); setComplete(false); }

  return <div className="stack-xl">
    <section className="page-intro"><div><span className="eyebrow">Active recall</span><h2>Turn reading into retrievable knowledge.</h2><p>Every answer updates your revision record; the score is a planning aid, not a claim about human knowledge.</p></div><Badge tone="teal">{state.attempts.length} attempts stored</Badge></section>
    <section className="mode-grid">
      {([{ id: "quick", title: "Quick Recall", note: "Short prompts and self-scoring", icon: BrainCircuit }, { id: "test", title: "Test Me", note: "Answer before revealing evidence", icon: BookOpen }, { id: "teach", title: "Teach AIC", note: "Explain the concept in your own words", icon: Lightbulb }] as const).map(({ id, title, note, icon: Icon }) => <button key={id} className={`mode-card ${mode === id ? "active" : ""}`} onClick={() => { setMode(id); restart(); }}><Icon size={23} /><span><strong>{title}</strong><small>{note}</small></span><ChevronRight size={17} /></button>)}
    </section>
    <section className="revision-workspace">
      {complete ? <article className="panel completion-card"><span className="completion-icon">✓</span><h2>Revision session complete</h2><p>Your attempts have been stored and future review dates recalculated.</p><button className="button button-primary" onClick={restart}><RotateCcw size={17} />Revise again</button></article> : question ? <>
        <article className="question-card panel"><div className="question-top"><div><Badge tone="blue">{mode === "teach" ? "Teach AIC" : mode === "test" ? "Test me" : "Quick recall"}</Badge><span>Question {index + 1} of {state.questions.length}</span></div><Badge tone="gold">{question.difficulty}</Badge></div><span className="eyebrow">{concept?.course} · {concept?.name}</span><h2>{mode === "teach" ? `Teach AIC: ${question.prompt}` : question.prompt}</h2><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={7} placeholder={mode === "teach" ? "Explain it clearly, as if teaching a thoughtful beginner…" : "Write what you can recall before checking the source…"} /><div className="button-row"><button className="button button-primary" disabled={!answer.trim()} onClick={() => setRevealed(true)}>Check answer</button><button className="button button-ghost" onClick={() => setRevealed(true)}>I cannot recall</button></div></article>
        <aside className="evidence-card panel"><SectionHeading eyebrow="Academic integrity" title="Evidence and self-score" />{revealed ? <><Badge tone="green">Source-grounded</Badge><p className="model-answer">{question.answer}</p><div className="source-citation"><strong>{source?.title}</strong><span>{source?.course} · {source?.lecture || source?.module}</span><button onClick={() => source && document.getElementById(`source-${source.id}`)?.scrollIntoView()}>Show source</button></div><p className="score-prompt">How strong was your recall?</p><div className="score-grid">{[0,1,2,3,4,5].map((value) => <button key={value} onClick={() => score(value)}><strong>{value}</strong><span>{["None","Weak","Partial","Good","Strong","Effortless"][value]}</span></button>)}</div></> : <div className="evidence-locked"><BookOpen size={26} /><strong>Evidence remains hidden</strong><span>Commit to an answer first to strengthen retrieval practice.</span></div>}</aside>
      </> : <EmptyState title="No revision questions" message="Add source material, then create revision questions." />}
    </section>
  </div>;
}
