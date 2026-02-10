import type { RAGResponse } from "../types.js";

export type EvalCategory =
	| "inkomstskatt"
	| "moms"
	| "kapitalvinst"
	| "foretag"
	| "avdrag"
	| "deklaration"
	| "fastighet"
	| "vardepapper"
	| "rot_rut"
	| "fordonsskatt"
	| "ovrigt";

export interface TestQuestion {
	id: string;
	question: string;
	category: EvalCategory;
	difficulty: "basic" | "intermediate" | "advanced";
	expectedKeywords: string[];
	expectedLawRefs?: string[];
	/** Reference answer from Skatteverket FAQ — used for comparison, not scoring */
	referenceAnswer?: string;
	/** Source URL of the reference answer */
	referenceUrl?: string;
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
