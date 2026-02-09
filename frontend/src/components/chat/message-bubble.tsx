import type { ChatMessage } from "@/types/app";
import { cn } from "@/lib/utils";
import { AssistantMessage } from "./assistant-message";

interface MessageBubbleProps {
	message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const isUser = message.role === "user";

	return (
		<div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
			<div
				className={cn(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
					isUser
						? "bg-blue-600 text-white"
						: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
				)}
			>
				{isUser ? "Du" : "AI"}
			</div>
			<div
				className={cn(
					"max-w-[80%] rounded-2xl px-4 py-3",
					isUser
						? "bg-blue-600 text-white"
						: "bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800",
				)}
			>
				{isUser ? (
					<p className="text-sm whitespace-pre-wrap">{message.content}</p>
				) : (
					<AssistantMessage
						content={message.content}
						citations={message.citations ?? []}
						queryId={message.queryId}
					/>
				)}
			</div>
		</div>
	);
}
