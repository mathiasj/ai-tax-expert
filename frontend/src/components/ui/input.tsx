import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, label, error, id, ...props }, ref) => {
		return (
			<div className="space-y-1">
				{label && (
					<label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
						{label}
					</label>
				)}
				<input
					ref={ref}
					id={id}
					className={cn(
						"w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500 dark:focus:border-blue-400",
						error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
						className,
					)}
					{...props}
				/>
				{error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
			</div>
		);
	},
);

Input.displayName = "Input";
