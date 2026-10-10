import { NextResponse } from "next/server";
import { z } from "zod";
import { compare } from "bcryptjs";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { databaseConfigured, db } from "@/lib/server/db";

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(200) });

function formRedirect(location: string) {
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}

function configuredCredentials() {
  const email = process.env.DEMO_EMAIL?.trim();
  const password = process.env.DEMO_PASSWORD;
  const secret = process.env.AUTH_SECRET?.trim();

  if (process.env.NODE_ENV === "production") {
    if (!email || !password || !secret || secret.length < 32) return null;
    return { email, password };
  }

  return {
    email: email || "clive@example.com",
    password: password || "AicScholar!2026"
  };
}

async function authenticate(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (databaseConfigured()) {
    const result = await db().query<{ id: string; email: string; password_hash: string; role: string }>(
      "SELECT id,email,password_hash,role FROM users WHERE lower(email)=lower($1) LIMIT 1",
      [normalizedEmail]
    );
    const user = result.rows[0];
    if (!user || !(await compare(password, user.password_hash))) return null;
    return { email: user.email, userId: user.id, role: user.role };
  }
  const credentials = configuredCredentials();
  if (!credentials || normalizedEmail !== credentials.email.toLowerCase() || password !== credentials.password) return null;
  return { email: credentials.email, role: "owner" };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const formSubmission = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
  const payload = formSubmission
    ? Object.fromEntries((await request.formData()).entries())
    : await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(payload);
  if (!parsed.success) {
    return formSubmission
      ? formRedirect("/login?error=invalid")
      : NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }
  if (!databaseConfigured() && !configuredCredentials()) {
    return formSubmission
      ? formRedirect("/login?error=configuration")
      : NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  }
  const identity = await authenticate(parsed.data.email, parsed.data.password);
  if (!identity) {
    return formSubmission
      ? formRedirect("/login?error=credentials")
      : NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = await createSessionToken(identity);
  const response = formSubmission
    ? formRedirect("/command-center")
    : NextResponse.json({ ok: true });
  const embedded = process.env.ALLOW_GOOGLE_SITES_EMBED === "true";
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: embedded ? "none" : "lax", secure: embedded || process.env.NODE_ENV === "production", maxAge: 60 * 60 * 12, path: "/" });
  return response;
}
