import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ChatContainer } from "@/components/chat/chat-container";

export function ChatPage() {
	return (
		<ErrorBoundary>
			<div className="h-full">
				<ChatContainer />
			</div>
		</ErrorBoundary>
	);
}
