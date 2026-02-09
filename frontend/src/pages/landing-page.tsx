import { AnswerPreview } from "@/components/landing/answer-preview";
import { type Category, CategoryTabs } from "@/components/landing/category-tabs";
import { ExampleQuestions } from "@/components/landing/example-questions";
import { HeroSection } from "@/components/landing/hero-section";
import { QueryInput } from "@/components/landing/query-input";
import { useAuthContext } from "@/contexts/auth-context";
import { useQueryMutation } from "@/hooks/use-query-mutation";
import type { QueryResponse } from "@/types/api";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const questionsByCategory: Record<Category, string[]> = {
	privat: [
		"Hur beskattas vinst vid försäljning av bostad?",
		"Vilka avdrag kan jag göra i min deklaration?",
		"Hur fungerar ROT- och RUT-avdraget?",
		"Vad gäller för skatt på kryptovalutor?",
		"Hur beskattas utdelning från aktier?",
	],
	foretag: [
		"Hur fungerar momsen för småföretag?",
		"Vilka regler gäller för arbetsgivaravgifter?",
		"Hur beskattas aktieutdelning i fåmansföretag?",
		"Vad gäller för representation och avdragsrätt?",
		"Hur fungerar periodiseringsfonder?",
	],
};

export function LandingPage() {
	const { user, isLoading: authLoading } = useAuthContext();
	const { sendQuery, isLoading } = useQueryMutation();
	const [activeTab, setActiveTab] = useState<Category>("privat");
	const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null);
	const [response, setResponse] = useState<QueryResponse | null>(null);
	const [selectedExample, setSelectedExample] = useState<string>();

	const questions = useMemo(() => questionsByCategory[activeTab], [activeTab]);

	async function handleSubmit(question: string) {
		setSubmittedQuestion(question);
		setResponse(null);
		const res = await sendQuery({ question });
		if (res) setResponse(res);
	}

	function handleTabChange(tab: Category) {
		setActiveTab(tab);
		setSubmittedQuestion(null);
		setResponse(null);
	}

	return (
		<div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
			{/* Top nav */}
			<header className="flex items-center gap-3 px-6 py-4">
				<Link to="/" className="flex items-center gap-2 mr-auto">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
						S
					</div>
					<span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
						Skattejuristen
					</span>
				</Link>
				{!authLoading &&
					(user ? (
						<Link
							to="/chat"
							className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
						>
							Gå till chatten
						</Link>
					) : (
						<>
							<Link
								to="/login"
								className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
							>
								Logga in
							</Link>
							<Link
								to="/register"
								className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
							>
								Skapa konto
							</Link>
						</>
					))}
			</header>

			{/* Main content */}
			<main className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
				<div className="w-full max-w-xl space-y-8">
					<HeroSection />
					<CategoryTabs active={activeTab} onChange={handleTabChange} />
					<ExampleQuestions questions={questions} onSelect={setSelectedExample} />
					<QueryInput
						questions={questions}
						onSubmit={handleSubmit}
						isLoading={isLoading}
						externalValue={selectedExample}
					/>
				</div>

				{submittedQuestion && response && (
					<AnswerPreview
						question={submittedQuestion}
						response={response}
						isAuthenticated={!!user}
					/>
				)}

				{submittedQuestion && !response && isLoading && (
					<div className="mt-8 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
						<div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
						Analyserar din fråga...
					</div>
				)}
			</main>
		</div>
	);
}
