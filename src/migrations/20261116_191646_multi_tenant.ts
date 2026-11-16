import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Timestamps on the former single-site "global" tables become required below; fill any gaps first.
  for (const table of ['site_settings', 'about', 'agenda']) {
    await db.execute(sql.raw(`UPDATE "${table}" SET "created_at" = COALESCE("created_at", now()), "updated_at" = COALESCE("updated_at", now())`))
  }

  await db.execute(sql`
   CREATE TYPE "public"."enum_users_tenants_role" AS ENUM('admin', 'editor', 'contributor');
  CREATE TYPE "public"."enum_users_platform_role" AS ENUM('platform-admin', 'member');
  CREATE TYPE "public"."enum_tenants_status" AS ENUM('active', 'suspended');
  CREATE TABLE "users_tenants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tenant_id" integer NOT NULL,
  	"role" "enum_users_tenants_role" DEFAULT 'editor' NOT NULL
  );
  
  CREATE TABLE "tenants_domains" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"domain" varchar NOT NULL
  );
  
  CREATE TABLE "tenants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"primary_domain" varchar,
  	"status" "enum_tenants_status" DEFAULT 'active' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  DROP INDEX "news_slug_idx";
  ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
  ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "site_settings" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "site_settings" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "about" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "about" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "agenda" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "agenda" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "agenda" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "agenda" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "news" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_news_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "projects" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "_projects_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "media" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "messages" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "users" ADD COLUMN "platform_role" "enum_users_platform_role" DEFAULT 'member' NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "site_settings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "about_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agenda_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tenants_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "about" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "agenda" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tenants_domains" ADD CONSTRAINT "tenants_domains_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_tenants_order_idx" ON "users_tenants" USING btree ("_order");
  CREATE INDEX "users_tenants_parent_id_idx" ON "users_tenants" USING btree ("_parent_id");
  CREATE INDEX "users_tenants_tenant_idx" ON "users_tenants" USING btree ("tenant_id");
  CREATE INDEX "tenants_domains_order_idx" ON "tenants_domains" USING btree ("_order");
  CREATE INDEX "tenants_domains_parent_id_idx" ON "tenants_domains" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");
  CREATE UNIQUE INDEX "tenants_primary_domain_idx" ON "tenants" USING btree ("primary_domain");
  CREATE INDEX "tenants_updated_at_idx" ON "tenants" USING btree ("updated_at");
  CREATE INDEX "tenants_created_at_idx" ON "tenants" USING btree ("created_at");
  ALTER TABLE "news" ADD CONSTRAINT "news_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_settings_fk" FOREIGN KEY ("site_settings_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_about_fk" FOREIGN KEY ("about_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agenda_fk" FOREIGN KEY ("agenda_id") REFERENCES "public"."agenda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenants_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agenda" ADD CONSTRAINT "agenda_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "news_tenant_idx" ON "news" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "tenant_slug_idx" ON "news" USING btree ("tenant_id","slug");
  CREATE INDEX "_news_v_version_version_tenant_idx" ON "_news_v" USING btree ("version_tenant_id");
  CREATE INDEX "version_tenant_version_slug_idx" ON "_news_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "projects_tenant_idx" ON "projects" USING btree ("tenant_id");
  CREATE INDEX "_projects_v_version_version_tenant_idx" ON "_projects_v" USING btree ("version_tenant_id");
  CREATE INDEX "media_tenant_idx" ON "media" USING btree ("tenant_id");
  CREATE INDEX "messages_tenant_idx" ON "messages" USING btree ("tenant_id");
  CREATE INDEX "payload_locked_documents_rels_site_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("site_settings_id");
  CREATE INDEX "payload_locked_documents_rels_about_id_idx" ON "payload_locked_documents_rels" USING btree ("about_id");
  CREATE INDEX "payload_locked_documents_rels_agenda_id_idx" ON "payload_locked_documents_rels" USING btree ("agenda_id");
  CREATE INDEX "payload_locked_documents_rels_tenants_id_idx" ON "payload_locked_documents_rels" USING btree ("tenants_id");
  CREATE UNIQUE INDEX "site_settings_tenant_idx" ON "site_settings" USING btree ("tenant_id");
  CREATE INDEX "site_settings_updated_at_idx" ON "site_settings" USING btree ("updated_at");
  CREATE INDEX "site_settings_created_at_idx" ON "site_settings" USING btree ("created_at");
  CREATE UNIQUE INDEX "about_tenant_idx" ON "about" USING btree ("tenant_id");
  CREATE INDEX "about_updated_at_idx" ON "about" USING btree ("updated_at");
  CREATE INDEX "about_created_at_idx" ON "about" USING btree ("created_at");
  CREATE UNIQUE INDEX "agenda_tenant_idx" ON "agenda" USING btree ("tenant_id");
  CREATE INDEX "agenda_updated_at_idx" ON "agenda" USING btree ("updated_at");
  CREATE INDEX "agenda_created_at_idx" ON "agenda" USING btree ("created_at");
  CREATE INDEX "news_slug_idx" ON "news" USING btree ("slug");`)

  // ---- Data: the existing single site becomes Civiq's first legislator site (tenant) ----
  // A brand-new database has nothing to move; the seed script creates its first site instead.
  const existing = await db.execute(sql`
    SELECT (SELECT count(*) FROM "site_settings") + (SELECT count(*) FROM "news") + (SELECT count(*) FROM "users") AS n`)
  if (Number(existing.rows[0]?.n ?? 0) === 0) return

  const named = await db.execute(sql`SELECT "name" FROM "site_settings" WHERE "name" IS NOT NULL ORDER BY "id" LIMIT 1`)
  const name = String(named.rows[0]?.name ?? 'Hon. Saidu Musa Abdullahi')
  const slug = process.env.MIGRATION_TENANT_SLUG || 'saidumusa'
  const created = await db.execute(sql`
    INSERT INTO "tenants" ("name", "slug", "status") VALUES (${name}, ${slug}, 'active') RETURNING "id"`)
  const tenant = Number(created.rows[0]!.id)

  // Every existing document belongs to that site, including saved draft versions.
  for (const table of ['site_settings', 'about', 'agenda', 'news', 'projects', 'media', 'messages']) {
    await db.execute(sql.raw(`UPDATE "${table}" SET "tenant_id" = ${tenant} WHERE "tenant_id" IS NULL`))
  }
  for (const table of ['_news_v', '_projects_v']) {
    await db.execute(sql.raw(`UPDATE "${table}" SET "version_tenant_id" = ${tenant} WHERE "version_tenant_id" IS NULL`))
  }

  // Old single-site roles map onto the new team: Super Admins also become Civiq platform admins.
  await db.execute(sql`UPDATE "users" SET "platform_role" = 'platform-admin' WHERE "role" = 'superadmin'`)
  await db.execute(sql`
    INSERT INTO "users_tenants" ("_order", "_parent_id", "id", "tenant_id", "role")
    SELECT 1, u."id", substr(md5(random()::text || u."id"::text), 1, 24), ${tenant},
      (CASE u."role" WHEN 'superadmin' THEN 'admin' WHEN 'contributor' THEN 'contributor' ELSE 'editor' END)::"enum_users_tenants_role"
    FROM "users" u
    WHERE NOT EXISTS (SELECT 1 FROM "users_tenants" t WHERE t."_parent_id" = u."id")`)

  payload.logger.info(`Moved the existing site into tenant “${name}” (${slug})`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_tenants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tenants_domains" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tenants" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "users_tenants" CASCADE;
  DROP TABLE "tenants_domains" CASCADE;
  DROP TABLE "tenants" CASCADE;
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_tenant_id_tenants_id_fk";
  
  ALTER TABLE "about" DROP CONSTRAINT "about_tenant_id_tenants_id_fk";
  
  ALTER TABLE "agenda" DROP CONSTRAINT "agenda_tenant_id_tenants_id_fk";
  
  ALTER TABLE "news" DROP CONSTRAINT "news_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_news_v" DROP CONSTRAINT "_news_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "projects" DROP CONSTRAINT "projects_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_projects_v" DROP CONSTRAINT "_projects_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "media" DROP CONSTRAINT "media_tenant_id_tenants_id_fk";
  
  ALTER TABLE "messages" DROP CONSTRAINT "messages_tenant_id_tenants_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_site_settings_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_about_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agenda_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tenants_fk";
  
  DROP INDEX "site_settings_tenant_idx";
  DROP INDEX "site_settings_updated_at_idx";
  DROP INDEX "site_settings_created_at_idx";
  DROP INDEX "about_tenant_idx";
  DROP INDEX "about_updated_at_idx";
  DROP INDEX "about_created_at_idx";
  DROP INDEX "agenda_tenant_idx";
  DROP INDEX "agenda_updated_at_idx";
  DROP INDEX "agenda_created_at_idx";
  DROP INDEX "news_tenant_idx";
  DROP INDEX "tenant_slug_idx";
  DROP INDEX "_news_v_version_version_tenant_idx";
  DROP INDEX "version_tenant_version_slug_idx";
  DROP INDEX "projects_tenant_idx";
  DROP INDEX "_projects_v_version_version_tenant_idx";
  DROP INDEX "media_tenant_idx";
  DROP INDEX "messages_tenant_idx";
  DROP INDEX "payload_locked_documents_rels_site_settings_id_idx";
  DROP INDEX "payload_locked_documents_rels_about_id_idx";
  DROP INDEX "payload_locked_documents_rels_agenda_id_idx";
  DROP INDEX "payload_locked_documents_rels_tenants_id_idx";
  DROP INDEX "news_slug_idx";
  ALTER TABLE "site_settings" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "site_settings" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "site_settings" ALTER COLUMN "created_at" DROP NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "about" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "about" ALTER COLUMN "created_at" DROP NOT NULL;
  ALTER TABLE "agenda" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "agenda" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "agenda" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "agenda" ALTER COLUMN "created_at" DROP NOT NULL;
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor';
  ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;
  CREATE UNIQUE INDEX "news_slug_idx" ON "news" USING btree ("slug");
  ALTER TABLE "site_settings" DROP COLUMN "tenant_id";
  ALTER TABLE "about" DROP COLUMN "tenant_id";
  ALTER TABLE "agenda" DROP COLUMN "tenant_id";
  ALTER TABLE "news" DROP COLUMN "tenant_id";
  ALTER TABLE "_news_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "projects" DROP COLUMN "tenant_id";
  ALTER TABLE "_projects_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "media" DROP COLUMN "tenant_id";
  ALTER TABLE "messages" DROP COLUMN "tenant_id";
  ALTER TABLE "users" DROP COLUMN "platform_role";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "site_settings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "about_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agenda_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tenants_id";
  DROP TYPE "public"."enum_users_tenants_role";
  DROP TYPE "public"."enum_users_platform_role";
  DROP TYPE "public"."enum_tenants_status";`)
}
