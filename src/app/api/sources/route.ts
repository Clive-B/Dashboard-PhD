import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured, db, userIdForEmail } from "@/lib/server/db";
import { currentEmail } from "@/lib/server/session";

const sourceSchema = z.object({
  title: z.string().min(1).max(300), sourceType: z.string().min(1).max(40), content: z.string().min(1).max(2_000_000),
  courseId: z.string().uuid().optional(), moduleId: z.string().uuid().optional(), lectureId: z.string().uuid().optional(),
  author: z.string().max(250).optional(), tags: z.array(z.string().max(50)).max(30).default([])
});

export async function GET(request: Request) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured()) return NextResponse.json({ data: [], mode: "local-demo" });
  const userId = await userIdForEmail(email);
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  const result = await db().query(`SELECT id,title,source_type AS "sourceType",author_or_lecturer AS author,tags,status,created_at AS "uploadedAt",left(raw_text,600) AS preview FROM sources WHERE user_id=$1 AND ($2='' OR title ILIKE '%'||$2||'%' OR raw_text ILIKE '%'||$2||'%' OR $2=ANY(tags)) ORDER BY created_at DESC LIMIT 100`, [userId, query]);
  return NextResponse.json({ data: result.rows, mode: "postgresql" });
}

export async function POST(request: Request) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured()) return NextResponse.json({ error: "PostgreSQL is not configured; use the browser-local Knowledge Vault in demo mode." }, { status: 503 });
  const parsed = sourceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid source", details: parsed.error.flatten() }, { status: 400 });
  const userId = await userIdForEmail(email); const input = parsed.data; const client = await db().connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: string }>(`INSERT INTO sources(user_id,title,source_type,course_id,module_id,lecture_id,author_or_lecturer,tags,raw_text,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'ready') RETURNING id`, [userId,input.title,input.sourceType,input.courseId||null,input.moduleId||null,input.lectureId||null,input.author||null,input.tags,input.content]);
    const sourceId = inserted.rows[0].id;
    const chunks = input.content.match(/[\s\S]{1,1800}(?:\s|$)/g) || [input.content];
    for (let index=0; index<chunks.length; index++) await client.query("INSERT INTO source_chunks(source_id,chunk_index,content) VALUES($1,$2,$3)",[sourceId,index,chunks[index].trim()]);
    await client.query("INSERT INTO audit_logs(user_id,operation,entity_type,entity_id,result_status,metadata) VALUES($1,'source.ingest','source',$2,'success',$3)",[userId,sourceId,JSON.stringify({chunkCount:chunks.length,sourceType:input.sourceType})]);
    await client.query("COMMIT"); return NextResponse.json({ id: sourceId, chunks: chunks.length }, { status: 201 });
  } catch (error) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Source ingestion failed" }, { status: 500 }); }
  finally { client.release(); }
}
