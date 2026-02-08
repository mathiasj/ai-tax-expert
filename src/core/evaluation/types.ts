import type { RAGResponse } from "../types.js";

export interface TestQuestion {
	id: string;
	question: string;
	category: "inkomstskatt" | "moms" | "kapitalvinst" | "foretag" | "avdrag" | "ovrigt";
	difficulty: "basic" | "intermediate" | "advanced";
	expectedKeywords: string[];
	expectedLawRefs?: string[];
}

export interface RelevanceScore {
	chunkId: string;
	score: number;
	reasoning: string;
}

export interface FaithfulnessResult {
	score: number;
	unsupportedClaims: string[];
	reasoning: string;
}

export interface QuestionEvalResult {
	questionId: string;
	question: string;
	category: string;
	difficulty: string;
	response: RAGResponse;
	relevanceScores: RelevanceScore[];
	faithfulness: FaithfulnessResult;
	citationAccuracy: number;
	keywordCoverage: number;
}

export interface EvaluationSummary {
	totalQuestions: number;
	avgRelevance: number;
	avgFaithfulness: number;
	avgCitationAccuracy: number;
	avgKeywordCoverage: number;
	avgRetrievalMs: number;
	avgTotalMs: number;
	byCategory: Record<string, CategorySummary>;
	byDifficulty: Record<string, CategorySummary>;
	results: QuestionEvalResult[];
}

export interface CategorySummary {
	count: number;
	avgRelevance: number;
	avgFaithfulness: number;
	avgKeywordCoverage: number;
}
