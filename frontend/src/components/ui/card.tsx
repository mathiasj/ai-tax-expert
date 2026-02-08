import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
	return (
		<div
			className={cn(
				"rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}
