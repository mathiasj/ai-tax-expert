import OpenAI from "openai";
import pino from "pino";
import { env } from "../config/env.js";

const logger = pino({ name: "embedder" });

const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 1500; // Pause between batches to avoid TPM rate limits
const MAX_RETRIES = 3;

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
	if (!openaiClient) {
		openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	}
	return openaiClient;
}

export interface EmbeddingResult {
	embedding: number[];
	index: number;
}

export async function embedTexts(texts: string[]): Promise<EmbeddingResult[]> {
	const client = getClient();
	const results: EmbeddingResult[] = [];

	logger.info({ totalTexts: texts.length, batchSize: BATCH_SIZE }, "Starting embedding");

	for (let i = 0; i < texts.length; i += BATCH_SIZE) {
		const batch = texts.slice(i, i + BATCH_SIZE);

		// Retry with exponential backoff on rate limit (429)
		let response: OpenAI.Embeddings.CreateEmbeddingResponse | null = null;
		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			try {
				response = await client.embeddings.create({
					model: EMBEDDING_MODEL,
					input: batch,
					dimensions: EMBEDDING_DIMENSIONS,
				});
				break;
			} catch (err) {
				const isRateLimit = err instanceof OpenAI.RateLimitError ||
					(err instanceof Error && err.message.includes("429"));
				if (isRateLimit && attempt < MAX_RETRIES) {
					const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
					logger.warn({ attempt: attempt + 1, delayMs: delay }, "Rate limited, retrying");
					await new Promise((r) => setTimeout(r, delay));
				} else {
					throw err;
				}
			}
		}

		if (!response) throw new Error("Embedding failed after retries");

		for (const item of response.data) {
			results.push({
				embedding: item.embedding,
				index: i + item.index,
			});
		}

		logger.info(
			{ processed: Math.min(i + BATCH_SIZE, texts.length), total: texts.length },
			"Batch embedded",
		);

		// Pause between batches to stay within TPM limits
		if (i + BATCH_SIZE < texts.length) {
			await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
		}
	}

	return results;
}

export async function embedSingle(text: string): Promise<number[]> {
	const results = await embedTexts([text]);
	return results[0].embedding;
}

export { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL };
