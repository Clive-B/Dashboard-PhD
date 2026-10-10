import { NextResponse } from "next/server";
import { databaseConfigured, db } from "@/lib/server/db";

function aiStatus() {
  return process.env.GENERAL_AI_ENABLED !== "false" && (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) ? "general-only" : "local-fallback";
}

export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ status: "ok", database: "local-demo", ai: aiStatus() });
  try { await db().query("SELECT 1"); return NextResponse.json({ status: "ok", database: "connected", ai: aiStatus() }); }
  catch { return NextResponse.json({ status: "degraded", database: "unavailable" }, { status: 503 }); }
}
