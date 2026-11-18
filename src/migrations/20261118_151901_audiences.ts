import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_audiences_interests" AS ENUM('Volunteering', 'Youth programmes', 'Women’s programmes', 'Education', 'Health', 'Agriculture', 'Jobs & empowerment', 'Infrastructure', 'Events & town halls');
  CREATE TYPE "public"."enum_audiences_channels" AS ENUM('WhatsApp', 'SMS', 'Email', 'Phone call');
  CREATE TABLE "audiences_interests" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_audiences_interests",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "audiences_channels" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_audiences_channels",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "audiences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"require_email" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audiences_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audiences_id" integer;
  ALTER TABLE "audiences_interests" ADD CONSTRAINT "audiences_interests_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."audiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audiences_channels" ADD CONSTRAINT "audiences_channels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."audiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audiences" ADD CONSTRAINT "audiences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audiences_texts" ADD CONSTRAINT "audiences_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."audiences"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "audiences_interests_order_idx" ON "audiences_interests" USING btree ("order");
  CREATE INDEX "audiences_interests_parent_idx" ON "audiences_interests" USING btree ("parent_id");
  CREATE INDEX "audiences_channels_order_idx" ON "audiences_channels" USING btree ("order");
  CREATE INDEX "audiences_channels_parent_idx" ON "audiences_channels" USING btree ("parent_id");
  CREATE INDEX "audiences_tenant_idx" ON "audiences" USING btree ("tenant_id");
  CREATE INDEX "audiences_updated_at_idx" ON "audiences" USING btree ("updated_at");
  CREATE INDEX "audiences_created_at_idx" ON "audiences" USING btree ("created_at");
  CREATE INDEX "audiences_texts_order_parent" ON "audiences_texts" USING btree ("order","parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audiences_fk" FOREIGN KEY ("audiences_id") REFERENCES "public"."audiences"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_audiences_id_idx" ON "payload_locked_documents_rels" USING btree ("audiences_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "audiences_interests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audiences_channels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audiences" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audiences_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "audiences_interests" CASCADE;
  DROP TABLE "audiences_channels" CASCADE;
  DROP TABLE "audiences" CASCADE;
  DROP TABLE "audiences_texts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audiences_fk";
  
  DROP INDEX "payload_locked_documents_rels_audiences_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audiences_id";
  DROP TYPE "public"."enum_audiences_interests";
  DROP TYPE "public"."enum_audiences_channels";`)
}
