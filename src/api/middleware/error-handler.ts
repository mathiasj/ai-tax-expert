import type { Context, Next } from "hono";
import pino from "pino";

const logger = pino({ name: "error-handler" });

export async function errorHandler(c: Context, next: Next): Promise<Response> {
	try {
		await next();
	} catch (error) {
		const message = error instanceof Error ? error.message : "Internal server error";
		const status = error instanceof Error && "status" in error ? (error as { status: number }).status : 500;

		logger.error({ error: message, path: c.req.path, method: c.req.method }, "Request error");

		return c.json({ error: message }, status as 500);
	}
	// This line is technically unreachable but satisfies the return type
	return c.res;
}
