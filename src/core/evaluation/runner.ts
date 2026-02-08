import pino from "pino";
import { executeRAGQuery } from "../rag-pipeline.js";
import { checkFaithfulness } from "./faithfulness-checker.js";
import { computeCitationAccuracy, computeKeywordCoverage } from "./metrics.js";
import { scoreRelevance } from "./relevance-scorer.js";
import { TEST_QUESTIONS } from "./test-questions.js";
import type {
	CategorySummary,
	EvaluationSummary,
	QuestionEvalResult,
	TestQuestion,
} from "./types.js";

const logger = pino({ name: "eval-runner" });

async function evaluateQuestion(question: TestQuestion): Promise<QuestionEvalResult> {
	logger.info({ id: question.id, question: question.question.slice(0, 60) }, "Evaluating question");

	const response = await executeRAGQuery(question.question);

	const relevanceScores = await scoreRelevance(
		question.question,
		response.context.chunks,
	);

	const faithfulness = await checkFaithfulness(
		response.context.contextText,
		response.answer,
	);

	const citationAccuracy = computeCitationAccuracy(response.answer);
	const keywordCoverage = computeKeywordCoverage(response.answer, question);

	return {
		questionId: question.id,
		question: question.question,
		category: question.category,
		difficulty: question.difficulty,
		response,
		relevanceScores,
		faithfulness,
		citationAccuracy,
		keywordCoverage,
	};
}

function summarizeCategory(results: QuestionEvalResult[]): CategorySummary {
	const count = results.length;
	return {
		count,
		avgRelevance:
			results.reduce(
				(sum, r) =>
					sum + r.relevanceScores.reduce((s, rs) => s + rs.score, 0) / Math.max(r.relevanceScores.length, 1),
				0,
			) / count,
		avgFaithfulness: results.reduce((sum, r) => sum + r.faithfulness.score, 0) / count,
		avgKeywordCoverage: results.reduce((sum, r) => sum + r.keywordCoverage, 0) / count,
	};
}

export async function runEvaluation(
	questions?: TestQuestion[],
): Promise<EvaluationSummary> {
	const testQuestions = questions ?? TEST_QUESTIONS;
	const results: QuestionEvalResult[] = [];

	logger.info({ total: testQuestions.length }, "Starting evaluation");

	for (const question of testQuestions) {
		try {
			const result = await evaluateQuestion(question);
			results.push(result);
			logger.info(
				{
					id: question.id,
					faithfulness: result.faithfulness.score.toFixed(2),
					citations: result.citationAccuracy.toFixed(2),
					keywords: result.keywordCoverage.toFixed(2),
				},
				"Question evaluated",
			);
		} catch (err) {
			logger.error({ err, id: question.id }, "Failed to evaluate question");
		}
	}

	const total = results.length;

	const avgRelevance =
		results.reduce(
			(sum, r) =>
				sum + r.relevanceScores.reduce((s, rs) => s + rs.score, 0) / Math.max(r.relevanceScores.length, 1),
			0,
		) / total;

	const avgFaithfulness = results.reduce((sum, r) => sum + r.faithfulness.score, 0) / total;
	const avgCitationAccuracy = results.reduce((sum, r) => sum + r.citationAccuracy, 0) / total;
	const avgKeywordCoverage = results.reduce((sum, r) => sum + r.keywordCoverage, 0) / total;
	const avgRetrievalMs = results.reduce((sum, r) => sum + r.response.timings.retrievalMs, 0) / total;
	const avgTotalMs = results.reduce((sum, r) => sum + r.response.timings.totalMs, 0) / total;

	// Group by category
	const byCategory: Record<string, CategorySummary> = {};
	const categories = [...new Set(results.map((r) => r.category))];
	for (const cat of categories) {
		byCategory[cat] = summarizeCategory(results.filter((r) => r.category === cat));
	}

	// Group by difficulty
	const byDifficulty: Record<string, CategorySummary> = {};
	const difficulties = [...new Set(results.map((r) => r.difficulty))];
	for (const diff of difficulties) {
		byDifficulty[diff] = summarizeCategory(results.filter((r) => r.difficulty === diff));
	}

	const summary: EvaluationSummary = {
		totalQuestions: total,
		avgRelevance,
		avgFaithfulness,
		avgCitationAccuracy,
		avgKeywordCoverage,
		avgRetrievalMs,
		avgTotalMs,
		byCategory,
		byDifficulty,
		results,
	};

	printSummary(summary);

	return summary;
}

function printSummary(summary: EvaluationSummary): void {
	console.log("\n" + "=".repeat(60));
	console.log("  RAG EVALUATION SUMMARY");
	console.log("=".repeat(60));
	console.log(`  Questions evaluated: ${summary.totalQuestions}`);
	console.log(`  Avg Relevance:       ${(summary.avgRelevance * 100).toFixed(1)}%`);
	console.log(`  Avg Faithfulness:    ${(summary.avgFaithfulness * 100).toFixed(1)}%`);
	console.log(`  Avg Citation Acc:    ${(summary.avgCitationAccuracy * 100).toFixed(1)}%`);
	console.log(`  Avg Keyword Cov:     ${(summary.avgKeywordCoverage * 100).toFixed(1)}%`);
	console.log(`  Avg Retrieval Time:  ${summary.avgRetrievalMs.toFixed(0)}ms`);
	console.log(`  Avg Total Time:      ${summary.avgTotalMs.toFixed(0)}ms`);

	console.log("\n  By Category:");
	for (const [cat, data] of Object.entries(summary.byCategory)) {
		console.log(
			`    ${cat.padEnd(15)} n=${data.count}  rel=${(data.avgRelevance * 100).toFixed(0)}%  faith=${(data.avgFaithfulness * 100).toFixed(0)}%  kw=${(data.avgKeywordCoverage * 100).toFixed(0)}%`,
		);
	}

	console.log("\n  By Difficulty:");
	for (const [diff, data] of Object.entries(summary.byDifficulty)) {
		console.log(
			`    ${diff.padEnd(15)} n=${data.count}  rel=${(data.avgRelevance * 100).toFixed(0)}%  faith=${(data.avgFaithfulness * 100).toFixed(0)}%  kw=${(data.avgKeywordCoverage * 100).toFixed(0)}%`,
		);
	}

	console.log("=".repeat(60) + "\n");
}

// CLI entry point
if (import.meta.main) {
	runEvaluation()
		.then(() => process.exit(0))
		.catch((err) => {
			console.error("Evaluation failed:", err);
			process.exit(1);
		});
}
