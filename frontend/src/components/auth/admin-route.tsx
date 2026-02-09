import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/auth-context";
import { Spinner } from "@/components/ui/spinner";

export function AdminRoute({ children }: { children: ReactNode }) {
	const { user, isLoading } = useAuthContext();

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Spinner size="lg" />
			</div>
		);
	}

	if (!user || user.role !== "admin") {
		return <Navigate to="/admin/login" replace />;
	}

	return <>{children}</>;
}
