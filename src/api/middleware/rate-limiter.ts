import type { Context, Next } from "hono";
import pino from "pino";
import { env } from "../../config/env.js";
import { getRedis } from "../../core/cache.js";

const logger = pino({ name: "rate-limiter" });

function getClientId(c: Context): string {
	const user = c.get("user");
	if (user?.sub) return `user:${user.sub}`;
	const forwarded = c.req.header("X-Forwarded-For");
	const ip = forwarded?.split(",")[0].trim() ?? "unknown";
	return `ip:${ip}`;
}

export async function rateLimiter(c: Context, next: Next): Promise<void | Response> {
	// Skip rate limiting in development
	if (process.env.NODE_ENV !== "production") {
		return next();
	}

	const clientId = getClientId(c);
	const user = c.get("user");
	const limit = user ? env.RATE_LIMIT_AUTHENTICATED : env.RATE_LIMIT_ANONYMOUS;

	const now = Math.floor(Date.now() / 1000);
	const windowStart = now - (now % 60);
	const key = `rate_limit:${clientId}:${windowStart}`;

	try {
		const redis = getRedis();
		const current = await redis.incr(key);
		if (current === 1) {
			await redis.expire(key, 60);
		}

		const remaining = Math.max(0, limit - current);
		const reset = windowStart + 60;

		c.header("X-RateLimit-Limit", String(limit));
		c.header("X-RateLimit-Remaining", String(remaining));
		c.header("X-RateLimit-Reset", String(reset));

		if (current > limit) {
			c.header("Retry-After", String(reset - now));
			return c.json({ error: "Too many requests" }, 429);
		}
	} catch (err) {
		logger.warn({ err }, "Rate limiter Redis error, allowing request");
	}

	return next();
}
