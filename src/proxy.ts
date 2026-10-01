import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));
  try { await verifySessionToken(token); return NextResponse.next(); }
  catch { const response = NextResponse.redirect(new URL("/login", request.url)); response.cookies.delete(SESSION_COOKIE); return response; }
}

export const config = { matcher: ["/command-center/:path*", "/courses/:path*", "/otter-inbox/:path*", "/knowledge-vault/:path*", "/revision/:path*", "/podcast/:path*", "/mastery/:path*", "/phd-planner/:path*", "/work-watchdog/:path*", "/calendar/:path*", "/aic-assistant/:path*", "/settings/:path*"] };
