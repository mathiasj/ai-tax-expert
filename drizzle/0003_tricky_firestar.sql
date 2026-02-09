CREATE TYPE "public"."source_status" AS ENUM('active', 'paused', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"source" "document_source" NOT NULL,
	"label" varchar(255),
	"status" "source_status" DEFAULT 'active' NOT NULL,
	"last_scraped_at" timestamp,
	"last_error" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sources_url_unique" UNIQUE("url")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "superseded_by_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "superseded_at" timestamp;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "superseded_note" text;--> statement-breakpoint
ALTER TABLE "queries" ADD COLUMN "feedback_rating" integer;--> statement-breakpoint
ALTER TABLE "queries" ADD COLUMN "feedback_comment" text;--> statement-breakpoint
ALTER TABLE "queries" ADD COLUMN "feedback_at" timestamp;