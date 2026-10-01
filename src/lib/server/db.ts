import "server-only";
import pg from "pg";

let pool: pg.Pool | undefined;

export function databaseConfigured() { return Boolean(process.env.DATABASE_URL); }

export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
  return pool;
}

export async function userIdForEmail(email: string) {
  const result = await db().query<{ id: string }>("SELECT id FROM users WHERE email=$1 LIMIT 1", [email]);
  if (!result.rows[0]) throw new Error("Authenticated user has no database record. Run npm run db:seed.");
  return result.rows[0].id;
}
