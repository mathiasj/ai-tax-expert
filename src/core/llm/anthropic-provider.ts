import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env.js";
import type { LLMCompletionOptions, LLMCompletionResult, LLMProvider } from "./llm-provider.js";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export class AnthropicProvider implements LLMProvider {
	readonly name = "anthropic";
	readonly model: string;
	private client: Anthropic;

	constructor(model?: string) {
		this.model = model ?? env.LLM_MODEL ?? DEFAULT_MODEL;
		this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
	}

	async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
		const systemMessage = options.messages.find((m) => m.role === "system");
		const nonSystemMessages = options.messages.filter((m) => m.role !== "system");

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: options.maxTokens ?? env.LLM_MAX_TOKENS,
			temperature: options.temperature ?? env.LLM_TEMPERATURE,
			system: systemMessage?.content,
			messages: nonSystemMessages.map((m) => ({
				role: m.role as "user" | "assistant",
				content: m.content,
			})),
		});

		const textBlock = response.content.find((b) => b.type === "text");
		return {
			content: textBlock?.text ?? "",
			finishReason: response.stop_reason ?? "unknown",
			usage: {
				promptTokens: response.usage.input_tokens,
				completionTokens: response.usage.output_tokens,
				totalTokens: response.usage.input_tokens + response.usage.output_tokens,
			},
		};
	}
}
