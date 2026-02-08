import { useCallback, useState } from "react";
import { api } from "@/lib/api-client";
import type { QueryRequest, QueryResponse } from "@/types/api";

export function useQueryMutation() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const sendQuery = useCallback(async (request: QueryRequest): Promise<QueryResponse | null> => {
		setIsLoading(true);
		setError(null);
		try {
			const response = await api.post<QueryResponse>("/api/query", request);
			return response;
		} catch (err) {
			const message = err instanceof Error ? err.message : "Något gick fel";
			setError(message);
			return null;
		} finally {
			setIsLoading(false);
		}
	}, []);

	return { sendQuery, isLoading, error };
}
