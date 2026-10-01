"use client";

import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { CalendarDays, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { useScholar } from "@/components/providers/ScholarProvider";
import { Badge, EmptyState } from "@/components/ui";

export function CalendarPage() {
  const { state } = useScholar();
  const [connectedEvents, setConnectedEvents] = useState<Array<{ id: string; title: string; startsAt: string; eventType: string }>>([]);
  useEffect(() => { void fetch("/api/calendar", { cache: "no-store" }).then((response) => response.ok ? response.json() : { data: [] }).then((body) => setConnectedEvents(body.data || [])); }, []);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  return <div className="stack-xl">
    <section className="page-intro"><div><span className="eyebrow">One calendar, clear boundaries</span><h2>See the week before it becomes a collision.</h2><p>Academic, professional and revision commitments share the timeline without sharing their private context.</p></div><div className="calendar-legend"><Badge tone="blue">PhD</Badge><Badge tone="gold">Work</Badge><Badge tone="teal">Revision</Badge></div></section>
    <section className="week-calendar panel"><div className="week-header"><button className="icon-button"><CalendarDays size={18} /></button><div><span className="eyebrow">Current week</span><h3>{format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}</h3></div></div><div className="week-grid">{days.map((day) => {
      const tasks = state.tasks.filter((task) => isSameDay(new Date(task.deadline), day));
      const reviews = state.concepts.filter((concept) => isSameDay(new Date(concept.nextReview), day));
      const integrations = connectedEvents.filter((event) => isSameDay(new Date(event.startsAt), day));
      return <div className={`day-column ${isSameDay(day, new Date()) ? "today" : ""}`} key={day.toISOString()}><div className="day-title"><span>{format(day,"EEE")}</span><strong>{format(day,"d")}</strong></div><div className="day-events">{tasks.map((task) => <article key={task.id} className={`calendar-event ${task.domain}`}><span>{task.domain}</span><strong>{task.title}</strong><small><Clock3 size={12} />Due {format(new Date(task.deadline),"HH:mm")}</small></article>)}{reviews.map((concept) => <article key={concept.id} className="calendar-event revision"><span>revision</span><strong>{concept.name}</strong><small><Clock3 size={12} />35-minute recall</small></article>)}{integrations.map((event) => <article key={event.id} className="calendar-event revision"><span>{event.eventType.replaceAll("_", " ")}</span><strong>{event.title}</strong><small><Clock3 size={12} />{format(new Date(event.startsAt),"HH:mm")} · Otter lesson</small></article>)}{!tasks.length && !reviews.length && !integrations.length && <span className="empty-day">Open capacity</span>}</div></div>;
    })}</div></section>
    <section className="collision-panel panel"><div className="collision-icon"><CalendarDays size={22} /></div><div><span className="eyebrow">Collision detection</span><h3>{state.tasks.reduce((sum, task) => sum + Math.max(0, task.estimatedMinutes - task.actualMinutes), 0) > (state.settings.weekdayStudyMinutes + state.settings.workdayMinutes) * 3 ? "Capacity collision detected" : "Current commitments fit the model"}</h3><p>AIC will recommend redistribution, but it will never move an important commitment without your approval.</p></div></section>
  </div>;
}
