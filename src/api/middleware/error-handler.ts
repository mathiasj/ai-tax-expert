import type { Context, Next } from "hono";
import pino from "pino";

const logger = pino({ name: "error-handler" });

export async function errorHandler(c: Context, next: Next): Promise<Response> {
	const requestId = crypto.randomUUID();
	c.header("X-Request-Id", requestId);

	try {
		await next();
	} catch (error) {
		const message = error instanceof Error ? error.message : "Internal server error";
		const statusCode =
			error instanceof Error && "status" in error
				? (error as { status: number }).status
				: 500;

		logger.error(
			{ error: message, requestId, path: c.req.path, method: c.req.method },
			"Request error",
		);

		return c.json({ error: message, requestId, statusCode }, statusCode as 500);
	}

	return c.res;
}
