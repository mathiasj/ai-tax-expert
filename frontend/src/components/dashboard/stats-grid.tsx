import type { AnalyticsSummary } from "@/types/api";
import { formatMs } from "@/lib/utils";
import { StatCard } from "./stat-card";

interface StatsGridProps {
	data: AnalyticsSummary;
}

export function StatsGrid({ data }: StatsGridProps) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<StatCard label="Totala frågor" value={data.totalQueries} />
			<StatCard label="Unika användare" value={data.uniqueUsers} />
			<StatCard label="Frågor (24h)" value={data.queries24h} />
			<StatCard label="Frågor (7d)" value={data.queries7d} />
			<StatCard label="Konversationer" value={data.conversations} />
			<StatCard
				label="Svarstid (snitt)"
				value={data.avgResponseTimeMs ? formatMs(data.avgResponseTimeMs) : "-"}
			/>
		</div>
	);
}
