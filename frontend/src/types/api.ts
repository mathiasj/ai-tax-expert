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

export interface QueryResponse {
	answer: string;
	citations: SourceCitation[];
	conversationId: string;
	queryId?: string;
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
		docType?: string[];
		audience?: string[];
		taxArea?: string[];
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

// ─── Activity Log ────────────────────────────────────────────

export interface ActivityDocument {
	id: string;
	title: string;
	source: string;
	status: string;
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ActivityResponse {
	documents: ActivityDocument[];
	queue: { waiting: number; active: number };
	scrapeQueue: { waiting: number; active: number };
}

// ─── Admin Types ─────────────────────────────────────────────

export interface AdminDocumentDetail {
	id: string;
	title: string;
	source: string;
	sourceUrl: string | null;
	filePath: string | null;
	status: string;
	docType: string | null;
	audience: string | null;
	taxArea: string | null;
	refreshPolicy: string;
	contentHash: string | null;
	lastCheckedAt: string | null;
	metadata: Record<string, unknown> | null;
	errorMessage: string | null;
	supersededById: string | null;
	supersededAt: string | null;
	supersededNote: string | null;
	createdAt: string;
	updatedAt: string;
	chunkCount: number;
}

export interface AdminChunk {
	id: string;
	chunkIndex: number;
	content: string;
	qdrantPointId: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: string;
}

export interface AdminChunksResponse {
	chunks: AdminChunk[];
	total: number;
}

export interface AdminSource {
	id: string;
	url: string;
	source: string;
	label: string | null;
	status: string;
	lastScrapedAt: string | null;
	lastError: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
	documentCount: number;
}

export interface AdminSourcesResponse {
	sources: AdminSource[];
	total: number;
}

export interface AdminQuery {
	id: string;
	question: string;
	answer: string | null;
	feedbackRating: number | null;
	feedbackComment: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: string;
}

export interface AdminQueriesResponse {
	queries: AdminQuery[];
	total: number;
}

export interface AdminQueryDetail {
	id: string;
	question: string;
	answer: string | null;
	userId: string | null;
	conversationId: string | null;
	sourceChunkIds: string[] | null;
	feedbackRating: number | null;
	feedbackComment: string | null;
	feedbackAt: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: string;
}

export interface FeedbackStats {
	total: number;
	positive: number;
	negative: number;
	noFeedback: number;
}

export interface ScrapeStatus {
	target: string;
	waiting: number;
	active: number;
	completed: number;
	failed: number;
	lastCompleted?: string;
}

export interface ScrapeStatusResponse {
	statuses: ScrapeStatus[];
}

export interface SystemHealth {
	qdrant: { status: string; pointsCount?: number; vectorsCount?: number; segmentsCount?: number; error?: string };
	redis: { status: string; latencyMs?: number; error?: string };
	postgres: { status: string; error?: string };
	bullmq: { status: string; waiting?: number; active?: number; completed?: number; failed?: number; error?: string };
	refreshScheduler?: { status: string; waiting?: number; active?: number; completed?: number; failed?: number; nextRun?: string; error?: string };
	scrapeScheduler?: { status: string; waiting?: number; active?: number; completed?: number; failed?: number; nextRun?: string; error?: string };
	documents: {
		byStatus: Record<string, number>;
		bySource: Record<string, number>;
		totalChunks: number;
	};
}
