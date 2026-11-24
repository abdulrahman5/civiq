import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_support_requests_type" AS ENUM('issue', 'request', 'question', 'feedback');
  CREATE TYPE "public"."enum_support_requests_priority" AS ENUM('normal', 'urgent');
  CREATE TYPE "public"."enum_support_requests_status" AS ENUM('new', 'in-progress', 'waiting', 'resolved');
  CREATE TABLE "support_requests_messages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"author_name" varchar,
  	"from_civiq" boolean DEFAULT false,
  	"body" varchar NOT NULL
  );
  
  CREATE TABLE "support_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"type" "enum_support_requests_type" DEFAULT 'issue' NOT NULL,
  	"priority" "enum_support_requests_priority" DEFAULT 'normal' NOT NULL,
  	"subject" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"page_url" varchar,
  	"status" "enum_support_requests_status" DEFAULT 'new' NOT NULL,
  	"assignee_id" integer,
  	"internal_notes" varchar,
  	"submitted_by_id" integer,
  	"submitted_by_name" varchar,
  	"last_activity_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "support_requests_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"support_files_id" integer
  );
  
  CREATE TABLE "support_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "support_requests_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "support_files_id" integer;
  ALTER TABLE "civiq_settings" ADD COLUMN "support_email" varchar;
  ALTER TABLE "support_requests_messages" ADD CONSTRAINT "support_requests_messages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "support_requests_rels" ADD CONSTRAINT "support_requests_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_requests_rels" ADD CONSTRAINT "support_requests_rels_support_files_fk" FOREIGN KEY ("support_files_id") REFERENCES "public"."support_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_files" ADD CONSTRAINT "support_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "support_requests_messages_order_idx" ON "support_requests_messages" USING btree ("_order");
  CREATE INDEX "support_requests_messages_parent_id_idx" ON "support_requests_messages" USING btree ("_parent_id");
  CREATE INDEX "support_requests_tenant_idx" ON "support_requests" USING btree ("tenant_id");
  CREATE INDEX "support_requests_assignee_idx" ON "support_requests" USING btree ("assignee_id");
  CREATE INDEX "support_requests_submitted_by_idx" ON "support_requests" USING btree ("submitted_by_id");
  CREATE INDEX "support_requests_updated_at_idx" ON "support_requests" USING btree ("updated_at");
  CREATE INDEX "support_requests_created_at_idx" ON "support_requests" USING btree ("created_at");
  CREATE INDEX "support_requests_rels_order_idx" ON "support_requests_rels" USING btree ("order");
  CREATE INDEX "support_requests_rels_parent_idx" ON "support_requests_rels" USING btree ("parent_id");
  CREATE INDEX "support_requests_rels_path_idx" ON "support_requests_rels" USING btree ("path");
  CREATE INDEX "support_requests_rels_support_files_id_idx" ON "support_requests_rels" USING btree ("support_files_id");
  CREATE INDEX "support_files_tenant_idx" ON "support_files" USING btree ("tenant_id");
  CREATE INDEX "support_files_updated_at_idx" ON "support_files" USING btree ("updated_at");
  CREATE INDEX "support_files_created_at_idx" ON "support_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "support_files_filename_idx" ON "support_files" USING btree ("filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_support_requests_fk" FOREIGN KEY ("support_requests_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_support_files_fk" FOREIGN KEY ("support_files_id") REFERENCES "public"."support_files"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_support_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("support_requests_id");
  CREATE INDEX "payload_locked_documents_rels_support_files_id_idx" ON "payload_locked_documents_rels" USING btree ("support_files_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "support_requests_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "support_requests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "support_requests_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "support_files" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "support_requests_messages" CASCADE;
  DROP TABLE "support_requests" CASCADE;
  DROP TABLE "support_requests_rels" CASCADE;
  DROP TABLE "support_files" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_support_requests_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_support_files_fk";
  
  DROP INDEX "payload_locked_documents_rels_support_requests_id_idx";
  DROP INDEX "payload_locked_documents_rels_support_files_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "support_requests_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "support_files_id";
  ALTER TABLE "civiq_settings" DROP COLUMN "support_email";
  DROP TYPE "public"."enum_support_requests_type";
  DROP TYPE "public"."enum_support_requests_priority";
  DROP TYPE "public"."enum_support_requests_status";`)
}
