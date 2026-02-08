import { count, countDistinct, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getCache, setCache } from "../../core/cache.js";
import { db } from "../../db/client.js";
import { conversations, queries, users } from "../../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const analytics = new Hono();

analytics.use("/analytics/*", requireAuth);

analytics.get("/analytics/summary", async (c) => {
	const cacheKey = "analytics:summary";
	const cached = await getCache<Record<string, unknown>>(cacheKey);
	if (cached) return c.json(cached);

	const now = sql`now()`;

	const [totals] = await db
		.select({
			totalQueries: count(queries.id),
			uniqueUsers: countDistinct(queries.userId),
		})
		.from(queries);

	const [last24h] = await db
		.select({ count: count(queries.id) })
		.from(queries)
		.where(sql`${queries.createdAt} > ${now} - interval '24 hours'`);

	const [last7d] = await db
		.select({ count: count(queries.id) })
		.from(queries)
		.where(sql`${queries.createdAt} > ${now} - interval '7 days'`);

	const [last30d] = await db
		.select({ count: count(queries.id) })
		.from(queries)
		.where(sql`${queries.createdAt} > ${now} - interval '30 days'`);

	const [convCount] = await db
		.select({ count: count(conversations.id) })
		.from(conversations);

	const [avgTiming] = await db
		.select({
			avgTotalMs: sql<number>`avg((${queries.metadata}->>'timings')::jsonb->>'totalMs')::numeric`,
		})
		.from(queries)
		.where(sql`${queries.metadata}->>'timings' is not null`);

	const result = {
		totalQueries: totals.totalQueries,
		uniqueUsers: totals.uniqueUsers,
		queries24h: last24h.count,
		queries7d: last7d.count,
		queries30d: last30d.count,
		conversations: convCount.count,
		avgResponseTimeMs: avgTiming.avgTotalMs ? Math.round(Number(avgTiming.avgTotalMs)) : null,
	};

	await setCache(cacheKey, result, 60);
	return c.json(result);
});

analytics.get("/analytics/popular", async (c) => {
	const cacheKey = "analytics:popular";
	const cached = await getCache<unknown[]>(cacheKey);
	if (cached) return c.json(cached);

	const rows = await db
		.select({
			question: queries.question,
			count: count(queries.id),
		})
		.from(queries)
		.groupBy(queries.question)
		.orderBy(sql`count(${queries.id}) desc`)
		.limit(20);

	await setCache(cacheKey, rows, 60);
	return c.json(rows);
});

export { analytics };
