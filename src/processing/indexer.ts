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

export async function deletePoints(pointIds: string[]): Promise<void> {
	if (pointIds.length === 0) return;
	const client = getClient();
	await client.delete(env.QDRANT_COLLECTION, { points: pointIds });
	logger.info({ count: pointIds.length }, "Deleted Qdrant points");
}

export interface CollectionInfo {
	pointsCount: number;
	vectorsCount: number;
	status: string;
	segmentsCount: number;
}

export async function getCollectionInfo(): Promise<CollectionInfo> {
	const client = getClient();
	const collections = await client.getCollections();
	const exists = collections.collections.some((c) => c.name === env.QDRANT_COLLECTION);
	if (!exists) {
		return { pointsCount: 0, vectorsCount: 0, status: "not_created", segmentsCount: 0 };
	}
	const info = await client.getCollection(env.QDRANT_COLLECTION);
	return {
		pointsCount: info.points_count ?? 0,
		vectorsCount: info.indexed_vectors_count ?? 0,
		status: info.status,
		segmentsCount: info.segments_count ?? 0,
	};
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

export interface QdrantFilter {
	source?: string[];
	documentId?: string[];
	docType?: string[];
	audience?: string[];
	taxArea?: string[];
}

export async function searchSimilarFiltered(
	queryEmbedding: number[],
	limit = 20,
	filter?: QdrantFilter,
): Promise<Array<{ id: string; score: number; payload: Record<string, unknown> }>> {
	const client = getClient();

	await ensureCollection();

	const mustConditions: Array<Record<string, unknown>> = [];
	if (filter?.source?.length) {
		mustConditions.push({
			key: "source",
			match: { any: filter.source },
		});
	}
	if (filter?.documentId?.length) {
		mustConditions.push({
			key: "documentId",
			match: { any: filter.documentId },
		});
	}
	if (filter?.docType?.length) {
		mustConditions.push({
			key: "docType",
			match: { any: filter.docType },
		});
	}
	if (filter?.audience?.length) {
		mustConditions.push({
			key: "audience",
			match: { any: filter.audience },
		});
	}
	if (filter?.taxArea?.length) {
		mustConditions.push({
			key: "taxArea",
			match: { any: filter.taxArea },
		});
	}

	const results = await client.search(env.QDRANT_COLLECTION, {
		vector: queryEmbedding,
		limit,
		with_payload: true,
		filter: mustConditions.length > 0 ? { must: mustConditions } : undefined,
	});

	return results.map((r) => ({
		id: String(r.id),
		score: r.score,
		payload: (r.payload ?? {}) as Record<string, unknown>,
	}));
}
