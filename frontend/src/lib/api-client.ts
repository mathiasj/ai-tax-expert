import { getToken, removeToken } from "./auth";

const BASE_URL = "";

interface ApiError {
	error: string;
	details?: unknown;
}

class ApiClientError extends Error {
	constructor(
		public status: number,
		public body: ApiError,
	) {
		super(body.error);
		this.name = "ApiClientError";
	}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getToken();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...((options.headers as Record<string, string>) ?? {}),
	};

	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	const res = await fetch(`${BASE_URL}${path}`, {
		...options,
		headers,
	});

	if (res.status === 401) {
		removeToken();
		window.location.href = "/login";
		throw new ApiClientError(401, { error: "Authentication required" });
	}

	const body = await res.json();

	if (!res.ok) {
		throw new ApiClientError(res.status, body as ApiError);
	}

	return body as T;
}

export const api = {
	get: <T>(path: string) => request<T>(path),
	post: <T>(path: string, data: unknown) =>
		request<T>(path, { method: "POST", body: JSON.stringify(data) }),
	patch: <T>(path: string, data: unknown) =>
		request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
	delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export { ApiClientError };
