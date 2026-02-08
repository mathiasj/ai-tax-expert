import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<Input
				id="email"
				label="E-post"
				type="email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				placeholder="din@email.se"
				required
				autoComplete="email"
			/>
			<Input
				id="password"
				label="Lösenord"
				type="password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				placeholder="Minst 8 tecken"
				required
				autoComplete="current-password"
			/>
			{error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
			<Button type="submit" className="w-full" isLoading={isLoading}>
				Logga in
			</Button>
			<p className="text-center text-sm text-gray-500 dark:text-gray-400">
				Inget konto?{" "}
				<Link to="/register" className="text-blue-600 hover:underline dark:text-blue-400">
					Registrera dig
				</Link>
			</p>
		</form>
	);
}
