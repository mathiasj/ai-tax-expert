const TOKEN_KEY = "skatteassistenten_token";

export function getToken(): string | null {
	return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
	localStorage.removeItem(TOKEN_KEY);
}

interface TokenPayload {
	sub: string;
	email: string;
	role: string;
	exp: number;
}

export function parsePayload(token: string): TokenPayload | null {
	try {
		const parts = token.split(".");
		const payload = parts[1];
		if (!payload) return null;
		return JSON.parse(atob(payload)) as TokenPayload;
	} catch {
		return null;
	}
}

export function isExpired(token: string): boolean {
	const payload = parsePayload(token);
	if (!payload) return true;
	return Date.now() >= payload.exp * 1000;
}
