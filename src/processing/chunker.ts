import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import pino from "pino";

const logger = pino({ name: "chunker" });

export interface Chunk {
	content: string;
	index: number;
	metadata: Record<string, unknown>;
}

// Swedish legal document separators, ordered from most to least significant
const SWEDISH_LEGAL_SEPARATORS = [
	"\n\nKapitel ",
	"\nKap. ",
	"\nKap ",
	"\n\n§ ",
	"\n§ ",
	"\n\nAvdelning ",
	"\n\nAvsnitt ",
	"\n\n", // Paragraph break
	"\n",
	". ",
	" ",
];

const DEFAULT_CHUNK_SIZE = 1500;
const DEFAULT_CHUNK_OVERLAP = 200;

export async function chunkDocument(
	text: string,
	documentMetadata: Record<string, unknown> = {},
	options?: { chunkSize?: number; chunkOverlap?: number },
): Promise<Chunk[]> {
	const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
	const chunkOverlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

	const splitter = new RecursiveCharacterTextSplitter({
		chunkSize,
		chunkOverlap,
		separators: SWEDISH_LEGAL_SEPARATORS,
	});

	const docs = await splitter.createDocuments([text]);

	const chunks: Chunk[] = docs.map((doc, index) => ({
		content: doc.pageContent,
		index,
		metadata: {
			...documentMetadata,
			chunkIndex: index,
			chunkSize: doc.pageContent.length,
		},
	}));

	logger.info(
		{
			totalChunks: chunks.length,
			avgSize: Math.round(chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length),
		},
		"Document chunked",
	);

	return chunks;
}
