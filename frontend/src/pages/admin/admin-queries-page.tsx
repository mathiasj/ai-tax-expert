import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAdminQueries, useFeedbackStats } from "@/hooks/use-admin";
import { formatDate, formatMs } from "@/lib/utils";

const PAGE_SIZE = 30;

const feedbackOptions = [
	{ value: "positive", label: "Positiv" },
	{ value: "negative", label: "Negativ" },
	{ value: "none", label: "Utan feedback" },
];

function FeedbackIcon({ rating }: { rating: number | null }) {
	if (rating === 1) return <span title="Positiv">👍</span>;
	if (rating === -1) return <span title="Negativ">👎</span>;
	return <span className="text-gray-400" title="Ingen feedback">—</span>;
}

export function AdminQueriesPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [feedback, setFeedback] = useState(searchParams.get("feedback") ?? "");
	const [page, setPage] = useState(1);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const { data, isLoading } = useAdminQueries({
		feedback: feedback || undefined,
		limit: PAGE_SIZE,
		offset: (page - 1) * PAGE_SIZE,
	});

	const { data: stats } = useFeedbackStats();

	const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

	const handleFilterChange = (value: string) => {
		setFeedback(value);
		setPage(1);
		const params = new URLSearchParams();
		if (value) params.set("feedback", value);
		setSearchParams(params);
	};

	const positivePercent = stats && stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0;
	const negativePercent = stats && stats.total > 0 ? Math.round((stats.negative / stats.total) * 100) : 0;
	const noFbPercent = stats && stats.total > 0 ? Math.round((stats.noFeedback / stats.total) * 100) : 0;

	return (
		<div className="space-y-4 p-6">
			<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Frågor</h2>

			{/* Feedback summary */}
			{stats && (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
					<Card className="flex flex-col gap-1 p-4">
						<p className="text-xs text-gray-500 dark:text-gray-400">Totalt</p>
						<p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
					</Card>
					<Card className="flex flex-col gap-1 p-4">
						<p className="text-xs text-gray-500 dark:text-gray-400">Positiv</p>
						<p className="text-xl font-bold text-green-600 dark:text-green-400">
							{stats.positive} <span className="text-sm font-normal">({positivePercent}%)</span>
						</p>
					</Card>
					<Card className="flex flex-col gap-1 p-4">
						<p className="text-xs text-gray-500 dark:text-gray-400">Negativ</p>
						<p className="text-xl font-bold text-red-600 dark:text-red-400">
							{stats.negative} <span className="text-sm font-normal">({negativePercent}%)</span>
						</p>
					</Card>
					<Card className="flex flex-col gap-1 p-4">
						<p className="text-xs text-gray-500 dark:text-gray-400">Utan feedback</p>
						<p className="text-xl font-bold text-gray-500">
							{stats.noFeedback} <span className="text-sm font-normal">({noFbPercent}%)</span>
						</p>
					</Card>
				</div>
			)}

			{/* Filter */}
			<Card className="flex items-end gap-3 p-4">
				<div style={{ minWidth: "180px" }}>
					<Select
						label="Feedback-filter"
						options={feedbackOptions}
						placeholder="Alla"
						value={feedback}
						onChange={(e) => handleFilterChange(e.target.value)}
					/>
				</div>
			</Card>

			{/* Table */}
			{isLoading ? (
				<div className="flex h-32 items-center justify-center">
					<Spinner />
				</div>
			) : (
				<Card className="overflow-x-auto p-0">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
							<tr>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Fråga</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Svarstid</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Feedback</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Datum</th>
							</tr>
						</thead>
						<tbody>
							{data?.queries.map((q) => {
								const timings = q.metadata?.timings as { totalMs?: number } | undefined;
								const isExpanded = expandedId === q.id;
								return (
									<>
										<tr
											key={q.id}
											className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/30"
											onClick={() => setExpandedId(isExpanded ? null : q.id)}
										>
											<td className="max-w-md truncate px-4 py-3 text-gray-900 dark:text-gray-100">
												{q.question}
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
												{timings?.totalMs ? formatMs(timings.totalMs) : "-"}
											</td>
											<td className="px-4 py-3">
												<FeedbackIcon rating={q.feedbackRating} />
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
												{formatDate(q.createdAt)}
											</td>
										</tr>
										{isExpanded && (
											<tr key={`${q.id}-detail`}>
												<td colSpan={4} className="bg-gray-50 px-4 py-4 dark:bg-gray-800/30">
													<div className="space-y-2">
														<p className="text-xs font-medium text-gray-500 dark:text-gray-400">Svar</p>
														<p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
															{q.answer || "Inget svar"}
														</p>
														{q.feedbackComment && (
															<div className="mt-2">
																<p className="text-xs font-medium text-gray-500 dark:text-gray-400">
																	Feedback-kommentar
																</p>
																<p className="text-sm text-gray-700 dark:text-gray-300">
																	{q.feedbackComment}
																</p>
															</div>
														)}
													</div>
												</td>
											</tr>
										)}
									</>
								);
							})}
							{data?.queries.length === 0 && (
								<tr>
									<td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
										Inga frågor hittades
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</Card>
			)}

			<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
		</div>
	);
}
