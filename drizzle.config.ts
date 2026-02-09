import { defineConfig } from "drizzle-kit";

const host = process.env.POSTGRES_HOST ?? "localhost";
const user = process.env.POSTGRES_USER ?? "postgres";
const password = process.env.POSTGRES_PASSWORD ?? "postgres";
const port = process.env.POSTGRES_DB_PORT ?? "5432";
const db = process.env.POSTGRES_DB_NAME ?? "tax_expert";

const url =
	process.env.DATABASE_URL ??
	`postgresql://${user}:${password}@${host}:${port}/${db}`;

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url,
	},
});
