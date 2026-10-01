"use client";

import { FormEvent, useState } from "react";
import { Check, Database, KeyRound, RotateCcw, ShieldCheck, Trash2, Unplug } from "lucide-react";
import { useScholar } from "@/components/providers/ScholarProvider";
import { Badge, SectionHeading } from "@/components/ui";

export function SettingsPage() {
  const { state, updateSettings, resetDemo, clearDemoData } = useScholar();
  const [saved, setSaved] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateSettings({ weekdayStudyMinutes: Number(data.get("weekdayStudyMinutes")), weekendStudyMinutes: Number(data.get("weekendStudyMinutes")), workdayMinutes: Number(data.get("workdayMinutes")), planningUtilization: Number(data.get("planningUtilization")) / 100, preferredRevisionPeriod: String(data.get("preferredRevisionPeriod")) });
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  }
  return <div className="settings-layout">
    <section className="panel"><SectionHeading eyebrow="Profile" title="Clive Ebo Barton-Odro" /><div className="profile-details"><div><span>Preferred name</span><strong>Clive</strong></div><div><span>Academic level</span><strong>PhD</strong></div><div><span>Field</span><strong>Information Technology</strong></div><div><span>Mentor</span><strong>Dr. David King Boison</strong></div></div></section>
    <section className="panel settings-form"><SectionHeading eyebrow="Capacity" title="Realistic planning settings" /><form onSubmit={submit} className="form-grid"><label>Weekday study minutes<input name="weekdayStudyMinutes" type="number" min="0" defaultValue={state.settings.weekdayStudyMinutes} /></label><label>Weekend study minutes<input name="weekendStudyMinutes" type="number" min="0" defaultValue={state.settings.weekendStudyMinutes} /></label><label>Workday minutes<input name="workdayMinutes" type="number" min="0" defaultValue={state.settings.workdayMinutes} /></label><label>Planning utilization (%)<input name="planningUtilization" type="number" min="10" max="100" defaultValue={Math.round(state.settings.planningUtilization * 100)} /></label><label className="full">Preferred revision period<input name="preferredRevisionPeriod" defaultValue={state.settings.preferredRevisionPeriod} /></label><div className="form-actions full"><button className="button button-primary">{saved ? <><Check size={17} />Saved</> : "Save settings"}</button></div></form></section>
    <section className="panel"><SectionHeading eyebrow="AI and data" title="Connection status" /><div className="connection-list"><div><Database size={19} /><span><strong>Data mode</strong>Browser-local First Edition</span><Badge tone="gold">Demo</Badge></div><div><KeyRound size={19} /><span><strong>AI provider</strong>Local grounded fallback</span><Badge tone="green">Available</Badge></div><div><Unplug size={19} /><span><strong>AIC governance service</strong>Awaiting authorized endpoint or governance package</span><Badge tone="red">Not connected</Badge></div><div><ShieldCheck size={19} /><span><strong>Governance</strong>Human-primary local safeguards</span><Badge tone="blue">Conceptual</Badge></div></div></section>
    <section className="panel danger-zone"><SectionHeading eyebrow="Demo controls" title="Local data" /><p>Demo records are clearly marked in the data model and can be removed without affecting records you add.</p><div className="button-row"><button className="button button-ghost" onClick={resetDemo}><RotateCcw size={17} />Restore demo</button><button className="button button-danger" onClick={clearDemoData}><Trash2 size={17} />Delete demo data</button></div></section>
  </div>;
}
