import { and, count, eq, ilike, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/client.js";
import { chunks, documents } from "../../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const docs = new Hono();

docs.use("/documents/*", requireAuth);
docs.use("/documents", requireAuth);

const querySchema = z.object({
	source: z.enum(["skatteverket", "lagrummet", "riksdagen", "manual"]).optional(),
	status: z
		.enum(["pending", "downloading", "parsing", "chunking", "embedding", "indexed", "failed"])
		.optional(),
	search: z.string().max(200).optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
	offset: z.coerce.number().int().min(0).default(0),
});

docs.get("/documents", async (c) => {
	const parsed = querySchema.safeParse(c.req.query());
	if (!parsed.success) {
		return c.json({ error: "Invalid query parameters", details: parsed.error.format() }, 400);
	}

	const { source, status, search, limit, offset } = parsed.data;

	const conditions = [];
	if (source) conditions.push(eq(documents.source, source));
	if (status) conditions.push(eq(documents.status, status));
	if (search) conditions.push(ilike(documents.title, `%${search}%`));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, [total]] = await Promise.all([
		db
			.select({
				id: documents.id,
				title: documents.title,
				source: documents.source,
				sourceUrl: documents.sourceUrl,
				status: documents.status,
				errorMessage: documents.errorMessage,
				supersededById: documents.supersededById,
				createdAt: documents.createdAt,
				updatedAt: documents.updatedAt,
			})
			.from(documents)
			.where(where)
			.orderBy(sql`${documents.createdAt} desc`)
			.limit(limit)
			.offset(offset),
		db.select({ count: count() }).from(documents).where(where),
	]);

	// Enrich with chunk counts
	const enriched = await Promise.all(
		rows.map(async (doc) => {
			const [chunkCount] = await db
				.select({ count: count() })
				.from(chunks)
				.where(eq(chunks.documentId, doc.id));
			return { ...doc, chunkCount: chunkCount.count };
		}),
	);

	return c.json({ documents: enriched, total: total.count });
});

export { docs };
