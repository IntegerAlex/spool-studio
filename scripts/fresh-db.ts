import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool } from '../src/lib/db';

async function freshDB() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Drop everything
    console.log('Dropping all objects in public schema...');
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        -- Drop all tables in public schema
        FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public' AND c.relkind = 'r'
        LOOP
          EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', r.relname);
        END LOOP;

        -- Drop all enum types in public schema
        FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE n.nspname = 'public' AND t.typtype = 'e'
        LOOP
          EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', r.typname);
        END LOOP;

        -- Drop all functions in public schema
        FOR r IN SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
          FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
        LOOP
          EXECUTE format('DROP FUNCTION IF EXISTS %I(%s) CASCADE', r.proname, r.args);
        END LOOP;

        -- Drop _migrations
        DROP TABLE IF EXISTS _migrations CASCADE;
      END $$;
    `);
    console.log('All objects dropped.');

    // Run consolidated migration
    const sql = readFileSync(join(process.cwd(), 'supabase', 'migrations', '20260630000000_consolidated_standalone.sql'), 'utf-8');
    await client.query(sql);
    console.log('Consolidated migration applied.');

    // Verify
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    console.log('\nTables created:', tables.rows.map(r => r.tablename).join(', '));

    const types = await client.query("SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e' ORDER BY typname");
    console.log('Enums created:', types.rows.map(r => r.typname).join(', '));

    const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' ORDER BY ordinal_position");
    console.log('\nusers columns:', cols.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));

    console.log('\nFresh database ready.');
  } finally {
    client.release();
    await pool.end();
  }
}

freshDB().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
