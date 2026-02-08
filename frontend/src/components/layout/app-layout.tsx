import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { ToastContainer } from "@/components/ui/toast";

export function AppLayout() {
	const [sidebarOpen, setSidebarOpen] = useState(false);

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
					<span className="text-lg font-bold text-blue-600 dark:text-blue-400">S</span>
					<span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
						SkatteAssistenten
					</span>
				</div>
				<Sidebar onNavigate={() => setSidebarOpen(false)} />
			</aside>

			{/* Main content */}
			<div className="flex flex-1 flex-col overflow-hidden">
				<Header onMenuClick={() => setSidebarOpen(true)} />
				<main className="flex-1 overflow-auto">
					<Outlet />
				</main>
			</div>

			<ToastContainer />
		</div>
	);
}
