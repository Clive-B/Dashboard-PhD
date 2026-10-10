import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "aic_scholar_session";

function secret() {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured && configured.length >= 32) return new TextEncoder().encode(configured);
  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode("aic-scholar-local-development-secret-change-me");
  }
  throw new Error("AUTH_SECRET must contain at least 32 characters in production.");
}

export async function createSessionToken(email: string) {
  return new SignJWT({ email, role: "scholar" }).setProtectedHeader({ alg: "HS256" }).setSubject(email).setIssuedAt().setExpirationTime("12h").sign(secret());
}

export async function verifySessionToken(token: string) {
  return jwtVerify(token, secret());
}
