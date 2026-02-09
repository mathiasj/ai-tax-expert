import { Queue, Worker, type Job } from "bullmq";
import { and, eq, lt, ne, sql } from "drizzle-orm";
import pino from "pino";
import { db } from "../db/client.js";
import { documents } from "../db/schema.js";
import { connection, documentQueue } from "./queue.js";

const logger = pino({ name: "refresh-scheduler" });

const REFRESH_QUEUE_NAME = "document-refresh";

export const refreshQueue = new Queue(REFRESH_QUEUE_NAME, { connection });

/** Threshold in days for each refresh policy */
const POLICY_THRESHOLDS: Record<string, number> = {
	weekly: 7,
	monthly: 30,
	quarterly: 90,
};

async function checkForStaleDocuments(_job: Job): Promise<void> {
	logger.info("Checking for stale documents...");

	let totalQueued = 0;

	for (const [policy, days] of Object.entries(POLICY_THRESHOLDS)) {
		const threshold = new Date();
		threshold.setDate(threshold.getDate() - days);

		const staleDocs = await db
			.select({
				id: documents.id,
				filePath: documents.filePath,
				title: documents.title,
			})
			.from(documents)
			.where(
				and(
					eq(documents.refreshPolicy, policy as "weekly"),
					eq(documents.status, "indexed"),
					// lastCheckedAt is null OR older than threshold
					sql`(${documents.lastCheckedAt} IS NULL OR ${documents.lastCheckedAt} < ${threshold})`,
				),
			);

		for (const doc of staleDocs) {
			if (!doc.filePath) {
				logger.warn({ id: doc.id }, "Skipping refresh: no file path");
				continue;
			}

			await documentQueue.add("refresh", {
				documentId: doc.id,
				filePath: doc.filePath,
				title: doc.title,
			});
			totalQueued++;
		}

		if (staleDocs.length > 0) {
			logger.info(
				{ policy, stale: staleDocs.length },
				"Queued stale documents for refresh",
			);
		}
	}

	logger.info({ totalQueued }, "Refresh check complete");
}

const refreshWorker = new Worker(REFRESH_QUEUE_NAME, checkForStaleDocuments, {
	connection,
	concurrency: 1,
});

refreshWorker.on("completed", (job) => {
	logger.info({ jobId: job.id }, "Refresh check completed");
});

refreshWorker.on("failed", (job, error) => {
	logger.error({ jobId: job?.id, error: error.message }, "Refresh check failed");
});

/**
 * Set up a repeatable job to check for stale documents daily at 03:00.
 */
export async function setupRefreshSchedule(): Promise<void> {
	await refreshQueue.upsertJobScheduler(
		"daily-refresh",
		{ pattern: "0 3 * * *" },
		{ name: "check-stale", data: {} },
	);
	logger.info("Refresh schedule registered: daily at 03:00");
}

/**
 * Manually trigger a refresh check.
 */
export async function triggerRefresh(): Promise<string> {
	const job = await refreshQueue.add("manual-refresh", {});
	return job.id ?? "unknown";
}

// When run directly as a script, start the worker + schedule
if (import.meta.main) {
	setupRefreshSchedule().catch((err) =>
		logger.error({ err }, "Failed to set up refresh schedule"),
	);
	logger.info("Refresh scheduler worker started");
}
