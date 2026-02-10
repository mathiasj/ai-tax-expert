import { readdir, readFile } from "node:fs/promises";
import { join, extname, basename, dirname } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { documents } from "../src/db/schema.js";
import { documentQueue } from "../src/workers/queue.js";

const RAW_DIR = "data/raw";

interface FileMeta {
	title: string;
	sourceUrl: string;
	source: string;
	[key: string]: unknown;
}

async function collectFiles(dir: string): Promise<string[]> {
	const files: string[] = [];

	try {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				files.push(...(await collectFiles(fullPath)));
			} else if (entry.isFile()) {
				const ext = extname(entry.name).toLowerCase();
				if ([".pdf", ".txt", ".html"].includes(ext)) {
					files.push(fullPath);
				}
			}
		}
	} catch (error) {
		console.error(`Error reading directory ${dir}:`, error);
	}

	return files;
}

async function loadMetadata(filePath: string): Promise<FileMeta> {
	const metaPath = `${filePath}.meta.json`;
	try {
		const raw = await readFile(metaPath, "utf-8");
		return JSON.parse(raw) as FileMeta;
	} catch {
		// Fallback: derive from file path
		const source = basename(dirname(filePath));
		const name = basename(filePath, extname(filePath));
		return {
			title: name.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
			sourceUrl: "",
			source: source || "unknown",
		};
	}
}

const VALID_SOURCES = ["skatteverket", "lagrummet", "riksdagen", "manual"] as const;
type ValidSource = (typeof VALID_SOURCES)[number];

function isValidSource(s: string): s is ValidSource {
	return VALID_SOURCES.includes(s as ValidSource);
}

async function main() {
	console.log("Importing documents from disk into database...");

	const files = await collectFiles(RAW_DIR);
	console.log(`Found ${files.length} files on disk`);

	if (files.length === 0) {
		console.log("No documents found. Run 'bun run scrape' first.");
		return;
	}

	// Check which files already have DB records (by filePath)
	const existingDocs = await db
		.select({ filePath: documents.filePath })
		.from(documents);
	const existingPaths = new Set(existingDocs.map((d) => d.filePath));

	let created = 0;
	let skipped = 0;

	for (const filePath of files) {
		if (existingPaths.has(filePath)) {
			skipped++;
			continue;
		}

		try {
			const meta = await loadMetadata(filePath);
			const source = isValidSource(meta.source) ? meta.source : "manual";
			const docType = meta.docType as string | undefined;
			const audience = meta.audience as string | undefined;
			const taxArea = meta.taxArea as string | undefined;

			// Read file content to store in DB (eliminates file path dependency)
			const rawContent = await readFile(filePath, "utf-8");

			const [doc] = await db
				.insert(documents)
				.values({
					title: meta.title,
					source,
					sourceUrl: meta.sourceUrl || null,
					filePath,
					rawContent,
					status: "pending",
					metadata: meta,
					...(docType ? { docType: docType as "stallningstagande" } : {}),
					...(audience ? { audience: audience as "allman" } : {}),
					...(taxArea ? { taxArea } : {}),
				})
				.returning({ id: documents.id });

			await documentQueue.add("process", {
				documentId: doc.id,
				filePath,
				title: meta.title,
				content: rawContent,
			});

			created++;
			console.log(`  Queued: ${meta.title.slice(0, 60)} (${source})`);
		} catch (error) {
			console.error(`  Failed: ${filePath}`, error);
		}
	}

	console.log(`\nDone: ${created} queued for processing, ${skipped} already in DB`);
	process.exit(0);
}

main().catch((error) => {
	console.error("Import failed:", error);
	process.exit(1);
});
