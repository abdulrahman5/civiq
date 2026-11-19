import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tenants_chamber" AS ENUM('senate', 'reps');
  -- Sites created before templates existed are House of Representatives sites (e.g. SMA).
  ALTER TABLE "tenants" ADD COLUMN "chamber" "enum_tenants_chamber" NOT NULL DEFAULT 'reps';
  ALTER TABLE "tenants" ALTER COLUMN "chamber" DROP DEFAULT;
  ALTER TABLE "site_settings" DROP COLUMN "primary_color";
  ALTER TABLE "site_settings" DROP COLUMN "accent_color";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "primary_color" varchar DEFAULT '#0b5d3b';
  ALTER TABLE "site_settings" ADD COLUMN "accent_color" varchar DEFAULT '#c8a13a';
  ALTER TABLE "tenants" DROP COLUMN "chamber";
  DROP TYPE "public"."enum_tenants_chamber";`)
}
