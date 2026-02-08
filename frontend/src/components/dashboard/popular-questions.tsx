import type { PopularQuestion } from "@/types/api";
import { Card } from "@/components/ui/card";

interface PopularQuestionsProps {
	questions: PopularQuestion[];
}

export function PopularQuestions({ questions }: PopularQuestionsProps) {
	if (questions.length === 0) {
		return (
			<Card>
				<p className="text-sm text-gray-500 dark:text-gray-400">Inga frågor ännu</p>
			</Card>
		);
	}

	const maxCount = Math.max(...questions.map((q) => q.count));

	return (
		<Card>
			<h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Populära frågor</h3>
			<div className="space-y-3">
				{questions.map((q, i) => (
					<div key={i}>
						<div className="flex items-center justify-between text-sm">
							<span className="mr-4 truncate text-gray-700 dark:text-gray-300">
								{q.question}
							</span>
							<span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
								{q.count}
							</span>
						</div>
						<div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
							<div
								className="h-full rounded-full bg-blue-500"
								style={{ width: `${(q.count / maxCount) * 100}%` }}
							/>
						</div>
					</div>
				))}
			</div>
		</Card>
	);
}
