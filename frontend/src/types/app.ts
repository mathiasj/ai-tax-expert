import type { SourceCitation } from "./api";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	citations?: SourceCitation[];
	timestamp: string;
}

export interface Conversation {
	id: string;
	title: string;
	createdAt: string;
	messages: ChatMessage[];
}

export type Theme = "light" | "dark" | "system";
