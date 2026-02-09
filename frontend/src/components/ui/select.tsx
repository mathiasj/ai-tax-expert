import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
	label?: string;
	error?: string;
	options: { value: string; label: string }[];
	placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
	({ className, label, error, id, options, placeholder, ...props }, ref) => {
		return (
			<div className="space-y-1">
				{label && (
					<label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
						{label}
					</label>
				)}
				<select
					ref={ref}
					id={id}
					className={cn(
						"w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-blue-400",
						error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
						className,
					)}
					{...props}
				>
					{placeholder && (
						<option value="">{placeholder}</option>
					)}
					{options.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
				{error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
			</div>
		);
	},
);

Select.displayName = "Select";
