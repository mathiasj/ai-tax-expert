import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

interface HeaderProps {
	onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
	const { user } = useAuthContext();
	const { logout } = useAuth();
	const navigate = useNavigate();

	return (
		<header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onMenuClick}
					className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800"
				>
					<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				<h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
					SkatteAssistenten
				</h1>
			</div>
			<div className="flex items-center gap-3">
				{user?.role === "admin" && (
					<Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
						Admin
					</Button>
				)}
				<span className="hidden text-sm text-gray-500 sm:block dark:text-gray-400">
					{user?.email}
				</span>
				<Button variant="ghost" size="sm" onClick={logout}>
					Logga ut
				</Button>
			</div>
		</header>
	);
}
