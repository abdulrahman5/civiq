import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_leads_role" AS ENUM('Legislator', 'Chief of staff', 'Media aide', 'Other office staff', 'Party or caucus', 'Other');
  CREATE TYPE "public"."enum_leads_chamber" AS ENUM('senate', 'reps', 'unsure');
  CREATE TYPE "public"."enum_leads_status" AS ENUM('new', 'contacted', 'demo-booked', 'signed', 'not-now');
  CREATE TABLE "leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_leads_role",
  	"phone" varchar,
  	"email" varchar,
  	"legislator_name" varchar,
  	"chamber" "enum_leads_chamber",
  	"constituency" varchar,
  	"message" varchar,
  	"status" "enum_leads_status" DEFAULT 'new' NOT NULL,
  	"notes" varchar,
  	"site_id" integer,
  	"consent_at" timestamp(3) with time zone,
  	"consent_text" varchar,
  	"source" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "civiq_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sales_email" varchar,
  	"whatsapp" varchar,
  	"lead_notify_email" varchar,
  	"linkedin" varchar,
  	"x" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "tenants" ADD COLUMN "showcase" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "leads_id" integer;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_site_id_tenants_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "leads_site_idx" ON "leads" USING btree ("site_id");
  CREATE INDEX "leads_updated_at_idx" ON "leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("leads_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "leads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "civiq_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "leads" CASCADE;
  DROP TABLE "civiq_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_leads_fk";
  
  DROP INDEX "payload_locked_documents_rels_leads_id_idx";
  ALTER TABLE "tenants" DROP COLUMN "showcase";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "leads_id";
  DROP TYPE "public"."enum_leads_role";
  DROP TYPE "public"."enum_leads_chamber";
  DROP TYPE "public"."enum_leads_status";`)
}
