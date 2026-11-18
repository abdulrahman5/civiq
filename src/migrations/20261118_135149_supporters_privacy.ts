import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_supporters_interests" AS ENUM('Volunteering', 'Youth programmes', 'Women’s programmes', 'Education', 'Health', 'Agriculture', 'Jobs & empowerment', 'Infrastructure', 'Events & town halls');
  CREATE TYPE "public"."enum_supporters_channels" AS ENUM('WhatsApp', 'SMS', 'Email', 'Phone call');
  CREATE TYPE "public"."enum_supporters_status" AS ENUM('subscribed', 'unsubscribed');
  CREATE TABLE "supporters_interests" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_supporters_interests",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "supporters_channels" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_supporters_channels",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "supporters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"email" varchar,
  	"ward" varchar,
  	"lga" varchar,
  	"state" varchar,
  	"status" "enum_supporters_status" DEFAULT 'subscribed' NOT NULL,
  	"unsubscribed_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"consent_text" varchar NOT NULL,
  	"consent_source" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "site_settings" ADD COLUMN "privacy_email" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "privacy_policy" jsonb;
  ALTER TABLE "messages" ADD COLUMN "consent_at" timestamp(3) with time zone;
  ALTER TABLE "messages" ADD COLUMN "consent_text" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "supporters_id" integer;
  ALTER TABLE "supporters_interests" ADD CONSTRAINT "supporters_interests_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."supporters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "supporters_channels" ADD CONSTRAINT "supporters_channels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."supporters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "supporters" ADD CONSTRAINT "supporters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "supporters_interests_order_idx" ON "supporters_interests" USING btree ("order");
  CREATE INDEX "supporters_interests_parent_idx" ON "supporters_interests" USING btree ("parent_id");
  CREATE INDEX "supporters_channels_order_idx" ON "supporters_channels" USING btree ("order");
  CREATE INDEX "supporters_channels_parent_idx" ON "supporters_channels" USING btree ("parent_id");
  CREATE INDEX "supporters_tenant_idx" ON "supporters" USING btree ("tenant_id");
  CREATE INDEX "supporters_phone_idx" ON "supporters" USING btree ("phone");
  CREATE INDEX "supporters_email_idx" ON "supporters" USING btree ("email");
  CREATE INDEX "supporters_updated_at_idx" ON "supporters" USING btree ("updated_at");
  CREATE INDEX "supporters_created_at_idx" ON "supporters" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_supporters_fk" FOREIGN KEY ("supporters_id") REFERENCES "public"."supporters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_supporters_id_idx" ON "payload_locked_documents_rels" USING btree ("supporters_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "supporters_interests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "supporters_channels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "supporters" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "supporters_interests" CASCADE;
  DROP TABLE "supporters_channels" CASCADE;
  DROP TABLE "supporters" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_supporters_fk";
  
  DROP INDEX "payload_locked_documents_rels_supporters_id_idx";
  ALTER TABLE "site_settings" DROP COLUMN "privacy_email";
  ALTER TABLE "site_settings" DROP COLUMN "privacy_policy";
  ALTER TABLE "messages" DROP COLUMN "consent_at";
  ALTER TABLE "messages" DROP COLUMN "consent_text";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "supporters_id";
  DROP TYPE "public"."enum_supporters_interests";
  DROP TYPE "public"."enum_supporters_channels";
  DROP TYPE "public"."enum_supporters_status";`)
}
