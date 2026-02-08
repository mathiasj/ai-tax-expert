import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api-client";
import { removeToken, setToken } from "@/lib/auth";
import type { AuthResponse } from "@/types/api";
import { useAuthContext } from "@/contexts/auth-context";

export function useAuth() {
	const navigate = useNavigate();
	const { setUser } = useAuthContext();

	const login = useCallback(
		async (email: string, password: string) => {
			const res = await api.post<AuthResponse>("/api/auth/login", { email, password });
			setToken(res.token);
			setUser(res.user);
			navigate("/");
		},
		[navigate, setUser],
	);

	const register = useCallback(
		async (email: string, password: string, name?: string) => {
			const res = await api.post<AuthResponse>("/api/auth/register", { email, password, name });
			setToken(res.token);
			setUser(res.user);
			navigate("/");
		},
		[navigate, setUser],
	);

	const logout = useCallback(() => {
		removeToken();
		setUser(null);
		navigate("/login");
	}, [navigate, setUser]);

	return { login, register, logout };
}
