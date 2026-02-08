import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import pino from "pino";
import { errorHandler } from "./api/middleware/error-handler.js";
import { health } from "./api/routes/health.js";
import { query } from "./api/routes/query.js";

const log = pino({ name: "server" });

const app = new Hono();

// Middleware
app.use("*", honoLogger());
app.use("*", cors());
app.use("*", errorHandler);

// Routes
app.route("/", health);
app.route("/api", query);

// Root
app.get("/", (c) => {
	return c.json({
		name: "SkatteAssistenten API",
		version: "0.1.0",
		docs: "/health",
	});
});

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

log.info({ port }, "Starting server");

export default {
	port,
	fetch: app.fetch,
};
