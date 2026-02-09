import { and, count, eq, ilike, isNotNull, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import IORedis from "ioredis";
import pino from "pino";
import { z } from "zod";
import { env } from "../../config/env.js";
import { db } from "../../db/client.js";
import { chunks, documents, queries, sources } from "../../db/schema.js";
import { deletePoints, getCollectionInfo } from "../../processing/indexer.js";
import { documentQueue } from "../../workers/queue.js";
import { refreshQueue, triggerRefresh } from "../../workers/refresh-scheduler.js";
import { requireAdmin } from "../middleware/admin.js";

const logger = pino({ name: "admin-api" });

const admin = new Hono();

admin.use("*", requireAdmin);

// ─── Documents ───────────────────────────────────────────────

admin.get("/documents/:id", async (c) => {
	const docId = c.req.param("id");

	const [doc] = await db
		.select()
		.from(documents)
		.where(eq(documents.id, docId))
		.limit(1);

	if (!doc) return c.json({ error: "Document not found" }, 404);

	const [chunkCount] = await db
		.select({ count: count() })
		.from(chunks)
		.where(eq(chunks.documentId, docId));

	return c.json({
		...doc,
		chunkCount: chunkCount.count,
	});
});

admin.get("/documents/:id/chunks", async (c) => {
	const docId = c.req.param("id");
	const limit = Math.min(Number(c.req.query("limit") ?? "50"), 200);
	const offset = Number(c.req.query("offset") ?? "0");

	const [rows, [total]] = await Promise.all([
		db
			.select({
				id: chunks.id,
				chunkIndex: chunks.chunkIndex,
				content: chunks.content,
				qdrantPointId: chunks.qdrantPointId,
				metadata: chunks.metadata,
				createdAt: chunks.createdAt,
			})
			.from(chunks)
			.where(eq(chunks.documentId, docId))
			.orderBy(chunks.chunkIndex)
			.limit(limit)
			.offset(offset),
		db.select({ count: count() }).from(chunks).where(eq(chunks.documentId, docId)),
	]);

	return c.json({ chunks: rows, total: total.count });
});

admin.delete("/documents/:id", async (c) => {
	const docId = c.req.param("id");

	const [doc] = await db
		.select({ id: documents.id })
		.from(documents)
		.where(eq(documents.id, docId))
		.limit(1);

	if (!doc) return c.json({ error: "Document not found" }, 404);

	// Get Qdrant point IDs before deleting chunks
	const chunkRows = await db
		.select({ qdrantPointId: chunks.qdrantPointId })
		.from(chunks)
		.where(eq(chunks.documentId, docId));

	const pointIds = chunkRows
		.map((r) => r.qdrantPointId)
		.filter((id): id is string => id !== null);

	// Delete from Qdrant
	try {
		await deletePoints(pointIds);
	} catch (err) {
		logger.warn({ err, docId }, "Failed to delete Qdrant points, continuing with DB delete");
	}

	// Delete document (chunks cascade)
	await db.delete(documents).where(eq(documents.id, docId));

	return c.json({ success: true });
});

admin.post("/documents/:id/reprocess", async (c) => {
	const docId = c.req.param("id");

	const [doc] = await db
		.select({
			id: documents.id,
			filePath: documents.filePath,
			title: documents.title,
		})
		.from(documents)
		.where(eq(documents.id, docId))
		.limit(1);

	if (!doc) return c.json({ error: "Document not found" }, 404);
	if (!doc.filePath) return c.json({ error: "Document has no file path" }, 400);

	// Delete existing chunks + Qdrant points
	const chunkRows = await db
		.select({ qdrantPointId: chunks.qdrantPointId })
		.from(chunks)
		.where(eq(chunks.documentId, docId));

	const pointIds = chunkRows
		.map((r) => r.qdrantPointId)
		.filter((id): id is string => id !== null);

	try {
		await deletePoints(pointIds);
	} catch (err) {
		logger.warn({ err }, "Failed to delete Qdrant points during reprocess");
	}

	await db.delete(chunks).where(eq(chunks.documentId, docId));

	// Reset status
	await db
		.update(documents)
		.set({ status: "pending", errorMessage: null, updatedAt: new Date() })
		.where(eq(documents.id, docId));

	// Queue for reprocessing
	await documentQueue.add("process", {
		documentId: docId,
		filePath: doc.filePath,
		title: doc.title,
	});

	return c.json({ success: true, message: "Document queued for reprocessing" });
});

const patchDocSchema = z.object({
	supersededById: z.string().uuid().nullable().optional(),
	supersededNote: z.string().max(500).nullable().optional(),
	refreshPolicy: z.enum(["once", "weekly", "monthly", "quarterly"]).optional(),
});

admin.patch("/documents/:id", async (c) => {
	const docId = c.req.param("id");
	const body = await c.req.json();
	const parsed = patchDocSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
	}

	const updates: Record<string, unknown> = { updatedAt: new Date() };
	if (parsed.data.supersededById !== undefined) {
		updates.supersededById = parsed.data.supersededById;
		updates.supersededAt = parsed.data.supersededById ? new Date() : null;
	}
	if (parsed.data.supersededNote !== undefined) {
		updates.supersededNote = parsed.data.supersededNote;
	}
	if (parsed.data.refreshPolicy !== undefined) {
		updates.refreshPolicy = parsed.data.refreshPolicy;
	}

	await db.update(documents).set(updates).where(eq(documents.id, docId));

	return c.json({ success: true });
});

// ─── Sources ─────────────────────────────────────────────────

const listSourcesSchema = z.object({
	source: z.enum(["skatteverket", "lagrummet", "riksdagen", "manual"]).optional(),
	status: z.enum(["active", "paused", "failed"]).optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
	offset: z.coerce.number().int().min(0).default(0),
});

admin.get("/sources", async (c) => {
	const parsed = listSourcesSchema.safeParse(c.req.query());
	if (!parsed.success) {
		return c.json({ error: "Invalid query parameters", details: parsed.error.format() }, 400);
	}

	const { source, status, limit, offset } = parsed.data;
	const conditions = [];
	if (source) conditions.push(eq(sources.source, source));
	if (status) conditions.push(eq(sources.status, status));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, [total]] = await Promise.all([
		db
			.select()
			.from(sources)
			.where(where)
			.orderBy(sql`${sources.createdAt} desc`)
			.limit(limit)
			.offset(offset),
		db.select({ count: count() }).from(sources).where(where),
	]);

	// Get document counts per source URL
	const enriched = await Promise.all(
		rows.map(async (s) => {
			const [docCount] = await db
				.select({ count: count() })
				.from(documents)
				.where(eq(documents.sourceUrl, s.url));
			return { ...s, documentCount: docCount.count };
		}),
	);

	return c.json({ sources: enriched, total: total.count });
});

const createSourceSchema = z.object({
	url: z.string().url().max(2000),
	source: z.enum(["skatteverket", "lagrummet", "riksdagen", "manual"]),
	label: z.string().max(255).optional(),
});

admin.post("/sources", async (c) => {
	const body = await c.req.json();
	const parsed = createSourceSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
	}

	const [existing] = await db
		.select({ id: sources.id })
		.from(sources)
		.where(eq(sources.url, parsed.data.url))
		.limit(1);

	if (existing) {
		return c.json({ error: "Source URL already exists" }, 409);
	}

	const [created] = await db
		.insert(sources)
		.values(parsed.data)
		.returning();

	return c.json(created, 201);
});

const patchSourceSchema = z.object({
	status: z.enum(["active", "paused", "failed"]).optional(),
	label: z.string().max(255).nullable().optional(),
});

admin.patch("/sources/:id", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();
	const parsed = patchSourceSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
	}

	const updates: Record<string, unknown> = { updatedAt: new Date() };
	if (parsed.data.status) updates.status = parsed.data.status;
	if (parsed.data.label !== undefined) updates.label = parsed.data.label;

	await db.update(sources).set(updates).where(eq(sources.id, id));

	return c.json({ success: true });
});

admin.delete("/sources/:id", async (c) => {
	const id = c.req.param("id");

	const [src] = await db
		.select({ id: sources.id })
		.from(sources)
		.where(eq(sources.id, id))
		.limit(1);

	if (!src) return c.json({ error: "Source not found" }, 404);

	await db.delete(sources).where(eq(sources.id, id));

	return c.json({ success: true });
});

// ─── Queries & Feedback ──────────────────────────────────────

const listQueriesSchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).default(50),
	offset: z.coerce.number().int().min(0).default(0),
	feedback: z.enum(["positive", "negative", "none"]).optional(),
});

admin.get("/queries", async (c) => {
	const parsed = listQueriesSchema.safeParse(c.req.query());
	if (!parsed.success) {
		return c.json({ error: "Invalid query parameters", details: parsed.error.format() }, 400);
	}

	const { limit, offset, feedback } = parsed.data;
	const conditions = [];
	if (feedback === "positive") conditions.push(eq(queries.feedbackRating, 1));
	else if (feedback === "negative") conditions.push(eq(queries.feedbackRating, -1));
	else if (feedback === "none") conditions.push(isNull(queries.feedbackRating));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, [total]] = await Promise.all([
		db
			.select({
				id: queries.id,
				question: queries.question,
				answer: queries.answer,
				feedbackRating: queries.feedbackRating,
				feedbackComment: queries.feedbackComment,
				metadata: queries.metadata,
				createdAt: queries.createdAt,
			})
			.from(queries)
			.where(where)
			.orderBy(sql`${queries.createdAt} desc`)
			.limit(limit)
			.offset(offset),
		db.select({ count: count() }).from(queries).where(where),
	]);

	// Truncate answers for list view
	const truncated = rows.map((r) => ({
		...r,
		answer: r.answer && r.answer.length > 200 ? `${r.answer.slice(0, 200)}...` : r.answer,
	}));

	return c.json({ queries: truncated, total: total.count });
});

admin.get("/queries/stats", async (c) => {
	const [totalResult] = await db.select({ count: count() }).from(queries);
	const [positiveResult] = await db
		.select({ count: count() })
		.from(queries)
		.where(eq(queries.feedbackRating, 1));
	const [negativeResult] = await db
		.select({ count: count() })
		.from(queries)
		.where(eq(queries.feedbackRating, -1));
	const [noFeedbackResult] = await db
		.select({ count: count() })
		.from(queries)
		.where(isNull(queries.feedbackRating));

	return c.json({
		total: totalResult.count,
		positive: positiveResult.count,
		negative: negativeResult.count,
		noFeedback: noFeedbackResult.count,
	});
});

admin.get("/queries/:id", async (c) => {
	const id = c.req.param("id");

	const [row] = await db
		.select()
		.from(queries)
		.where(eq(queries.id, id))
		.limit(1);

	if (!row) return c.json({ error: "Query not found" }, 404);

	return c.json(row);
});

// ─── Refresh ─────────────────────────────────────────────────

admin.post("/refresh/trigger", async (c) => {
	const jobId = await triggerRefresh();
	return c.json({ success: true, jobId });
});

// ─── System Health ───────────────────────────────────────────

admin.get("/health", async (c) => {
	const result: Record<string, unknown> = {};

	// Qdrant
	try {
		const qdrantInfo = await getCollectionInfo();
		result.qdrant = { status: "ok", collectionStatus: qdrantInfo.status, pointsCount: qdrantInfo.pointsCount, vectorsCount: qdrantInfo.vectorsCount, segmentsCount: qdrantInfo.segmentsCount };
	} catch (err) {
		result.qdrant = { status: "error", error: String(err) };
	}

	// Redis
	try {
		const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
		const start = Date.now();
		await redis.ping();
		const latencyMs = Date.now() - start;
		await redis.quit();
		result.redis = { status: "ok", latencyMs };
	} catch (err) {
		result.redis = { status: "error", error: String(err) };
	}

	// PostgreSQL
	try {
		await db.execute(sql`SELECT 1`);
		result.postgres = { status: "ok" };
	} catch (err) {
		result.postgres = { status: "error", error: String(err) };
	}

	// BullMQ queue stats
	try {
		const [waiting, active, completed, failed] = await Promise.all([
			documentQueue.getWaitingCount(),
			documentQueue.getActiveCount(),
			documentQueue.getCompletedCount(),
			documentQueue.getFailedCount(),
		]);
		result.bullmq = { status: "ok", waiting, active, completed, failed };
	} catch (err) {
		result.bullmq = { status: "error", error: String(err) };
	}

	// Refresh scheduler
	try {
		const [rWaiting, rActive, rCompleted, rFailed] = await Promise.all([
			refreshQueue.getWaitingCount(),
			refreshQueue.getActiveCount(),
			refreshQueue.getCompletedCount(),
			refreshQueue.getFailedCount(),
		]);
		const schedulers = await refreshQueue.getJobSchedulers();
		const nextRun = schedulers[0]?.next ? new Date(schedulers[0].next).toISOString() : undefined;
		result.refreshScheduler = { status: "ok", waiting: rWaiting, active: rActive, completed: rCompleted, failed: rFailed, nextRun };
	} catch (err) {
		result.refreshScheduler = { status: "error", error: String(err) };
	}

	// Documents by status
	const docsByStatus = await db
		.select({
			status: documents.status,
			count: count(),
		})
		.from(documents)
		.groupBy(documents.status);

	// Documents by source
	const docsBySource = await db
		.select({
			source: documents.source,
			count: count(),
		})
		.from(documents)
		.groupBy(documents.source);

	// Total chunks
	const [chunkTotal] = await db.select({ count: count() }).from(chunks);

	result.documents = {
		byStatus: Object.fromEntries(docsByStatus.map((r) => [r.status, r.count])),
		bySource: Object.fromEntries(docsBySource.map((r) => [r.source, r.count])),
		totalChunks: chunkTotal.count,
	};

	return c.json(result);
});

export { admin };
