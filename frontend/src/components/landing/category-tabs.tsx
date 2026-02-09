import { cn } from "@/lib/utils";

export type Category = "privat" | "foretag";

interface CategoryTabsProps {
	active: Category;
	onChange: (tab: Category) => void;
}

const tabs: { value: Category; label: string }[] = [
	{ value: "privat", label: "Privat" },
	{ value: "foretag", label: "Företag" },
];

export function CategoryTabs({ active, onChange }: CategoryTabsProps) {
	return (
		<div className="flex justify-center gap-2">
			{tabs.map((tab) => (
				<button
					key={tab.value}
					type="button"
					onClick={() => onChange(tab.value)}
					className={cn(
						"rounded-full px-5 py-1.5 text-sm font-medium transition-colors",
						active === tab.value
							? "bg-blue-600 text-white"
							: "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
					)}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}
