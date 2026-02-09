import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z
	.object({
		OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
		COHERE_API_KEY: z.string().min(1, "COHERE_API_KEY is required"),

		// Qdrant — individual components
		QDRANT_HOST: z.string().default("localhost"),
		QDRANT_DB_PORT: z.coerce.number().default(6333),
		QDRANT_GRPC_PORT: z.coerce.number().default(6334),
		QDRANT_COLLECTION: z.string().default("tax_documents"),
		QDRANT_URL: z.string().url().optional(),

		// PostgreSQL — individual components
		POSTGRES_HOST: z.string().default("localhost"),
		POSTGRES_USER: z.string().default("postgres"),
		POSTGRES_PASSWORD: z.string().default("postgres"),
		POSTGRES_DB_NAME: z.string().default("tax_expert"),
		POSTGRES_DB_PORT: z.coerce.number().default(5432),
		DATABASE_URL: z.string().url().optional(),

		// Redis — individual components
		REDIS_HOST: z.string().default("localhost"),
		REDIS_CACHE_PORT: z.coerce.number().default(6379),
		REDIS_URL: z.string().url().optional(),

		// Server
		BACKEND_API_PORT: z.coerce.number().default(3050),
		APP_FRONTEND_PORT: z.coerce.number().default(5100),
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

type ParsedEnv = z.output<typeof envSchema>;

export type Env = ParsedEnv & {
	DATABASE_URL: string;
	REDIS_URL: string;
	QDRANT_URL: string;
};

function loadEnv(): Env {
	const result = envSchema.safeParse(process.env);
	if (!result.success) {
		const formatted = result.error.format();
		console.error("Invalid environment variables:", formatted);
		throw new Error("Invalid environment configuration");
	}

	const parsed = result.data;

	const DATABASE_URL =
		parsed.DATABASE_URL ??
		`postgresql://${parsed.POSTGRES_USER}:${parsed.POSTGRES_PASSWORD}@${parsed.POSTGRES_HOST}:${parsed.POSTGRES_DB_PORT}/${parsed.POSTGRES_DB_NAME}`;

	const REDIS_URL =
		parsed.REDIS_URL ?? `redis://${parsed.REDIS_HOST}:${parsed.REDIS_CACHE_PORT}`;

	const QDRANT_URL =
		parsed.QDRANT_URL ?? `http://${parsed.QDRANT_HOST}:${parsed.QDRANT_DB_PORT}`;

	return {
		...parsed,
		DATABASE_URL,
		REDIS_URL,
		QDRANT_URL,
	};
}

export const env = loadEnv();
