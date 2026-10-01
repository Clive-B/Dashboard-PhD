import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { lessonRecommendedAt } from "@/lib/lesson-scheduling";
import { databaseConfigured, db, userIdForEmail } from "@/lib/server/db";

export const runtime = "nodejs";

const payloadSchema = z.object({
  recordingId: z.string().trim().max(500).optional(),
  title: z.string().trim().min(1).max(500),
  recordedAt: z.string().datetime({ offset: true }),
  transcript: z.string().max(2_000_000).optional().default(""),
  summary: z.string().max(100_000).optional().default(""),
  speakerNames: z.union([z.array(z.string().trim().max(200)).max(100), z.string().max(10_000)]).optional(),
  courseHint: z.string().trim().max(300).optional(),
  sourceUrl: z.string().url().max(2_000).optional()
});

function authorized(request: Request) {
  const configured = process.env.OTTER_ZAPIER_WEBHOOK_SECRET || "";
  const supplied = request.headers.get("x-aic-webhook-secret") || "";
  if (!configured || !supplied) return false;
  const configuredBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  return configuredBuffer.length === suppliedBuffer.length && timingSafeEqual(configuredBuffer, suppliedBuffer);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
  if (!databaseConfigured()) return NextResponse.json({ error: "PostgreSQL is required for external ingestion" }, { status: 503 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid Otter payload", details: parsed.error.flatten() }, { status: 400 });

  const input = parsed.data;
  const email = process.env.OTTER_INGEST_USER_EMAIL || process.env.DEMO_EMAIL;
  if (!email) return NextResponse.json({ error: "OTTER_INGEST_USER_EMAIL is not configured" }, { status: 503 });

  const userId = await userIdForEmail(email);
  const externalId = input.recordingId || createHash("sha256").update(`${input.title}|${input.recordedAt}`).digest("hex");
  const speakers = Array.isArray(input.speakerNames)
    ? input.speakerNames.filter(Boolean)
    : (input.speakerNames || "").split(/[,;\n]/).map((name) => name.trim()).filter(Boolean);
  const recommendedAt = lessonRecommendedAt(input.recordedAt);
  const status = input.transcript.trim() ? "awaiting_match" : "awaiting_transcript";
  const metadata = { provider: "otter", transport: "zapier", sourceUrl: input.sourceUrl || null, transcriptReceived: Boolean(input.transcript.trim()) };

  const result = await db().query<{ id: string; status: string }>(`
    INSERT INTO otter_ingestions(user_id,external_recording_id,title,occurred_at,transcript,summary,speaker_names,course_hint,status,recommended_at,metadata)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT(user_id,external_recording_id) DO UPDATE SET
      title=EXCLUDED.title,
      occurred_at=EXCLUDED.occurred_at,
      transcript=COALESCE(NULLIF(EXCLUDED.transcript,''),otter_ingestions.transcript),
      summary=COALESCE(NULLIF(EXCLUDED.summary,''),otter_ingestions.summary),
      speaker_names=CASE WHEN cardinality(EXCLUDED.speaker_names)>0 THEN EXCLUDED.speaker_names ELSE otter_ingestions.speaker_names END,
      course_hint=COALESCE(EXCLUDED.course_hint,otter_ingestions.course_hint),
      status=CASE WHEN otter_ingestions.status='ready' THEN otter_ingestions.status ELSE EXCLUDED.status END,
      recommended_at=EXCLUDED.recommended_at,
      metadata=otter_ingestions.metadata || EXCLUDED.metadata,
      updated_at=now()
    RETURNING id,status`,
    [userId, externalId, input.title, input.recordedAt, input.transcript.trim() || null, input.summary.trim() || null, speakers, input.courseHint || null, status, recommendedAt, JSON.stringify(metadata)]
  );

  await db().query("INSERT INTO audit_logs(user_id,operation,entity_type,entity_id,result_status,metadata) VALUES($1,'otter.ingest','otter_ingestion',$2,'success',$3)", [userId, result.rows[0].id, JSON.stringify({ transport: "zapier", status: result.rows[0].status })]);
  return NextResponse.json({ accepted: true, id: result.rows[0].id, status: result.rows[0].status, recommendedAt }, { status: 202 });
}
