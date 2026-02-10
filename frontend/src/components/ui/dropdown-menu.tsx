import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
	trigger?: ReactNode;
	children: ReactNode;
	align?: "left" | "right";
}

export function DropdownMenu({ trigger, children, align = "right" }: DropdownMenuProps) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	return (
		<div ref={ref} className="relative inline-block">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
			>
				{trigger ?? (
					<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
						<circle cx="10" cy="4" r="1.5" />
						<circle cx="10" cy="10" r="1.5" />
						<circle cx="10" cy="16" r="1.5" />
					</svg>
				)}
			</button>
			{open && (
				<div
					className={cn(
						"absolute z-50 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900",
						align === "right" ? "right-0" : "left-0",
					)}
				>
					{children}
				</div>
			)}
		</div>
	);
}

interface DropdownItemProps {
	children: ReactNode;
	onClick?: () => void;
	variant?: "default" | "danger";
	disabled?: boolean;
}

export function DropdownItem({ children, onClick, variant = "default", disabled }: DropdownItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
				variant === "danger"
					? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
					: "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
			)}
		>
			{children}
		</button>
	);
}
