import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type {
	ActivityResponse,
	AdminChunksResponse,
	AdminDocumentDetail,
	AdminQueriesResponse,
	AdminQueryDetail,
	AdminSource,
	AdminSourcesResponse,
	DocumentsResponse,
	FeedbackStats,
	ScrapeStatusResponse,
	SystemHealth,
} from "@/types/api";

// ─── Activity Log ────────────────────────────────────────────

export function useActivity(refreshInterval = 5000, sourceId?: string) {
	const [data, setData] = useState<ActivityResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const fetch = useCallback(async () => {
		try {
			const params = sourceId ? `?sourceId=${sourceId}` : "";
			const result = await api.get<ActivityResponse>(`/api/admin/activity${params}`);
			setData(result);
		} catch {
			// keep previous data on error
		} finally {
			setIsLoading(false);
		}
	}, [sourceId]);

	useEffect(() => {
		fetch();
		const interval = setInterval(fetch, refreshInterval);
		return () => clearInterval(interval);
	}, [fetch, refreshInterval]);

	return { data, isLoading, refetch: fetch };
}

export function useSourceActivity(
	sourceId: string | null,
	options: { limit?: number; offset?: number; refreshInterval?: number } = {},
) {
	const { limit = 50, offset = 0, refreshInterval = 5000 } = options;
	const [data, setData] = useState<ActivityResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const fetch = useCallback(async () => {
		if (!sourceId) {
			setData(null);
			setIsLoading(false);
			return;
		}
		try {
			const params = new URLSearchParams({ sourceId, limit: String(limit), offset: String(offset) });
			const result = await api.get<ActivityResponse>(`/api/admin/activity?${params}`);
			setData(result);
		} catch {
			// keep previous data on error
		} finally {
			setIsLoading(false);
		}
	}, [sourceId, limit, offset]);

	useEffect(() => {
		fetch();
		if (!sourceId) return;
		const interval = setInterval(fetch, refreshInterval);
		return () => clearInterval(interval);
	}, [fetch, sourceId, refreshInterval]);

	return { data, isLoading, refetch: fetch };
}

export function useSourceDetail(id: string | null) {
	const [data, setData] = useState<AdminSource | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetch = useCallback(async () => {
		if (!id) {
			setData(null);
			return;
		}
		setIsLoading(true);
		setError(null);
		try {
			const result = await api.get<AdminSource>(`/api/admin/sources/${id}`);
			setData(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsLoading(false);
		}
	}, [id]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	return { data, isLoading, error, refetch: fetch };
}

// ─── Documents ───────────────────────────────────────────────

interface DocFilters {
	source?: string;
	status?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

export function useAdminDocuments(filters: DocFilters = {}) {
	const [data, setData] = useState<DocumentsResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetch = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams();
			if (filters.source) params.set("source", filters.source);
			if (filters.status) params.set("status", filters.status);
			if (filters.search) params.set("search", filters.search);
			if (filters.limit) params.set("limit", String(filters.limit));
			if (filters.offset) params.set("offset", String(filters.offset));
			const qs = params.toString();
			const result = await api.get<DocumentsResponse>(`/api/documents${qs ? `?${qs}` : ""}`);
			setData(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsLoading(false);
		}
	}, [filters.source, filters.status, filters.search, filters.limit, filters.offset]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	return { data, isLoading, error, refetch: fetch };
}

export function useDocumentDetail(id: string | null) {
	const [data, setData] = useState<AdminDocumentDetail | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!id) {
			setData(null);
			return;
		}
		setIsLoading(true);
		setError(null);
		api.get<AdminDocumentDetail>(`/api/admin/documents/${id}`)
			.then(setData)
			.catch((err) => setError(err instanceof Error ? err.message : "Unknown error"))
			.finally(() => setIsLoading(false));
	}, [id]);

	return { data, isLoading, error };
}

export function useDocumentChunks(id: string | null, page = 1) {
	const [data, setData] = useState<AdminChunksResponse | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!id) {
			setData(null);
			return;
		}
		setIsLoading(true);
		const limit = 20;
		const offset = (page - 1) * limit;
		api.get<AdminChunksResponse>(`/api/admin/documents/${id}/chunks?limit=${limit}&offset=${offset}`)
			.then(setData)
			.finally(() => setIsLoading(false));
	}, [id, page]);

	return { data, isLoading };
}

export function useDeleteDocument() {
	const [isLoading, setIsLoading] = useState(false);

	const deleteDocument = async (id: string) => {
		setIsLoading(true);
		try {
			await api.delete(`/api/admin/documents/${id}`);
			return true;
		} catch {
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return { deleteDocument, isLoading };
}

export function useReprocessDocument() {
	const [isLoading, setIsLoading] = useState(false);

	const reprocess = async (id: string) => {
		setIsLoading(true);
		try {
			await api.post(`/api/admin/documents/${id}/reprocess`, {});
			return true;
		} catch {
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return { reprocess, isLoading };
}

// ─── Sources ─────────────────────────────────────────────────

interface SourceFilters {
	source?: string;
	status?: string;
	limit?: number;
	offset?: number;
}

export function useSources(filters: SourceFilters = {}) {
	const [data, setData] = useState<AdminSourcesResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetch = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams();
			if (filters.source) params.set("source", filters.source);
			if (filters.status) params.set("status", filters.status);
			if (filters.limit) params.set("limit", String(filters.limit));
			if (filters.offset) params.set("offset", String(filters.offset));
			const qs = params.toString();
			const result = await api.get<AdminSourcesResponse>(`/api/admin/sources${qs ? `?${qs}` : ""}`);
			setData(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsLoading(false);
		}
	}, [filters.source, filters.status, filters.limit, filters.offset]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	return { data, isLoading, error, refetch: fetch };
}

export function useCreateSource() {
	const [isLoading, setIsLoading] = useState(false);

	const create = async (data: { url: string; source: string; label?: string }) => {
		setIsLoading(true);
		try {
			await api.post("/api/admin/sources", data);
			return true;
		} catch {
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return { create, isLoading };
}

export function useUpdateSource() {
	const [isLoading, setIsLoading] = useState(false);

	const updateSource = async (
		id: string,
		data: Partial<Pick<AdminSource, "label" | "url" | "isActive" | "maxDocuments" | "scrapeIntervalMinutes" | "rateLimitMs" | "status">>,
	): Promise<AdminSource | null> => {
		setIsLoading(true);
		try {
			const result = await api.patch<AdminSource>(`/api/admin/sources/${id}`, data);
			return result;
		} catch {
			return null;
		} finally {
			setIsLoading(false);
		}
	};

	return { updateSource, isLoading };
}

export function useDeleteSource() {
	const [isLoading, setIsLoading] = useState(false);

	const deleteSource = async (id: string) => {
		setIsLoading(true);
		try {
			await api.delete(`/api/admin/sources/${id}`);
			return true;
		} catch {
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return { deleteSource, isLoading };
}

// ─── Queries ─────────────────────────────────────────────────

interface QueryFilters {
	feedback?: string;
	limit?: number;
	offset?: number;
}

export function useAdminQueries(filters: QueryFilters = {}) {
	const [data, setData] = useState<AdminQueriesResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetch = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams();
			if (filters.feedback) params.set("feedback", filters.feedback);
			if (filters.limit) params.set("limit", String(filters.limit));
			if (filters.offset) params.set("offset", String(filters.offset));
			const qs = params.toString();
			const result = await api.get<AdminQueriesResponse>(`/api/admin/queries${qs ? `?${qs}` : ""}`);
			setData(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsLoading(false);
		}
	}, [filters.feedback, filters.limit, filters.offset]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	return { data, isLoading, error, refetch: fetch };
}

export function useQueryDetail(id: string | null) {
	const [data, setData] = useState<AdminQueryDetail | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!id) {
			setData(null);
			return;
		}
		setIsLoading(true);
		api.get<AdminQueryDetail>(`/api/admin/queries/${id}`)
			.then(setData)
			.finally(() => setIsLoading(false));
	}, [id]);

	return { data, isLoading };
}

export function useFeedbackStats() {
	const [data, setData] = useState<FeedbackStats | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		api.get<FeedbackStats>("/api/admin/queries/stats")
			.then(setData)
			.finally(() => setIsLoading(false));
	}, []);

	return { data, isLoading };
}

// ─── Scraping ────────────────────────────────────────────────

export function useScrapeStatus() {
	const [data, setData] = useState<ScrapeStatusResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const fetch = useCallback(async () => {
		try {
			const result = await api.get<ScrapeStatusResponse>("/api/admin/scrape/status");
			setData(result);
		} catch {
			// keep previous data on error
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetch();
	}, [fetch]);

	return { data, isLoading, refetch: fetch };
}

export function useTriggerScrape() {
	const [isLoading, setIsLoading] = useState(false);

	const trigger = async (sourceId: string) => {
		setIsLoading(true);
		try {
			await api.post("/api/admin/scrape/trigger", { sourceId });
			return true;
		} catch {
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return { trigger, isLoading };
}

// ─── System Health ───────────────────────────────────────────

export function useSystemHealth(refreshInterval = 30000) {
	const [data, setData] = useState<SystemHealth | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const fetch = useCallback(async () => {
		try {
			const result = await api.get<SystemHealth>("/api/admin/health");
			setData(result);
		} catch {
			// keep previous data on error
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetch();
		const interval = setInterval(fetch, refreshInterval);
		return () => clearInterval(interval);
	}, [fetch, refreshInterval]);

	return { data, isLoading, refetch: fetch };
}
