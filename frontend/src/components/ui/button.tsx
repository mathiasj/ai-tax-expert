import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "ghost" | "danger";
	size?: "sm" | "md" | "lg";
	isLoading?: boolean;
}

const variants = {
	primary:
		"bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 disabled:bg-blue-400",
	secondary:
		"bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 focus-visible:ring-gray-500",
	ghost:
		"text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 focus-visible:ring-gray-500",
	danger:
		"bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-400",
};

const buttonSizes = {
	sm: "px-3 py-1.5 text-sm",
	md: "px-4 py-2 text-sm",
	lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
		return (
			<button
				ref={ref}
				className={cn(
					"inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed",
					variants[variant],
					buttonSizes[size],
					className,
				)}
				disabled={disabled || isLoading}
				{...props}
			>
				{isLoading && <Spinner size="sm" className="text-current" />}
				{children}
			</button>
		);
	},
);

Button.displayName = "Button";
