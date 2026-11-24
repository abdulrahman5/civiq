import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_checks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer NOT NULL,
  	"url" varchar NOT NULL,
  	"ok" boolean DEFAULT false,
  	"status_code" numeric,
  	"response_ms" numeric,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "support_requests" ALTER COLUMN "status" DROP NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "site_checks_id" integer;
  ALTER TABLE "site_checks" ADD CONSTRAINT "site_checks_site_id_tenants_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_checks_site_idx" ON "site_checks" USING btree ("site_id");
  CREATE INDEX "site_checks_ok_idx" ON "site_checks" USING btree ("ok");
  CREATE INDEX "site_checks_updated_at_idx" ON "site_checks" USING btree ("updated_at");
  CREATE INDEX "site_checks_created_at_idx" ON "site_checks" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_checks_fk" FOREIGN KEY ("site_checks_id") REFERENCES "public"."site_checks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_site_checks_id_idx" ON "payload_locked_documents_rels" USING btree ("site_checks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_checks" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_checks" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_site_checks_fk";
  
  DROP INDEX "payload_locked_documents_rels_site_checks_id_idx";
  ALTER TABLE "support_requests" ALTER COLUMN "status" SET NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "site_checks_id";`)
}
