import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PipelineSteps, pipelineDuration, relativeTime } from "@/components/admin/pipeline-steps";
import {
	INTERVAL_PRESETS,
	InfoRow,
	intervalBadgeVariant,
	intervalLabel,
} from "@/pages/admin/admin-sources-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
	useDeleteDocument,
	useDocumentChunks,
	useDocumentDetail,
	useReprocessDocument,
	useSourceActivity,
	useSourceDetail,
	useTriggerScrape,
	useUpdateSource,
} from "@/hooks/use-admin";
import { formatDate } from "@/lib/utils";

const DOC_PAGE_SIZE = 30;

function statusBadgeVariant(status: string): "success" | "danger" | "warning" | "info" | "default" {
	if (status === "indexed") return "success";
	if (status === "failed") return "danger";
	if (status === "pending") return "default";
	return "info";
}

export function AdminSourceDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const { data: source, isLoading: sourceLoading, error: sourceError, refetch: refetchSource } = useSourceDetail(id ?? null);
	const { updateSource, isLoading: saving } = useUpdateSource();
	const { trigger: triggerScrape, isLoading: triggeringScrape } = useTriggerScrape();

	// Document pagination
	const [docPage, setDocPage] = useState(1);
	const { data: activity, isLoading: activityLoading } = useSourceActivity(id ?? null, {
		limit: DOC_PAGE_SIZE,
		offset: (docPage - 1) * DOC_PAGE_SIZE,
		refreshInterval: 5000,
	});

	// Document detail sheet
	const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
	const [chunkPage, setChunkPage] = useState(1);
	const { data: docDetail, isLoading: docDetailLoading } = useDocumentDetail(selectedDocId);
	const { data: chunksData, isLoading: chunksLoading } = useDocumentChunks(selectedDocId, chunkPage);
	const { deleteDocument, isLoading: deleting } = useDeleteDocument();
	const { reprocess, isLoading: reprocessing } = useReprocessDocument();
	const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

	// Config form state
	const [label, setLabel] = useState("");
	const [url, setUrl] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [intervalMinutes, setIntervalMinutes] = useState(0);
	const [isCustomInterval, setIsCustomInterval] = useState(false);
	const [maxDocs, setMaxDocs] = useState("50");
	const [rateLimit, setRateLimit] = useState("2000");

	// Sync form state from source data
	useEffect(() => {
		if (!source) return;
		setLabel(source.label ?? "");
		setUrl(source.url);
		setIsActive(source.isActive);
		setIntervalMinutes(source.scrapeIntervalMinutes);
		setIsCustomInterval(
			!INTERVAL_PRESETS.some((p) => p.value !== "custom" && Number(p.value) === source.scrapeIntervalMinutes),
		);
		setMaxDocs(String(source.maxDocuments));
		setRateLimit(String(source.rateLimitMs));
	}, [source]);

	const docTotalPages = activity ? Math.ceil(activity.total / DOC_PAGE_SIZE) : 1;

	const handleIntervalChange = (value: string) => {
		if (value === "custom") {
			setIsCustomInterval(true);
		} else {
			setIsCustomInterval(false);
			setIntervalMinutes(Number(value));
		}
	};

	const currentPresetValue = isCustomInterval ? "custom" : String(intervalMinutes);

	const handleSave = async () => {
		if (!source) return;
		const result = await updateSource(source.id, {
			label: label || null,
			url,
			isActive,
			scrapeIntervalMinutes: intervalMinutes,
			maxDocuments: Number.parseInt(maxDocs, 10) || 50,
			rateLimitMs: Number.parseInt(rateLimit, 10) || 2000,
		});
		if (result) {
			toast.success("Källa sparad");
			refetchSource();
		} else {
			toast.error("Kunde inte spara");
		}
	};

	const handleScrape = async () => {
		if (!source) return;
		const ok = await triggerScrape(source.id);
		if (ok) {
			toast.success("Skrapning startad");
			// Refetch source after a delay to pick up lastError / lastScrapedAt
			setTimeout(refetchSource, 10000);
			setTimeout(refetchSource, 30000);
		} else {
			toast.error("Kunde inte starta skrapning");
		}
	};

	const handleDeleteDoc = async () => {
		if (!deleteDocId) return;
		const ok = await deleteDocument(deleteDocId);
		if (ok) {
			setDeleteDocId(null);
			if (selectedDocId === deleteDocId) setSelectedDocId(null);
		}
	};

	const handleReprocess = async (docId: string) => {
		const ok = await reprocess(docId);
		if (ok) toast.success("Dokument köat för ombearbetning");
	};

	if (sourceLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Spinner />
			</div>
		);
	}

	if (sourceError || !source) {
		return (
			<div className="p-6">
				<Button variant="ghost" size="sm" onClick={() => navigate("/admin/sources")}>
					<ArrowLeft className="h-4 w-4" />
					Tillbaka
				</Button>
				<p className="mt-4 text-muted-foreground">
					{sourceError ?? "Källan hittades inte"}
				</p>
			</div>
		);
	}

	const totalDocQueue = (activity?.queue.waiting ?? 0) + (activity?.queue.active ?? 0);
	const totalScrapeQueue = (activity?.scrapeQueue.waiting ?? 0) + (activity?.scrapeQueue.active ?? 0);

	return (
		<div className="space-y-6 p-6">
			{/* Error banner */}
			{source.lastError && (
				<div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
					<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
					<div>
						<p className="text-sm font-medium text-destructive">Skrapningsfel</p>
						<p className="text-sm text-destructive/80">{source.lastError}</p>
					</div>
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="sm" onClick={() => navigate("/admin/sources")}>
						<ArrowLeft className="h-4 w-4" />
						Tillbaka
					</Button>
					<h2 className="text-xl font-bold text-foreground">
						{source.label ?? source.source}
					</h2>
					{!source.isActive && (
						<Badge variant="default">Inaktiv</Badge>
					)}
					<Badge variant={intervalBadgeVariant(source.scrapeIntervalMinutes)}>
						{intervalLabel(source.scrapeIntervalMinutes)}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Button size="sm" onClick={handleSave} disabled={saving}>
						{saving && <Loader2 className="animate-spin" />}
						Spara
					</Button>
					{source.source !== "manual" && (
						<Button size="sm" variant="secondary" onClick={handleScrape} disabled={triggeringScrape}>
							{triggeringScrape && <Loader2 className="animate-spin" />}
							Skrapa nu
						</Button>
					)}
				</div>
			</div>

			{/* Config section */}
			<Card className="p-4">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div className="space-y-2">
						<Label>Etikett</Label>
						<Input
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							placeholder="Beskrivande namn"
						/>
					</div>
					<div className="space-y-2">
						<Label>URL</Label>
						<Input
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://..."
						/>
					</div>
					<div className="space-y-2">
						<Label>Intervall</Label>
						<Select value={currentPresetValue} onValueChange={handleIntervalChange}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{INTERVAL_PRESETS.map((p) => (
									<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{isCustomInterval && (
						<div className="space-y-2">
							<Label>Anpassat intervall (minuter)</Label>
							<Input
								type="number"
								min={1}
								max={525600}
								value={String(intervalMinutes)}
								onChange={(e) => setIntervalMinutes(Number(e.target.value) || 0)}
							/>
						</div>
					)}
					<div className="space-y-2">
						<Label>Max dokument</Label>
						<Input
							type="number"
							min={1}
							max={10000}
							value={maxDocs}
							onChange={(e) => setMaxDocs(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label>Fördröjning (ms)</Label>
						<Input
							type="number"
							min={100}
							max={60000}
							value={rateLimit}
							onChange={(e) => setRateLimit(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label>Aktiv</Label>
						<div>
							<button
								type="button"
								onClick={() => setIsActive(!isActive)}
								className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
									isActive ? "bg-primary" : "bg-input"
								}`}
							>
								<span
									className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
										isActive ? "translate-x-5" : "translate-x-0"
									}`}
								/>
							</button>
						</div>
					</div>
				</div>

				{/* Read-only info */}
				<div className="mt-4 grid gap-x-8 gap-y-1 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
					<InfoRow label="Typ" value={source.source} />
					<InfoRow label="Status" value={source.status} />
					<InfoRow label="Dokument" value={String(source.documentCount)} />
					<InfoRow label="Skapad" value={source.createdAt ? formatDate(source.createdAt) : "-"} />
					<InfoRow label="Senast scrapad" value={source.lastScrapedAt ? formatDate(source.lastScrapedAt) : "-"} />
				</div>
			</Card>

			{/* Queue summary cards */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<Card className="!p-3">
					<h3 className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
						Dokumentkö
					</h3>
					<span className="text-lg font-bold text-foreground">{totalDocQueue}</span>
					<span className="ml-1.5 text-xs text-muted-foreground">
						{activity?.queue.waiting ?? 0} väntar / {activity?.queue.active ?? 0} aktiva
					</span>
				</Card>
				<Card className="!p-3">
					<h3 className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
						Skrapningskö
					</h3>
					<span className="text-lg font-bold text-foreground">{totalScrapeQueue}</span>
					<span className="ml-1.5 text-xs text-muted-foreground">
						{activity?.scrapeQueue.waiting ?? 0} väntar / {activity?.scrapeQueue.active ?? 0} aktiva
					</span>
				</Card>
				<Card className="!p-3">
					<h3 className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
						Totalt dokument
					</h3>
					<span className="text-lg font-bold text-foreground">{activity?.total ?? source.documentCount}</span>
				</Card>
				<Card className="!p-3">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
						Auto-uppdatering var 5:e sekund
					</div>
				</Card>
			</div>

			{/* Document table */}
			<div>
				<h3 className="mb-3 text-lg font-semibold text-foreground">Dokument</h3>
				{activityLoading && !activity ? (
					<div className="flex h-32 items-center justify-center">
						<Spinner />
					</div>
				) : (
					<Card className="overflow-x-auto p-0">
						<table className="w-full text-left text-sm">
							<thead className="border-b bg-muted/50">
								<tr>
									<th className="px-4 py-3 font-medium text-muted-foreground">Titel</th>
									<th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
									<th className="px-4 py-3 font-medium text-muted-foreground">Tid</th>
									<th className="px-4 py-3 font-medium text-muted-foreground">Käll-URL</th>
								</tr>
							</thead>
							<tbody>
								{activity?.documents.map((doc) => (
									<tr
										key={doc.id}
										className="cursor-pointer border-b border-border hover:bg-muted/50"
										onClick={() => {
											setSelectedDocId(doc.id);
											setChunkPage(1);
										}}
									>
										<td className="max-w-xs truncate px-4 py-3 text-foreground">
											{doc.title}
										</td>
										<td className="px-4 py-3">
											{doc.status === "failed" ? (
												<Badge variant="danger">Misslyckad</Badge>
											) : doc.status === "indexed" ? (
												<Badge variant="success">Klar</Badge>
											) : (
												<div className="scale-75 origin-left">
													<PipelineSteps status={doc.status} />
												</div>
											)}
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
											<div>{relativeTime(doc.updatedAt)}</div>
											{(doc.status === "indexed" || doc.status === "failed") &&
												pipelineDuration(doc.createdAt, doc.updatedAt) && (
													<div className="text-[10px]">
														{pipelineDuration(doc.createdAt, doc.updatedAt)}
													</div>
												)}
										</td>
										<td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground">
											{doc.sourceUrl ?? "-"}
										</td>
									</tr>
								))}
								{activity?.documents.length === 0 && (
									<tr>
										<td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
											Inga dokument för denna källa
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</Card>
				)}

				<div className="mt-3">
					<Pagination page={docPage} totalPages={docTotalPages} onPageChange={setDocPage} />
				</div>
			</div>

			{/* Document Detail Sheet */}
			<Sheet open={!!selectedDocId} onOpenChange={(isOpen) => !isOpen && setSelectedDocId(null)}>
				<SheetContent side="right" className="w-full max-w-lg overflow-auto">
					<SheetHeader>
						<SheetTitle>Dokumentdetaljer</SheetTitle>
					</SheetHeader>
					{docDetailLoading ? (
						<div className="flex h-32 items-center justify-center">
							<Spinner />
						</div>
					) : docDetail ? (
						<div className="space-y-4">
							<div>
								<p className="text-xs font-medium text-muted-foreground">Titel</p>
								<p className="text-sm text-foreground">{docDetail.title}</p>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-xs font-medium text-muted-foreground">Källa</p>
									<p className="text-sm">{docDetail.source}</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Status</p>
									<Badge variant={statusBadgeVariant(docDetail.status)}>{docDetail.status}</Badge>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Chunks</p>
									<p className="text-sm">{docDetail.chunkCount}</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Skapad</p>
									<p className="text-sm">{formatDate(docDetail.createdAt)}</p>
								</div>
								{docDetail.docType && (
									<div>
										<p className="text-xs font-medium text-muted-foreground">Dokumenttyp</p>
										<p className="text-sm">{docDetail.docType}</p>
									</div>
								)}
								{docDetail.audience && (
									<div>
										<p className="text-xs font-medium text-muted-foreground">Målgrupp</p>
										<p className="text-sm">{docDetail.audience}</p>
									</div>
								)}
								{docDetail.taxArea && (
									<div>
										<p className="text-xs font-medium text-muted-foreground">Skatteområde</p>
										<p className="text-sm">{docDetail.taxArea}</p>
									</div>
								)}
								<div>
									<p className="text-xs font-medium text-muted-foreground">Uppdateringspolicy</p>
									<p className="text-sm">{docDetail.refreshPolicy}</p>
								</div>
							</div>
							{docDetail.errorMessage && (
								<div>
									<p className="text-xs font-medium text-destructive">Felmeddelande</p>
									<p className="text-sm text-destructive">{docDetail.errorMessage}</p>
								</div>
							)}
							{docDetail.sourceUrl && (
								<div>
									<p className="text-xs font-medium text-muted-foreground">Käll-URL</p>
									<a
										href={docDetail.sourceUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="truncate text-sm text-primary hover:underline"
									>
										{docDetail.sourceUrl}
									</a>
								</div>
							)}

							{/* Pipeline visualization for non-terminal states */}
							{docDetail.status !== "indexed" && docDetail.status !== "failed" && (
								<div className="border-t border-border pt-4">
									<PipelineSteps status={docDetail.status} />
								</div>
							)}

							{/* Actions */}
							<div className="flex gap-2 border-t border-border pt-4">
								<Button
									size="sm"
									variant="secondary"
									onClick={() => selectedDocId && handleReprocess(selectedDocId)}
									disabled={reprocessing}
								>
									{reprocessing && <Loader2 className="animate-spin" />}
									Bearbeta om
								</Button>
								<Button
									size="sm"
									variant="destructive"
									onClick={() => selectedDocId && setDeleteDocId(selectedDocId)}
								>
									Ta bort
								</Button>
							</div>

							{/* Chunks */}
							<div className="border-t border-border pt-4">
								<h3 className="mb-2 text-sm font-semibold text-foreground">
									Chunks ({chunksData?.total ?? 0})
								</h3>
								{chunksLoading ? (
									<Spinner size="sm" />
								) : (
									<div className="space-y-2">
										{chunksData?.chunks.map((chunk) => (
											<div
												key={chunk.id}
												className="rounded-lg border border-border p-3"
											>
												<p className="mb-1 text-xs text-muted-foreground">#{chunk.chunkIndex}</p>
												<p className="line-clamp-4 text-xs text-foreground">
													{chunk.content}
												</p>
											</div>
										))}
									</div>
								)}
								{chunksData && (
									<div className="mt-2">
										<Pagination
											page={chunkPage}
											totalPages={Math.ceil(chunksData.total / 20)}
											onPageChange={setChunkPage}
										/>
									</div>
								)}
							</div>
						</div>
					) : null}
				</SheetContent>
			</Sheet>

			{/* Delete Document Dialog */}
			<Dialog open={!!deleteDocId} onOpenChange={(isOpen) => !isOpen && setDeleteDocId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ta bort dokument</DialogTitle>
						<DialogDescription>
							Är du säker? Dokumentet och alla dess chunks tas bort permanent, inklusive vektorer i Qdrant.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteDocId(null)}>Avbryt</Button>
						<Button variant="destructive" onClick={handleDeleteDoc} disabled={deleting}>
							{deleting && <Loader2 className="animate-spin" />}
							Ta bort
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
