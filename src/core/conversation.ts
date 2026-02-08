import { asc, eq } from "drizzle-orm";
import pino from "pino";
import { db } from "../db/client.js";
import { conversations, queries } from "../db/schema.js";
import type { ConversationTurn } from "./types.js";

const logger = pino({ name: "conversation" });

export async function createConversation(userId?: string): Promise<string> {
	const [conv] = await db
		.insert(conversations)
		.values({ userId, title: null })
		.returning({ id: conversations.id });

	logger.debug({ conversationId: conv.id, userId }, "Created conversation");
	return conv.id;
}

export async function getConversationHistory(
	conversationId: string,
	limit = 5,
): Promise<ConversationTurn[]> {
	const rows = await db
		.select({ question: queries.question, answer: queries.answer })
		.from(queries)
		.where(eq(queries.conversationId, conversationId))
		.orderBy(asc(queries.createdAt))
		.limit(limit);

	return rows
		.filter((r): r is { question: string; answer: string } => r.answer != null)
		.map((r) => ({ question: r.question, answer: r.answer }));
}
