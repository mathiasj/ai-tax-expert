import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/password.js";
import { db } from "./client.js";
import { sources, users } from "./schema.js";

const TEST_EMAIL = "test@example.se";
const TEST_PASSWORD = "test123";
const TEST_NAME = "Testanvändare";

const ADMIN_EMAIL = "admin@example.se";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Administratör";

async function seedUser(
	email: string,
	password: string,
	name: string,
	role: string,
): Promise<void> {
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

const DEFAULT_SOURCES = [
	{
		url: "https://www4.skatteverket.se/rattsligvagledning/121.html",
		source: "skatteverket" as const,
		label: "Ställningstaganden",
	},
	{
		url: "https://www4.skatteverket.se/rattsligvagledning/110.html",
		source: "skatteverket" as const,
		label: "Handledningar",
	},
	{
		url: "https://data.lagrummet.se/set/hfd",
		source: "lagrummet" as const,
		label: "HFD rättsfall",
	},
	{
		url: "https://data.riksdagen.se/dokumentlista/?doktyp=prop,sou",
		source: "riksdagen" as const,
		label: "Propositioner & SOU",
	},
];

async function seedSources(): Promise<void> {
	for (const src of DEFAULT_SOURCES) {
		const existing = await db
			.select({ id: sources.id })
			.from(sources)
			.where(eq(sources.url, src.url))
			.limit(1);

		if (existing.length > 0) continue;

		await db.insert(sources).values(src);
		console.log(`[seed] source created: ${src.label} (${src.source})`);
	}
}

export async function seedTestUser(): Promise<void> {
	await seedUser(TEST_EMAIL, TEST_PASSWORD, TEST_NAME, "user");
	await seedUser(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, "admin");
	await seedSources();
}
