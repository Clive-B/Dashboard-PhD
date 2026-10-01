"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, CloudDownload, ExternalLink, FileClock, Link2, LoaderCircle, Play, RefreshCw, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Badge, EmptyState, SectionHeading } from "@/components/ui";

type LectureOption = { id: string; title: string };
type ModuleOption = { id: string; title: string; lectures: LectureOption[] };
type CourseOption = { id: string; code?: string; title: string; modules: ModuleOption[] };
type InboxItem = {
  id: string; title: string; occurredAt: string; status: "received" | "awaiting_transcript" | "awaiting_match" | "ready" | "failed";
  courseHint?: string; speakerNames: string[]; recommendedAt: string; earlyStartedAt?: string; matchedAt?: string;
  transcriptPreview?: string; course?: string; module?: string; lecture?: string;
};
type InboxResponse = { data: InboxItem[]; courses: CourseOption[]; mode: string; configuration: { database: boolean; webhookSecret: boolean; ingestUser: boolean } };
type Pick = { courseId: string; moduleId: string; lectureId: string };

export function OtterInboxPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<InboxResponse | null>(null);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [endpoint, setEndpoint] = useState("/api/integrations/otter/zapier");

  async function load() {
    setError("");
    const response = await fetch("/api/integrations/otter/inbox", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) { setError(body.error || "Could not load the Otter inbox"); return; }
    setPayload(body);
  }

  useEffect(() => { setEndpoint(`${window.location.origin}/api/integrations/otter/zapier`); void load(); }, []);

  const ready = Boolean(payload?.configuration.database && payload.configuration.webhookSecret && payload.configuration.ingestUser);
  const pending = useMemo(() => payload?.data.filter((item) => item.status !== "ready") || [], [payload]);
  const matched = useMemo(() => payload?.data.filter((item) => item.status === "ready") || [], [payload]);

  function pickFor(item: InboxItem): Pick {
    return picks[item.id] || { courseId: "", moduleId: "", lectureId: "" };
  }

  function updatePick(id: string, patch: Partial<Pick>) {
    setPicks((current) => {
      const previous = current[id];
      return { ...current, [id]: { courseId: previous?.courseId || "", moduleId: previous?.moduleId || "", lectureId: previous?.lectureId || "", ...patch } };
    });
  }

  async function match(item: InboxItem) {
    const pick = pickFor(item);
    if (!pick.courseId) { setError("Select a course before processing the transcript."); return; }
    setBusy(item.id); setError("");
    const response = await fetch("/api/integrations/otter/inbox", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "match", id: item.id, courseId: pick.courseId, moduleId: pick.moduleId || undefined, lectureId: pick.lectureId || undefined }) });
    const body = await response.json();
    setBusy(null);
    if (!response.ok) { setError(body.error || "Could not process the transcript"); return; }
    await load();
  }

  async function startEarly(item: InboxItem) {
    setBusy(item.id); setError("");
    const response = await fetch("/api/integrations/otter/inbox", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start_early", id: item.id }) });
    const body = await response.json();
    setBusy(null);
    if (!response.ok) { setError(body.error || "Could not start the lesson early"); return; }
    await load();
    router.push("/aic-assistant");
  }

  async function copyEndpoint() {
    await navigator.clipboard.writeText(endpoint);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  return <div className="stack-xl">
    <section className="page-intro"><div><span className="eyebrow">Otter Pro · Zapier bridge</span><h2>Turn every transcript into a learning appointment.</h2><p>Incoming recordings remain in a protected inbox until you match them to an academic course. The lesson is immediately available, while its recommended guided session is scheduled three calendar days after the lecture.</p></div><button className="button button-ghost" onClick={load}><RefreshCw size={16} />Refresh inbox</button></section>

    <section className="panel otter-setup"><SectionHeading eyebrow="Connection readiness" title="Zapier receiver" action={<Badge tone={ready ? "green" : "gold"}>{ready ? "Ready to test" : "Setup required"}</Badge>} /><div className="otter-readiness"><div className={payload?.configuration.database ? "ready" : ""}><span>{payload?.configuration.database ? <Check size={16} /> : "1"}</span><strong>PostgreSQL</strong><small>{payload?.configuration.database ? "Configured" : "Required for webhook storage"}</small></div><div className={payload?.configuration.webhookSecret ? "ready" : ""}><span>{payload?.configuration.webhookSecret ? <Check size={16} /> : "2"}</span><strong>Webhook secret</strong><small>{payload?.configuration.webhookSecret ? "Configured" : "Add OTTER_ZAPIER_WEBHOOK_SECRET"}</small></div><div className={payload?.configuration.ingestUser ? "ready" : ""}><span>{payload?.configuration.ingestUser ? <Check size={16} /> : "3"}</span><strong>Destination user</strong><small>{payload?.configuration.ingestUser ? "Configured" : "Add OTTER_INGEST_USER_EMAIL"}</small></div></div><div className="webhook-address"><Link2 size={17} /><code>{endpoint}</code><button className="icon-button" onClick={copyEndpoint} aria-label="Copy webhook URL">{copied ? <Check size={16} /> : <Clipboard size={16} />}</button></div><div className="otter-security-note"><ShieldCheck size={17} /><span><strong>Zapier authentication</strong>Send the secret in the custom header <code>x-aic-webhook-secret</code>. The value is stored only in Zapier and the deployed server environment.</span></div></section>

    {error && <div className="form-error">{error}</div>}

    <section className="panel"><SectionHeading eyebrow={`${pending.length} pending`} title="Incoming transcript inbox" />{!payload ? <div className="otter-loading"><LoaderCircle className="spin" size={22} />Loading secure inbox…</div> : pending.length ? <div className="otter-inbox-list">{pending.map((item) => {
      const pick = pickFor(item);
      const course = payload.courses.find((entry) => entry.id === pick.courseId);
      const module = course?.modules.find((entry) => entry.id === pick.moduleId);
      return <article className="otter-item" key={item.id}><div className="otter-item-icon"><CloudDownload size={20} /></div><div className="otter-item-main"><div className="otter-item-heading"><div><Badge tone={item.status === "awaiting_transcript" ? "gold" : "blue"}>{item.status.replaceAll("_", " ")}</Badge><h3>{item.title}</h3><small>{format(new Date(item.occurredAt), "EEE, d MMM yyyy · HH:mm")} · Recommended {format(new Date(item.recommendedAt), "EEE, d MMM")}</small></div></div>{item.transcriptPreview ? <p>{item.transcriptPreview}…</p> : <p className="quiet">Zapier supplied recording metadata but no transcript text. Update the Zap field mapping or import the Otter transcript manually.</p>}<div className="otter-match-grid"><label>Course<select value={pick.courseId} onChange={(event) => updatePick(item.id, { courseId: event.target.value, moduleId: "", lectureId: "" })}><option value="">Select course</option>{payload.courses.map((entry) => <option key={entry.id} value={entry.id}>{entry.code ? `${entry.code} — ` : ""}{entry.title}</option>)}</select></label><label>Module<select value={pick.moduleId} disabled={!course} onChange={(event) => updatePick(item.id, { moduleId: event.target.value, lectureId: "" })}><option value="">No module</option>{course?.modules.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label><label>Lecture<select value={pick.lectureId} disabled={!module} onChange={(event) => updatePick(item.id, { lectureId: event.target.value })}><option value="">No lecture</option>{module?.lectures.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label><button className="button button-primary" disabled={!pick.courseId || !item.transcriptPreview || busy === item.id} onClick={() => match(item)}>{busy === item.id ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Process lesson</button></div></div></article>;
    })}</div> : <EmptyState title="No transcripts waiting" message="When the Zap runs successfully, a new Otter recording will appear here for course matching." />}</section>

    <section className="panel"><SectionHeading eyebrow={`${matched.length} ready`} title="Scheduled Otter lessons" />{matched.length ? <div className="otter-ready-grid">{matched.map((item) => <article className="otter-ready-card" key={item.id}><div className="otter-ready-top"><span className="otter-item-icon"><FileClock size={19} /></span><Badge tone={item.earlyStartedAt ? "teal" : "green"}>{item.earlyStartedAt ? "Day 3 checkpoint" : "Guided lesson"}</Badge></div><h3>{item.title}</h3><p>{item.course}{item.module ? ` · ${item.module}` : ""}{item.lecture ? ` · ${item.lecture}` : ""}</p><div className="lesson-date"><span>Recommended</span><strong>{format(new Date(item.recommendedAt), "EEEE, d MMM yyyy")}</strong></div><button className="button button-ghost" disabled={busy === item.id} onClick={() => startEarly(item)}>{item.earlyStartedAt ? <ExternalLink size={16} /> : <Play size={16} />}{item.earlyStartedAt ? "Continue with tutor" : "Start lesson early"}</button></article>)}</div> : <EmptyState title="No scheduled Otter lessons" message="Processed transcripts will create a Day 3 guided-learning appointment here and on the calendar." />}</section>
  </div>;
}
