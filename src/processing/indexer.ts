import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";
import { env } from "../config/env.js";
import { EMBEDDING_DIMENSIONS } from "./embedder.js";
import type { Chunk } from "./chunker.js";

const logger = pino({ name: "indexer" });

let qdrantClient: QdrantClient | null = null;

function getClient(): QdrantClient {
	if (!qdrantClient) {
		qdrantClient = new QdrantClient({ url: env.QDRANT_URL });
	}
	return qdrantClient;
}

export async function ensureCollection(): Promise<void> {
	const client = getClient();
	const collectionName = env.QDRANT_COLLECTION;

	const collections = await client.getCollections();
	const exists = collections.collections.some((c) => c.name === collectionName);

	if (!exists) {
		await client.createCollection(collectionName, {
			vectors: {
				size: EMBEDDING_DIMENSIONS,
				distance: "Cosine",
			},
		});
		logger.info({ collectionName }, "Created Qdrant collection");
	}
}

export interface IndexPoint {
	chunk: Chunk;
	embedding: number[];
	documentId: string;
}

export async function indexPoints(points: IndexPoint[]): Promise<string[]> {
	const client = getClient();
	const collectionName = env.QDRANT_COLLECTION;

	await ensureCollection();

	const qdrantPoints = points.map((p) => {
		const id = uuidv4();
		return {
			id,
			vector: p.embedding,
			payload: {
				content: p.chunk.content,
				documentId: p.documentId,
				chunkIndex: p.chunk.index,
				...p.chunk.metadata,
			},
		};
	});

	const UPSERT_BATCH = 100;
	const ids: string[] = [];

	for (let i = 0; i < qdrantPoints.length; i += UPSERT_BATCH) {
		const batch = qdrantPoints.slice(i, i + UPSERT_BATCH);
		await client.upsert(collectionName, { points: batch });
		ids.push(...batch.map((p) => p.id));

		logger.info(
			{ indexed: Math.min(i + UPSERT_BATCH, qdrantPoints.length), total: qdrantPoints.length },
			"Batch indexed",
		);
	}

	return ids;
}

export async function searchSimilar(
	queryEmbedding: number[],
	limit = 5,
): Promise<Array<{ id: string; score: number; payload: Record<string, unknown> }>> {
	const client = getClient();

	const results = await client.search(env.QDRANT_COLLECTION, {
		vector: queryEmbedding,
		limit,
		with_payload: true,
	});

	return results.map((r) => ({
		id: String(r.id),
		score: r.score,
		payload: (r.payload ?? {}) as Record<string, unknown>,
	}));
}
