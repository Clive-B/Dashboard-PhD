import { NextResponse } from "next/server";
import { aiGatewayToken } from "@/lib/server/aiGateway";
import { databaseConfigured, db } from "@/lib/server/db";

async function aiStatus() {
  return await aiGatewayToken() ? "general-only" : "local-fallback";
}

export async function GET() {
  const ai = await aiStatus();
  if (!databaseConfigured()) return NextResponse.json({ status: "ok", database: "local-demo", ai });
  try { await db().query("SELECT 1"); return NextResponse.json({ status: "ok", database: "connected", ai }); }
  catch { return NextResponse.json({ status: "degraded", database: "unavailable" }, { status: 503 }); }
}
