import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuthContext } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { setToken } from "@/lib/auth";
import type { AuthResponse } from "@/types/api";

export function AdminLoginPage() {
	const { user, setUser, isLoading: authLoading } = useAuthContext();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	if (authLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Spinner size="lg" />
			</div>
		);
	}

	// Already logged in as admin — go to dashboard
	if (user?.role === "admin") {
		return <Navigate to="/admin" replace />;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
			const res = await api.post<AuthResponse>("/api/auth/login", { email, password }, { skipAuthRedirect: true });
			if (res.user.role !== "admin") {
				setError("Kontot har inte administratörsbehörighet");
				return;
			}
			setToken(res.token);
			setUser(res.user);
			navigate("/admin", { replace: true });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Inloggningen misslyckades");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-sm">
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 text-xl font-bold text-white">
						A
					</div>
					<h1 className="text-2xl font-bold text-foreground">
						Admin
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						SkatteAssistenten — Administration
					</p>
				</div>
				<Card>
						<form onSubmit={handleSubmit} className="space-y-4">
							{import.meta.env.DEV && (
								<button
									type="button"
									onClick={() => {
										setEmail("admin@example.se");
										setPassword("admin123");
									}}
									className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
								>
									Dev-läge: Klicka för att fylla i admin-uppgifter
								</button>
							)}
							<div className="space-y-2">
								<Label htmlFor="admin-email">E-post</Label>
								<Input
									id="admin-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="admin@example.se"
									required
									autoComplete="email"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="admin-password">Lösenord</Label>
								<Input
									id="admin-password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									autoComplete="current-password"
								/>
							</div>
							{error && <p className="text-sm text-destructive">{error}</p>}
							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading && <Loader2 className="animate-spin" />}
								Logga in
							</Button>
						</form>
				</Card>
			</div>
		</div>
	);
}
