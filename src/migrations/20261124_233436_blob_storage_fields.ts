import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Storage fields the Vercel Blob plugin uses (present in production whenever Blob is connected).
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "prefix" varchar DEFAULT '';
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
  ALTER TABLE "support_files" ADD COLUMN IF NOT EXISTS "prefix" varchar DEFAULT '';
  ALTER TABLE "support_files" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP COLUMN "prefix";
  ALTER TABLE "media" DROP COLUMN "_objectkey";
  ALTER TABLE "support_files" DROP COLUMN "prefix";
  ALTER TABLE "support_files" DROP COLUMN "_objectkey";`)
}
