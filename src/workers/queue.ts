import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env.js";

const QUEUE_NAME = "document-processing";

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export interface DocumentJob {
	documentId: string;
	filePath: string;
	title: string;
	/** Raw text content — when present, worker uses this instead of reading filePath from disk */
	content?: string;
}

export const documentQueue = new Queue<DocumentJob>(QUEUE_NAME, { connection });

export { QUEUE_NAME, connection };
