"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, ChevronDown, CircleDot, GraduationCap, Layers3, Plus, Presentation, Trash2 } from "lucide-react";
import { useScholar } from "@/components/providers/ScholarProvider";
import { Badge, EmptyState, Modal, SectionHeading } from "@/components/ui";

type AddTarget =
  | { type: "course" }
  | { type: "module"; courseId: string }
  | { type: "lecture"; courseId: string; moduleId: string }
  | { type: "topic"; courseId: string; moduleId: string; lectureId: string }
  | { type: "concept"; courseId: string; moduleId: string; lectureId: string; topicId: string };

export function CoursesPage() {
  const { state, addCourse, deleteCourse, addCourseModule, addCourseLecture, addCourseTopic, addCourseConcept } = useScholar();
  const [selectedId, setSelectedId] = useState(state.courses[0]?.id || "");
  const [target, setTarget] = useState<AddTarget | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const selected = state.courses.find((course) => course.id === selectedId) || state.courses[0];

  useEffect(() => {
    if (!state.courses.some((course) => course.id === selectedId)) setSelectedId(state.courses[0]?.id || "");
  }, [selectedId, state.courses]);

  const counts = useMemo(() => {
    if (!selected) return { modules: 0, lectures: 0, topics: 0, concepts: 0 };
    const lectures = selected.modules.flatMap((module) => module.lectures);
    const topics = lectures.flatMap((lecture) => lecture.topics);
    return { modules: selected.modules.length, lectures: lectures.length, topics: topics.length, concepts: topics.reduce((total, topic) => total + topic.conceptIds.length, 0) };
  }, [selected]);

  function submit(formData: FormData) {
    if (!target) return;
    const title = String(formData.get("title") || "").trim();
    if (!title) return;
    if (target.type === "course") {
      addCourse({ title, code: String(formData.get("code") || "").trim(), description: String(formData.get("description") || "").trim() });
    } else if (target.type === "module") {
      addCourseModule(target.courseId, title, String(formData.get("description") || "").trim());
    } else if (target.type === "lecture") {
      const scheduled = String(formData.get("scheduledAt") || "");
      addCourseLecture(target.courseId, target.moduleId, title, String(formData.get("lecturer") || "").trim(), scheduled ? new Date(scheduled).toISOString() : undefined);
      setExpandedModules((current) => current.includes(target.moduleId) ? current : [...current, target.moduleId]);
    } else if (target.type === "topic") {
      addCourseTopic(target.courseId, target.moduleId, target.lectureId, title);
    } else {
      addCourseConcept(target.courseId, target.moduleId, target.lectureId, target.topicId, title, Number(formData.get("importance") || 3));
    }
    setTarget(null);
  }

  function modalTitle() {
    if (!target) return "Add item";
    return `Add ${target.type}`;
  }

  return <div className="stack-xl">
    <section className="page-intro"><div><span className="eyebrow">Academic structure</span><h2>Build the map before filling the vault.</h2><p>Create reusable courses and organise each one into modules, lectures, topics and concepts. New concepts automatically enter Mastery as “new”.</p></div><button className="button button-primary" onClick={() => setTarget({ type: "course" })}><Plus size={17} />Add course</button></section>

    <section className="courses-layout">
      <aside className="panel course-index">
        <SectionHeading eyebrow={`${state.courses.length} courses`} title="Course library" />
        {state.courses.length ? state.courses.map((course) => {
          const conceptCount = course.modules.flatMap((module) => module.lectures.flatMap((lecture) => lecture.topics)).reduce((total, topic) => total + topic.conceptIds.length, 0);
          return <button key={course.id} className={`course-index-item ${selected?.id === course.id ? "active" : ""}`} onClick={() => setSelectedId(course.id)}><span className="course-code">{course.code || course.title.slice(0,2).toUpperCase()}</span><span><strong>{course.title}</strong><small>{course.modules.length} modules · {conceptCount} concepts</small></span>{course.demo && <Badge tone="gold">Demo</Badge>}</button>;
        }) : <EmptyState title="No courses yet" message="Create your first course to begin structuring learning." />}
      </aside>

      <div className="stack-lg">
        {selected ? <>
          <article className="panel course-overview"><div className="course-overview-top"><div><Badge tone="blue">{selected.code || "Course"}</Badge><h2>{selected.title}</h2><p>{selected.description || "No course description has been added."}</p></div><button className="icon-button danger" onClick={() => deleteCourse(selected.id)} title="Delete course"><Trash2 size={17} /></button></div><div className="course-counts"><div><Layers3 size={18} /><strong>{counts.modules}</strong><span>Modules</span></div><div><Presentation size={18} /><strong>{counts.lectures}</strong><span>Lectures</span></div><div><BookOpen size={18} /><strong>{counts.topics}</strong><span>Topics</span></div><div><CircleDot size={18} /><strong>{counts.concepts}</strong><span>Concepts</span></div></div><button className="button button-ghost" onClick={() => setTarget({ type: "module", courseId: selected.id })}><Plus size={16} />Add module</button></article>

          <section className="course-tree">
            {selected.modules.length ? selected.modules.map((module, moduleIndex) => {
              const open = expandedModules.includes(module.id) || selected.modules.length === 1;
              return <article className="panel module-card" key={module.id}><button className="module-heading" onClick={() => setExpandedModules((current) => current.includes(module.id) ? current.filter((id) => id !== module.id) : [...current, module.id])}><span className="module-number">{String(moduleIndex + 1).padStart(2,"0")}</span><span><strong>{module.title}</strong><small>{module.description || `${module.lectures.length} lectures`}</small></span><ChevronDown size={18} className={open ? "open" : ""} /></button>{open && <div className="module-content"><div className="tree-action"><button className="text-link" onClick={() => setTarget({ type: "lecture", courseId: selected.id, moduleId: module.id })}><Plus size={14} />Add lecture</button></div>{module.lectures.length ? module.lectures.map((lecture) => <div className="lecture-node" key={lecture.id}><div className="lecture-heading"><span className="tree-line-icon"><Presentation size={16} /></span><div><strong>{lecture.title}</strong><small>{lecture.lecturer || "Lecturer not set"}{lecture.scheduledAt ? ` · ${lecture.scheduledAt.slice(0,10)}` : ""}</small></div><button className="text-link" onClick={() => setTarget({ type: "topic", courseId: selected.id, moduleId: module.id, lectureId: lecture.id })}><Plus size={14} />Topic</button></div><div className="topic-list">{lecture.topics.length ? lecture.topics.map((topic) => <div className="topic-node" key={topic.id}><div className="topic-heading"><BookOpen size={15} /><strong>{topic.title}</strong><button className="text-link" onClick={() => setTarget({ type: "concept", courseId: selected.id, moduleId: module.id, lectureId: lecture.id, topicId: topic.id })}><Plus size={13} />Concept</button></div><div className="concept-chips">{topic.conceptIds.length ? topic.conceptIds.map((id) => { const concept = state.concepts.find((item) => item.id === id); return concept ? <span key={id}><CircleDot size={11} />{concept.name}<Badge tone={concept.mastery === "new" ? "neutral" : "teal"}>{concept.mastery}</Badge></span> : null; }) : <small>No concepts yet</small>}</div></div>) : <div className="tree-empty">No topics yet. Add the first topic for this lecture.</div>}</div></div>) : <div className="tree-empty">No lectures yet. Add a lecture to continue the hierarchy.</div>}</div>}</article>;
            }) : <article className="panel"><EmptyState title="No modules yet" message="Add the first module to begin this course hierarchy." /></article>}
          </section>
        </> : <article className="panel"><EmptyState title="Select or create a course" message="Course details will appear here." /></article>}
      </div>
    </section>

    <Modal open={Boolean(target)} title={modalTitle()} onClose={() => setTarget(null)}><form action={submit} className="form-grid"><label className="full">{target?.type === "concept" ? "Concept name" : target?.type === "lecture" ? "Lecture title" : target?.type === "topic" ? "Topic title" : target?.type === "module" ? "Module title" : "Course title"}<input name="title" required autoFocus /></label>{target?.type === "course" && <><label>Course code<input name="code" placeholder="e.g. RM-001" /></label><label className="full">Description<textarea name="description" rows={4} /></label></>}{target?.type === "module" && <label className="full">Description<textarea name="description" rows={3} /></label>}{target?.type === "lecture" && <><label>Lecturer<input name="lecturer" /></label><label>Scheduled date<input name="scheduledAt" type="datetime-local" /></label></>}{target?.type === "concept" && <label>Importance<select name="importance" defaultValue="3"><option value="1">1 — Low</option><option value="2">2</option><option value="3">3 — Normal</option><option value="4">4</option><option value="5">5 — Essential</option></select></label>}<div className="form-actions full"><button type="button" className="button button-ghost" onClick={() => setTarget(null)}>Cancel</button><button className="button button-primary"><Plus size={16} />Add {target?.type}</button></div></form></Modal>
  </div>;
}
