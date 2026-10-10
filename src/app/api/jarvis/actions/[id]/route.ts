import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured, db } from "@/lib/server/db";
import { currentSession } from "@/lib/server/session";

const decisionSchema = z.object({ decision: z.enum(["approve", "deny"]), note: z.string().max(500).optional() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured() || !session.userId) return NextResponse.json({ error: "PostgreSQL identity is required" }, { status: 503 });
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid action id" }, { status: 400 });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision", details: parsed.error.flatten() }, { status: 400 });
  const status = parsed.data.decision === "approve" ? "approved" : "denied";
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string }>(
      `UPDATE jarvis_action_requests SET status=$1,approved_by=$2,decided_at=now(),decision_note=$3,updated_at=now()
       WHERE id=$4 AND requested_by=$2 AND status='requested' AND expires_at>now() RETURNING id`,
      [status, session.userId, parsed.data.note || null, id]
    );
    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Pending action not found or approval expired" }, { status: 409 });
    }
    await client.query("INSERT INTO jarvis_action_events(action_request_id,actor_user_id,event_type,metadata) VALUES($1,$2,$3,$4)", [id, session.userId, status, { note: parsed.data.note || null, executionEnabled: false }]);
    await client.query("COMMIT");
    return NextResponse.json({ id, status, executionEnabled: false });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Could not decide Jarvis action:", error instanceof Error ? error.message : "Unknown database error");
    return NextResponse.json({ error: "Could not record decision" }, { status: 500 });
  } finally {
    client.release();
  }
}
