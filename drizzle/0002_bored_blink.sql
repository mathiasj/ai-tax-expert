CREATE TABLE IF NOT EXISTS "evaluation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_questions" integer NOT NULL,
	"avg_relevance" numeric(5, 4) NOT NULL,
	"avg_faithfulness" numeric(5, 4) NOT NULL,
	"avg_citation_accuracy" numeric(5, 4) NOT NULL,
	"avg_keyword_coverage" numeric(5, 4) NOT NULL,
	"avg_retrieval_ms" numeric(10, 2) NOT NULL,
	"avg_total_ms" numeric(10, 2) NOT NULL,
	"by_category" jsonb NOT NULL,
	"by_difficulty" jsonb NOT NULL,
	"results" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
