import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const verified = await verifySessionToken(token);
    const email = String(verified.payload.email || "");
    if (!email) return null;
    return {
      email,
      userId: typeof verified.payload.userId === "string" ? verified.payload.userId : undefined,
      role: typeof verified.payload.role === "string" ? verified.payload.role : "scholar"
    };
  }
  catch { return null; }
}

export async function currentEmail() {
  return (await currentSession())?.email || null;
}
