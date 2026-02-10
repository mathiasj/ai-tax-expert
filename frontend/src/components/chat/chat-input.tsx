import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
	onSend: (message: string) => void;
	isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
	const [value, setValue] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		function handleSuggestion(e: Event) {
			const detail = (e as CustomEvent).detail as string;
			setValue(detail);
			textareaRef.current?.focus();
		}
		window.addEventListener("suggestion-click", handleSuggestion);
		return () => window.removeEventListener("suggestion-click", handleSuggestion);
	}, []);

	function handleSend() {
		const trimmed = value.trim();
		if (!trimmed || isLoading) return;
		onSend(trimmed);
		setValue("");
		// Reset textarea height
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function handleInput() {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto";
			textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
		}
	}

	return (
		<div className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
			<div className="flex gap-2">
				<textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => {
						setValue(e.target.value);
						handleInput();
					}}
					onKeyDown={handleKeyDown}
					placeholder="Ställ en fråga om svensk skatterätt..."
					rows={1}
					className="flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500 dark:focus:border-blue-400"
				/>
				<Button onClick={handleSend} disabled={!value.trim() || isLoading}>
					{isLoading && <Loader2 className="animate-spin" />}
					Skicka
				</Button>
			</div>
			<p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
				Tryck Enter för att skicka, Shift+Enter för ny rad
			</p>
		</div>
	);
}
