import type { Theme } from "@/types/app";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
	theme: Theme;
	onChange: (theme: Theme) => void;
}

const options: { value: Theme; label: string }[] = [
	{ value: "light", label: "Ljust" },
	{ value: "dark", label: "Mörkt" },
	{ value: "system", label: "System" },
];

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
	return (
		<div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
			{options.map((opt) => (
				<button
					key={opt.value}
					type="button"
					onClick={() => onChange(opt.value)}
					className={cn(
						"rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
						theme === opt.value
							? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
							: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
					)}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}
