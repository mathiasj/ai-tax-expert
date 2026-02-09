import type { Context, Next } from "hono";
import { requireAuth } from "./auth.js";

export async function requireAdmin(c: Context, next: Next): Promise<void | Response> {
	const authResult = await requireAuth(c, async () => {});
	if (authResult) return authResult;

	const user = c.get("user");
	if (!user || user.role !== "admin") {
		return c.json({ error: "Forbidden: admin access required" }, 403);
	}

	return next();
}
