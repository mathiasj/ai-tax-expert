import { type Job, Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
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
	target: "skatteverket" | "lagrummet" | "riksdagen";
	limit?: number;
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
	const { target, limit } = job.data;
	const effectiveLimit = limit ?? env.SCRAPE_DEFAULT_LIMIT;

	logger.info({ target, limit: effectiveLimit, jobId: job.id }, "Starting scrape job");

	// Health check
	const healthUrl = healthUrls[target];
	if (healthUrl) {
		const healthy = await checkHealth(healthUrl);
		if (!healthy) {
			const errorMsg = `Health check failed for ${target} (${healthUrl})`;
			logger.warn({ target }, errorMsg);

			// Update source lastError
			await db
				.update(sources)
				.set({ lastError: errorMsg, updatedAt: new Date() })
				.where(eq(sources.source, target));

			throw new Error(errorMsg);
		}
	}

	// Create scraper with onDocument callback to insert DB records immediately
	const factory = scraperFactories[target];
	if (!factory) {
		throw new Error(`Unknown scrape target: ${target}`);
	}

	let docCount = 0;

	const onDocument = async (doc: import("../scraping/base-scraper.js").ScrapedDocument) => {
		if (!doc.filePath) return;

		const meta = doc.metadata ?? {};
		const source = (meta.source as string) ?? target;
		const docType = meta.docType as string | undefined;
		const audience = meta.audience as string | undefined;
		const taxArea = meta.taxArea as string | undefined;

		try {
			const [created] = await db
				.insert(documents)
				.values({
					title: doc.title,
					source: source as "skatteverket" | "lagrummet" | "riksdagen" | "manual",
					sourceUrl: doc.sourceUrl ?? null,
					filePath: doc.filePath,
					status: "pending",
					metadata: meta,
					...(docType ? { docType: docType as "stallningstagande" } : {}),
					...(audience ? { audience: audience as "allman" } : {}),
					...(taxArea ? { taxArea } : {}),
				})
				.returning({ id: documents.id });

			await documentQueue.add("process", {
				documentId: created.id,
				filePath: doc.filePath,
				title: doc.title,
			});

			docCount++;
			logger.info({ documentId: created.id, title: doc.title }, "Queued document for processing");
		} catch (err) {
			logger.error({ title: doc.title, err }, "Failed to create document record");
		}
	};

	const scraper = factory({ limit: effectiveLimit, onDocument });
	await scraper.scrape();

	logger.info({ target, documents: docCount, jobId: job.id }, "Scrape job completed");

	// Update sources table
	await db
		.update(sources)
		.set({
			lastScrapedAt: new Date(),
			lastError: null,
			updatedAt: new Date(),
		})
		.where(eq(sources.source, target));
}

const scrapeWorker = new Worker<ScrapeJob>(SCRAPE_QUEUE_NAME, processScrapeJob, {
	connection,
	concurrency: 1,
});

scrapeWorker.on("completed", (job) => {
	logger.info({ jobId: job.id, target: job.data.target }, "Scrape job completed");
});

scrapeWorker.on("failed", (job, error) => {
	logger.error(
		{ jobId: job?.id, target: job?.data.target, error: error.message },
		"Scrape job failed",
	);
});

/**
 * Queue a scrape job for a specific target.
 */
export async function triggerScrape(target: ScrapeJob["target"], limit?: number): Promise<string> {
	const job = await scrapeQueue.add(`scrape-${target}`, { target, limit });
	return job.id ?? "unknown";
}

/**
 * Set up a repeatable scrape schedule (default: every Monday at 04:00).
 */
export async function setupScrapeSchedule(): Promise<void> {
	if (!env.SCRAPE_SCHEDULE_ENABLED) {
		logger.info("Scrape schedule disabled via SCRAPE_SCHEDULE_ENABLED=false");
		return;
	}

	await scrapeQueue.upsertJobScheduler(
		"weekly-scrape",
		{ pattern: env.SCRAPE_SCHEDULE_CRON },
		{
			name: "scheduled-scrape-all",
			data: { target: "riksdagen" as const },
		},
	);
	logger.info({ cron: env.SCRAPE_SCHEDULE_CRON }, "Scrape schedule registered");
}

// When run directly as a script, start the worker + schedule
if (import.meta.main) {
	// For scheduled jobs, run all three scrapers sequentially
	scrapeWorker.on("completed", async (job) => {
		if (job.name === "scheduled-scrape-all") {
			// The scheduled job triggers riksdagen first, then chain the others
			await triggerScrape("lagrummet");
			await triggerScrape("skatteverket");
		}
	});

	setupScrapeSchedule().catch((err) => logger.error({ err }, "Failed to set up scrape schedule"));
	logger.info("Scrape scheduler worker started");
}
