import { useCallback, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/auth-context";
import { useTheme } from "@/hooks/use-theme";
import { removeToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ToastContainer } from "@/components/ui/toast";
import { AdminSidebar } from "./admin-sidebar";

export function AdminLayout() {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const { setUser } = useAuthContext();
	const { theme, setTheme } = useTheme();
	const navigate = useNavigate();

	const logout = useCallback(() => {
		removeToken();
		setUser(null);
		navigate("/admin/login");
	}, [navigate, setUser]);

	return (
		<div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
			{/* Mobile overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/50 lg:hidden"
					onClick={() => setSidebarOpen(false)}
					onKeyDown={() => {}}
					role="presentation"
				/>
			)}

			{/* Sidebar */}
			<aside
				className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0 dark:border-gray-800 dark:bg-gray-950 ${
					sidebarOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex h-14 items-center border-b border-gray-200 px-4 dark:border-gray-800">
					<span className="text-lg font-bold text-amber-600 dark:text-amber-400">A</span>
					<span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
						Admin
					</span>
				</div>
				<AdminSidebar onNavigate={() => setSidebarOpen(false)} />
			</aside>

			{/* Main content */}
			<div className="flex flex-1 flex-col overflow-hidden">
				<header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => setSidebarOpen(true)}
							className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800"
						>
							<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</button>
						<h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
							SkatteAssistenten <span className="text-amber-600 dark:text-amber-400">Admin</span>
						</h1>
					</div>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
							className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
							title={theme === "dark" ? "Ljust läge" : "Mörkt läge"}
						>
							{theme === "dark" ? (
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
								</svg>
							) : (
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
								</svg>
							)}
						</button>
						<Button variant="ghost" size="sm" onClick={() => navigate("/chat")}>
							Chatt
						</Button>
						<Button variant="ghost" size="sm" onClick={logout}>
							Logga ut
						</Button>
					</div>
				</header>
				<main className="flex-1 overflow-auto">
					<Outlet />
				</main>
			</div>

			<ToastContainer />
		</div>
	);
}
