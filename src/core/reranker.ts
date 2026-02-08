import { CohereClientV2 } from "cohere-ai";
import pino from "pino";
import { env } from "../config/env.js";
import type { RankedChunk, RetrievedChunk } from "./types.js";

const logger = pino({ name: "reranker" });

const RERANK_MODEL = "rerank-multilingual-v3.0";

let cohereClient: CohereClientV2 | null = null;

function getClient(): CohereClientV2 {
	if (!cohereClient) {
		cohereClient = new CohereClientV2({ token: env.COHERE_API_KEY });
	}
	return cohereClient;
}

export async function rerankChunks(
	query: string,
	chunks: RetrievedChunk[],
	topN?: number,
): Promise<RankedChunk[]> {
	const limit = topN ?? env.RERANKER_TOP_N;

	if (chunks.length === 0) {
		return [];
	}

	if (chunks.length <= limit) {
		logger.info({ chunks: chunks.length, topN: limit }, "Skipping rerank, already within limit");
		return chunks.map((chunk) => ({
			...chunk,
			rerankScore: chunk.score,
		}));
	}

	logger.info({ chunks: chunks.length, topN: limit }, "Reranking chunks");

	const client = getClient();
	const response = await client.rerank({
		model: RERANK_MODEL,
		query,
		documents: chunks.map((c) => c.content),
		topN: limit,
	});

	const ranked: RankedChunk[] = response.results.map((result) => ({
		...chunks[result.index],
		rerankScore: result.relevanceScore,
	}));

	ranked.sort((a, b) => b.rerankScore - a.rerankScore);

	logger.info(
		{ reranked: ranked.length, topScore: ranked[0]?.rerankScore },
		"Reranking complete",
	);

	return ranked;
}
