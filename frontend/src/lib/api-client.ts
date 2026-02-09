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

async function request<T>(path: string, options: RequestInit & { skipAuthRedirect?: boolean } = {}): Promise<T> {
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
		if (!options.skipAuthRedirect) {
			removeToken();
			window.location.href = "/login";
		}
		throw new ApiClientError(401, { error: "Authentication required" });
	}

	const body = await res.json();

	if (!res.ok) {
		throw new ApiClientError(res.status, body as ApiError);
	}

	return body as T;
}

interface RequestOptions {
	skipAuthRedirect?: boolean;
}

export const api = {
	get: <T>(path: string, opts?: RequestOptions) => request<T>(path, opts),
	post: <T>(path: string, data: unknown, opts?: RequestOptions) =>
		request<T>(path, { method: "POST", body: JSON.stringify(data), ...opts }),
	patch: <T>(path: string, data: unknown, opts?: RequestOptions) =>
		request<T>(path, { method: "PATCH", body: JSON.stringify(data), ...opts }),
	delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { method: "DELETE", ...opts }),
};

export { ApiClientError };
