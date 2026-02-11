import { type Job, Queue, Worker } from "bullmq";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import pino from "pino";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { documents, sources } from "../db/schema.js";
import type { BaseScraper } from "../scraping/base-scraper.js";
import { LagrummetClient } from "../scraping/lagrummet-client.js";
import { RiksdagenClient } from "../scraping/riksdagen-client.js";
import { SkatteverketScraper } from "../scraping/skatteverket-scraper.js";
import { connection, documentQueue } from "./queue.js";

const logger = pino({ name: "scrape-scheduler" });

const SCRAPE_QUEUE_NAME = "scrape-jobs";

export interface ScrapeJob {
	sourceId: string;
	target: string;
	limit: number;
	rateLimitMs: number;
	doktyp?: string;
}

export const scrapeQueue = new Queue<ScrapeJob>(SCRAPE_QUEUE_NAME, {
	connection,
});

type ScraperFactory = (opts: Partial<import("../scraping/base-scraper.js").ScraperOptions>) => BaseScraper;

const scraperFactories: Record<string, ScraperFactory> = {
	skatteverket: (opts) => new SkatteverketScraper(opts),
	lagrummet: (opts) => new LagrummetClient(opts),
	riksdagen: (opts) => new RiksdagenClient(opts),
};

const healthUrls: Record<string, string> = {
	skatteverket: "https://api.firecrawl.dev",
	lagrummet: "https://data.lagrummet.se",
	riksdagen: "https://data.riksdagen.se/dokumentlista/?sok=skatt&utformat=json&sz=1",
};

/** Parse doktyp param from a riksdagen source URL */
function parseDoktyp(url: string): string | undefined {
	try {
		const parsed = new URL(url);
		return parsed.searchParams.get("doktyp") ?? undefined;
	} catch {
		return undefined;
	}
}

async function checkHealth(url: string): Promise<boolean> {
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 5000);
		try {
			const response = await fetch(url, {
				method: "HEAD",
				signal: controller.signal,
				headers: {
					"User-Agent": "SkatteAssistenten/0.1 (Swedish Tax Research; academic/research use)",
				},
			});
			return response.ok || response.status < 500;
		} finally {
			clearTimeout(timer);
		}
	} catch {
		return false;
	}
}

async function processScrapeJob(job: Job<ScrapeJob>): Promise<void> {
	const { sourceId, target, limit, rateLimitMs, doktyp } = job.data;

	logger.info({ sourceId, target, limit, doktyp, jobId: job.id }, "Starting scrape job");

	// Look up source to confirm it still exists and is active
	const [source] = await db
		.select()
		.from(sources)
		.where(eq(sources.id, sourceId))
		.limit(1);

	if (!source) {
		logger.warn({ sourceId }, "Source not found, skipping");
		return;
	}
	if (!source.isActive) {
		logger.info({ sourceId }, "Source is inactive, skipping");
		return;
	}

	// Health check
	const healthUrl = healthUrls[target];
	if (healthUrl) {
		const healthy = await checkHealth(healthUrl);
		if (!healthy) {
			const errorMsg = `Health check failed for ${target} (${healthUrl})`;
			logger.warn({ target, sourceId }, errorMsg);

			await db
				.update(sources)
				.set({ lastError: errorMsg, updatedAt: new Date() })
				.where(eq(sources.id, sourceId));

			throw new Error(errorMsg);
		}
	}

	// Create scraper with source-specific config
	const factory = scraperFactories[target];
	if (!factory) {
		throw new Error(`Unknown scrape target: ${target}`);
	}

	let docCount = 0;

	const onDocument = async (doc: import("../scraping/base-scraper.js").ScrapedDocument) => {
		if (!doc.filePath) return;

		const meta = doc.metadata ?? {};
		const docSource = (meta.source as string) ?? target;
		const docType = meta.docType as string | undefined;
		const audience = meta.audience as string | undefined;
		const taxArea = meta.taxArea as string | undefined;

		try {
			const [created] = await db
				.insert(documents)
				.values({
					title: doc.title,
					source: docSource as "skatteverket" | "lagrummet" | "riksdagen" | "manual",
					sourceId,
					sourceUrl: doc.sourceUrl ?? null,
					filePath: doc.filePath,
					rawContent: doc.content ?? null,
					status: "pending",
					metadata: meta,
					...(docType ? { docType: docType as "stallningstagande" } : {}),
					...(audience ? { audience: audience as "allman" } : {}),
					...(taxArea ? { taxArea } : {}),
				})
				.returning({ id: documents.id });

			await documentQueue.add("process", {
				documentId: created.id,
				filePath: doc.filePath ?? "",
				title: doc.title,
				content: doc.content,
			});

			docCount++;
			logger.info({ documentId: created.id, title: doc.title, sourceId }, "Queued document for processing");
		} catch (err) {
			logger.error({ title: doc.title, err }, "Failed to create document record");
		}
	};

	const scraper = factory({
		limit,
		rateLimit: rateLimitMs,
		onDocument,
		doktyp,
	});

	let scrapeError: string | null = null;
	try {
		await scraper.scrape();
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		// Check for Firecrawl insufficient credits (402)
		if (msg.includes("Insufficient credits") || msg.includes("402")) {
			scrapeError = "Firecrawl: Otillräckliga credits. Fyll på via firecrawl.dev/pricing";
		} else {
			scrapeError = msg;
		}
		logger.error({ sourceId, target, error: msg }, "Scraper threw an error");
	}

	logger.info({ sourceId, target, documents: docCount, jobId: job.id }, "Scrape job completed");

	// Update the specific source row
	await db
		.update(sources)
		.set({
			lastScrapedAt: new Date(),
			lastError: scrapeError,
			updatedAt: new Date(),
		})
		.where(eq(sources.id, sourceId));
}

const scrapeWorker = new Worker<ScrapeJob>(SCRAPE_QUEUE_NAME, processScrapeJob, {
	connection,
	concurrency: 1,
});

scrapeWorker.on("completed", (job) => {
	logger.info({ jobId: job.id, sourceId: job.data.sourceId, target: job.data.target }, "Scrape job completed");
});

scrapeWorker.on("failed", (job, error) => {
	logger.error(
		{ jobId: job?.id, sourceId: job?.data.sourceId, target: job?.data.target, error: error.message },
		"Scrape job failed",
	);
});

/**
 * Queue a scrape job for a specific source.
 */
export async function triggerScrape(sourceId: string): Promise<string> {
	const [source] = await db
		.select()
		.from(sources)
		.where(eq(sources.id, sourceId))
		.limit(1);

	if (!source) throw new Error(`Source not found: ${sourceId}`);

	const doktyp = source.source === "riksdagen" ? parseDoktyp(source.url) : undefined;

	const job = await scrapeQueue.add(`scrape-${source.source}-${sourceId.slice(0, 8)}`, {
		sourceId,
		target: source.source,
		limit: source.maxDocuments,
		rateLimitMs: source.rateLimitMs,
		doktyp,
	});
	return job.id ?? "unknown";
}

/**
 * Check all active sources and trigger scrape jobs for those that are due.
 */
async function checkAndTriggerSources(): Promise<void> {
	const activeSources = await db
		.select()
		.from(sources)
		.where(eq(sources.isActive, true));

	const now = Date.now();

	for (const source of activeSources) {
		// 0 = manual, never auto-triggered
		if (source.scrapeIntervalMinutes <= 0) continue;

		const thresholdMs = source.scrapeIntervalMinutes * 60 * 1000;
		const lastScraped = source.lastScrapedAt ? new Date(source.lastScrapedAt).getTime() : 0;

		if (now - lastScraped >= thresholdMs) {
			logger.info(
				{ sourceId: source.id, source: source.source, intervalMinutes: source.scrapeIntervalMinutes },
				"Source is due for scraping, triggering",
			);
			try {
				await triggerScrape(source.id);
			} catch (err) {
				logger.error({ sourceId: source.id, err }, "Failed to trigger scrape for source");
			}
		}
	}
}

/**
 * Set up hourly schedule check for source-based scraping.
 */
export async function setupScrapeSchedule(): Promise<void> {
	if (!env.SCRAPE_SCHEDULE_ENABLED) {
		logger.info("Scrape schedule disabled via SCRAPE_SCHEDULE_ENABLED=false");
		return;
	}

	// Run an initial check
	await checkAndTriggerSources();

	// Check every 5 minutes
	setInterval(async () => {
		try {
			await checkAndTriggerSources();
		} catch (err) {
			logger.error({ err }, "Error in scheduled source check");
		}
	}, 5 * 60 * 1000);

	logger.info("Source-based scrape schedule active (5-minute check)");
}

// When run directly as a script, start the worker + schedule
if (import.meta.main) {
	setupScrapeSchedule().catch((err) => logger.error({ err }, "Failed to set up scrape schedule"));
	logger.info("Scrape scheduler worker started");
}
