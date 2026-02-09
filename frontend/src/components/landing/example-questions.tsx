interface ExampleQuestionsProps {
	questions: string[];
	onSelect: (question: string) => void;
}

export function ExampleQuestions({ questions, onSelect }: ExampleQuestionsProps) {
	return (
		<div className="flex flex-wrap justify-center gap-2">
			{questions.map((q) => (
				<button
					key={q}
					type="button"
					onClick={() => onSelect(q)}
					className="rounded-full border border-gray-200 bg-gray-100 px-3.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-700"
				>
					{q}
				</button>
			))}
		</div>
	);
}
