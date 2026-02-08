import Redis from "ioredis";
import pino from "pino";
import { env } from "../config/env.js";

const logger = pino({ name: "cache" });

let redis: Redis | null = null;

function getRedis(): Redis {
	if (!redis) {
		redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });
		redis.on("error", (err) => logger.error({ err }, "Redis connection error"));
	}
	return redis;
}

export async function getCache<T>(key: string): Promise<T | null> {
	try {
		const data = await getRedis().get(key);
		if (!data) return null;
		return JSON.parse(data) as T;
	} catch (err) {
		logger.warn({ err, key }, "Cache get failed");
		return null;
	}
}

export async function setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
	try {
		const seconds = ttl ?? env.CACHE_TTL_SECONDS;
		await getRedis().set(key, JSON.stringify(value), "EX", seconds);
	} catch (err) {
		logger.warn({ err, key }, "Cache set failed");
	}
}

export async function deleteCache(pattern: string): Promise<void> {
	try {
		const keys = await getRedis().keys(pattern);
		if (keys.length > 0) {
			await getRedis().del(...keys);
		}
	} catch (err) {
		logger.warn({ err, pattern }, "Cache delete failed");
	}
}

export function queryCacheKey(question: string, options?: { topK?: number; filters?: Record<string, unknown> }): string {
	const normalized = question.trim().toLowerCase();
	const payload = JSON.stringify({ q: normalized, ...options });
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(payload);
	return `query_cache:${hasher.digest("hex")}`;
}

export { getRedis };
