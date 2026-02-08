import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { Conversation } from "@/types/app";
import { Button } from "@/components/ui/button";

interface ConversationSidebarProps {
	conversations: Conversation[];
	activeId: string | null;
	onSelect: (id: string) => void;
	onNewConversation: () => void;
}

export function ConversationSidebar({
	conversations,
	activeId,
	onSelect,
	onNewConversation,
}: ConversationSidebarProps) {
	return (
		<div className="hidden w-64 shrink-0 border-r border-gray-200 bg-gray-50 md:flex md:flex-col dark:border-gray-800 dark:bg-gray-900/50">
			<div className="p-3">
				<Button variant="secondary" size="sm" className="w-full" onClick={onNewConversation}>
					+ Ny konversation
				</Button>
			</div>
			<div className="flex-1 overflow-y-auto">
				{conversations.length === 0 ? (
					<p className="px-3 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
						Inga konversationer ännu
					</p>
				) : (
					<div className="space-y-0.5 px-2">
						{conversations.map((conv) => (
							<button
								key={conv.id}
								type="button"
								onClick={() => onSelect(conv.id)}
								className={cn(
									"w-full rounded-lg px-3 py-2 text-left transition-colors",
									activeId === conv.id
										? "bg-white shadow-sm dark:bg-gray-800"
										: "hover:bg-white/50 dark:hover:bg-gray-800/50",
								)}
							>
								<p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
									{conv.title}
								</p>
								<p className="text-xs text-gray-400 dark:text-gray-500">
									{formatDate(conv.createdAt)}
								</p>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
