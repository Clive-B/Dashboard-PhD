import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured, db, userIdForEmail } from "@/lib/server/db";
import { currentEmail } from "@/lib/server/session";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("match"), id: z.string().uuid(), courseId: z.string().uuid(), moduleId: z.string().uuid().optional(), lectureId: z.string().uuid().optional() }),
  z.object({ action: z.literal("start_early"), id: z.string().uuid() })
]);

export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const configuration = { database: databaseConfigured(), webhookSecret: Boolean(process.env.OTTER_ZAPIER_WEBHOOK_SECRET), ingestUser: Boolean(process.env.OTTER_INGEST_USER_EMAIL || process.env.DEMO_EMAIL) };
  if (!databaseConfigured()) return NextResponse.json({ data: [], courses: [], mode: "local-demo", configuration });
  const userId = await userIdForEmail(email);
  const [items, courses] = await Promise.all([
    db().query(`SELECT oi.id,oi.external_recording_id AS "externalRecordingId",oi.title,oi.occurred_at AS "occurredAt",oi.status,oi.course_hint AS "courseHint",oi.speaker_names AS "speakerNames",oi.available_at AS "availableAt",oi.recommended_at AS "recommendedAt",oi.early_started_at AS "earlyStartedAt",oi.matched_at AS "matchedAt",oi.source_id AS "sourceId",left(oi.transcript,500) AS "transcriptPreview",c.title AS course,m.title AS module,l.title AS lecture FROM otter_ingestions oi LEFT JOIN courses c ON c.id=oi.course_id LEFT JOIN modules m ON m.id=oi.module_id LEFT JOIN lectures l ON l.id=oi.lecture_id WHERE oi.user_id=$1 ORDER BY oi.created_at DESC LIMIT 100`, [userId]),
    db().query(`SELECT c.id,c.code,c.title,jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'lectures',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'title',l.title) ORDER BY l.position,l.title) FROM lectures l WHERE l.module_id=m.id),'[]'::jsonb)) ORDER BY m.position,m.title) FILTER (WHERE m.id IS NOT NULL) AS modules FROM courses c LEFT JOIN modules m ON m.course_id=c.id WHERE c.user_id=$1 GROUP BY c.id ORDER BY c.title`, [userId])
  ]);
  return NextResponse.json({ data: items.rows, courses: courses.rows.map((course) => ({ ...course, modules: course.modules || [] })), mode: "postgresql", configuration });
}

export async function PATCH(request: Request) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured()) return NextResponse.json({ error: "PostgreSQL is required" }, { status: 503 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action", details: parsed.error.flatten() }, { status: 400 });
  const userId = await userIdForEmail(email);

  if (parsed.data.action === "start_early") {
    const updated = await db().query(`UPDATE otter_ingestions SET early_started_at=COALESCE(early_started_at,now()),updated_at=now() WHERE id=$1 AND user_id=$2 AND status='ready' RETURNING id`, [parsed.data.id, userId]);
    if (!updated.rowCount) return NextResponse.json({ error: "Ready lesson not found" }, { status: 404 });
    await db().query(`UPDATE calendar_events SET title='Day 3 retention checkpoint' WHERE user_id=$1 AND external_provider='otter' AND external_id=$2 AND event_type='lesson_review'`, [userId, parsed.data.id]);
    await db().query("INSERT INTO audit_logs(user_id,operation,entity_type,entity_id,result_status,metadata) VALUES($1,'lesson.start_early','otter_ingestion',$2,'success',$3)", [userId, parsed.data.id, JSON.stringify({ day3Preserved: true })]);
    return NextResponse.json({ ok: true, day3Mode: "retention_checkpoint" });
  }

  const input = parsed.data;
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const valid = await client.query(`SELECT oi.id,oi.title,oi.occurred_at,oi.transcript,oi.summary,oi.recommended_at,oi.source_id,oi.status,c.title AS course_title,m.title AS module_title,l.title AS lecture_title FROM otter_ingestions oi JOIN courses c ON c.id=$3 AND c.user_id=oi.user_id LEFT JOIN modules m ON m.id=$4 AND m.course_id=c.id LEFT JOIN lectures l ON l.id=$5 AND l.module_id=m.id WHERE oi.id=$1 AND oi.user_id=$2 AND ($4::uuid IS NULL OR m.id IS NOT NULL) AND ($5::uuid IS NULL OR l.id IS NOT NULL) FOR UPDATE`, [input.id, userId, input.courseId, input.moduleId || null, input.lectureId || null]);
    const item = valid.rows[0];
    if (!item) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Ingestion or course hierarchy not found" }, { status: 404 }); }
    if (item.source_id) { await client.query("ROLLBACK"); return NextResponse.json({ ok: true, sourceId: item.source_id, alreadyProcessed: true }); }
    if (!item.transcript) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Transcript content has not arrived from Zapier" }, { status: 409 }); }

    const inserted = await client.query<{ id: string }>(`INSERT INTO sources(user_id,domain,title,source_type,course_id,module_id,lecture_id,author_or_lecturer,source_date,tags,raw_text,status) VALUES($1,'academic',$2,'transcript',$3,$4,$5,$6,$7,$8,$9,'ready') RETURNING id`, [userId, item.title, input.courseId, input.moduleId || null, input.lectureId || null, "Otter.ai", item.occurred_at, ["otter", "lecture-transcript"], item.transcript]);
    const sourceId = inserted.rows[0].id;
    const chunks = String(item.transcript).match(/[\s\S]{1,1800}(?:\s|$)/g) || [String(item.transcript)];
    for (let index = 0; index < chunks.length; index++) await client.query("INSERT INTO source_chunks(source_id,chunk_index,content,metadata) VALUES($1,$2,$3,$4)", [sourceId, index, chunks[index].trim(), JSON.stringify({ provider: "otter", ingestionId: input.id })]);
    await client.query(`UPDATE otter_ingestions SET course_id=$3,module_id=$4,lecture_id=$5,source_id=$6,status='ready',matched_at=now(),updated_at=now() WHERE id=$1 AND user_id=$2`, [input.id, userId, input.courseId, input.moduleId || null, input.lectureId || null, sourceId]);
    const endAt = new Date(new Date(item.recommended_at).getTime() + 45 * 60_000).toISOString();
    await client.query(`INSERT INTO calendar_events(user_id,domain,title,starts_at,ends_at,event_type,external_provider,external_id,metadata) VALUES($1,'academic','Day 3 guided lesson',$2,$3,'lesson_review','otter',$4,$5) ON CONFLICT(user_id,external_provider,external_id,event_type) WHERE external_provider='otter' DO UPDATE SET starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,metadata=EXCLUDED.metadata`, [userId, item.recommended_at, endAt, input.id, JSON.stringify({ sourceId, courseId: input.courseId, earlyAccess: true, calendarDaysAfterLecture: 3 })]);
    await client.query("INSERT INTO audit_logs(user_id,operation,entity_type,entity_id,result_status,metadata) VALUES($1,'otter.match','otter_ingestion',$2,'success',$3)", [userId, input.id, JSON.stringify({ sourceId, chunkCount: chunks.length, courseId: input.courseId })]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, sourceId, chunks: chunks.length, recommendedAt: item.recommended_at });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Could not match the Otter transcript" }, { status: 500 });
  } finally {
    client.release();
  }
}
