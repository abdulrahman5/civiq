import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "messages_replies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"sent_at" timestamp(3) with time zone NOT NULL,
  	"sent_by_id" integer,
  	"sent_by_name" varchar,
  	"to" varchar,
  	"subject" varchar,
  	"body" varchar
  );
  
  ALTER TABLE "messages" ALTER COLUMN "status" SET DATA TYPE text;
  -- Map the old statuses onto the new ones before the column becomes the new enum again.
  UPDATE "messages" SET "status" = CASE "status"
    WHEN 'new' THEN 'unread' WHEN 'in-progress' THEN 'read' WHEN 'handled' THEN 'archived' ELSE 'unread' END;
  ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'unread'::text;
  DROP TYPE "public"."enum_messages_status";
  CREATE TYPE "public"."enum_messages_status" AS ENUM('unread', 'read', 'archived');
  ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'unread'::"public"."enum_messages_status";
  ALTER TABLE "messages" ALTER COLUMN "status" SET DATA TYPE "public"."enum_messages_status" USING "status"::"public"."enum_messages_status";
  ALTER TABLE "messages" ADD COLUMN "last_replied_at" timestamp(3) with time zone;
  ALTER TABLE "messages_replies" ADD CONSTRAINT "messages_replies_sent_by_id_users_id_fk" FOREIGN KEY ("sent_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages_replies" ADD CONSTRAINT "messages_replies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "messages_replies_order_idx" ON "messages_replies" USING btree ("_order");
  CREATE INDEX "messages_replies_parent_id_idx" ON "messages_replies" USING btree ("_parent_id");
  CREATE INDEX "messages_replies_sent_by_idx" ON "messages_replies" USING btree ("sent_by_id");`)

  // Row-level security for child tables (array and multi-select rows) of tenant-owned documents.
  // The public site's restricted role reads these when Payload returns a document it just saved
  // (e.g. a contact message and its replies). Each child row is visible only if its parent is,
  // and the parent is already limited to the current legislator.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION civiq_grant_web() RETURNS void LANGUAGE plpgsql AS $fn$
    DECLARE t text;
    BEGIN
      EXECUTE 'GRANT USAGE ON SCHEMA public TO civiq_web';
      EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO civiq_web';
      FOR t IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (
          tablename IN ('tenants', 'site_settings', 'about', 'agenda', 'news', 'projects', 'media', 'messages', 'supporters')
          OR tablename ~ '^(tenants|site_settings|about|agenda|supporters|messages)_'
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

    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT c.relname AS child, p.relname AS parent, a.attname AS col
        FROM pg_constraint k
        JOIN pg_class c ON c.oid = k.conrelid
        JOIN pg_class p ON p.oid = k.confrelid
        JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
        WHERE k.contype = 'f'
          AND a.attname IN ('_parent_id', 'parent_id')
          AND p.relname IN ('site_settings', 'about', 'agenda', 'supporters', 'messages')
      LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.child);
        EXECUTE format('DROP POLICY IF EXISTS civiq_web_parent ON %I', r.child);
        EXECUTE format(
          'CREATE POLICY civiq_web_parent ON %I TO civiq_web USING (EXISTS (SELECT 1 FROM %I p WHERE p.id = %I)) WITH CHECK (EXISTS (SELECT 1 FROM %I p WHERE p.id = %I))',
          r.child, r.parent, r.col, r.parent, r.col);
      END LOOP;
    END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "messages_replies" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "messages_replies" CASCADE;
  ALTER TABLE "messages" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'new'::text;
  DROP TYPE "public"."enum_messages_status";
  CREATE TYPE "public"."enum_messages_status" AS ENUM('new', 'in-progress', 'handled');
  ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."enum_messages_status";
  ALTER TABLE "messages" ALTER COLUMN "status" SET DATA TYPE "public"."enum_messages_status" USING "status"::"public"."enum_messages_status";
  ALTER TABLE "messages" DROP COLUMN "last_replied_at";`)
}
