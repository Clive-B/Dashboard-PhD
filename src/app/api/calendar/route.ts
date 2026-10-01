import { NextResponse } from "next/server";
import { databaseConfigured, db, userIdForEmail } from "@/lib/server/db";
import { currentEmail } from "@/lib/server/session";

export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured()) return NextResponse.json({ data: [], mode: "local-demo" });
  const userId = await userIdForEmail(email);
  const result = await db().query(`SELECT id,title,starts_at AS "startsAt",ends_at AS "endsAt",event_type AS "eventType",external_provider AS "externalProvider",metadata FROM calendar_events WHERE user_id=$1 AND starts_at >= now() - interval '45 days' AND starts_at < now() + interval '180 days' ORDER BY starts_at`, [userId]);
  return NextResponse.json({ data: result.rows, mode: "postgresql" });
}
