import OpenAI from "openai";
import pino from "pino";
import { env } from "../config/env.js";

const logger = pino({ name: "embedder" });

const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 100;

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

		const response = await client.embeddings.create({
			model: EMBEDDING_MODEL,
			input: batch,
			dimensions: EMBEDDING_DIMENSIONS,
		});

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
	}

	return results;
}

export async function embedSingle(text: string): Promise<number[]> {
	const results = await embedTexts([text]);
	return results[0].embedding;
}

export { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL };
