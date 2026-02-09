import { useCallback, useEffect, useState } from "react";
import type { Conversation, ChatMessage } from "@/types/app";
import type { ConversationsResponse, ConversationMessagesResponse } from "@/types/api";
import { api } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { useLocalStorage } from "./use-local-storage";

const STORAGE_KEY = "skatteassistenten_conversations";

export function useConversations() {
	const [localConversations, setLocalConversations] = useLocalStorage<Conversation[]>(STORAGE_KEY, []);
	const [apiConversations, setApiConversations] = useState<Conversation[]>([]);
	const [isAuthenticated] = useState(() => !!getToken());

	const conversations = isAuthenticated ? apiConversations : localConversations;

	// Fetch conversations from API when authenticated
	useEffect(() => {
		if (!isAuthenticated) return;
		api.get<ConversationsResponse>("/api/conversations", { skipAuthRedirect: true })
			.then((res) => {
				setApiConversations(
					res.conversations.map((c) => ({
						id: c.id,
						title: c.title ?? "Ny konversation",
						createdAt: c.createdAt,
						messages: [],
					})),
				);
			})
			.catch(() => {
				// Fall back to localStorage on error
				setApiConversations(localConversations);
			});
	}, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

	const addConversation = useCallback(
		(conversation: Conversation) => {
			if (isAuthenticated) {
				setApiConversations((prev) => [conversation, ...prev]);
			}
			setLocalConversations((prev) => [conversation, ...prev]);
		},
		[isAuthenticated, setLocalConversations],
	);

	const updateConversation = useCallback(
		(id: string, updates: Partial<Conversation>) => {
			if (isAuthenticated) {
				setApiConversations((prev) =>
					prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
				);
			}
			setLocalConversations((prev) =>
				prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
			);
		},
		[isAuthenticated, setLocalConversations],
	);

	const getConversation = useCallback(
		(id: string) => conversations.find((c) => c.id === id) ?? null,
		[conversations],
	);

	const deleteConversation = useCallback(
		(id: string) => {
			if (isAuthenticated) {
				setApiConversations((prev) => prev.filter((c) => c.id !== id));
			}
			setLocalConversations((prev) => prev.filter((c) => c.id !== id));
		},
		[isAuthenticated, setLocalConversations],
	);

	const loadConversationMessages = useCallback(
		async (id: string): Promise<ChatMessage[]> => {
			// If authenticated, try to load from API
			if (isAuthenticated) {
				try {
					const res = await api.get<ConversationMessagesResponse>(
						`/api/conversations/${id}/messages`,
						{ skipAuthRedirect: true },
					);
					const messages: ChatMessage[] = [];
					for (const msg of res.messages) {
						messages.push({
							id: `${msg.id}-q`,
							role: "user",
							content: msg.question,
							timestamp: msg.createdAt,
						});
						if (msg.answer) {
							messages.push({
								id: `${msg.id}-a`,
								role: "assistant",
								content: msg.answer,
								timestamp: msg.createdAt,
							});
						}
					}
					return messages;
				} catch {
					// Fall through to localStorage
				}
			}
			// Fall back to localStorage
			const conv = localConversations.find((c) => c.id === id);
			return conv?.messages ?? [];
		},
		[isAuthenticated, localConversations],
	);

	return {
		conversations,
		addConversation,
		updateConversation,
		getConversation,
		deleteConversation,
		loadConversationMessages,
	};
}
