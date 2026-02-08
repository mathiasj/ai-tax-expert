import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { AnalyticsSummary, PopularQuestion } from "@/types/api";

export function useAnalyticsSummary() {
	const [data, setData] = useState<AnalyticsSummary | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		try {
			const summary = await api.get<AnalyticsSummary>("/api/analytics/summary");
			setData(summary);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Kunde inte hämta statistik");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { data, isLoading, error, refresh };
}

export function usePopularQuestions() {
	const [data, setData] = useState<PopularQuestion[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		api.get<PopularQuestion[]>("/api/analytics/popular")
			.then((questions) => {
				setData(questions);
				setError(null);
			})
			.catch((err) => {
				setError(err instanceof Error ? err.message : "Kunde inte hämta populära frågor");
			})
			.finally(() => setIsLoading(false));
	}, []);

	return { data, isLoading, error };
}
