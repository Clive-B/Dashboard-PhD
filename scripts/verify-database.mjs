import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const url = new URL(process.env.DATABASE_URL);
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
if (!isLocal && url.searchParams.get("sslmode") !== "verify-full") {
  throw new Error("Remote DATABASE_URL must use sslmode=verify-full.");
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const connection = await client.query(`
    SELECT
      current_database() AS database_name,
      current_user AS database_user,
      version() AS server_version,
      COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()), false) AS tls_active
  `);
  const extensions = await client.query(`
    SELECT extname, extversion
    FROM pg_extension
    WHERE extname IN ('pgcrypto', 'vector')
    ORDER BY extname
  `);
  const migrations = await client.query(`
    SELECT name, applied_at
    FROM schema_migrations
    ORDER BY name
  `);

  const installed = new Set(extensions.rows.map((row) => row.extname));
  if (!isLocal && !connection.rows[0]?.tls_active) throw new Error("Remote database connection is not using TLS.");
  for (const required of ["pgcrypto", "vector"]) {
    if (!installed.has(required)) throw new Error(`Required extension is missing: ${required}`);
  }

  console.log(JSON.stringify({
    status: "ok",
    declaredRegion: process.env.DATABASE_REGION || "not-declared",
    host: url.hostname,
    database: connection.rows[0]?.database_name,
    user: connection.rows[0]?.database_user,
    tls: Boolean(connection.rows[0]?.tls_active),
    extensions: extensions.rows,
    migrations: migrations.rows.map((row) => row.name),
  }, null, 2));
} finally {
  await client.end();
}
