import { useAnalyticsSummary, usePopularQuestions } from "@/hooks/use-analytics";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { PopularQuestions } from "@/components/dashboard/popular-questions";
import { Spinner } from "@/components/ui/spinner";

export function DashboardPage() {
	const { data: summary, isLoading: summaryLoading, error: summaryError } = useAnalyticsSummary();
	const {
		data: popular,
		isLoading: popularLoading,
		error: popularError,
	} = usePopularQuestions();

	if (summaryLoading || popularLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Spinner size="lg" />
			</div>
		);
	}

	if (summaryError || popularError) {
		return (
			<div className="p-8">
				<p className="text-red-600 dark:text-red-400">
					{summaryError || popularError}
				</p>
			</div>
		);
	}

	return (
		<div className="p-6">
			<h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>
			{summary && <StatsGrid data={summary} />}
			<div className="mt-6">
				<PopularQuestions questions={popular} />
			</div>
		</div>
	);
}
