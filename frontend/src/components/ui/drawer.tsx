import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DrawerProps {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
	className?: string;
}

export function Drawer({ open, onClose, title, children, className }: DrawerProps) {
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open, onClose]);

	return (
		<>
			{/* Backdrop */}
			{open && (
				<div
					className="fixed inset-0 z-40 bg-black/50"
					onClick={onClose}
					onKeyDown={() => {}}
					role="presentation"
				/>
			)}

			{/* Panel */}
			<div
				className={cn(
					"fixed inset-y-0 right-0 z-50 w-full max-w-lg transform border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 dark:border-gray-700 dark:bg-gray-900",
					open ? "translate-x-0" : "translate-x-full",
					className,
				)}
			>
				<div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800"
					>
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div className="h-[calc(100%-3.5rem)] overflow-auto p-4">{children}</div>
			</div>
		</>
	);
}
