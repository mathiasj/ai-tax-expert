import { cn } from "@/lib/utils";

const SOURCES = [
	{ id: "skatteverket", label: "Skatteverket" },
	{ id: "lagrummet", label: "Lagrummet" },
	{ id: "riksdagen", label: "Riksdagen" },
] as const;

interface SourceFilterProps {
	selected: string[];
	onChange: (sources: string[]) => void;
}

export function SourceFilter({ selected, onChange }: SourceFilterProps) {
	function toggle(sourceId: string) {
		if (selected.includes(sourceId)) {
			onChange(selected.filter((s) => s !== sourceId));
		} else {
			onChange([...selected, sourceId]);
		}
	}

	return (
		<div className="flex items-center gap-2">
			<span className="text-xs text-gray-500 dark:text-gray-400">Filter:</span>
			{SOURCES.map((source) => {
				const active = selected.includes(source.id);
				return (
					<button
						key={source.id}
						type="button"
						onClick={() => toggle(source.id)}
						className={cn(
							"rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
							active
								? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
								: "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
						)}
					>
						{source.label}
					</button>
				);
			})}
		</div>
	);
}
