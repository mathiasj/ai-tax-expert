import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/client.js";
import { queries as queriesTable } from "../../db/schema.js";
import { executeRAGQuery } from "../../core/rag-pipeline.js";
import { requireAuth } from "../middleware/auth.js";

const query = new Hono();

const querySchema = z.object({
	question: z.string().min(1).max(2000),
	topK: z.number().int().min(1).max(100).optional(),
	rerankerTopN: z.number().int().min(1).max(50).optional(),
	tokenBudget: z.number().int().min(500).max(20000).optional(),
	temperature: z.number().min(0).max(2).optional(),
	conversationId: z.string().uuid().optional(),
	filters: z
		.object({
			source: z.array(z.string()).optional(),
			documentId: z.array(z.string()).optional(),
		})
		.optional(),
});

query.post("/query", async (c) => {
	const body = await c.req.json();
	const parsed = querySchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
	}

	const { question, conversationId, ...rest } = parsed.data;
	const user = c.get("user");

	const response = await executeRAGQuery(question, {
		...rest,
		conversationId,
		userId: user?.sub,
	});

	return c.json({
		answer: response.answer,
		citations: response.citations,
		conversationId: response.conversationId,
		queryId: response.queryId,
		cached: response.cached ?? false,
		timings: response.timings,
		metadata: {
			retrievedCount: response.retrievedChunks.length,
			rerankedCount: response.rankedChunks.length,
			contextChunks: response.context.chunks.length,
			contextTokens: response.context.totalTokens,
			droppedChunks: response.context.droppedCount,
		},
	});
});

const feedbackSchema = z.object({
	rating: z.union([z.literal(1), z.literal(-1)]),
	comment: z.string().max(2000).optional(),
});

query.post("/queries/:id/feedback", requireAuth, async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();
	const parsed = feedbackSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
	}

	const [existing] = await db
		.select({ id: queriesTable.id })
		.from(queriesTable)
		.where(eq(queriesTable.id, id))
		.limit(1);

	if (!existing) {
		return c.json({ error: "Query not found" }, 404);
	}

	await db
		.update(queriesTable)
		.set({
			feedbackRating: parsed.data.rating,
			feedbackComment: parsed.data.comment ?? null,
			feedbackAt: new Date(),
		})
		.where(eq(queriesTable.id, id));

	return c.json({ success: true });
});

export { query };
