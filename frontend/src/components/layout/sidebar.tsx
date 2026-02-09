import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SidebarProps {
	onNavigate?: () => void;
}

const navItems = [
	{ to: "/chat", label: "Chatt", icon: "💬" },
	{ to: "/settings", label: "Inställningar", icon: "⚙️" },
];

export function Sidebar({ onNavigate }: SidebarProps) {
	return (
		<nav className="flex flex-col gap-1 p-3">
			{navItems.map((item) => (
				<NavLink
					key={item.to}
					to={item.to}
					end
					onClick={onNavigate}
					className={({ isActive }) =>
						cn(
							"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
							isActive
								? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
								: "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
						)
					}
				>
					<span className="text-base">{item.icon}</span>
					{item.label}
				</NavLink>
			))}
		</nav>
	);
}
