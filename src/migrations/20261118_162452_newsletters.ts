import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_newsletters_status" AS ENUM('draft', 'scheduled', 'sending', 'sent');
  CREATE TYPE "public"."enum_newsletter_deliveries_status" AS ENUM('queued', 'claimed', 'sent', 'failed', 'bounced', 'complained');
  CREATE TABLE "newsletters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"subject" varchar NOT NULL,
  	"preview_text" varchar,
  	"audience_id" integer,
  	"image_id" integer,
  	"body" jsonb NOT NULL,
  	"button_label" varchar,
  	"button_url" varchar,
  	"status" "enum_newsletters_status" DEFAULT 'draft' NOT NULL,
  	"scheduled_at" timestamp(3) with time zone,
  	"sent_at" timestamp(3) with time zone,
  	"sent_by_name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "newsletter_deliveries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"newsletter_id" integer NOT NULL,
  	"supporter_id" integer,
  	"email" varchar NOT NULL,
  	"status" "enum_newsletter_deliveries_status" DEFAULT 'queued' NOT NULL,
  	"resend_id" varchar,
  	"sent_at" timestamp(3) with time zone,
  	"delivered_at" timestamp(3) with time zone,
  	"opened_at" timestamp(3) with time zone,
  	"clicked_at" timestamp(3) with time zone,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "newsletters_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "newsletter_deliveries_id" integer;
  ALTER TABLE "newsletters" ADD CONSTRAINT "newsletters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "newsletters" ADD CONSTRAINT "newsletters_audience_id_audiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "newsletters" ADD CONSTRAINT "newsletters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "newsletter_deliveries" ADD CONSTRAINT "newsletter_deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "newsletter_deliveries" ADD CONSTRAINT "newsletter_deliveries_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "newsletter_deliveries" ADD CONSTRAINT "newsletter_deliveries_supporter_id_supporters_id_fk" FOREIGN KEY ("supporter_id") REFERENCES "public"."supporters"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "newsletters_tenant_idx" ON "newsletters" USING btree ("tenant_id");
  CREATE INDEX "newsletters_audience_idx" ON "newsletters" USING btree ("audience_id");
  CREATE INDEX "newsletters_image_idx" ON "newsletters" USING btree ("image_id");
  CREATE INDEX "newsletters_updated_at_idx" ON "newsletters" USING btree ("updated_at");
  CREATE INDEX "newsletters_created_at_idx" ON "newsletters" USING btree ("created_at");
  CREATE INDEX "newsletter_deliveries_tenant_idx" ON "newsletter_deliveries" USING btree ("tenant_id");
  CREATE INDEX "newsletter_deliveries_newsletter_idx" ON "newsletter_deliveries" USING btree ("newsletter_id");
  CREATE INDEX "newsletter_deliveries_supporter_idx" ON "newsletter_deliveries" USING btree ("supporter_id");
  CREATE INDEX "newsletter_deliveries_status_idx" ON "newsletter_deliveries" USING btree ("status");
  CREATE INDEX "newsletter_deliveries_resend_id_idx" ON "newsletter_deliveries" USING btree ("resend_id");
  CREATE INDEX "newsletter_deliveries_updated_at_idx" ON "newsletter_deliveries" USING btree ("updated_at");
  CREATE INDEX "newsletter_deliveries_created_at_idx" ON "newsletter_deliveries" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletters_fk" FOREIGN KEY ("newsletters_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletter_deliveries_fk" FOREIGN KEY ("newsletter_deliveries_id") REFERENCES "public"."newsletter_deliveries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_newsletters_id_idx" ON "payload_locked_documents_rels" USING btree ("newsletters_id");
  CREATE INDEX "payload_locked_documents_rels_newsletter_deliveries_id_idx" ON "payload_locked_documents_rels" USING btree ("newsletter_deliveries_id");
  -- Never email the same address twice for one newsletter (the duplicate-send guard).
  CREATE UNIQUE INDEX "newsletter_deliveries_once" ON "newsletter_deliveries" ("newsletter_id", lower("email"));
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "newsletters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "newsletter_deliveries" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "newsletters" CASCADE;
  DROP TABLE "newsletter_deliveries" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_newsletters_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_newsletter_deliveries_fk";
  
  DROP INDEX "payload_locked_documents_rels_newsletters_id_idx";
  DROP INDEX "payload_locked_documents_rels_newsletter_deliveries_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "newsletters_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "newsletter_deliveries_id";
  DROP TYPE "public"."enum_newsletters_status";
  DROP TYPE "public"."enum_newsletter_deliveries_status";`)
}
