CREATE TYPE "public"."audience" AS ENUM('allman', 'foretag', 'specialist');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('stallningstagande', 'handledning', 'proposition', 'sou', 'rattsfallsnotis', 'rattsfallsreferat', 'ovrigt');--> statement-breakpoint
CREATE TYPE "public"."refresh_policy" AS ENUM('once', 'weekly', 'monthly', 'quarterly');--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "doc_type" "doc_type";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "audience" "audience";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "tax_area" varchar(100);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "refresh_policy" "refresh_policy" DEFAULT 'once' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "content_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "last_checked_at" timestamp;