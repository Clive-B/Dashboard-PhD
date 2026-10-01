import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "aic_scholar_session";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "aic-scholar-local-development-secret-change-me");
}

export async function createSessionToken(email: string) {
  return new SignJWT({ email, role: "scholar" }).setProtectedHeader({ alg: "HS256" }).setSubject(email).setIssuedAt().setExpirationTime("12h").sign(secret());
}

export async function verifySessionToken(token: string) {
  return jwtVerify(token, secret());
}
