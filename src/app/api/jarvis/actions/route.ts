import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jarvisCapability, permanentJarvisDenial, requiresHumanApproval, type JarvisCapability } from "@/lib/jarvis";
import { databaseConfigured, db } from "@/lib/server/db";
import { currentSession } from "@/lib/server/session";

const requestSchema = z.object({
  capability: z.string(),
  actionType: z.string().min(1).max(120),
  summary: z.string().min(1).max(500),
  payload: z.record(z.string(), z.unknown()).default({})
});

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured() || !session.userId) return NextResponse.json({ error: "PostgreSQL identity is required" }, { status: 503 });
  const result = await db().query(
    `SELECT id,capability,action_type AS "actionType",risk_level AS "riskLevel",summary,status,
            approval_required AS "approvalRequired",decided_at AS "decidedAt",expires_at AS "expiresAt",created_at AS "createdAt"
     FROM jarvis_action_requests WHERE requested_by=$1 ORDER BY created_at DESC LIMIT 100`,
    [session.userId]
  );
  return NextResponse.json({ data: result.rows, executionEnabled: false });
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured() || !session.userId) return NextResponse.json({ error: "PostgreSQL identity is required" }, { status: 503 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action request", details: parsed.error.flatten() }, { status: 400 });
  const permanentDenial = permanentJarvisDenial(parsed.data.capability);
  if (permanentDenial) return NextResponse.json({ error: permanentDenial, permanentlyDenied: true }, { status: 403 });
  const definition = jarvisCapability(parsed.data.capability);
  if (!definition) return NextResponse.json({ error: "Capability is not registered" }, { status: 403 });
  const payloadJson = JSON.stringify(parsed.data.payload);
  if (payloadJson.length > 20_000) return NextResponse.json({ error: "Action payload is too large" }, { status: 413 });
  const permission = await db().query<{ effect: "allow" | "deny" }>(
    `SELECT effect FROM user_permissions
     WHERE user_id=$1 AND capability=$2 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())
     ORDER BY granted_at DESC LIMIT 1`,
    [session.userId, parsed.data.capability]
  );
  if (permission.rows[0]?.effect !== "allow") return NextResponse.json({ error: "Capability is denied by default" }, { status: 403 });
  const approvalRequired = requiresHumanApproval(parsed.data.capability as JarvisCapability);
  const initialStatus = approvalRequired ? "requested" : "approved";
  const payloadHash = createHash("sha256").update(payloadJson).digest("hex");
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string }>(
      `INSERT INTO jarvis_action_requests(requested_by,capability,action_type,risk_level,summary,payload,payload_sha256,status,approval_required,approved_by,decided_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [session.userId, parsed.data.capability, parsed.data.actionType, definition.risk, parsed.data.summary, parsed.data.payload, payloadHash, initialStatus, approvalRequired, approvalRequired ? null : session.userId, approvalRequired ? null : new Date()]
    );
    await client.query(
      "INSERT INTO jarvis_action_events(action_request_id,actor_user_id,event_type,metadata) VALUES($1,$2,$3,$4)",
      [result.rows[0].id, session.userId, initialStatus, { payloadSha256: payloadHash, executionEnabled: false }]
    );
    await client.query("COMMIT");
    return NextResponse.json({ id: result.rows[0].id, status: initialStatus, approvalRequired, executionEnabled: false }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Could not create Jarvis action request:", error instanceof Error ? error.message : "Unknown database error");
    return NextResponse.json({ error: "Could not create action request" }, { status: 500 });
  } finally {
    client.release();
  }
}
