CREATE TYPE "public"."scrape_schedule" AS ENUM('manual', 'daily', 'weekly', 'monthly');--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "source_id" uuid;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "max_documents" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "scrape_schedule" "scrape_schedule" DEFAULT 'weekly' NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "rate_limit_ms" integer DEFAULT 2000 NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
