import pg from "pg";
import { readdir, readFile } from "node:fs/promises";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const migrationsUrl = new URL("../db/migrations/", import.meta.url);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const baseline = await client.query("SELECT to_regclass('public.users') AS users_table");
  if (baseline.rows[0]?.users_table) {
    await client.query("INSERT INTO schema_migrations(name) VALUES('001_initial.sql') ON CONFLICT DO NOTHING");
  }

  const files = (await readdir(migrationsUrl)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
  for (const name of files) {
    const applied = await client.query("SELECT 1 FROM schema_migrations WHERE name=$1", [name]);
    if (applied.rowCount) continue;
    const sql = await readFile(new URL(name, migrationsUrl), "utf8");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [name]);
    console.log(`Applied ${name}`);
  }
  console.log("AIC Scholar database migrations complete.");
} finally {
  await client.end();
}
