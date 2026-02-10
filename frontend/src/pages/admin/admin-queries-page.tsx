import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
	return <span className="text-muted-foreground" title="Ingen feedback">—</span>;
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
		const newValue = value === "_all" ? "" : value;
		setFeedback(newValue);
		setPage(1);
		const params = new URLSearchParams();
		if (newValue) params.set("feedback", newValue);
		setSearchParams(params);
	};

	const positivePercent = stats && stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0;
	const negativePercent = stats && stats.total > 0 ? Math.round((stats.negative / stats.total) * 100) : 0;
	const noFbPercent = stats && stats.total > 0 ? Math.round((stats.noFeedback / stats.total) * 100) : 0;

	return (
		<div className="space-y-4 p-6">
			<h2 className="text-xl font-bold text-foreground">Frågor</h2>

			{/* Feedback summary */}
			{stats && (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
					<Card className="flex flex-col gap-1 p-4">
						<p className="text-xs text-muted-foreground">Totalt</p>
						<p className="text-xl font-bold text-foreground">{stats.total}</p>
					</Card>
					<Card className="flex flex-col gap-1 p-4">
						<p className="text-xs text-muted-foreground">Positiv</p>
						<p className="text-xl font-bold text-green-600 dark:text-green-400">
							{stats.positive} <span className="text-sm font-normal">({positivePercent}%)</span>
						</p>
					</Card>
					<Card className="flex flex-col gap-1 p-4">
						<p className="text-xs text-muted-foreground">Negativ</p>
						<p className="text-xl font-bold text-red-600 dark:text-red-400">
							{stats.negative} <span className="text-sm font-normal">({negativePercent}%)</span>
						</p>
					</Card>
					<Card className="flex flex-col gap-1 p-4">
						<p className="text-xs text-muted-foreground">Utan feedback</p>
						<p className="text-xl font-bold text-muted-foreground">
							{stats.noFeedback} <span className="text-sm font-normal">({noFbPercent}%)</span>
						</p>
					</Card>
				</div>
			)}

			{/* Filter */}
			<Card className="flex items-end gap-3 p-4">
				<div style={{ minWidth: "180px" }} className="space-y-2">
					<Label>Feedback-filter</Label>
					<Select value={feedback || "_all"} onValueChange={handleFilterChange}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Alla" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="_all">Alla</SelectItem>
							{feedbackOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
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
						<thead className="border-b bg-muted/50">
							<tr>
								<th className="px-4 py-3 font-medium text-muted-foreground">Fråga</th>
								<th className="px-4 py-3 font-medium text-muted-foreground">Svarstid</th>
								<th className="px-4 py-3 font-medium text-muted-foreground">Feedback</th>
								<th className="px-4 py-3 font-medium text-muted-foreground">Datum</th>
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
											className="cursor-pointer border-b border-border hover:bg-muted/50"
											onClick={() => setExpandedId(isExpanded ? null : q.id)}
										>
											<td className="max-w-md truncate px-4 py-3 text-foreground">
												{q.question}
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
												{timings?.totalMs ? formatMs(timings.totalMs) : "-"}
											</td>
											<td className="px-4 py-3">
												<FeedbackIcon rating={q.feedbackRating} />
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
												{formatDate(q.createdAt)}
											</td>
										</tr>
										{isExpanded && (
											<tr key={`${q.id}-detail`}>
												<td colSpan={4} className="bg-muted/50 px-4 py-4">
													<div className="space-y-2">
														<p className="text-xs font-medium text-muted-foreground">Svar</p>
														<p className="whitespace-pre-wrap text-sm text-foreground">
															{q.answer || "Inget svar"}
														</p>
														{q.feedbackComment && (
															<div className="mt-2">
																<p className="text-xs font-medium text-muted-foreground">
																	Feedback-kommentar
																</p>
																<p className="text-sm text-foreground">
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
									<td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
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
