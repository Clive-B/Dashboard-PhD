import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(200) });

function formRedirect(location: string) {
  return new NextResponse(null, { status: 303, headers: { Location: location } });
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
  const expectedEmail = process.env.DEMO_EMAIL || "clive@example.com";
  const expectedPassword = process.env.DEMO_PASSWORD || "AicScholar!2026";
  if (parsed.data.email !== expectedEmail || parsed.data.password !== expectedPassword) {
    return formSubmission
      ? formRedirect("/login?error=credentials")
      : NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = await createSessionToken(parsed.data.email);
  const response = formSubmission
    ? formRedirect("/command-center")
    : NextResponse.json({ ok: true });
  const embedded = process.env.ALLOW_GOOGLE_SITES_EMBED === "true";
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: embedded ? "none" : "lax", secure: embedded || process.env.NODE_ENV === "production", maxAge: 60 * 60 * 12, path: "/" });
  return response;
}
