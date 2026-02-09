import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/password.js";
import { db } from "./client.js";
import { users } from "./schema.js";

const TEST_EMAIL = "test@example.se";
const TEST_PASSWORD = "test123";
const TEST_NAME = "Testanvändare";

export async function seedTestUser(): Promise<void> {
	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, TEST_EMAIL))
		.limit(1);

	if (existing.length > 0) return;

	const passwordHash = await hashPassword(TEST_PASSWORD);
	await db.insert(users).values({
		email: TEST_EMAIL,
		name: TEST_NAME,
		passwordHash,
		role: "user",
	});

	console.log(`[seed] Test user created: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
}
