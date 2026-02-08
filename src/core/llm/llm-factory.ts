import { env } from "../../config/env.js";
import { AnthropicProvider } from "./anthropic-provider.js";
import type { LLMProvider } from "./llm-provider.js";
import { OpenAIProvider } from "./openai-provider.js";

let cachedProvider: LLMProvider | null = null;

export function createLLMProvider(provider?: "openai" | "anthropic"): LLMProvider {
	const selected = provider ?? env.LLM_PROVIDER;
	switch (selected) {
		case "anthropic":
			return new AnthropicProvider();
		case "openai":
			return new OpenAIProvider();
		default:
			throw new Error(`Unknown LLM provider: ${selected}`);
	}
}

export function getLLMProvider(): LLMProvider {
	if (!cachedProvider) {
		cachedProvider = createLLMProvider();
	}
	return cachedProvider;
}
