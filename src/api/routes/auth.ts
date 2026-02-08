import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { signToken } from "../../auth/jwt.js";
import { hashPassword, verifyPassword } from "../../auth/password.js";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const auth = new Hono();

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	name: z.string().max(255).optional(),
});

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

auth.post("/auth/register", async (c) => {
	const body = await c.req.json();
	const parsed = registerSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
	}

	const { email, password, name } = parsed.data;

	const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
	if (existing.length > 0) {
		return c.json({ error: "Email already registered" }, 409);
	}

	const passwordHash = await hashPassword(password);
	const [user] = await db
		.insert(users)
		.values({ email, name, passwordHash, role: "user" })
		.returning({ id: users.id, email: users.email, role: users.role });

	const token = await signToken({ sub: user.id, email: user.email, role: user.role });

	return c.json({ token, user: { id: user.id, email: user.email, role: user.role } }, 201);
});

auth.post("/auth/login", async (c) => {
	const body = await c.req.json();
	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
	}

	const { email, password } = parsed.data;

	const [user] = await db
		.select({ id: users.id, email: users.email, role: users.role, passwordHash: users.passwordHash })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (!user?.passwordHash) {
		return c.json({ error: "Invalid email or password" }, 401);
	}

	const valid = await verifyPassword(password, user.passwordHash);
	if (!valid) {
		return c.json({ error: "Invalid email or password" }, 401);
	}

	const token = await signToken({ sub: user.id, email: user.email, role: user.role });

	return c.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

auth.get("/auth/me", requireAuth, async (c) => {
	const user = c.get("user");
	return c.json({ user });
});

const updateProfileSchema = z.object({
	name: z.string().max(255).min(1),
});

auth.patch("/auth/me", requireAuth, async (c) => {
	const user = c.get("user")!;
	const body = await c.req.json();
	const parsed = updateProfileSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
	}

	const [updated] = await db
		.update(users)
		.set({ name: parsed.data.name })
		.where(eq(users.id, user.sub))
		.returning({ id: users.id, email: users.email, role: users.role, name: users.name });

	if (!updated) {
		return c.json({ error: "User not found" }, 404);
	}

	return c.json({ user: updated });
});

export { auth };
