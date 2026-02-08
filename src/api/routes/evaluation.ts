import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db/client.js";
import { evaluationRuns } from "../../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const evaluation = new Hono();

evaluation.use("/eval/*", requireAuth);

evaluation.get("/eval/results/latest", async (c) => {
	const [run] = await db
		.select()
		.from(evaluationRuns)
		.orderBy(sql`${evaluationRuns.createdAt} desc`)
		.limit(1);

	if (!run) {
		return c.json({ error: "No evaluation runs found" }, 404);
	}

	return c.json({
		id: run.id,
		totalQuestions: run.totalQuestions,
		avgRelevance: Number(run.avgRelevance),
		avgFaithfulness: Number(run.avgFaithfulness),
		avgCitationAccuracy: Number(run.avgCitationAccuracy),
		avgKeywordCoverage: Number(run.avgKeywordCoverage),
		avgRetrievalMs: Number(run.avgRetrievalMs),
		avgTotalMs: Number(run.avgTotalMs),
		byCategory: run.byCategory,
		byDifficulty: run.byDifficulty,
		results: run.results,
		createdAt: run.createdAt,
	});
});

export { evaluation };
