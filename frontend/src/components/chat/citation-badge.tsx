import type { SourceCitation } from "@/types/api";

interface CitationBadgeProps {
	index: number;
	citation: SourceCitation;
}

export function CitationBadge({ index, citation }: CitationBadgeProps) {
	const url = citation.sourceUrl;
	const Tag = url ? "a" : "span";
	const linkProps = url ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {};

	return (
		<Tag
			{...linkProps}
			className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 cursor-pointer"
			title={citation.title}
		>
			Källa {index + 1}
		</Tag>
	);
}
