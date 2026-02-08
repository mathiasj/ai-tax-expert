import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { sampleEvalSummary, sampleEvalQuestions } from "@/data/sample-eval-results";

function scoreColor(score: number): "success" | "warning" | "danger" {
	if (score >= 0.8) return "success";
	if (score >= 0.6) return "warning";
	return "danger";
}

function pct(score: number): string {
	return `${Math.round(score * 100)}%`;
}

export function EvaluationPage() {
	const summary = sampleEvalSummary;
	const questions = sampleEvalQuestions;

	const categories = [...new Set(questions.map((q) => q.category))];
	const categoryStats = categories.map((cat) => {
		const catQuestions = questions.filter((q) => q.category === cat);
		const avg = catQuestions.reduce((s, q) => s + q.overallScore, 0) / catQuestions.length;
		return { category: cat, avg, count: catQuestions.length };
	});

	return (
		<div className="p-6">
			<div className="mb-6">
				<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Utvärdering</h2>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Senaste körning: {formatDate(summary.runDate)} (exempeldata)
				</p>
			</div>

			{/* Summary cards */}
			<div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="p-4 text-center">
					<p className="text-sm text-gray-500 dark:text-gray-400">Relevans</p>
					<p className="mt-1 text-2xl font-bold">{pct(summary.avgRelevance)}</p>
				</Card>
				<Card className="p-4 text-center">
					<p className="text-sm text-gray-500 dark:text-gray-400">Trovärdighet</p>
					<p className="mt-1 text-2xl font-bold">{pct(summary.avgFaithfulness)}</p>
				</Card>
				<Card className="p-4 text-center">
					<p className="text-sm text-gray-500 dark:text-gray-400">Källnoggrannhet</p>
					<p className="mt-1 text-2xl font-bold">{pct(summary.avgCitationAccuracy)}</p>
				</Card>
				<Card className="p-4 text-center">
					<p className="text-sm text-gray-500 dark:text-gray-400">Totalt</p>
					<p className="mt-1 text-2xl font-bold">{pct(summary.avgOverall)}</p>
				</Card>
			</div>

			{/* Category breakdown */}
			<Card className="mb-6">
				<h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Per kategori</h3>
				<div className="space-y-3">
					{categoryStats.map((cat) => (
						<div key={cat.category} className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className="text-sm text-gray-700 dark:text-gray-300">
									{cat.category}
								</span>
								<span className="text-xs text-gray-400 dark:text-gray-500">
									({cat.count} frågor)
								</span>
							</div>
							<Badge variant={scoreColor(cat.avg)}>{pct(cat.avg)}</Badge>
						</div>
					))}
				</div>
			</Card>

			{/* Question list */}
			<Card>
				<h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Alla frågor</h3>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Fråga</th>
								<th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Kategori</th>
								<th className="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">
									Relevans
								</th>
								<th className="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">
									Trovärdighet
								</th>
								<th className="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">
									Totalt
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
							{questions.map((q) => (
								<tr key={q.id}>
									<td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
										{q.question}
									</td>
									<td className="py-3 pr-4">
										<Badge>{q.category}</Badge>
									</td>
									<td className="py-3 text-right">
										<Badge variant={scoreColor(q.relevanceScore)}>
											{pct(q.relevanceScore)}
										</Badge>
									</td>
									<td className="py-3 text-right">
										<Badge variant={scoreColor(q.faithfulnessScore)}>
											{pct(q.faithfulnessScore)}
										</Badge>
									</td>
									<td className="py-3 text-right">
										<Badge variant={scoreColor(q.overallScore)}>
											{pct(q.overallScore)}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
		</div>
	);
}
