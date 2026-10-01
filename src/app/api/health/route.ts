import { NextResponse } from "next/server";
import { databaseConfigured, db } from "@/lib/server/db";

export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ status: "ok", database: "local-demo", ai: process.env.OPENAI_API_KEY ? "configured" : "local-fallback" });
  try { await db().query("SELECT 1"); return NextResponse.json({ status: "ok", database: "connected", ai: process.env.OPENAI_API_KEY ? "configured" : "local-fallback" }); }
  catch { return NextResponse.json({ status: "degraded", database: "unavailable" }, { status: 503 }); }
}
