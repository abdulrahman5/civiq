import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Database-level isolation between legislators (defence in depth).
//
// Public-website queries run as the restricted role `civiq_web` inside a transaction that sets
// `civiq.tenant_id` (see asSite() in src/lib/payload.ts). Row-level security on every tenant-owned
// table then only shows, and only accepts, rows of that tenant. With no tenant set it sees nothing.
// `civiq_web` can read only the public site's tables (never users or console data) and can only
// insert contact messages and supporters. The console and migrations keep using the normal role.
//
// When a later migration adds a table the public site reads (e.g. a new array field on Site
// settings), call `SELECT civiq_grant_web();` in it; a new tenant-owned table also needs a policy.

const TENANT_TABLES = ['site_settings', 'about', 'agenda', 'news', 'projects', 'media', 'messages', 'supporters']

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'civiq_web') THEN
        CREATE ROLE civiq_web NOLOGIN NOBYPASSRLS;
      END IF;
      -- Let the app's own role switch to civiq_web (SET LOCAL ROLE) without inheriting its rights.
      IF current_setting('server_version_num')::int >= 160000 THEN
        EXECUTE format('GRANT civiq_web TO %I WITH INHERIT FALSE, SET TRUE', current_user);
      ELSE
        EXECUTE format('GRANT civiq_web TO %I', current_user);
      END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'The database user % cannot create roles. Civiq needs a database user with the CREATEROLE privilege (the default owner role on Neon has it).', current_user;
    END $$;

    CREATE OR REPLACE FUNCTION civiq_grant_web() RETURNS void LANGUAGE plpgsql AS $fn$
    DECLARE t text;
    BEGIN
      EXECUTE 'GRANT USAGE ON SCHEMA public TO civiq_web';
      EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO civiq_web';
      FOR t IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (
          tablename IN ('tenants', 'site_settings', 'about', 'agenda', 'news', 'projects', 'media', 'messages', 'supporters')
          OR tablename ~ '^(tenants|site_settings|about|agenda|supporters)_'
        )
      LOOP
        EXECUTE format('GRANT SELECT ON %I TO civiq_web', t);
      END LOOP;
      EXECUTE 'GRANT INSERT, UPDATE ON messages, supporters TO civiq_web';
      FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ~ '^supporters_' LOOP
        EXECUTE format('GRANT INSERT, UPDATE, DELETE ON %I TO civiq_web', t);
      END LOOP;
    END $fn$;

    SELECT civiq_grant_web();
  `)

  for (const table of TENANT_TABLES) {
    await db.execute(
      sql.raw(`
        ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS civiq_web_tenant ON "${table}";
        CREATE POLICY civiq_web_tenant ON "${table}" TO civiq_web
          USING ("tenant_id" = nullif(current_setting('civiq.tenant_id', true), '')::int)
          WITH CHECK ("tenant_id" = nullif(current_setting('civiq.tenant_id', true), '')::int);
      `),
    )
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const table of TENANT_TABLES) {
    await db.execute(sql.raw(`DROP POLICY IF EXISTS civiq_web_tenant ON "${table}"; ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`))
  }
  await db.execute(sql`
    DROP FUNCTION IF EXISTS civiq_grant_web();
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'civiq_web') THEN
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM civiq_web';
        EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM civiq_web';
        EXECUTE 'REVOKE USAGE ON SCHEMA public FROM civiq_web';
        EXECUTE 'DROP ROLE civiq_web';
      END IF;
    END $$;
  `)
}
