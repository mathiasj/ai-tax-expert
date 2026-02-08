import { and, count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db/client.js";
import { conversations, queries } from "../../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const convRouter = new Hono();

convRouter.use("/conversations/*", requireAuth);
convRouter.use("/conversations", requireAuth);

convRouter.get("/conversations", async (c) => {
	const user = c.get("user")!;

	const rows = await db
		.select({
			id: conversations.id,
			title: conversations.title,
			createdAt: conversations.createdAt,
			updatedAt: conversations.updatedAt,
			messageCount: count(queries.id),
		})
		.from(conversations)
		.leftJoin(queries, eq(queries.conversationId, conversations.id))
		.where(eq(conversations.userId, user.sub))
		.groupBy(conversations.id)
		.orderBy(sql`${conversations.updatedAt} desc`);

	return c.json({ conversations: rows });
});

convRouter.get("/conversations/:id/messages", async (c) => {
	const user = c.get("user")!;
	const convId = c.req.param("id");

	// Verify ownership
	const [conv] = await db
		.select({ id: conversations.id })
		.from(conversations)
		.where(and(eq(conversations.id, convId), eq(conversations.userId, user.sub)))
		.limit(1);

	if (!conv) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	const messages = await db
		.select({
			id: queries.id,
			question: queries.question,
			answer: queries.answer,
			metadata: queries.metadata,
			createdAt: queries.createdAt,
		})
		.from(queries)
		.where(eq(queries.conversationId, convId))
		.orderBy(sql`${queries.createdAt} asc`);

	return c.json({ messages });
});

export { convRouter };
