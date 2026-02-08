export interface LLMMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface LLMCompletionOptions {
	messages: LLMMessage[];
	maxTokens?: number;
	temperature?: number;
}

export interface LLMCompletionResult {
	content: string;
	finishReason: string;
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

export interface LLMProvider {
	name: string;
	model: string;
	complete(options: LLMCompletionOptions): Promise<LLMCompletionResult>;
}
