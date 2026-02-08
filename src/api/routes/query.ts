import { Hono } from "hono";
import { z } from "zod";
import { executeRAGQuery } from "../../core/rag-pipeline.js";

const query = new Hono();

const querySchema = z.object({
	question: z.string().min(1).max(2000),
	topK: z.number().int().min(1).max(100).optional(),
	rerankerTopN: z.number().int().min(1).max(50).optional(),
	tokenBudget: z.number().int().min(500).max(20000).optional(),
	temperature: z.number().min(0).max(2).optional(),
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

	const { question, ...options } = parsed.data;

	const response = await executeRAGQuery(question, options);

	return c.json({
		answer: response.answer,
		citations: response.citations,
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

export { query };
