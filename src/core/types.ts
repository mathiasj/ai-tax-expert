export interface RetrievedChunk {
	id: string;
	content: string;
	score: number;
	documentId: string;
	chunkIndex: number;
	metadata: Record<string, unknown>;
}

export interface RankedChunk extends RetrievedChunk {
	rerankScore: number;
}

export interface AssembledContext {
	chunks: RankedChunk[];
	contextText: string;
	totalTokens: number;
	droppedCount: number;
}

export interface SourceCitation {
	chunkId: string;
	documentId: string;
	title: string;
	sourceUrl: string | null;
	section: string | null;
	docType: string | null;
	relevanceScore: number;
}

export interface RAGTimings {
	retrievalMs: number;
	rerankMs: number;
	assemblyMs: number;
	generationMs: number;
	totalMs: number;
}

export interface RAGResponse {
	answer: string;
	citations: SourceCitation[];
	retrievedChunks: RetrievedChunk[];
	rankedChunks: RankedChunk[];
	context: AssembledContext;
	timings: RAGTimings;
	conversationId?: string;
	queryId?: string;
	cached?: boolean;
}

export interface MetadataFilter {
	source?: string[];
	documentId?: string[];
	docType?: string[];
	audience?: string[];
	taxArea?: string[];
}

export interface ConversationTurn {
	question: string;
	answer: string;
}

export interface RAGOptions {
	topK?: number;
	rerankerTopN?: number;
	tokenBudget?: number;
	filters?: MetadataFilter;
	temperature?: number;
	conversationId?: string;
	userId?: string;
}
