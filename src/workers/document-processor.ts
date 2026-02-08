import { Worker, Queue, type Job } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { documents, chunks as chunksTable } from "../db/schema.js";
import { parsePdf, parseTextFile } from "../processing/pdf-parser.js";
import { chunkDocument } from "../processing/chunker.js";
import { embedTexts } from "../processing/embedder.js";
import { indexPoints, type IndexPoint } from "../processing/indexer.js";

const logger = pino({ name: "document-worker" });

const QUEUE_NAME = "document-processing";

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const documentQueue = new Queue(QUEUE_NAME, { connection });

interface DocumentJob {
	documentId: string;
	filePath: string;
	title: string;
}

async function updateStatus(
	documentId: string,
	status: string,
	errorMessage?: string,
): Promise<void> {
	await db
		.update(documents)
		.set({
			status: status as "pending",
			errorMessage,
			updatedAt: new Date(),
		})
		.where(eq(documents.id, documentId));
}

async function processDocument(job: Job<DocumentJob>): Promise<void> {
	const { documentId, filePath, title } = job.data;
	logger.info({ documentId, title }, "Processing document");

	try {
		// 1. Parse
		await updateStatus(documentId, "parsing");
		const isPdf = filePath.toLowerCase().endsWith(".pdf");
		const parsed = isPdf ? await parsePdf(filePath) : await parseTextFile(filePath);
		logger.info({ documentId, chars: parsed.text.length }, "Parsed");

		if (!parsed.text || parsed.text.length < 50) {
			await updateStatus(documentId, "failed", "Document too short after parsing");
			return;
		}

		// 2. Chunk
		await updateStatus(documentId, "chunking");
		const docChunks = await chunkDocument(parsed.text, { documentId, title });
		logger.info({ documentId, chunks: docChunks.length }, "Chunked");

		// 3. Embed
		await updateStatus(documentId, "embedding");
		const texts = docChunks.map((c) => c.content);
		const embeddings = await embedTexts(texts);
		logger.info({ documentId, embeddings: embeddings.length }, "Embedded");

		// 4. Index in Qdrant
		const points: IndexPoint[] = docChunks.map((chunk, i) => ({
			chunk,
			embedding: embeddings[i].embedding,
			documentId,
		}));
		const pointIds = await indexPoints(points);

		// 5. Store chunks in PostgreSQL
		for (let i = 0; i < docChunks.length; i++) {
			await db.insert(chunksTable).values({
				documentId,
				content: docChunks[i].content,
				chunkIndex: docChunks[i].index,
				qdrantPointId: pointIds[i],
				metadata: docChunks[i].metadata,
			});
		}

		await updateStatus(documentId, "indexed");
		logger.info({ documentId, chunks: docChunks.length }, "Document fully processed");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error({ documentId, error: message }, "Processing failed");
		await updateStatus(documentId, "failed", message);
		throw error;
	}
}

const worker = new Worker<DocumentJob>(QUEUE_NAME, processDocument, {
	connection,
	concurrency: 2,
});

worker.on("completed", (job) => {
	logger.info({ jobId: job.id, documentId: job.data.documentId }, "Job completed");
});

worker.on("failed", (job, error) => {
	logger.error({ jobId: job?.id, error: error.message }, "Job failed");
});

logger.info("Document processing worker started");

export { documentQueue as queue };
