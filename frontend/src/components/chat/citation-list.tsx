import type { SourceCitation } from "@/types/api";

interface CitationListProps {
	citations: SourceCitation[];
}

export function CitationList({ citations }: CitationListProps) {
	if (citations.length === 0) return null;

	return (
		<div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
			<p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Källor</p>
			<div className="space-y-1">
				{citations.map((c, i) => (
					<div key={c.chunkId} className="flex items-start gap-2 text-xs">
						<span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
							{i + 1}
						</span>
						<div className="min-w-0">
							{c.sourceUrl ? (
								<a
									href={c.sourceUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:underline dark:text-blue-400"
								>
									{c.title}
								</a>
							) : (
								<span className="text-gray-700 dark:text-gray-300">{c.title}</span>
							)}
							{c.section && (
								<span className="text-gray-400 dark:text-gray-500"> - {c.section}</span>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
