export function TypingIndicator() {
	return (
		<div className="flex items-center gap-1 px-4 py-3">
			<div className="flex gap-1">
				<span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:0ms]" />
				<span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:150ms]" />
				<span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:300ms]" />
			</div>
			<span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
				Analyserar...
			</span>
		</div>
	);
}
