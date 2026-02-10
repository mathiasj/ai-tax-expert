/**
 * Backfill rawContent from files on disk for existing documents.
 * Run: bun run scripts/backfill-content.ts
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq, isNull } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { documents } from "../src/db/schema.js";

async function main() {
	console.log("Backfilling rawContent from files on disk...");

	const docs = await db
		.select({
			id: documents.id,
			title: documents.title,
			filePath: documents.filePath,
		})
		.from(documents)
		.where(isNull(documents.rawContent));

	console.log(`Found ${docs.length} documents without rawContent`);

	let updated = 0;
	let missing = 0;

	for (const doc of docs) {
		if (!doc.filePath) {
			missing++;
			continue;
		}

		// Try multiple path resolutions
		const paths = [
			doc.filePath,
			resolve(doc.filePath),
			doc.filePath.replace(/^\/app\//, ""),
			resolve(doc.filePath.replace(/^\/app\//, "")),
		];

		let content: string | null = null;
		for (const p of paths) {
			if (existsSync(p)) {
				content = await readFile(p, "utf-8");
				break;
			}
		}

		if (content) {
			await db
				.update(documents)
				.set({ rawContent: content })
				.where(eq(documents.id, doc.id));
			updated++;
		} else {
			missing++;
			console.log(`  Missing file: ${doc.title.slice(0, 60)} (${doc.filePath})`);
		}
	}

	console.log(`\nDone: ${updated} updated, ${missing} missing files`);
	process.exit(0);
}

main().catch((err) => {
	console.error("Backfill failed:", err);
	process.exit(1);
});
