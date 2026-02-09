import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DialogProps {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm?: () => void;
	variant?: "default" | "danger";
	isLoading?: boolean;
}

export function Dialog({
	open,
	onClose,
	title,
	description,
	children,
	confirmLabel = "Bekräfta",
	cancelLabel = "Avbryt",
	onConfirm,
	variant = "default",
	isLoading,
}: DialogProps) {
	const dialogRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="fixed inset-0 bg-black/50"
				onClick={onClose}
				onKeyDown={() => {}}
				role="presentation"
			/>
			<div
				ref={dialogRef}
				className={cn(
					"relative z-50 w-full max-w-md rounded-xl border bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900",
				)}
				role="dialog"
				aria-modal="true"
				aria-labelledby="dialog-title"
			>
				<h2 id="dialog-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
					{title}
				</h2>
				{description && (
					<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
				)}
				{children && <div className="mt-4">{children}</div>}
				{onConfirm && (
					<div className="mt-6 flex justify-end gap-3">
						<Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
							{cancelLabel}
						</Button>
						<Button
							variant={variant === "danger" ? "danger" : "primary"}
							size="sm"
							onClick={onConfirm}
							isLoading={isLoading}
						>
							{confirmLabel}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
