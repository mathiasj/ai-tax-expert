import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/auth-context";
import { RegisterForm } from "@/components/auth/register-form";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function RegisterPage() {
	const { user, isLoading } = useAuthContext();

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Spinner size="lg" />
			</div>
		);
	}

	if (user) return <Navigate to="/chat" replace />;

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
			<div className="w-full max-w-sm">
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
						S
					</div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
						Skapa konto
					</h1>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						Registrera dig för att använda SkatteAssistenten
					</p>
				</div>
				<Card>
					<RegisterForm />
				</Card>
			</div>
		</div>
	);
}
