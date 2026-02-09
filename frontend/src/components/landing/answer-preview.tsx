import { AssistantMessage } from "@/components/chat/assistant-message";
import { Button } from "@/components/ui/button";
import type { QueryResponse } from "@/types/api";
import { Link } from "react-router-dom";

interface AnswerPreviewProps {
	question: string;
	response: QueryResponse;
	isAuthenticated: boolean;
}

function truncateOnSentence(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text;
	const cut = text.slice(0, maxChars);
	const lastDot = cut.lastIndexOf(".");
	const lastExcl = cut.lastIndexOf("!");
	const lastQ = cut.lastIndexOf("?");
	const boundary = Math.max(lastDot, lastExcl, lastQ);
	if (boundary > maxChars * 0.4) {
		return text.slice(0, boundary + 1);
	}
	return `${cut.trimEnd()}...`;
}

export function AnswerPreview({ question, response, isAuthenticated }: AnswerPreviewProps) {
	const truncated = !isAuthenticated;
	const displayAnswer = truncated ? truncateOnSentence(response.answer, 200) : response.answer;

	return (
		<div className="w-full max-w-2xl mx-auto mt-8 space-y-4">
			{/* User question bubble */}
			<div className="flex justify-end">
				<div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm text-white">
					{question}
				</div>
			</div>

			{/* Answer */}
			<div className="relative">
				<div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
					<AssistantMessage
						content={displayAnswer}
						citations={response.citations}
						showCitationList={isAuthenticated}
					/>
				</div>

				{truncated && (
					<>
						{/* Gradient fade overlay */}
						<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 rounded-b-2xl bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent dark:from-gray-950 dark:via-gray-950/90" />

						{/* CTA */}
						<div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2">
							<Link to="/register">
								<Button size="lg" className="rounded-xl shadow-lg">
									Skapa ett konto för att se hela svaret
								</Button>
							</Link>
							<Link
								to="/login"
								className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							>
								Har redan ett konto? Logga in
							</Link>
						</div>
					</>
				)}
			</div>

			{isAuthenticated && (
				<div className="flex justify-center pt-2">
					<Link to={`/chat?q=${encodeURIComponent(question)}`}>
						<Button variant="secondary" className="rounded-xl">
							Fortsätt i chatten &rarr;
						</Button>
					</Link>
				</div>
			)}
		</div>
	);
}
