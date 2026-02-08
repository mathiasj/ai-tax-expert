import type { Context, Next } from "hono";
import pino from "pino";
import type { JWTPayload } from "../../auth/jwt.js";
import { verifyToken } from "../../auth/jwt.js";

const logger = pino({ name: "auth-middleware" });

declare module "hono" {
	interface ContextVariableMap {
		user: JWTPayload | null;
	}
}

function extractToken(c: Context): string | null {
	const header = c.req.header("Authorization");
	if (!header?.startsWith("Bearer ")) return null;
	return header.slice(7);
}

export async function optionalAuth(c: Context, next: Next): Promise<void | Response> {
	const token = extractToken(c);
	if (!token) {
		c.set("user", null);
		return next();
	}
	try {
		const payload = await verifyToken(token);
		c.set("user", payload);
	} catch {
		c.set("user", null);
	}
	return next();
}

export async function requireAuth(c: Context, next: Next): Promise<void | Response> {
	const token = extractToken(c);
	if (!token) {
		return c.json({ error: "Authentication required" }, 401);
	}
	try {
		const payload = await verifyToken(token);
		c.set("user", payload);
	} catch (err) {
		logger.warn({ err }, "Invalid JWT token");
		return c.json({ error: "Invalid or expired token" }, 401);
	}
	return next();
}
