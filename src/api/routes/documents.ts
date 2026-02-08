import { count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/client.js";
import { documents } from "../../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const docs = new Hono();

docs.use("/documents/*", requireAuth);
docs.use("/documents", requireAuth);

const querySchema = z.object({
	source: z.enum(["skatteverket", "lagrummet", "riksdagen", "manual"]).optional(),
	status: z
		.enum(["pending", "downloading", "parsing", "chunking", "embedding", "indexed", "failed"])
		.optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
	offset: z.coerce.number().int().min(0).default(0),
});

docs.get("/documents", async (c) => {
	const parsed = querySchema.safeParse(c.req.query());
	if (!parsed.success) {
		return c.json({ error: "Invalid query parameters", details: parsed.error.format() }, 400);
	}

	const { source, status, limit, offset } = parsed.data;

	const conditions = [];
	if (source) conditions.push(eq(documents.source, source));
	if (status) conditions.push(eq(documents.status, status));

	const where = conditions.length > 0 ? sql`${sql.join(conditions, sql` and `)}` : undefined;

	const [rows, [total]] = await Promise.all([
		db
			.select({
				id: documents.id,
				title: documents.title,
				source: documents.source,
				sourceUrl: documents.sourceUrl,
				status: documents.status,
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

	return c.json({ documents: rows, total: total.count });
});

export { docs };
