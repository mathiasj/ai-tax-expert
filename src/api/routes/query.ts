import { Hono } from "hono";

const query = new Hono();

query.post("/query", async (c) => {
	// Placeholder for RAG query endpoint (Phase 3)
	const body = await c.req.json();
	const question = body?.question;

	if (!question || typeof question !== "string") {
		return c.json({ error: "Missing 'question' field" }, 400);
	}

	return c.json({
		message: "RAG query endpoint - not yet implemented (Phase 3)",
		question,
	});
});

export { query };
