import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "invited_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "invited_by_name" varchar;
  ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "invited_at";
  ALTER TABLE "users" DROP COLUMN "invited_by_name";
  ALTER TABLE "users" DROP COLUMN "last_seen_at";`)
}
