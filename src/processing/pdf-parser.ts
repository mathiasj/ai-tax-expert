import { readFile } from "node:fs/promises";
import pdf from "pdf-parse";
import pino from "pino";

const logger = pino({ name: "pdf-parser" });

export interface ParsedDocument {
	text: string;
	pageCount: number;
	metadata: Record<string, unknown>;
}

export async function parsePdf(filePath: string): Promise<ParsedDocument> {
	logger.info({ filePath }, "Parsing PDF");

	const buffer = await readFile(filePath);
	const data = await pdf(buffer);

	const cleaned = cleanText(data.text);

	logger.info({ filePath, pages: data.numpages, chars: cleaned.length }, "PDF parsed");

	return {
		text: cleaned,
		pageCount: data.numpages,
		metadata: {
			info: data.info,
			pages: data.numpages,
		},
	};
}

export async function parseTextFile(filePath: string): Promise<ParsedDocument> {
	const text = await readFile(filePath, "utf-8");
	const cleaned = cleanText(text);

	return {
		text: cleaned,
		pageCount: 1,
		metadata: {},
	};
}

function cleanText(text: string): string {
	return (
		text
			// Normalize whitespace
			.replace(/\r\n/g, "\n")
			.replace(/[ \t]+/g, " ")
			// Remove excessive newlines but keep paragraph breaks
			.replace(/\n{3,}/g, "\n\n")
			// Remove page headers/footers (common patterns in Swedish legal PDFs)
			.replace(/^\d+\s*$/gm, "")
			.replace(/^Sida \d+ av \d+\s*$/gm, "")
			.trim()
	);
}
