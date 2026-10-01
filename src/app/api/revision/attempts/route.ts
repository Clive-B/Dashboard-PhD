import { NextResponse } from "next/server";
import { z } from "zod";
import { nextRevisionDate } from "@/lib/algorithms";
import { databaseConfigured, db, userIdForEmail } from "@/lib/server/db";
import { currentEmail } from "@/lib/server/session";

const schema = z.object({ questionId: z.string().uuid(), conceptId: z.string().uuid(), answer: z.string().max(20_000), score: z.number().int().min(0).max(5), previousAttempts: z.number().int().min(0).default(0) });
export async function POST(request: Request) {
  const email = await currentEmail(); if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured()) return NextResponse.json({ error: "PostgreSQL is not configured; the browser-local revision engine remains available." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
  const userId = await userIdForEmail(email); const input = parsed.data; const nextReview = nextRevisionDate(input.score,input.previousAttempts);
  const result = await db().query<{id:string}>("INSERT INTO revision_attempts(question_id,user_id,user_answer,score,next_review_at) VALUES($1,$2,$3,$4,$5) RETURNING id",[input.questionId,userId,input.answer,input.score,nextReview]);
  await db().query(`INSERT INTO mastery_records(user_id,concept_id,state,rolling_score,attempt_count,last_reviewed_at,next_review_at) VALUES($1,$2,'exposed',$3,1,now(),$4) ON CONFLICT(user_id,concept_id) DO UPDATE SET rolling_score=((mastery_records.rolling_score*mastery_records.attempt_count)+$3)/(mastery_records.attempt_count+1),attempt_count=mastery_records.attempt_count+1,last_reviewed_at=now(),next_review_at=$4,updated_at=now()`,[userId,input.conceptId,input.score,nextReview]);
  return NextResponse.json({ id: result.rows[0].id, nextReview }, { status: 201 });
}
