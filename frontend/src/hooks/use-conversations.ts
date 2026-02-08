import { useCallback } from "react";
import type { Conversation } from "@/types/app";
import { useLocalStorage } from "./use-local-storage";

const STORAGE_KEY = "skatteassistenten_conversations";

export function useConversations() {
	const [conversations, setConversations] = useLocalStorage<Conversation[]>(STORAGE_KEY, []);

	const addConversation = useCallback(
		(conversation: Conversation) => {
			setConversations((prev) => [conversation, ...prev]);
		},
		[setConversations],
	);

	const updateConversation = useCallback(
		(id: string, updates: Partial<Conversation>) => {
			setConversations((prev) =>
				prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
			);
		},
		[setConversations],
	);

	const getConversation = useCallback(
		(id: string) => conversations.find((c) => c.id === id) ?? null,
		[conversations],
	);

	const deleteConversation = useCallback(
		(id: string) => {
			setConversations((prev) => prev.filter((c) => c.id !== id));
		},
		[setConversations],
	);

	return {
		conversations,
		addConversation,
		updateConversation,
		getConversation,
		deleteConversation,
	};
}
