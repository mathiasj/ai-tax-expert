/**
 * Database migration script.
 * Uses drizzle-orm/postgres-js migrator to apply SQL migrations from drizzle/ directory.
 * Then runs any additional schema fixes needed.
 */
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const host = process.env.POSTGRES_HOST ?? "localhost";
const user = process.env.POSTGRES_USER ?? "postgres";
const password = process.env.POSTGRES_PASSWORD ?? "postgres";
const port = process.env.POSTGRES_DB_PORT ?? "5432";
const dbName = process.env.POSTGRES_DB_NAME ?? "tax_expert";

const url =
	process.env.DATABASE_URL ??
	`postgresql://${user}:${password}@${host}:${port}/${dbName}`;

console.log("[migrate] Connecting to database...");

const connection = postgres(url, { max: 1 });
const db = drizzle(connection);

try {
	// Run all idempotent schema statements
	// Each uses IF NOT EXISTS / IF EXISTS so it's safe to re-run
	console.log("[migrate] Applying schema...");

	// 1. Enums
	await connection.unsafe(`
		DO $$ BEGIN
			CREATE TYPE "document_source" AS ENUM('skatteverket', 'lagrummet', 'riksdagen', 'manual');
		EXCEPTION WHEN duplicate_object THEN null; END $$;

		DO $$ BEGIN
			CREATE TYPE "document_status" AS ENUM('pending', 'downloading', 'parsing', 'chunking', 'embedding', 'indexed', 'failed');
		EXCEPTION WHEN duplicate_object THEN null; END $$;

		DO $$ BEGIN
			CREATE TYPE "source_status" AS ENUM('active', 'paused', 'failed');
		EXCEPTION WHEN duplicate_object THEN null; END $$;

		DO $$ BEGIN
			CREATE TYPE "audience" AS ENUM('allman', 'foretag', 'specialist');
		EXCEPTION WHEN duplicate_object THEN null; END $$;

		DO $$ BEGIN
			CREATE TYPE "refresh_policy" AS ENUM('once', 'weekly', 'monthly', 'quarterly');
		EXCEPTION WHEN duplicate_object THEN null; END $$;
	`);

	// Add lagtext to doc_type if missing
	await connection.unsafe(`
		DO $$ BEGIN
			CREATE TYPE "doc_type" AS ENUM('stallningstagande', 'handledning', 'proposition', 'sou', 'lagtext', 'rattsfallsnotis', 'rattsfallsreferat', 'ovrigt');
		EXCEPTION WHEN duplicate_object THEN
			BEGIN
				ALTER TYPE "doc_type" ADD VALUE IF NOT EXISTS 'lagtext' BEFORE 'rattsfallsnotis';
			EXCEPTION WHEN duplicate_object THEN null; END;
		END $$;
	`);

	// 2. Tables
	await connection.unsafe(`
		CREATE TABLE IF NOT EXISTS "users" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"email" varchar(255) UNIQUE,
			"name" varchar(255),
			"password_hash" text,
			"role" varchar(50) DEFAULT 'user' NOT NULL,
			"created_at" timestamp DEFAULT now() NOT NULL
		);

		CREATE TABLE IF NOT EXISTS "conversations" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"user_id" uuid REFERENCES "users"("id"),
			"title" varchar(500),
			"metadata" jsonb,
			"created_at" timestamp DEFAULT now() NOT NULL,
			"updated_at" timestamp DEFAULT now() NOT NULL
		);

		CREATE TABLE IF NOT EXISTS "sources" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"url" text NOT NULL UNIQUE,
			"source" "document_source" NOT NULL,
			"label" varchar(255),
			"status" "source_status" DEFAULT 'active' NOT NULL,
			"max_documents" integer DEFAULT 50 NOT NULL,
			"scrape_interval_minutes" integer DEFAULT 10080 NOT NULL,
			"rate_limit_ms" integer DEFAULT 2000 NOT NULL,
			"is_active" boolean DEFAULT true NOT NULL,
			"last_scraped_at" timestamp,
			"last_error" text,
			"metadata" jsonb,
			"created_at" timestamp DEFAULT now() NOT NULL,
			"updated_at" timestamp DEFAULT now() NOT NULL
		);

		CREATE TABLE IF NOT EXISTS "documents" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"title" varchar(500) NOT NULL,
			"source" "document_source" NOT NULL,
			"source_id" uuid REFERENCES "sources"("id") ON DELETE SET NULL,
			"source_url" text,
			"file_path" text,
			"status" "document_status" DEFAULT 'pending' NOT NULL,
			"metadata" jsonb,
			"error_message" text,
			"doc_type" "doc_type",
			"audience" "audience",
			"tax_area" varchar(100),
			"refresh_policy" "refresh_policy" DEFAULT 'once' NOT NULL,
			"content_hash" varchar(64),
			"last_checked_at" timestamp,
			"superseded_by_id" uuid,
			"superseded_at" timestamp,
			"superseded_note" text,
			"created_at" timestamp DEFAULT now() NOT NULL,
			"updated_at" timestamp DEFAULT now() NOT NULL
		);

		CREATE TABLE IF NOT EXISTS "chunks" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
			"content" text NOT NULL,
			"chunk_index" integer NOT NULL,
			"qdrant_point_id" uuid,
			"metadata" jsonb,
			"created_at" timestamp DEFAULT now() NOT NULL
		);

		CREATE TABLE IF NOT EXISTS "queries" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"user_id" uuid REFERENCES "users"("id"),
			"conversation_id" uuid REFERENCES "conversations"("id"),
			"question" text NOT NULL,
			"answer" text,
			"source_chunk_ids" uuid[],
			"metadata" jsonb,
			"feedback_rating" integer,
			"feedback_comment" text,
			"feedback_at" timestamp,
			"created_at" timestamp DEFAULT now() NOT NULL
		);

		CREATE TABLE IF NOT EXISTS "evaluation_runs" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"total_questions" integer NOT NULL,
			"avg_relevance" numeric(5,4) NOT NULL,
			"avg_faithfulness" numeric(5,4) NOT NULL,
			"avg_citation_accuracy" numeric(5,4) NOT NULL,
			"avg_keyword_coverage" numeric(5,4) NOT NULL,
			"avg_retrieval_ms" numeric(10,2) NOT NULL,
			"avg_total_ms" numeric(10,2) NOT NULL,
			"by_category" jsonb NOT NULL,
			"by_difficulty" jsonb NOT NULL,
			"results" jsonb NOT NULL,
			"created_at" timestamp DEFAULT now() NOT NULL
		);
	`);

	// 3. Add columns that may be missing (idempotent)
	const addColumnIfMissing = async (table: string, column: string, type: string) => {
		await connection.unsafe(`
			DO $$ BEGIN
				ALTER TABLE "${table}" ADD COLUMN "${column}" ${type};
			EXCEPTION WHEN duplicate_column THEN null; END $$;
		`);
	};

	// Sources columns (added in Phase 11, may be missing)
	await addColumnIfMissing("sources", "max_documents", "integer DEFAULT 50 NOT NULL");
	await addColumnIfMissing("sources", "scrape_interval_minutes", "integer DEFAULT 10080 NOT NULL");
	await addColumnIfMissing("sources", "rate_limit_ms", "integer DEFAULT 2000 NOT NULL");
	await addColumnIfMissing("sources", "is_active", "boolean DEFAULT true NOT NULL");

	// Documents columns
	await addColumnIfMissing("documents", "source_id", "uuid REFERENCES sources(id) ON DELETE SET NULL");
	await addColumnIfMissing("documents", "doc_type", '"doc_type"');
	await addColumnIfMissing("documents", "audience", '"audience"');
	await addColumnIfMissing("documents", "tax_area", "varchar(100)");
	await addColumnIfMissing("documents", "refresh_policy", '"refresh_policy" DEFAULT \'once\' NOT NULL');
	await addColumnIfMissing("documents", "content_hash", "varchar(64)");
	await addColumnIfMissing("documents", "last_checked_at", "timestamp");
	await addColumnIfMissing("documents", "superseded_by_id", "uuid");
	await addColumnIfMissing("documents", "superseded_at", "timestamp");
	await addColumnIfMissing("documents", "superseded_note", "text");

	// Queries columns
	await addColumnIfMissing("queries", "feedback_rating", "integer");
	await addColumnIfMissing("queries", "feedback_comment", "text");
	await addColumnIfMissing("queries", "feedback_at", "timestamp");

	// Drop old scrape_schedule column if it exists
	await connection.unsafe(`
		ALTER TABLE "sources" DROP COLUMN IF EXISTS "scrape_schedule";
		DROP TYPE IF EXISTS "scrape_schedule";
	`);

	console.log("[migrate] Schema applied successfully");
} catch (err) {
	console.error("[migrate] Error:", err);
	process.exit(1);
} finally {
	await connection.end();
}
