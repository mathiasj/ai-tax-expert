import { Hono } from "hono";

const health = new Hono();

health.get("/health", (c) => {
	return c.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		version: "0.1.0",
		env: process.env.NODE_ENV ?? "development",
	});
});

export { health };
