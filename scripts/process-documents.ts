import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { parsePdf, parseTextFile } from "../src/processing/pdf-parser.js";
import { chunkDocument } from "../src/processing/chunker.js";
import { embedTexts } from "../src/processing/embedder.js";
import { indexPoints, type IndexPoint } from "../src/processing/indexer.js";
import { v4 as uuidv4 } from "uuid";

const RAW_DIR = "data/raw";

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

async function main() {
	console.log("Starting document processing pipeline...");

	const files = await collectFiles(RAW_DIR);
	console.log(`Found ${files.length} documents to process`);

	if (files.length === 0) {
		console.log("No documents found. Run 'bun run scrape' first.");
		return;
	}

	for (const filePath of files) {
		const documentId = uuidv4();
		console.log(`\nProcessing: ${filePath}`);

		try {
			// 1. Parse
			const ext = extname(filePath).toLowerCase();
			const parsed = ext === ".pdf" ? await parsePdf(filePath) : await parseTextFile(filePath);

			if (!parsed.text || parsed.text.length < 50) {
				console.log(`  Skipping (too short): ${parsed.text.length} chars`);
				continue;
			}

			console.log(`  Parsed: ${parsed.text.length} chars, ${parsed.pageCount} pages`);

			// 2. Chunk
			const chunks = await chunkDocument(parsed.text, {
				filePath,
				...parsed.metadata,
			});
			console.log(`  Chunked: ${chunks.length} chunks`);

			// 3. Embed
			const texts = chunks.map((c) => c.content);
			const embeddings = await embedTexts(texts);
			console.log(`  Embedded: ${embeddings.length} vectors`);

			// 4. Index
			const points: IndexPoint[] = chunks.map((chunk, i) => ({
				chunk,
				embedding: embeddings[i].embedding,
				documentId,
			}));

			const ids = await indexPoints(points);
			console.log(`  Indexed: ${ids.length} points in Qdrant`);
		} catch (error) {
			console.error(`  Failed to process ${filePath}:`, error);
		}
	}

	console.log("\nProcessing complete.");
}

main().catch((error) => {
	console.error("Processing failed:", error);
	process.exit(1);
});
