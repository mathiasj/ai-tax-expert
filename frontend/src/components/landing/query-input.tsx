import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTypewriter } from "@/hooks/use-typewriter";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

interface QueryInputProps {
	questions: string[];
	onSubmit: (question: string) => void;
	isLoading: boolean;
	externalValue?: string;
}

export function QueryInput({ questions, onSubmit, isLoading, externalValue }: QueryInputProps) {
	const [value, setValue] = useState("");
	const [focused, setFocused] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const showTypewriter = !value && !focused;
	const typewriterText = useTypewriter({
		questions,
		enabled: showTypewriter,
	});

	useEffect(() => {
		if (externalValue !== undefined) {
			setValue(externalValue);
			textareaRef.current?.focus();
		}
	}, [externalValue]);

	function handleSend() {
		const trimmed = value.trim();
		if (!trimmed || isLoading) return;
		onSubmit(trimmed);
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
			textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
		}
	}

	return (
		<div className="w-full">
			<div className="relative">
				<textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => {
						setValue(e.target.value);
						handleInput();
					}}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					onKeyDown={handleKeyDown}
					rows={2}
					className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-transparent focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400"
					placeholder="Ställ en fråga om svensk skatterätt..."
				/>
				{showTypewriter && (
					<span
						className="pointer-events-none absolute left-4 top-3 text-sm text-gray-400 dark:text-gray-500"
						aria-hidden="true"
					>
						{typewriterText}
						<span className="ml-px inline-block w-px animate-pulse text-gray-400 dark:text-gray-500">
							|
						</span>
					</span>
				)}
			</div>
			<div className="mt-3 flex justify-center">
				<Button
					onClick={handleSend}
					disabled={!value.trim() || isLoading}
					size="lg"
					className="rounded-xl px-8"
				>
					{isLoading && <Loader2 className="animate-spin" />}
					Ställ din fråga
				</Button>
			</div>
			<p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
				Tryck Enter för att skicka
			</p>
		</div>
	);
}
