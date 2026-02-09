import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ToastContainer } from "@/components/ui/toast";
import { AdminSidebar } from "./admin-sidebar";

export function AdminLayout() {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const { logout } = useAuth();
	const navigate = useNavigate();

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
