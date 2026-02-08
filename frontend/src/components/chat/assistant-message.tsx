import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SourceCitation } from "@/types/api";
import { CitationBadge } from "./citation-badge";
import { CitationList } from "./citation-list";

interface AssistantMessageProps {
	content: string;
	citations: SourceCitation[];
}

function replaceCitations(text: string, citations: SourceCitation[]): string {
	// Replace [Källa N] markers with a placeholder that won't break markdown
	return text.replace(/\[Källa (\d+)\]/g, (_match, num) => {
		const idx = Number.parseInt(num, 10) - 1;
		if (idx >= 0 && idx < citations.length) {
			return `<citation-${idx}>`;
		}
		return _match;
	});
}

export function AssistantMessage({ content, citations }: AssistantMessageProps) {
	const processed = replaceCitations(content, citations);

	return (
		<div>
			<div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-4">
				<ReactMarkdown
					remarkPlugins={[remarkGfm]}
					components={{
						p: ({ children }) => {
							// Replace citation placeholders within text nodes
							const processed = processChildren(children, citations);
							return <p>{processed}</p>;
						},
					}}
				>
					{processed}
				</ReactMarkdown>
			</div>
			<CitationList citations={citations} />
		</div>
	);
}

function processChildren(
	children: React.ReactNode,
	citations: SourceCitation[],
): React.ReactNode {
	if (!Array.isArray(children)) {
		if (typeof children === "string") {
			return processTextNode(children, citations);
		}
		return children;
	}

	return children.map((child, i) => {
		if (typeof child === "string") {
			return <span key={i}>{processTextNode(child, citations)}</span>;
		}
		return child;
	});
}

function processTextNode(text: string, citations: SourceCitation[]): React.ReactNode {
	const parts = text.split(/(<citation-\d+>)/);
	if (parts.length === 1) return text;

	return parts.map((part, i) => {
		const match = part.match(/^<citation-(\d+)>$/);
		if (match) {
			const idx = Number.parseInt(match[1]!, 10);
			const citation = citations[idx];
			if (citation) {
				return <CitationBadge key={i} index={idx} citation={citation} />;
			}
		}
		return part;
	});
}
