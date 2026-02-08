import pino from "pino";
import { env } from "../config/env.js";
import { embedSingle } from "../processing/embedder.js";
import { searchSimilarFiltered } from "../processing/indexer.js";
import type { MetadataFilter, RetrievedChunk } from "./types.js";

const logger = pino({ name: "retriever" });

export async function retrieveChunks(
	query: string,
	options?: { topK?: number; filters?: MetadataFilter },
): Promise<RetrievedChunk[]> {
	const topK = options?.topK ?? env.RAG_TOP_K;

	logger.info({ query: query.slice(0, 100), topK }, "Retrieving chunks");

	const queryEmbedding = await embedSingle(query);

	const filter =
		options?.filters?.source?.length || options?.filters?.documentId?.length
			? {
					source: options.filters.source,
					documentId: options.filters.documentId,
				}
			: undefined;

	const results = await searchSimilarFiltered(queryEmbedding, topK, filter);

	const chunks: RetrievedChunk[] = results.map((r) => ({
		id: r.id,
		content: (r.payload.content as string) ?? "",
		score: r.score,
		documentId: (r.payload.documentId as string) ?? "",
		chunkIndex: (r.payload.chunkIndex as number) ?? 0,
		metadata: r.payload,
	}));

	logger.info({ retrieved: chunks.length }, "Chunks retrieved");

	return chunks;
}
