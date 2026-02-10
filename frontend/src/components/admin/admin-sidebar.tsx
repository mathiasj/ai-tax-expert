import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
	onNavigate?: () => void;
}

const navItems = [
	{ to: "/admin", label: "Översikt", icon: "📊", end: true },
	{ to: "/admin/documents", label: "Dokument", icon: "📄", end: false },
	{ to: "/admin/sources", label: "Källor", icon: "🔗", end: false },
	{ to: "/admin/queries", label: "Frågor", icon: "💬", end: false },
	{ to: "/admin/system", label: "System", icon: "🖥️", end: false },
];

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
	return (
		<nav className="flex flex-col gap-1 p-3">
			{navItems.map((item) => (
				<NavLink
					key={item.to}
					to={item.to}
					end={item.end}
					onClick={onNavigate}
					className={({ isActive }) =>
						cn(
							"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
							isActive
								? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
								: "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
						)
					}
				>
					<span className="text-base">{item.icon}</span>
					{item.label}
				</NavLink>
			))}

			<div className="my-2 border-t border-gray-200 dark:border-gray-700" />

			<NavLink
				to="/chat"
				onClick={onNavigate}
				className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
			>
				<span className="text-base">←</span>
				Tillbaka till chatten
			</NavLink>
		</nav>
	);
}
