import pino from "pino";
import { getLLMProvider } from "../llm/llm-factory.js";
import { FAITHFULNESS_EVAL_PROMPT } from "../prompts.js";
import type { FaithfulnessResult } from "./types.js";

const logger = pino({ name: "faithfulness-checker" });

export async function checkFaithfulness(
	context: string,
	answer: string,
): Promise<FaithfulnessResult> {
	const llm = getLLMProvider();

	const prompt = FAITHFULNESS_EVAL_PROMPT
		.replace("{context}", context)
		.replace("{answer}", answer);

	try {
		const result = await llm.complete({
			messages: [{ role: "user", content: prompt }],
			temperature: 0,
			maxTokens: 500,
		});

		const parsed = JSON.parse(result.content);
		return {
			score: parsed.score ?? 0,
			unsupportedClaims: parsed.unsupported_claims ?? [],
			reasoning: parsed.reasoning ?? "",
		};
	} catch (err) {
		logger.warn({ err }, "Failed to check faithfulness");
		return { score: 0, unsupportedClaims: [], reasoning: "Check failed" };
	}
}
