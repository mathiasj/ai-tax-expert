import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SourceCitation } from "@/types/api";
import { useFeedback } from "@/hooks/use-feedback";
import { cn } from "@/lib/utils";
import { CitationBadge } from "./citation-badge";
import { CitationList } from "./citation-list";

interface AssistantMessageProps {
	content: string;
	citations: SourceCitation[];
	showCitationList?: boolean;
	queryId?: string;
}

function replaceCitations(text: string, citations: SourceCitation[]): string {
	return text.replace(/\[Källa (\d+)\]/g, (_match, num) => {
		const idx = Number.parseInt(num, 10) - 1;
		if (idx >= 0 && idx < citations.length) {
			return `<citation-${idx}>`;
		}
		return _match;
	});
}

function FeedbackButtons({ queryId }: { queryId: string }) {
	const { submitFeedback } = useFeedback();
	const [submitted, setSubmitted] = useState<1 | -1 | null>(null);

	const handleFeedback = async (rating: 1 | -1) => {
		const ok = await submitFeedback(queryId, rating);
		if (ok) setSubmitted(rating);
	};

	if (submitted) {
		return (
			<div className="mt-2 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
				{submitted === 1 ? "👍" : "👎"} Tack för din feedback
			</div>
		);
	}

	return (
		<div className="mt-2 flex items-center gap-1">
			<button
				type="button"
				onClick={() => handleFeedback(1)}
				className={cn(
					"rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-green-600 dark:hover:bg-gray-800 dark:hover:text-green-400",
				)}
				title="Bra svar"
			>
				<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
				</svg>
			</button>
			<button
				type="button"
				onClick={() => handleFeedback(-1)}
				className={cn(
					"rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400",
				)}
				title="Dåligt svar"
			>
				<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.31-.269 2.56-.754 3.69-.162.376.167.79.578.79h.908c.889 0 1.713-.518 1.972-1.368a12 12 0 0 0 .521-3.507c0-1.553-.295-3.036-.831-4.398-.306-.774-1.086-1.227-1.918-1.227h-1.053c-.472 0-.745.556-.5.96.638 1.052 1.052 2.27 1.052 3.558" />
				</svg>
			</button>
		</div>
	);
}

export function AssistantMessage({ content, citations, showCitationList = true, queryId }: AssistantMessageProps) {
	const processed = replaceCitations(content, citations);

	return (
		<div>
			<div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-4">
				<ReactMarkdown
					remarkPlugins={[remarkGfm]}
					components={{
						p: ({ children }) => {
							const processed = processChildren(children, citations);
							return <p>{processed}</p>;
						},
					}}
				>
					{processed}
				</ReactMarkdown>
			</div>
			{showCitationList && <CitationList citations={citations} />}
			{queryId && <FeedbackButtons queryId={queryId} />}
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
