import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export function RegisterForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const { register } = useAuth();

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
			await register(email, password, name || undefined);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Registreringen misslyckades");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="name">Namn (valfritt)</Label>
				<Input
					id="name"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Ditt namn"
					autoComplete="name"
				/>
			</div>
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
					minLength={8}
					autoComplete="new-password"
				/>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
			<Button type="submit" className="w-full" disabled={isLoading}>
				{isLoading && <Loader2 className="animate-spin" />}
				Skapa konto
			</Button>
			<p className="text-center text-sm text-muted-foreground">
				Har du redan ett konto?{" "}
				<Link to="/login" className="text-primary hover:underline">
					Logga in
				</Link>
			</p>
		</form>
	);
}
