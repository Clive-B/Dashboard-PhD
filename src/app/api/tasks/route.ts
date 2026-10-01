import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured, db, userIdForEmail } from "@/lib/server/db";
import { currentEmail } from "@/lib/server/session";

const taskSchema = z.object({ domain: z.enum(["academic","work"]), title: z.string().min(1).max(300), type: z.string().max(80).default("Task"), parentId: z.string().uuid().optional(), deadline: z.coerce.date(), priority: z.enum(["low","medium","high","critical"]), estimatedMinutes: z.number().int().positive().max(100_000), notes: z.string().max(10_000).optional() });

export async function GET(request: Request) {
  const email = await currentEmail(); if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured()) return NextResponse.json({ data: [], mode: "local-demo" });
  const userId = await userIdForEmail(email); const domain = new URL(request.url).searchParams.get("domain") || "academic";
  const table = domain === "work" ? "work_tasks" : "academic_tasks";
  const result = await db().query(`SELECT id,title,deadline,priority,estimated_minutes AS "estimatedMinutes",actual_minutes AS "actualMinutes",status,progress,notes FROM ${table} WHERE user_id=$1 ORDER BY deadline`, [userId]);
  return NextResponse.json({ data: result.rows, mode: "postgresql" });
}

export async function POST(request: Request) {
  const email = await currentEmail(); if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured()) return NextResponse.json({ error: "PostgreSQL is not configured; use browser-local tasks in demo mode." }, { status: 503 });
  const parsed = taskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid task", details: parsed.error.flatten() }, { status: 400 });
  const userId = await userIdForEmail(email); const input = parsed.data;
  const result = input.domain === "work"
    ? await db().query<{id:string}>("INSERT INTO work_tasks(user_id,project_id,title,deadline,priority,estimated_minutes,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",[userId,input.parentId||null,input.title,input.deadline,input.priority,input.estimatedMinutes,input.notes||null])
    : await db().query<{id:string}>("INSERT INTO academic_tasks(user_id,course_id,title,task_type,deadline,priority,estimated_minutes,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",[userId,input.parentId||null,input.title,input.type,input.deadline,input.priority,input.estimatedMinutes,input.notes||null]);
  return NextResponse.json({ id: result.rows[0].id }, { status: 201 });
}
