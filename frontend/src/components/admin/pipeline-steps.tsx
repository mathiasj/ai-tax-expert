import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityDocument } from "@/types/api";

const PIPELINE_STEPS = ["pending", "parsing", "chunking", "embedding", "indexed"] as const;

const STEP_LABELS: Record<string, string> = {
	pending: "Väntar",
	parsing: "Tolkar",
	chunking: "Delar",
	embedding: "Bäddar in",
	indexed: "Klar",
};

function stepIndex(status: string): number {
	const idx = PIPELINE_STEPS.indexOf(status as (typeof PIPELINE_STEPS)[number]);
	return idx === -1 ? -1 : idx;
}

export function relativeTime(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const seconds = Math.floor(diff / 1000);
	if (seconds < 5) return "just nu";
	if (seconds < 60) return `${seconds}s sedan`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} min sedan`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h sedan`;
	const days = Math.floor(hours / 24);
	return `${days}d sedan`;
}

export function pipelineDuration(createdAt: string, updatedAt: string): string | null {
	const start = new Date(createdAt).getTime();
	const end = new Date(updatedAt).getTime();
	const diffMs = end - start;
	if (diffMs < 0) return null;
	if (diffMs < 1000) return `${diffMs}ms`;
	const seconds = Math.floor(diffMs / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainSec = seconds % 60;
	return `${minutes}m ${remainSec}s`;
}

export function sourceBadgeVariant(source: string): "default" | "success" | "warning" | "danger" | "info" {
	switch (source) {
		case "skatteverket":
			return "info";
		case "riksdagen":
			return "success";
		case "lagrummet":
			return "warning";
		default:
			return "default";
	}
}

export function PipelineSteps({ status }: { status: string }) {
	const isFailed = status === "failed";
	const current = isFailed ? -1 : stepIndex(status);

	return (
		<div className="flex items-center gap-1">
			{PIPELINE_STEPS.map((step, i) => {
				const isCompleted = !isFailed && current > i;
				const isActive = !isFailed && current === i;
				const isFinal = step === "indexed" && isActive;

				return (
					<div key={step} className="flex items-center gap-1">
						<div className="flex flex-col items-center">
							<div
								className={cn(
									"flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all",
									isFinal
										? "bg-green-500 text-white"
										: isActive
											? "bg-blue-500 text-white animate-pulse"
											: isCompleted
												? "bg-blue-500/80 text-white"
												: "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500",
								)}
							>
								{isCompleted || isFinal ? "\u2713" : i + 1}
							</div>
							<span
								className={cn(
									"mt-0.5 text-[9px] leading-tight",
									isActive
										? "font-semibold text-blue-600 dark:text-blue-400"
										: isFinal
											? "font-semibold text-green-600 dark:text-green-400"
											: "text-gray-400 dark:text-gray-500",
								)}
							>
								{STEP_LABELS[step]}
							</span>
						</div>
						{i < PIPELINE_STEPS.length - 1 && (
							<div
								className={cn(
									"mb-4 h-0.5 w-3",
									isCompleted
										? "bg-blue-500/60"
										: "bg-gray-200 dark:bg-gray-700",
								)}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

export function DocumentRow({ doc }: { doc: ActivityDocument }) {
	const isFailed = doc.status === "failed";

	return (
		<div
			className={cn(
				"flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between",
				isFailed
					? "border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20"
					: "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900",
			)}
		>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex items-center gap-2">
					<span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
						{doc.title}
					</span>
					<Badge variant={sourceBadgeVariant(doc.source)}>{doc.source}</Badge>
				</div>

				{isFailed ? (
					<div className="flex items-center gap-2">
						<Badge variant="danger">Misslyckad</Badge>
						{doc.errorMessage && (
							<span className="truncate text-xs text-red-600 dark:text-red-400">
								{doc.errorMessage}
							</span>
						)}
					</div>
				) : (
					<PipelineSteps status={doc.status} />
				)}

				{doc.sourceUrl && (
					<a
						href={doc.sourceUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="block truncate text-xs text-blue-500 hover:text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
					>
						{doc.sourceUrl}
					</a>
				)}
			</div>

			<div className="shrink-0 text-right space-y-0.5">
				<span className="text-xs text-gray-400 dark:text-gray-500">
					{relativeTime(doc.updatedAt)}
				</span>
				{(doc.status === "indexed" || isFailed) && pipelineDuration(doc.createdAt, doc.updatedAt) && (
					<div className="text-[10px] text-gray-400 dark:text-gray-500">
						{pipelineDuration(doc.createdAt, doc.updatedAt)}
					</div>
				)}
			</div>
		</div>
	);
}
