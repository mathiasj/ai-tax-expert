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

export interface DocumentInfo {
	id: string;
	title: string;
	source: string;
	sourceUrl: string | null;
	status: string;
	createdAt: string;
	updatedAt: string;
}

export interface DocumentsResponse {
	documents: DocumentInfo[];
	total: number;
}

export interface ConversationListItem {
	id: string;
	title: string | null;
	createdAt: string;
	updatedAt: string;
	messageCount: number;
}

export interface ConversationsResponse {
	conversations: ConversationListItem[];
}

export interface ConversationMessage {
	id: string;
	question: string;
	answer: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: string;
}

export interface ConversationMessagesResponse {
	messages: ConversationMessage[];
}

export interface EvalRunResponse {
	id: string;
	totalQuestions: number;
	avgRelevance: number;
	avgFaithfulness: number;
	avgCitationAccuracy: number;
	avgKeywordCoverage: number;
	avgRetrievalMs: number;
	avgTotalMs: number;
	byCategory: Record<string, { count: number; avgRelevance: number; avgFaithfulness: number; avgKeywordCoverage: number }>;
	byDifficulty: Record<string, { count: number; avgRelevance: number; avgFaithfulness: number; avgKeywordCoverage: number }>;
	results: EvalQuestionResult[];
	createdAt: string;
}

export interface EvalQuestionResult {
	questionId: string;
	question: string;
	category: string;
	difficulty: string;
	faithfulness: { score: number };
	citationAccuracy: number;
	keywordCoverage: number;
	relevanceScores: { score: number }[];
}

export interface UpdateProfileRequest {
	name: string;
}

export interface UpdateProfileResponse {
	user: UserInfo;
}
