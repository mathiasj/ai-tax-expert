import pino from "pino";
import { getLLMProvider } from "../llm/llm-factory.js";
import { RELEVANCE_EVAL_PROMPT } from "../prompts.js";
import type { RetrievedChunk } from "../types.js";
import type { RelevanceScore } from "./types.js";

const logger = pino({ name: "relevance-scorer" });

export async function scoreRelevance(
	question: string,
	chunks: RetrievedChunk[],
): Promise<RelevanceScore[]> {
	const llm = getLLMProvider();
	const scores: RelevanceScore[] = [];

	for (const chunk of chunks) {
		const prompt = RELEVANCE_EVAL_PROMPT
			.replace("{question}", question)
			.replace("{chunk}", chunk.content);

		try {
			const result = await llm.complete({
				messages: [{ role: "user", content: prompt }],
				temperature: 0,
				maxTokens: 200,
			});

			const parsed = JSON.parse(result.content);
			scores.push({
				chunkId: chunk.id,
				score: parsed.score ?? 0,
				reasoning: parsed.reasoning ?? "",
			});
		} catch (err) {
			logger.warn({ err, chunkId: chunk.id }, "Failed to score chunk relevance");
			scores.push({ chunkId: chunk.id, score: 0, reasoning: "Scoring failed" });
		}
	}

	return scores;
}
