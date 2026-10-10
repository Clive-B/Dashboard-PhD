import { NextResponse } from "next/server";
import { z } from "zod";
import { isJarvisCapability } from "@/lib/jarvis";
import { databaseConfigured, db } from "@/lib/server/db";
import { currentSession } from "@/lib/server/session";

const grantSchema = z.object({
  capability: z.string().refine(isJarvisCapability, "Unknown capability"),
  effect: z.enum(["allow", "deny"]).default("allow"),
  scope: z.record(z.string(), z.unknown()).default({}),
  expiresAt: z.coerce.date().optional()
});

async function databaseIdentity() {
  const session = await currentSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!databaseConfigured() || !session.userId) return { error: NextResponse.json({ error: "PostgreSQL identity is required" }, { status: 503 }) };
  return { session };
}

export async function GET() {
  const identity = await databaseIdentity();
  if (identity.error) return identity.error;
  const result = await db().query(
    `SELECT DISTINCT ON (capability) id,capability,effect,scope,granted_at AS "grantedAt",expires_at AS "expiresAt"
     FROM user_permissions
     WHERE user_id=$1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())
     ORDER BY capability,granted_at DESC`,
    [identity.session.userId]
  );
  return NextResponse.json({ data: result.rows, defaultPolicy: "deny" });
}

export async function POST(request: Request) {
  const identity = await databaseIdentity();
  if (identity.error) return identity.error;
  if (identity.session.role !== "owner") return NextResponse.json({ error: "Owner approval is required" }, { status: 403 });
  const parsed = grantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid permission", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  if (input.expiresAt && input.expiresAt <= new Date()) return NextResponse.json({ error: "Expiry must be in the future" }, { status: 400 });
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE user_permissions SET revoked_at=now() WHERE user_id=$1 AND capability=$2 AND revoked_at IS NULL", [identity.session.userId, input.capability]);
    const result = await client.query<{ id: string }>(
      "INSERT INTO user_permissions(user_id,capability,effect,scope,granted_by,expires_at) VALUES($1,$2,$3,$4,$1,$5) RETURNING id",
      [identity.session.userId, input.capability, input.effect, input.scope, input.expiresAt || null]
    );
    await client.query(
      "INSERT INTO audit_logs(user_id,operation,entity_type,entity_id,result_status,metadata) VALUES($1,'jarvis.permission.set','user_permission',$2,'success',$3)",
      [identity.session.userId, result.rows[0].id, { capability: input.capability, effect: input.effect }]
    );
    await client.query("COMMIT");
    return NextResponse.json({ id: result.rows[0].id, defaultPolicy: "deny" }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Could not set Jarvis permission:", error instanceof Error ? error.message : "Unknown database error");
    return NextResponse.json({ error: "Could not set permission" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const identity = await databaseIdentity();
  if (identity.error) return identity.error;
  if (identity.session.role !== "owner") return NextResponse.json({ error: "Owner approval is required" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Valid permission id required" }, { status: 400 });
  const result = await db().query<{ id: string }>("UPDATE user_permissions SET revoked_at=now() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL RETURNING id", [id, identity.session.userId]);
  if (!result.rows[0]) return NextResponse.json({ error: "Permission not found" }, { status: 404 });
  await db().query("INSERT INTO audit_logs(user_id,operation,entity_type,entity_id,result_status) VALUES($1,'jarvis.permission.revoke','user_permission',$2,'success')", [identity.session.userId, id]);
  return NextResponse.json({ ok: true });
}
