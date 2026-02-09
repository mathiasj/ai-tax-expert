import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z
	.object({
		OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
		COHERE_API_KEY: z.string().min(1, "COHERE_API_KEY is required"),

		QDRANT_URL: z.string().url().default("http://localhost:6333"),
		QDRANT_COLLECTION: z.string().default("tax_documents"),

		DATABASE_URL: z
			.string()
			.url()
			.default("postgresql://postgres:postgres@localhost:5432/tax_expert"),

		REDIS_URL: z.string().url().default("redis://localhost:6379"),

		PORT: z.coerce.number().default(3000),
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

		// LLM provider config
		LLM_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
		ANTHROPIC_API_KEY: z.string().optional(),
		LLM_MODEL: z.string().optional(),
		LLM_MAX_TOKENS: z.coerce.number().default(4096),
		LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),

		// Auth config
		JWT_SECRET: z.string().min(32),
		JWT_EXPIRES_IN: z.string().default("7d"),

		// Cache config
		CACHE_TTL_SECONDS: z.coerce.number().default(3600),

		// Rate limiting
		RATE_LIMIT_ANONYMOUS: z.coerce.number().default(10),
		RATE_LIMIT_AUTHENTICATED: z.coerce.number().default(60),

		// Scraping
		FIRECRAWL_API_KEY: z.string().optional(),

		// RAG config
		RERANKER_TOP_N: z.coerce.number().default(5),
		RAG_TOP_K: z.coerce.number().default(20),
		RAG_TOKEN_BUDGET: z.coerce.number().default(6000),
	})
	.refine(
		(data) => data.LLM_PROVIDER !== "anthropic" || !!data.ANTHROPIC_API_KEY,
		{
			message: "ANTHROPIC_API_KEY is required when LLM_PROVIDER is 'anthropic'",
			path: ["ANTHROPIC_API_KEY"],
		},
	);

export type Env = z.output<typeof envSchema>;

function loadEnv(): Env {
	const result = envSchema.safeParse(process.env);
	if (!result.success) {
		const formatted = result.error.format();
		console.error("Invalid environment variables:", formatted);
		throw new Error("Invalid environment configuration");
	}
	return result.data;
}

export const env = loadEnv();
