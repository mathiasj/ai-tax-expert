import { useConversations } from "@/hooks/use-conversations";
import { useQueryMutation } from "@/hooks/use-query-mutation";
import type { SourceCitation } from "@/types/api";
import type { ChatMessage, Conversation } from "@/types/app";
import { useCallback, useRef, useState } from "react";
import { ChatInput } from "./chat-input";
import { ConversationSidebar } from "./conversation-sidebar";
import { MessageList } from "./message-list";
import { SourceFilter } from "./source-filter";

export function ChatContainer() {
	const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [sourceFilters, setSourceFilters] = useState<string[]>([]);
	const [backendConversationId, setBackendConversationId] = useState<string | undefined>();
	const { sendQuery, isLoading } = useQueryMutation();
	const { conversations, addConversation, updateConversation, loadConversationMessages } =
		useConversations();

	// Refs to avoid stale closures in handleSend
	const activeConvRef = useRef(activeConversationId);
	activeConvRef.current = activeConversationId;
	const backendConvRef = useRef(backendConversationId);
	backendConvRef.current = backendConversationId;
	const sourceFiltersRef = useRef(sourceFilters);
	sourceFiltersRef.current = sourceFilters;

	const loadConversation = useCallback(
		async (id: string) => {
			const msgs = await loadConversationMessages(id);
			setActiveConversationId(id);
			setMessages(msgs);
			setBackendConversationId(id);
		},
		[loadConversationMessages],
	);

	const startNewConversation = useCallback(() => {
		setActiveConversationId(null);
		setMessages([]);
		setBackendConversationId(undefined);
	}, []);

	const handleSend = useCallback(
		async (content: string) => {
			const userMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "user",
				content,
				timestamp: new Date().toISOString(),
			};

			setMessages((prev) => [...prev, userMessage]);

			const response = await sendQuery({
				question: content,
				conversationId: backendConvRef.current,
				filters:
					sourceFiltersRef.current.length > 0 ? { source: sourceFiltersRef.current } : undefined,
			});

			if (response) {
				const assistantMessage: ChatMessage = {
					id: crypto.randomUUID(),
					role: "assistant",
					content: response.answer,
					citations: response.citations as SourceCitation[],
					timestamp: new Date().toISOString(),
				};

				setMessages((prev) => {
					const updatedMessages = [...prev, assistantMessage];

					if (!activeConvRef.current) {
						// First message — create conversation
						const convId = response.conversationId;
						const title = content.length > 50 ? `${content.slice(0, 50)}...` : content;
						const newConv: Conversation = {
							id: convId,
							title,
							createdAt: new Date().toISOString(),
							messages: updatedMessages,
						};
						addConversation(newConv);
						setActiveConversationId(convId);
						setBackendConversationId(convId);
					} else {
						updateConversation(activeConvRef.current, {
							messages: updatedMessages,
						});
					}

					return updatedMessages;
				});
			}
		},
		[sendQuery, addConversation, updateConversation],
	);

	return (
		<div className="flex h-full">
			<ConversationSidebar
				conversations={conversations}
				activeId={activeConversationId}
				onSelect={loadConversation}
				onNewConversation={startNewConversation}
			/>
			<div className="flex flex-1 flex-col">
				<div className="border-b border-gray-200 px-4 py-2 dark:border-gray-800">
					<SourceFilter selected={sourceFilters} onChange={setSourceFilters} />
				</div>
				<MessageList messages={messages} isLoading={isLoading} />
				<ChatInput onSend={handleSend} isLoading={isLoading} />
			</div>
		</div>
	);
}
