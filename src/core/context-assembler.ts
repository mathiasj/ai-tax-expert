import pino from "pino";
import { env } from "../config/env.js";
import type { AssembledContext, RankedChunk } from "./types.js";

const logger = pino({ name: "context-assembler" });

const CHARS_PER_TOKEN = 4;
const DEDUP_PREFIX_LENGTH = 200;

function estimateTokens(text: string): number {
	return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function dedupChunks(chunks: RankedChunk[]): RankedChunk[] {
	const seen = new Set<string>();
	return chunks.filter((chunk) => {
		const key = chunk.content.slice(0, DEDUP_PREFIX_LENGTH).trim();
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

function orderChunks(chunks: RankedChunk[]): RankedChunk[] {
	const byDocument = new Map<string, RankedChunk[]>();
	for (const chunk of chunks) {
		const docId = chunk.documentId;
		if (!byDocument.has(docId)) {
			byDocument.set(docId, []);
		}
		byDocument.get(docId)!.push(chunk);
	}

	// Sort documents by best rerank score
	const sortedDocs = [...byDocument.entries()].sort(
		(a, b) => Math.max(...b[1].map((c) => c.rerankScore)) - Math.max(...a[1].map((c) => c.rerankScore)),
	);

	const ordered: RankedChunk[] = [];
	for (const [, docChunks] of sortedDocs) {
		// Within each document, sort by chunk index for reading order
		docChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
		ordered.push(...docChunks);
	}

	return ordered;
}

const DOC_TYPE_LABELS: Record<string, string> = {
	stallningstagande: "Ställningstagande",
	handledning: "Handledning",
	proposition: "Proposition",
	sou: "SOU",
	lagtext: "Lagtext (SFS)",
	rattsfallsnotis: "Rättsfallsnotis",
	rattsfallsreferat: "Rättsfallsreferat",
	ovrigt: "Övrigt",
};

function formatContext(chunks: RankedChunk[]): string {
	return chunks
		.map((chunk, i) => {
			const docType = chunk.metadata.docType as string | undefined;
			const label = docType ? (DOC_TYPE_LABELS[docType] ?? docType) : ((chunk.metadata.source as string) ?? "okänd");
			const title = (chunk.metadata.title as string) ?? "Utan titel";
			return `[Källa ${i + 1}: ${label} - ${title}]\n${chunk.content}`;
		})
		.join("\n\n---\n\n");
}

export function assembleContext(
	chunks: RankedChunk[],
	tokenBudget?: number,
): AssembledContext {
	const budget = tokenBudget ?? env.RAG_TOKEN_BUDGET;

	const deduped = dedupChunks(chunks);
	const ordered = orderChunks(deduped);

	const included: RankedChunk[] = [];
	let totalTokens = 0;
	let droppedCount = 0;

	for (const chunk of ordered) {
		const chunkTokens = estimateTokens(chunk.content);
		if (totalTokens + chunkTokens > budget) {
			droppedCount++;
			continue;
		}
		included.push(chunk);
		totalTokens += chunkTokens;
	}

	const contextText = formatContext(included);

	logger.info(
		{
			input: chunks.length,
			deduped: deduped.length,
			included: included.length,
			dropped: droppedCount,
			tokens: totalTokens,
			budget,
		},
		"Context assembled",
	);

	return {
		chunks: included,
		contextText,
		totalTokens,
		droppedCount,
	};
}
