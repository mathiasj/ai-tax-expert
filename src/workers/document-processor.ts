import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Worker, type Job } from "bullmq";
import pino from "pino";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { documents, chunks as chunksTable } from "../db/schema.js";
import { parsePdf, parseTextFile } from "../processing/pdf-parser.js";
import { chunkDocument } from "../processing/chunker.js";
import { embedTexts } from "../processing/embedder.js";
import { indexPoints, type IndexPoint } from "../processing/indexer.js";
import { classifyDocType, classifyAudience, detectTaxArea } from "../processing/classifier.js";
import { documentQueue, QUEUE_NAME, connection, type DocumentJob } from "./queue.js";

const logger = pino({ name: "document-worker" });

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

function computeContentHash(text: string): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(text);
	return hasher.digest("hex");
}

async function processDocument(job: Job<DocumentJob>): Promise<void> {
	const { documentId, filePath: rawPath, title, content: jobContent } = job.data;
	const filePath = resolve(rawPath);
	logger.info({ documentId, title, filePath, hasContent: !!jobContent }, "Processing document");

	try {
		// Fetch full document record from DB for metadata
		const [doc] = await db
			.select()
			.from(documents)
			.where(eq(documents.id, documentId))
			.limit(1);

		// 1. Parse — prefer inline content from job > DB rawContent > file on disk
		await updateStatus(documentId, "parsing");
		let parsed: { text: string; pageCount: number; metadata: Record<string, unknown> };
		const inlineContent = jobContent || doc?.rawContent;
		if (inlineContent) {
			parsed = { text: inlineContent, pageCount: 1, metadata: {} };
		} else if (existsSync(filePath)) {
			const isPdf = filePath.toLowerCase().endsWith(".pdf");
			parsed = isPdf ? await parsePdf(filePath) : await parseTextFile(filePath);
		} else {
			throw new Error(`No content available: job content missing, DB rawContent empty, and file not found at ${filePath}`);
		}
		logger.info({ documentId, chars: parsed.text.length, source: inlineContent ? "inline" : "file" }, "Parsed");

		if (!parsed.text || parsed.text.length < 50) {
			await updateStatus(documentId, "failed", "Document too short after parsing");
			return;
		}

		// Compute and store content hash
		const contentHash = computeContentHash(parsed.text);

		// For refresh jobs: skip if content unchanged
		if (job.name === "refresh" && doc?.contentHash === contentHash) {
			logger.info({ documentId }, "Content unchanged, skipping");
			await db
				.update(documents)
				.set({ lastCheckedAt: new Date(), updatedAt: new Date() })
				.where(eq(documents.id, documentId));
			return;
		}

		// Auto-classify if metadata is missing
		const docMeta = doc?.metadata as Record<string, unknown> | null;
		const classifiedDocType = doc?.docType ?? classifyDocType(doc?.source ?? "manual", docMeta ?? {});
		const classifiedAudience = doc?.audience ?? classifyAudience(doc?.source ?? "manual", docMeta ?? {});
		const classifiedTaxArea = doc?.taxArea ?? detectTaxArea(title, parsed.text.slice(0, 2000));

		// Update content hash + classification on document
		const docUpdates: Record<string, unknown> = { contentHash, updatedAt: new Date() };
		if (!doc?.docType && classifiedDocType) docUpdates.docType = classifiedDocType;
		if (!doc?.audience && classifiedAudience) docUpdates.audience = classifiedAudience;
		if (!doc?.taxArea && classifiedTaxArea) docUpdates.taxArea = classifiedTaxArea;

		await db
			.update(documents)
			.set(docUpdates)
			.where(eq(documents.id, documentId));

		// 2. Chunk — build rich metadata from document record
		await updateStatus(documentId, "chunking");
		const documentMetadata: Record<string, unknown> = {
			documentId,
			title,
		};
		if (doc) {
			if (doc.source) documentMetadata.source = doc.source;
			if (doc.sourceUrl) documentMetadata.sourceUrl = doc.sourceUrl;
		}
		documentMetadata.docType = classifiedDocType;
		documentMetadata.audience = classifiedAudience;
		if (classifiedTaxArea) documentMetadata.taxArea = classifiedTaxArea;

		const docChunks = await chunkDocument(parsed.text, documentMetadata);
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
	concurrency: 1,
});

worker.on("completed", (job) => {
	logger.info({ jobId: job.id, documentId: job.data.documentId }, "Job completed");
});

worker.on("failed", (job, error) => {
	logger.error({ jobId: job?.id, error: error.message }, "Job failed");
});

logger.info("Document processing worker started");

export { documentQueue as queue };
