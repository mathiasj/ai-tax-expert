import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useSystemHealth, useTriggerScrape } from "@/hooks/use-admin";
import { api } from "@/lib/api-client";

function StatusDot({ ok }: { ok: boolean }) {
	return (
		<span
			className={`inline-block h-3 w-3 rounded-full ${
				ok ? "bg-green-500" : "bg-red-500"
			}`}
		/>
	);
}

function ServiceCard({
	title,
	status,
	children,
}: {
	title: string;
	status: string;
	children: React.ReactNode;
}) {
	const ok = status === "ok";
	return (
		<Card>
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
				<div className="flex items-center gap-2">
					<StatusDot ok={ok} />
					<Badge variant={ok ? "success" : "danger"}>{ok ? "Online" : "Offline"}</Badge>
				</div>
			</div>
			<div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">{children}</div>
		</Card>
	);
}

export function AdminSystemPage() {
	const { data, isLoading, refetch } = useSystemHealth();
	const [refreshing, setRefreshing] = useState(false);
	const [scraping, setScraping] = useState(false);
	const { trigger: triggerScrape } = useTriggerScrape();

	const handleTriggerScrapeAll = async () => {
		setScraping(true);
		try {
			await Promise.all([
				triggerScrape("riksdagen"),
				triggerScrape("lagrummet"),
				triggerScrape("skatteverket"),
			]);
			setTimeout(refetch, 1000);
		} catch {
			// ignore
		} finally {
			setScraping(false);
		}
	};

	const handleTriggerRefresh = async () => {
		setRefreshing(true);
		try {
			await api.post("/api/admin/refresh/trigger", {});
			setTimeout(refetch, 1000);
		} catch {
			// ignore
		} finally {
			setRefreshing(false);
		}
	};

	if (isLoading && !data) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Spinner size="lg" />
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">System</h2>
				<Button variant="secondary" size="sm" onClick={refetch}>
					Uppdatera
				</Button>
			</div>

			<p className="text-xs text-gray-400 dark:text-gray-500">Uppdateras automatiskt var 30:e sekund</p>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{/* Qdrant */}
				<ServiceCard title="Qdrant" status={data?.qdrant.status ?? "error"}>
					{data?.qdrant.status === "ok" ? (
						<>
							<p>Punkter: <span className="font-medium text-gray-900 dark:text-gray-100">{data.qdrant.pointsCount?.toLocaleString()}</span></p>
							<p>Vektorer: <span className="font-medium text-gray-900 dark:text-gray-100">{data.qdrant.vectorsCount?.toLocaleString()}</span></p>
							<p>Segment: <span className="font-medium text-gray-900 dark:text-gray-100">{data.qdrant.segmentsCount}</span></p>
						</>
					) : (
						<p className="text-red-500">{data?.qdrant.error}</p>
					)}
				</ServiceCard>

				{/* Redis */}
				<ServiceCard title="Redis" status={data?.redis.status ?? "error"}>
					{data?.redis.status === "ok" ? (
						<p>Latens: <span className="font-medium text-gray-900 dark:text-gray-100">{data.redis.latencyMs}ms</span></p>
					) : (
						<p className="text-red-500">{data?.redis.error}</p>
					)}
				</ServiceCard>

				{/* PostgreSQL */}
				<ServiceCard title="PostgreSQL" status={data?.postgres.status ?? "error"}>
					{data?.postgres.status === "ok" ? (
						<p>Anslutning OK</p>
					) : (
						<p className="text-red-500">{data?.postgres.error}</p>
					)}
				</ServiceCard>

				{/* BullMQ */}
				<ServiceCard title="BullMQ" status={data?.bullmq.status ?? "error"}>
					{data?.bullmq.status === "ok" ? (
						<div className="grid grid-cols-2 gap-1">
							<p>Väntande: <span className="font-medium text-gray-900 dark:text-gray-100">{data.bullmq.waiting}</span></p>
							<p>Aktiva: <span className="font-medium text-gray-900 dark:text-gray-100">{data.bullmq.active}</span></p>
							<p>Klara: <span className="font-medium text-gray-900 dark:text-gray-100">{data.bullmq.completed?.toLocaleString()}</span></p>
							<p>Misslyckade: <span className="font-medium text-red-600 dark:text-red-400">{data.bullmq.failed}</span></p>
						</div>
					) : (
						<p className="text-red-500">{data?.bullmq.error}</p>
					)}
				</ServiceCard>

				{/* Refresh Scheduler */}
				<ServiceCard title="Refresh Scheduler" status={data?.refreshScheduler?.status ?? "error"}>
					{data?.refreshScheduler?.status === "ok" ? (
						<>
							<div className="grid grid-cols-2 gap-1">
								<p>Väntande: <span className="font-medium text-gray-900 dark:text-gray-100">{data.refreshScheduler.waiting}</span></p>
								<p>Aktiva: <span className="font-medium text-gray-900 dark:text-gray-100">{data.refreshScheduler.active}</span></p>
								<p>Klara: <span className="font-medium text-gray-900 dark:text-gray-100">{data.refreshScheduler.completed?.toLocaleString()}</span></p>
								<p>Misslyckade: <span className="font-medium text-red-600 dark:text-red-400">{data.refreshScheduler.failed}</span></p>
							</div>
							{data.refreshScheduler.nextRun && (
								<p className="mt-1">Nästa körning: <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(data.refreshScheduler.nextRun).toLocaleString("sv-SE")}</span></p>
							)}
							<Button variant="secondary" size="sm" className="mt-2" onClick={handleTriggerRefresh} disabled={refreshing}>
								{refreshing ? "Kör..." : "Kör nu"}
							</Button>
						</>
					) : (
						<p className="text-red-500">{data?.refreshScheduler?.error ?? "Ej konfigurerad"}</p>
					)}
				</ServiceCard>

				{/* Scrape Scheduler */}
				<ServiceCard title="Scrape Scheduler" status={data?.scrapeScheduler?.status ?? "error"}>
					{data?.scrapeScheduler?.status === "ok" ? (
						<>
							<div className="grid grid-cols-2 gap-1">
								<p>Väntande: <span className="font-medium text-gray-900 dark:text-gray-100">{data.scrapeScheduler.waiting}</span></p>
								<p>Aktiva: <span className="font-medium text-gray-900 dark:text-gray-100">{data.scrapeScheduler.active}</span></p>
								<p>Klara: <span className="font-medium text-gray-900 dark:text-gray-100">{data.scrapeScheduler.completed?.toLocaleString()}</span></p>
								<p>Misslyckade: <span className="font-medium text-red-600 dark:text-red-400">{data.scrapeScheduler.failed}</span></p>
							</div>
							{data.scrapeScheduler.nextRun && (
								<p className="mt-1">Nästa körning: <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(data.scrapeScheduler.nextRun).toLocaleString("sv-SE")}</span></p>
							)}
							<Button variant="secondary" size="sm" className="mt-2" onClick={handleTriggerScrapeAll} disabled={scraping}>
								{scraping ? "Skrapar..." : "Kör alla"}
							</Button>
						</>
					) : (
						<p className="text-red-500">{data?.scrapeScheduler?.error ?? "Ej konfigurerad"}</p>
					)}
				</ServiceCard>
			</div>

			{/* Document stats */}
			{data?.documents && (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Card>
						<h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
							Dokument per status
						</h3>
						<div className="space-y-2">
							{Object.entries(data.documents.byStatus).map(([status, cnt]) => {
								const total = Object.values(data.documents.byStatus).reduce(
									(a, b) => a + b,
									0,
								);
								return (
									<div key={status} className="flex items-center gap-3">
										<span className="w-20 text-xs text-gray-600 dark:text-gray-400">
											{status}
										</span>
										<div className="flex-1">
											<div
												className={`h-4 rounded ${
													status === "indexed"
														? "bg-green-500"
														: status === "failed"
															? "bg-red-500"
															: "bg-blue-500"
												}`}
												style={{
													width: `${total > 0 ? (cnt / total) * 100 : 0}%`,
													minWidth: cnt > 0 ? "0.25rem" : "0",
												}}
											/>
										</div>
										<span className="w-10 text-right text-xs font-medium text-gray-900 dark:text-gray-100">
											{cnt}
										</span>
									</div>
								);
							})}
						</div>
					</Card>

					<Card>
						<h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
							Dokument per källa
						</h3>
						<div className="space-y-2">
							{Object.entries(data.documents.bySource).map(([source, cnt]) => {
								const total = Object.values(data.documents.bySource).reduce(
									(a, b) => a + b,
									0,
								);
								return (
									<div key={source} className="flex items-center gap-3">
										<span className="w-20 text-xs text-gray-600 dark:text-gray-400">
											{source}
										</span>
										<div className="flex-1">
											<div
												className="h-4 rounded bg-blue-500"
												style={{
													width: `${total > 0 ? (cnt / total) * 100 : 0}%`,
													minWidth: cnt > 0 ? "0.25rem" : "0",
												}}
											/>
										</div>
										<span className="w-10 text-right text-xs font-medium text-gray-900 dark:text-gray-100">
											{cnt}
										</span>
									</div>
								);
							})}
						</div>
						<p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
							Totalt chunks: <span className="font-medium">{data.documents.totalChunks.toLocaleString()}</span>
						</p>
					</Card>
				</div>
			)}
		</div>
	);
}
