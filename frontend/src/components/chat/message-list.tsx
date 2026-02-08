import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types/app";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";

interface MessageListProps {
	messages: ChatMessage[];
	isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isLoading]);

	if (messages.length === 0 && !isLoading) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
				<div className="mb-4 text-5xl">🏛️</div>
				<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
					Välkommen till SkatteAssistenten
				</h2>
				<p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
					Ställ en fråga om svensk skatterätt. Jag söker igenom Skatteverkets ställningstaganden,
					rättspraxis och lagtexter för att ge dig ett välgrundat svar.
				</p>
				<div className="mt-6 flex flex-wrap justify-center gap-2">
					{[
						"Hur beskattas kapitalvinst vid bostadsförsäljning?",
						"Vad gäller för ränteavdrag?",
						"Hur fungerar ROT-avdraget?",
					].map((q) => (
						<button
							key={q}
							type="button"
							className="rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
							onClick={() => {
								const event = new CustomEvent("suggestion-click", { detail: q });
								window.dispatchEvent(event);
							}}
						>
							{q}
						</button>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 space-y-4 overflow-y-auto p-4">
			{messages.map((msg) => (
				<MessageBubble key={msg.id} message={msg} />
			))}
			{isLoading && <TypingIndicator />}
			<div ref={bottomRef} />
		</div>
	);
}
