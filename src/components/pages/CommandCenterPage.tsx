"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpenCheck, BriefcaseBusiness, CalendarClock, Database, Play, ShieldAlert, Sparkles, Target } from "lucide-react";
import { assessRisk, calculateCapacity, formatMinutes, recommendNext } from "@/lib/algorithms";
import { useScholar } from "@/components/providers/ScholarProvider";
import { Badge, Progress, SectionHeading } from "@/components/ui";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export function CommandCenterPage() {
  const { state } = useScholar();
  const recommendation = recommendNext(state);
  const dueRevision = state.concepts.filter((concept) => new Date(concept.nextReview) <= new Date()).length;
  const academic = state.tasks.filter((task) => task.domain === "academic" && task.status !== "completed");
  const work = state.tasks.filter((task) => task.domain === "work" && task.status !== "completed");
  const capacity = calculateCapacity(state.settings.weekdayStudyMinutes + 240, state.settings.planningUtilization);
  const workRisks = work.map((task) => ({ task, risk: assessRisk(task, capacity) }));
  const alerts = workRisks.filter(({ risk }) => !["normal"].includes(risk.state));
  const masteryAverage = state.concepts.length ? Math.round(state.concepts.reduce((total, item) => total + item.score, 0) / state.concepts.length / 5 * 100) : 0;

  const stats = [
    { label: "Revision due", value: dueRevision, note: dueRevision ? "Concepts need recall" : "You are on schedule", icon: BookOpenCheck, tone: "teal" },
    { label: "Academic tasks", value: academic.length, note: `${academic.filter((item) => item.priority === "high" || item.priority === "critical").length} high priority`, icon: Target, tone: "blue" },
    { label: "Work tasks", value: work.length, note: `${alerts.length} need attention`, icon: BriefcaseBusiness, tone: "gold" },
    { label: "Knowledge sources", value: state.sources.length, note: `${state.sources.filter((item) => item.status === "ready").length} ready to search`, icon: Database, tone: "teal" }
  ];

  return <div className="stack-xl">
    <section className="welcome-row">
      <div><span className="eyebrow">Daily intelligence brief</span><h2>{greeting()}, Clive.</h2><p>Here is the clearest view of your academic and professional day.</p></div>
      <div className="date-card"><CalendarClock size={20} /><div><strong>{new Intl.DateTimeFormat("en-GH", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</strong><span>{formatMinutes(capacity)} realistic planning capacity</span></div></div>
    </section>

    <section className="stat-grid">
      {stats.map(({ label, value, note, icon: Icon, tone }) => <article className="stat-card" key={label}><div className={`stat-icon ${tone}`}><Icon size={20} /></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>)}
    </section>

    <section className="dashboard-main-grid">
      <article className="recommendation-card">
        <div className="recommendation-glow" />
        <div className="recommendation-top"><div><span className="eyebrow gold-text">What should I do now?</span><h3>Recommended next action</h3></div><Sparkles size={24} /></div>
        {recommendation ? <>
          <Badge tone={recommendation.domain === "academic" ? "blue" : "gold"}>{recommendation.domain}</Badge>
          <h2>{recommendation.title}</h2><p className="recommendation-subtitle">{recommendation.subtitle}</p>
          <div className="estimate"><span>Estimated focus block</span><strong>{formatMinutes(recommendation.estimatedMinutes)}</strong></div>
          <div className="reason-box"><strong>Why this?</strong><p>{recommendation.reasons.join(" · ")}</p><small>Transparent priority score: {recommendation.score}</small></div>
          <div className="button-row"><Link className="button button-gold" href={recommendation.taskId.startsWith("revision:") ? "/revision" : recommendation.domain === "work" ? "/work-watchdog" : "/phd-planner"}><Play size={17} fill="currentColor" />Start</Link><button className="button button-ghost" onClick={() => document.getElementById("priority-explanation")?.scrollIntoView({ behavior: "smooth" })}>Why this?</button></div>
        </> : <p>No open work currently requires attention.</p>}
      </article>

      <div className="stack-lg">
        <article className="panel">
          <SectionHeading eyebrow="Balance" title="Workload status" />
          <div className="balance-row"><span>Academic demand</span><strong>{academic.reduce((sum, task) => sum + Math.max(0, task.estimatedMinutes - task.actualMinutes), 0) / 60}h</strong></div>
          <Progress value={Math.min(100, academic.reduce((sum, task) => sum + task.estimatedMinutes, 0) / 12)} tone="blue" />
          <div className="balance-row"><span>Professional demand</span><strong>{work.reduce((sum, task) => sum + Math.max(0, task.estimatedMinutes - task.actualMinutes), 0) / 60}h</strong></div>
          <Progress value={Math.min(100, work.reduce((sum, task) => sum + task.estimatedMinutes, 0) / 12)} tone="gold" />
          <div className="capacity-note"><AlertTriangle size={17} /><span>Capacity is an estimate, not a promise. AIC applies your {Math.round(state.settings.planningUtilization * 100)}% utilization setting.</span></div>
        </article>
        <article className="panel">
          <SectionHeading eyebrow="Learning" title="Mastery pulse" action={<Link href="/mastery" className="text-link">View all <ArrowRight size={15} /></Link>} />
          <div className="mastery-pulse"><div className="ring" style={{ "--progress": `${masteryAverage * 3.6}deg` } as React.CSSProperties}><strong>{masteryAverage}%</strong><span>aggregate</span></div><div>{state.concepts.slice(0, 3).map((concept) => <div className="mini-concept" key={concept.id}><span>{concept.name}</span><Badge tone={concept.score >= 3 ? "green" : "gold"}>{concept.mastery}</Badge></div>)}</div></div>
        </article>
      </div>
    </section>

    <section className="panel" id="priority-explanation">
      <SectionHeading eyebrow="Early warning" title="Watchdog alerts" action={<Link href="/work-watchdog" className="text-link">Open watchdog <ArrowRight size={15} /></Link>} />
      <div className="alert-list">{alerts.length ? alerts.map(({ task, risk }) => <div className="alert-row" key={task.id}><div className={`risk-symbol ${risk.state}`}><ShieldAlert size={19} /></div><div><strong>{task.title}</strong><span>{risk.reasons.join(" · ")}</span></div><Badge tone={risk.state === "critical" || risk.state === "overdue" ? "red" : "gold"}>{risk.state}</Badge><small>{formatMinutes(risk.remainingMinutes)} remaining</small></div>) : <p className="quiet">No work tasks are currently at risk.</p>}</div>
    </section>
  </div>;
}
