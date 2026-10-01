"use client";

import { useMemo, useState } from "react";
import { FileText, Filter, Plus, Search, Trash2, Upload } from "lucide-react";
import { useScholar } from "@/components/providers/ScholarProvider";
import { Badge, EmptyState, Modal, SectionHeading } from "@/components/ui";
import type { SourceType } from "@/lib/types";

export function KnowledgeVaultPage() {
  const { state, addSource, deleteSource } = useScholar();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(state.sources[0]?.id || "");
  const filtered = useMemo(() => state.sources.filter((source) => {
    const haystack = `${source.title} ${source.course} ${source.module} ${source.topic} ${source.tags.join(" ")} ${source.content}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (type === "all" || source.sourceType === type);
  }), [state.sources, query, type]);
  const active = state.sources.find((source) => source.id === selected) || filtered[0];

  function submit(formData: FormData) {
    const rawTags = String(formData.get("tags") || "");
    addSource({
      title: String(formData.get("title") || "Untitled source"),
      sourceType: String(formData.get("sourceType") || "note") as SourceType,
      course: String(formData.get("course") || ""), module: String(formData.get("module") || ""),
      topic: String(formData.get("topic") || ""), author: String(formData.get("author") || ""),
      lecture: String(formData.get("lecture") || ""), tags: rawTags.split(",").map((tag) => tag.trim()).filter(Boolean),
      content: String(formData.get("content") || ""), sourceDate: new Date().toISOString()
    });
    setOpen(false);
  }

  return <div className="stack-xl">
    <section className="page-intro"><div><span className="eyebrow">Source-grounded knowledge</span><h2>Your academic memory, organised.</h2><p>Store lecture material, notes and transcripts with provenance that remains visible during revision.</p></div><button className="button button-primary" onClick={() => setOpen(true)}><Plus size={17} />Add source</button></section>
    <section className="vault-toolbar"><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sources, concepts, tags or content…" /></label><label className="select-field"><Filter size={17} /><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All source types</option><option value="transcript">Transcripts</option><option value="note">Notes</option><option value="pdf">PDF</option><option value="journal">Journal articles</option></select></label></section>
    <section className="vault-grid">
      <div className="source-list panel"><SectionHeading eyebrow={`${filtered.length} items`} title="Knowledge sources" />{filtered.length ? filtered.map((source) => <button key={source.id} onClick={() => setSelected(source.id)} className={`source-row ${active?.id === source.id ? "active" : ""}`}><span className="file-icon"><FileText size={19} /></span><span><strong>{source.title}</strong><small>{source.course || "Unassigned"} · {source.sourceType}</small></span><Badge tone={source.status === "ready" ? "green" : "gold"}>{source.status}</Badge></button>) : <EmptyState title="No matching sources" message="Adjust the filters or add your first source." />}</div>
      <article className="source-preview panel">
        {active ? <><div className="preview-header"><div><Badge tone="blue">Source-grounded</Badge><h2>{active.title}</h2><p>{active.course} {active.module ? `· ${active.module}` : ""}</p></div><button className="icon-button danger" onClick={() => deleteSource(active.id)} title="Delete source"><Trash2 size={18} /></button></div><div className="metadata-grid"><div><span>Type</span><strong>{active.sourceType}</strong></div><div><span>Author / lecturer</span><strong>{active.author || "Not recorded"}</strong></div><div><span>Lecture</span><strong>{active.lecture || "Not assigned"}</strong></div><div><span>Added</span><strong>{new Date(active.uploadedAt).toLocaleDateString()}</strong></div></div><div className="source-content"><span className="eyebrow">Preview</span><p>{active.content}</p></div><div className="tag-row">{active.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}</div></> : <EmptyState title="Select a source" message="Source details and provenance will appear here." />}
      </article>
    </section>
    <Modal open={open} title="Add knowledge source" onClose={() => setOpen(false)}><form action={submit} className="form-grid"><datalist id="course-options">{state.courses.map((course) => <option key={course.id} value={course.title} />)}</datalist><datalist id="module-options">{state.courses.flatMap((course) => course.modules).map((module) => <option key={module.id} value={module.title} />)}</datalist><datalist id="lecture-options">{state.courses.flatMap((course) => course.modules.flatMap((module) => module.lectures)).map((lecture) => <option key={lecture.id} value={lecture.title} />)}</datalist><datalist id="topic-options">{state.courses.flatMap((course) => course.modules.flatMap((module) => module.lectures.flatMap((lecture) => lecture.topics))).map((topic) => <option key={topic.id} value={topic.title} />)}</datalist><label className="full">Title<input name="title" required placeholder="e.g. Research Philosophy — Lecture 2" /></label><label>Source type<select name="sourceType"><option value="transcript">Transcript</option><option value="note">Personal note</option><option value="pdf">PDF text</option><option value="docx">DOCX text</option><option value="journal">Journal article</option><option value="assignment">Assignment material</option></select></label><label>Course<input name="course" list="course-options" placeholder="Select or enter a course" /></label><label>Module<input name="module" list="module-options" placeholder="Select or enter a module" /></label><label>Topic<input name="topic" list="topic-options" placeholder="Select or enter a topic" /></label><label>Author / lecturer<input name="author" /></label><label>Lecture<input name="lecture" list="lecture-options" placeholder="Select or enter a lecture" /></label><label className="full">Tags<input name="tags" placeholder="epistemology, methods, lecture" /></label><label className="full">Paste transcript or note content<textarea name="content" rows={9} required placeholder="Paste Otter/Otta transcript or your notes here…" /></label><div className="upload-note full"><Upload size={18} /><span>First Edition accepts pasted content in the live demo. The PostgreSQL API and storage abstraction prepare file uploads for the connected mode.</span></div><div className="form-actions full"><button type="button" className="button button-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary">Process source</button></div></form></Modal>
  </div>;
}
