export interface SourceCitation {
	chunkId: string;
	documentId: string;
	title: string;
	sourceUrl: string | null;
	section: string | null;
	relevanceScore: number;
}

export interface RAGTimings {
	retrievalMs: number;
	rerankMs: number;
	assemblyMs: number;
	generationMs: number;
	totalMs: number;
}

export interface QueryResponse {
	answer: string;
	citations: SourceCitation[];
	conversationId: string;
	cached: boolean;
	timings: RAGTimings;
	metadata: {
		retrievedCount: number;
		rerankedCount: number;
		contextChunks: number;
		contextTokens: number;
		droppedChunks: number;
	};
}

export interface QueryRequest {
	question: string;
	topK?: number;
	rerankerTopN?: number;
	tokenBudget?: number;
	temperature?: number;
	conversationId?: string;
	filters?: {
		source?: string[];
		documentId?: string[];
	};
}

export interface AuthResponse {
	token: string;
	user: UserInfo;
}

export interface UserInfo {
	id: string;
	email: string;
	role: string;
	name?: string;
}

export interface AnalyticsSummary {
	totalQueries: number;
	uniqueUsers: number;
	queries24h: number;
	queries7d: number;
	queries30d: number;
	conversations: number;
	avgResponseTimeMs: number | null;
}

export interface PopularQuestion {
	question: string;
	count: number;
}
