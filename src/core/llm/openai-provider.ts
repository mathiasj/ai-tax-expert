import OpenAI from "openai";
import { env } from "../../config/env.js";
import type { LLMCompletionOptions, LLMCompletionResult, LLMProvider } from "./llm-provider.js";

const DEFAULT_MODEL = "gpt-4o";

export class OpenAIProvider implements LLMProvider {
	readonly name = "openai";
	readonly model: string;
	private client: OpenAI;

	constructor(model?: string) {
		this.model = model ?? env.LLM_MODEL ?? DEFAULT_MODEL;
		this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	}

	async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
		const response = await this.client.chat.completions.create({
			model: this.model,
			messages: options.messages.map((m) => ({
				role: m.role,
				content: m.content,
			})),
			max_tokens: options.maxTokens ?? env.LLM_MAX_TOKENS,
			temperature: options.temperature ?? env.LLM_TEMPERATURE,
		});

		const choice = response.choices[0];
		return {
			content: choice.message.content ?? "",
			finishReason: choice.finish_reason ?? "unknown",
			usage: {
				promptTokens: response.usage?.prompt_tokens ?? 0,
				completionTokens: response.usage?.completion_tokens ?? 0,
				totalTokens: response.usage?.total_tokens ?? 0,
			},
		};
	}
}
