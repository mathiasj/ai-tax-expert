import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/password.js";
import { db } from "./client.js";
import { users } from "./schema.js";

const TEST_EMAIL = "test@example.se";
const TEST_PASSWORD = "test123";
const TEST_NAME = "Testanvändare";

const ADMIN_EMAIL = "admin@example.se";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Administratör";

async function seedUser(email: string, password: string, name: string, role: string): Promise<void> {
	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (existing.length > 0) return;

	const passwordHash = await hashPassword(password);
	await db.insert(users).values({
		email,
		name,
		passwordHash,
		role,
	});

	console.log(`[seed] ${role} user created: ${email} / ${password}`);
}

export async function seedTestUser(): Promise<void> {
	await seedUser(TEST_EMAIL, TEST_PASSWORD, TEST_NAME, "user");
	await seedUser(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, "admin");
}
