import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { getToken, isExpired, removeToken } from "@/lib/auth";
import type { UserInfo } from "@/types/api";

interface AuthContextValue {
	user: UserInfo | null;
	setUser: (user: UserInfo | null) => void;
	isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<UserInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const token = getToken();
		if (!token || isExpired(token)) {
			removeToken();
			setIsLoading(false);
			return;
		}

		api.get<{ user: UserInfo }>("/api/auth/me", { skipAuthRedirect: true })
			.then((res) => setUser(res.user))
			.catch(() => removeToken())
			.finally(() => setIsLoading(false));
	}, []);

	return (
		<AuthContext.Provider value={{ user, setUser, isLoading }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuthContext() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
	return ctx;
}
