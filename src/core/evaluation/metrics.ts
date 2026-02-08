import type { RAGResponse } from "../types.js";
import type { TestQuestion } from "./types.js";

export function computeCitationAccuracy(answer: string): number {
	const citationPattern = /\[Källa \d+\]/g;
	const citations = answer.match(citationPattern);

	if (!citations) {
		return 0;
	}

	// Count paragraphs with at least one citation
	const paragraphs = answer
		.split("\n\n")
		.filter((p) => p.trim().length > 20 && !p.startsWith("Observera:"));

	if (paragraphs.length === 0) {
		return citations.length > 0 ? 1 : 0;
	}

	const citedParagraphs = paragraphs.filter((p) => citationPattern.test(p));
	return citedParagraphs.length / paragraphs.length;
}

export function computeKeywordCoverage(
	answer: string,
	question: TestQuestion,
): number {
	if (question.expectedKeywords.length === 0) {
		return 1;
	}

	const lowerAnswer = answer.toLowerCase();
	const found = question.expectedKeywords.filter((kw) =>
		lowerAnswer.includes(kw.toLowerCase()),
	);

	return found.length / question.expectedKeywords.length;
}

export function computeRetrievalPrecision(
	response: RAGResponse,
	relevanceScores: Array<{ score: number }>,
	threshold = 0.5,
): number {
	if (relevanceScores.length === 0) {
		return 0;
	}

	const relevant = relevanceScores.filter((s) => s.score >= threshold);
	return relevant.length / relevanceScores.length;
}
