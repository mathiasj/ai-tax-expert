import { readdir, readFile } from "node:fs/promises";
import { join, extname, basename, dirname } from "node:path";
import { parsePdf, parseTextFile } from "../src/processing/pdf-parser.js";
import { chunkDocument } from "../src/processing/chunker.js";
import { embedTexts } from "../src/processing/embedder.js";
import { indexPoints, type IndexPoint } from "../src/processing/indexer.js";
import { classifyDocType, classifyAudience, detectTaxArea } from "../src/processing/classifier.js";
import { v4 as uuidv4 } from "uuid";

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
			// 0. Load metadata
			const meta = await loadMetadata(filePath);
			console.log(`  Source: ${meta.source}, Title: ${meta.title.slice(0, 60)}`);

			// 1. Parse
			const ext = extname(filePath).toLowerCase();
			const parsed = ext === ".pdf" ? await parsePdf(filePath) : await parseTextFile(filePath);

			if (!parsed.text || parsed.text.length < 50) {
				console.log(`  Skipping (too short): ${parsed.text.length} chars`);
				continue;
			}

			console.log(`  Parsed: ${parsed.text.length} chars, ${parsed.pageCount} pages`);

			// 1b. Auto-classify if not already set in metadata
			const docType = (meta.docType as string) ?? classifyDocType(meta.source, meta);
			const audience = (meta.audience as string) ?? classifyAudience(meta.source, meta);
			const taxArea = (meta.taxArea as string) ?? detectTaxArea(meta.title, parsed.text.slice(0, 2000));

			console.log(`  Classification: docType=${docType}, audience=${audience}, taxArea=${taxArea ?? "none"}`);

			// 2. Chunk — include all metadata
			const enrichedMeta: Record<string, unknown> = {
				...parsed.metadata,
				...meta,
				filePath,
				docType,
				audience,
			};
			if (taxArea) enrichedMeta.taxArea = taxArea;

			const chunks = await chunkDocument(parsed.text, enrichedMeta);
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
