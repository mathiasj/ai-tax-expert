import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export function LoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const { login } = useAuth();

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
			await login(email, password);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Inloggningen misslyckades");
		} finally {
			setIsLoading(false);
		}
	}

	function fillTestCredentials() {
		setEmail("test@example.se");
		setPassword("test123");
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{import.meta.env.DEV && (
				<button
					type="button"
					onClick={fillTestCredentials}
					className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
				>
					Dev-läge: Klicka för att fylla i testanvändare (test@example.se / test123)
				</button>
			)}
			<div className="space-y-2">
				<Label htmlFor="email">E-post</Label>
				<Input
					id="email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="din@email.se"
					required
					autoComplete="email"
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="password">Lösenord</Label>
				<Input
					id="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Minst 8 tecken"
					required
					autoComplete="current-password"
				/>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
			<Button type="submit" className="w-full" disabled={isLoading}>
				{isLoading && <Loader2 className="animate-spin" />}
				Logga in
			</Button>
			<p className="text-center text-sm text-muted-foreground">
				Inget konto?{" "}
				<Link to="/register" className="text-primary hover:underline">
					Registrera dig
				</Link>
			</p>
		</form>
	);
}
