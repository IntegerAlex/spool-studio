import { execSync } from "node:child_process"
import { loadEnvConfig } from "@next/env"
import { getPool } from "../src/lib/db"

loadEnvConfig(process.cwd())

async function freshDB() {
  const pool = getPool()
  const client = await pool.connect()

  try {
    // Drop everything in the public schema, including the drizzle journal schema,
    // so the subsequent `drizzle-kit migrate` rebuilds the database from scratch.
    console.log("Dropping all objects in public + drizzle schemas...")
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public' AND c.relkind = 'r'
        LOOP
          EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', r.relname);
        END LOOP;
        FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE n.nspname = 'public' AND t.typtype = 'e'
        LOOP
          EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', r.typname);
        END LOOP;
        FOR r IN SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
          FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
        LOOP
          EXECUTE format('DROP FUNCTION IF EXISTS %I(%s) CASCADE', r.proname, r.args);
        END LOOP;
      END $$;
    `)
    await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE")
    console.log("All objects dropped.")
  } finally {
    client.release()
    await pool.end()
  }

  // Rebuild from the canonical drizzle-kit migrations (drizzle/migrations/*).
  console.log("Rebuilding from Drizzle migrations...")
  execSync("npx drizzle-kit migrate", { stdio: "inherit" })
  console.log("\nFresh database ready.")
}

freshDB().catch((err) => {
  // SAFETY: execSync/rejected promise surfaces Error instances; .message is set.
  console.error("Failed:", (err as Error).message)
  process.exit(1)
})
