import { useCallback, useState } from "react";
import type { ChatMessage, Conversation } from "@/types/app";
import type { SourceCitation } from "@/types/api";
import { useQueryMutation } from "@/hooks/use-query-mutation";
import { useConversations } from "@/hooks/use-conversations";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { SourceFilter } from "./source-filter";
import { ConversationSidebar } from "./conversation-sidebar";

export function ChatContainer() {
	const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [sourceFilters, setSourceFilters] = useState<string[]>([]);
	const [backendConversationId, setBackendConversationId] = useState<string | undefined>();
	const { sendQuery, isLoading } = useQueryMutation();
	const { conversations, addConversation, updateConversation, getConversation } =
		useConversations();

	const loadConversation = useCallback(
		(id: string) => {
			const conv = getConversation(id);
			if (conv) {
				setActiveConversationId(id);
				setMessages(conv.messages);
				setBackendConversationId(id);
			}
		},
		[getConversation],
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
				conversationId: backendConversationId,
				filters: sourceFilters.length > 0 ? { source: sourceFilters } : undefined,
			});

			if (response) {
				const assistantMessage: ChatMessage = {
					id: crypto.randomUUID(),
					role: "assistant",
					content: response.answer,
					citations: response.citations as SourceCitation[],
					timestamp: new Date().toISOString(),
				};

				const newMessages = (prev: ChatMessage[]) => [...prev, assistantMessage];
				setMessages(newMessages);

				// Get the updated messages for storage
				setMessages((prev) => {
					const updatedMessages = prev;

					if (!activeConversationId) {
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
						updateConversation(activeConversationId, {
							messages: updatedMessages,
						});
					}

					return prev;
				});
			}
		},
		[
			sendQuery,
			backendConversationId,
			sourceFilters,
			activeConversationId,
			addConversation,
			updateConversation,
		],
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
