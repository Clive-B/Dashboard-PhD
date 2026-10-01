import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function currentEmail() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try { const verified = await verifySessionToken(token); return String(verified.payload.email || verified.payload.sub || ""); }
  catch { return null; }
}
