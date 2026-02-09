import { useState } from "react";
import { api } from "@/lib/api-client";

export function useFeedback() {
	const [isLoading, setIsLoading] = useState(false);

	const submitFeedback = async (queryId: string, rating: 1 | -1, comment?: string) => {
		setIsLoading(true);
		try {
			await api.post(`/api/queries/${queryId}/feedback`, { rating, comment });
			return true;
		} catch {
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return { submitFeedback, isLoading };
}
