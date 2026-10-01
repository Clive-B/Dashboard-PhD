"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Plus, Trash2 } from "lucide-react";
import { addDays } from "date-fns";
import { assessRisk, calculateCapacity, formatMinutes } from "@/lib/algorithms";
import { useScholar } from "@/components/providers/ScholarProvider";
import { Badge, EmptyState, Modal, Progress } from "@/components/ui";
import type { Priority, TaskStatus } from "@/lib/types";

export function TasksPage({ domain }: { domain: "academic" | "work" }) {
  const { state, addTask, updateTask, deleteTask } = useScholar();
  const [open, setOpen] = useState(false);
  const tasks = useMemo(() => state.tasks.filter((task) => task.domain === domain), [state.tasks, domain]);
  const capacity = calculateCapacity(domain === "academic" ? state.settings.weekdayStudyMinutes * 3 : state.settings.workdayMinutes * 2, state.settings.planningUtilization);
  const title = domain === "academic" ? "PhD Planner" : "Work Watchdog";

  function submit(formData: FormData) {
    addTask({
      domain, title: String(formData.get("title")), type: String(formData.get("type")),
      parent: domain === "work" ? String(formData.get("parent") || "") : undefined,
      course: domain === "academic" ? String(formData.get("parent") || "") : undefined,
      deadline: new Date(String(formData.get("deadline"))).toISOString(),
      priority: String(formData.get("priority")) as Priority,
      estimatedMinutes: Number(formData.get("hours")) * 60,
      status: "not-started", notes: String(formData.get("notes") || "")
    });
    setOpen(false);
  }

  return <div className="stack-xl">
    <section className="page-intro"><div><span className="eyebrow">{domain === "academic" ? "Academic delivery" : "Professional accountability"}</span><h2>{domain === "academic" ? "Move the PhD forward deliberately." : "Spot workload risk before deadlines fail."}</h2><p>{domain === "academic" ? "Track readings, research, supervisor actions and milestones in one academic plan." : "Professional work stays separate from academic AI context while contributing to realistic capacity planning."}</p></div><button className="button button-primary" onClick={() => setOpen(true)}><Plus size={17} />Add {domain === "academic" ? "academic" : "work"} task</button></section>
    {domain === "work" && <section className="watchdog-brief panel"><div><span className="eyebrow">Capacity model</span><h3>{formatMinutes(capacity)} available before the current planning horizon</h3><p>Based on configured hours and {Math.round(state.settings.planningUtilization * 100)}% planning utilization.</p></div><div className="risk-legend">{["normal","watch","at-risk","critical","overdue"].map((risk) => <Badge key={risk} tone={risk === "critical" || risk === "overdue" ? "red" : risk === "normal" ? "green" : "gold"}>{risk}</Badge>)}</div></section>}
    <section className="task-board">{tasks.length ? tasks.map((task) => {
      const risk = assessRisk(task, Math.max(0, capacity - tasks.filter((item) => item.id !== task.id && item.status !== "completed").reduce((sum, item) => sum + Math.max(0, item.estimatedMinutes - item.actualMinutes), 0)));
      return <article className="task-card panel" key={task.id}><div className="task-card-top"><div className={`domain-marker ${domain}`} /> <Badge tone={task.priority === "critical" ? "red" : task.priority === "high" ? "gold" : "neutral"}>{task.priority}</Badge><div className="task-actions"><button className="icon-button" onClick={() => deleteTask(task.id)} aria-label="Delete task"><Trash2 size={16} /></button></div></div><span className="eyebrow">{task.parent || task.course || task.type}</span><h3>{task.title}</h3><div className="deadline-line"><Clock3 size={16} /><span>Due {new Date(task.deadline).toLocaleDateString()}</span><strong>{formatMinutes(Math.max(0, task.estimatedMinutes - task.actualMinutes))} remaining</strong></div><Progress value={task.progress} tone={risk.state === "critical" || risk.state === "overdue" ? "red" : domain === "academic" ? "blue" : "gold"} /><div className="progress-label"><span>{task.status.replace("-", " ")}</span><strong>{task.progress}%</strong></div>{domain === "work" && <div className={`risk-callout ${risk.state}`}><AlertCircle size={17} /><div><strong>{risk.state.replace("-", " ")}</strong><span>{risk.reasons.join(" · ")}{risk.deficitMinutes ? ` · ${formatMinutes(risk.deficitMinutes)} capacity deficit` : ""}</span></div></div>}<div className="task-controls"><select value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as TaskStatus, progress: event.target.value === "completed" ? 100 : task.progress })}><option value="not-started">Not started</option><option value="in-progress">In progress</option>{domain === "work" && <option value="waiting">Waiting</option>}<option value="blocked">Blocked</option><option value="completed">Completed</option></select><label>Progress<input type="range" min="0" max="100" step="5" value={task.progress} onChange={(event) => updateTask(task.id, { progress: Number(event.target.value), status: Number(event.target.value) === 100 ? "completed" : task.status })} /></label></div></article>;
    }) : <EmptyState title={`No ${domain} tasks`} message={`Add a task to begin using ${title}.`} />}</section>
    <Modal open={open} title={`Add ${domain === "academic" ? "academic" : "professional"} task`} onClose={() => setOpen(false)}><form action={submit} className="form-grid"><datalist id="academic-course-options">{state.courses.map((course) => <option key={course.id} value={course.title} />)}</datalist><label className="full">Title<input name="title" required /></label><label>Type<select name="type">{(domain === "academic" ? ["Assignment","Reading","Lecture","Research task","Milestone","Supervisor action","Examination","Presentation"] : ["Project task","Deliverable","Meeting","Report","Review"]).map((item) => <option key={item}>{item}</option>)}</select></label><label>{domain === "academic" ? "Course" : "Project"}<input name="parent" list={domain === "academic" ? "academic-course-options" : undefined} placeholder={domain === "academic" ? "Select or enter a course" : "Project name"} /></label><label>Deadline<input name="deadline" type="datetime-local" required defaultValue={addDays(new Date(), 3).toISOString().slice(0,16)} /></label><label>Priority<select name="priority"><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option><option value="low">Low</option></select></label><label>Estimated hours<input name="hours" type="number" min="0.25" step="0.25" defaultValue="1" required /></label><label className="full">Notes<textarea name="notes" rows={4} /></label><div className="form-actions full"><button type="button" className="button button-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary"><CheckCircle2 size={17} />Add task</button></div></form></Modal>
  </div>;
}
