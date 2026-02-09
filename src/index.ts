import { existsSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import pino from "pino";
import { optionalAuth } from "./api/middleware/auth.js";
import { errorHandler } from "./api/middleware/error-handler.js";
import { rateLimiter } from "./api/middleware/rate-limiter.js";
import { admin } from "./api/routes/admin.js";
import { analytics } from "./api/routes/analytics.js";
import { auth } from "./api/routes/auth.js";
import { convRouter } from "./api/routes/conversations.js";
import { docs } from "./api/routes/documents.js";
import { evaluation } from "./api/routes/evaluation.js";
import { health } from "./api/routes/health.js";
import { query } from "./api/routes/query.js";
import { env } from "./config/env.js";
import { seedTestUser } from "./db/seed.js";
import { connection, documentQueue } from "./workers/queue.js";
import { refreshQueue, setupRefreshSchedule } from "./workers/refresh-scheduler.js";
import { scrapeQueue, setupScrapeSchedule } from "./workers/scrape-scheduler.js";

const log = pino({ name: "server" });

const app = new Hono();

// Middleware
app.use("*", honoLogger());
app.use("*", cors());
app.use("*", errorHandler);
app.use("/api/*", optionalAuth);
app.use("/api/*", rateLimiter);

// Routes
app.route("/", health);
app.route("/api", auth);
app.route("/api", query);
app.route("/api", analytics);
app.route("/api", docs);
app.route("/api", convRouter);
app.route("/api", evaluation);
app.route("/api/admin", admin);

// Static file serving (SPA)
const distPath = join(import.meta.dir, "../frontend/dist");
const hasDistDir = existsSync(distPath);

if (hasDistDir) {
	log.info({ distPath }, "Serving frontend static files");

	app.use("/assets/*", serveStatic({ root: "./frontend/dist" }));
	app.use("/favicon.svg", serveStatic({ path: "./frontend/dist/favicon.svg" }));

	// SPA fallback — serve index.html for non-API routes
	app.get("*", serveStatic({ path: "./frontend/dist/index.html" }));
} else {
	// Root — API info (no frontend build available)
	app.get("/", (c) => {
		return c.json({
			name: "SkatteAssistenten API",
			version: "0.1.0",
			docs: "/health",
		});
	});
}

const port = env.BACKEND_API_PORT;

// Seed test user in development mode
if (process.env.NODE_ENV !== "production") {
	seedTestUser().catch((err) => log.warn({ err }, "Could not seed test user"));
}

// Set up refresh scheduler
setupRefreshSchedule().catch((err) => log.warn({ err }, "Could not set up refresh schedule"));

// Set up scrape scheduler
setupScrapeSchedule().catch((err) => log.warn({ err }, "Could not set up scrape schedule"));

log.info({ port }, "Starting server");

// ─── Graceful Shutdown ───────────────────────────────────────

async function shutdown(signal: string) {
	log.info({ signal }, "Shutting down gracefully...");
	try {
		await Promise.allSettled([
			documentQueue.close(),
			refreshQueue.close(),
			scrapeQueue.close(),
			connection.quit(),
		]);
		log.info("All queues closed");
	} catch (err) {
		log.error({ err }, "Error during shutdown");
	}
	process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default {
	port,
	fetch: app.fetch,
};
