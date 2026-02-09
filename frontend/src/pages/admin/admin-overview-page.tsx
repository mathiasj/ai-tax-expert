import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFeedbackStats, useSystemHealth } from "@/hooks/use-admin";
import { api } from "@/lib/api-client";
import type { DocumentsResponse } from "@/types/api";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
	return (
		<Card className="flex flex-col gap-1">
			<p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
			<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
			{sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
		</Card>
	);
}

export function AdminOverviewPage() {
	const { data: health, isLoading: healthLoading } = useSystemHealth();
	const { data: feedbackStats, isLoading: fbLoading } = useFeedbackStats();
	const [docCounts, setDocCounts] = useState<{ total: number; failed: number; indexed: number } | null>(null);

	useEffect(() => {
		Promise.all([
			api.get<DocumentsResponse>("/api/documents?limit=1"),
			api.get<DocumentsResponse>("/api/documents?status=failed&limit=1"),
			api.get<DocumentsResponse>("/api/documents?status=indexed&limit=1"),
		]).then(([all, failed, indexed]) => {
			setDocCounts({
				total: all.total,
				failed: failed.total,
				indexed: indexed.total,
			});
		});
	}, []);

	if (healthLoading || fbLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Spinner size="lg" />
			</div>
		);
	}

	const totalSources = health?.documents
		? Object.values(health.documents.bySource).reduce((a, b) => a + b, 0)
		: 0;

	return (
		<div className="space-y-6 p-6">
			<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Översikt</h2>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard label="Totalt dokument" value={docCounts?.total ?? "..."} />
				<StatCard
					label="Indexerade"
					value={docCounts?.indexed ?? "..."}
					sub={docCounts ? `${docCounts.failed} misslyckade` : undefined}
				/>
				<StatCard label="Chunks" value={health?.documents.totalChunks ?? "..."} />
				<StatCard
					label="Qdrant-punkter"
					value={health?.qdrant.pointsCount ?? "..."}
					sub={health?.qdrant.status === "ok" ? "Online" : "Offline"}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard label="Totalt frågor" value={feedbackStats?.total ?? "..."} />
				<StatCard label="Positiv feedback" value={feedbackStats?.positive ?? "..."} />
				<StatCard label="Negativ feedback" value={feedbackStats?.negative ?? "..."} />
				<StatCard label="Utan feedback" value={feedbackStats?.noFeedback ?? "..."} />
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Card>
					<h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Snabblänkar</h3>
					<div className="flex flex-col gap-2">
						<Link
							to="/admin/documents?status=failed"
							className="text-sm text-red-600 hover:underline dark:text-red-400"
						>
							Se misslyckade dokument ({docCounts?.failed ?? 0})
						</Link>
						<Link
							to="/admin/queries?feedback=negative"
							className="text-sm text-amber-600 hover:underline dark:text-amber-400"
						>
							Se negativ feedback ({feedbackStats?.negative ?? 0})
						</Link>
						<Link
							to="/admin/system"
							className="text-sm text-blue-600 hover:underline dark:text-blue-400"
						>
							Systemhälsa
						</Link>
					</div>
				</Card>

				{health?.documents.bySource && (
					<Card>
						<h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
							Dokument per källa
						</h3>
						<div className="space-y-2">
							{Object.entries(health.documents.bySource).map(([source, cnt]) => (
								<div key={source} className="flex items-center gap-3">
									<span className="w-24 text-sm text-gray-600 dark:text-gray-400">{source}</span>
									<div className="flex-1">
										<div
											className="h-5 rounded bg-blue-500 dark:bg-blue-600"
											style={{
												width: `${totalSources > 0 ? (cnt / totalSources) * 100 : 0}%`,
												minWidth: cnt > 0 ? "0.5rem" : "0",
											}}
										/>
									</div>
									<span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cnt}</span>
								</div>
							))}
						</div>
					</Card>
				)}
			</div>
		</div>
	);
}
