import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
	useAdminDocuments,
	useDeleteDocument,
	useDocumentChunks,
	useDocumentDetail,
	useReprocessDocument,
} from "@/hooks/use-admin";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 30;

const sourceOptions = [
	{ value: "skatteverket", label: "Skatteverket" },
	{ value: "lagrummet", label: "Lagrummet" },
	{ value: "riksdagen", label: "Riksdagen" },
	{ value: "manual", label: "Manual" },
];

const statusOptions = [
	{ value: "pending", label: "Väntande" },
	{ value: "downloading", label: "Laddar ned" },
	{ value: "parsing", label: "Parsas" },
	{ value: "chunking", label: "Chunkas" },
	{ value: "embedding", label: "Embeddings" },
	{ value: "indexed", label: "Indexerad" },
	{ value: "failed", label: "Misslyckad" },
];

function statusBadgeVariant(status: string): "success" | "danger" | "warning" | "info" | "default" {
	if (status === "indexed") return "success";
	if (status === "failed") return "danger";
	if (status === "pending") return "default";
	return "info";
}

export function AdminDocumentsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [search, setSearch] = useState(searchParams.get("search") ?? "");
	const [source, setSource] = useState(searchParams.get("source") ?? "");
	const [status, setStatus] = useState(searchParams.get("status") ?? "");
	const [page, setPage] = useState(1);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [chunkPage, setChunkPage] = useState(1);

	const { data, isLoading, refetch } = useAdminDocuments({
		search: search || undefined,
		source: source || undefined,
		status: status || undefined,
		limit: PAGE_SIZE,
		offset: (page - 1) * PAGE_SIZE,
	});

	const { data: detail, isLoading: detailLoading } = useDocumentDetail(selectedId);
	const { data: chunksData, isLoading: chunksLoading } = useDocumentChunks(selectedId, chunkPage);
	const { deleteDocument, isLoading: deleting } = useDeleteDocument();
	const { reprocess, isLoading: reprocessing } = useReprocessDocument();

	const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

	const handleSearch = () => {
		setPage(1);
		const params = new URLSearchParams();
		if (search) params.set("search", search);
		if (source) params.set("source", source);
		if (status) params.set("status", status);
		setSearchParams(params);
	};

	const handleDelete = async () => {
		if (!deleteId) return;
		const ok = await deleteDocument(deleteId);
		if (ok) {
			setDeleteId(null);
			refetch();
		}
	};

	const handleReprocess = async (id: string) => {
		const ok = await reprocess(id);
		if (ok) refetch();
	};

	return (
		<div className="space-y-4 p-6">
			<h2 className="text-xl font-bold text-foreground">Dokument</h2>

			{/* Filters */}
			<Card className="flex flex-wrap items-end gap-3 p-4">
				<div className="flex-1" style={{ minWidth: "200px" }}>
					<Input
						placeholder="Sök titel..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
					/>
				</div>
				<div style={{ minWidth: "150px" }}>
					<Select value={source || "_all"} onValueChange={(v) => setSource(v === "_all" ? "" : v)}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Alla källor" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="_all">Alla källor</SelectItem>
							{sourceOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div style={{ minWidth: "150px" }}>
					<Select value={status || "_all"} onValueChange={(v) => setStatus(v === "_all" ? "" : v)}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Alla statusar" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="_all">Alla statusar</SelectItem>
							{statusOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Button size="sm" onClick={handleSearch}>
					Sök
				</Button>
			</Card>

			{/* Table */}
			{isLoading ? (
				<div className="flex h-32 items-center justify-center">
					<Spinner />
				</div>
			) : (
				<Card className="overflow-x-auto p-0">
					<table className="w-full text-left text-sm">
						<thead className="border-b bg-muted/50">
							<tr>
								<th className="px-4 py-3 font-medium text-muted-foreground">Titel</th>
								<th className="px-4 py-3 font-medium text-muted-foreground">Källa</th>
								<th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
								<th className="px-4 py-3 font-medium text-muted-foreground">Chunks</th>
								<th className="px-4 py-3 font-medium text-muted-foreground">Skapad</th>
								<th className="px-4 py-3 font-medium text-muted-foreground">Åtgärder</th>
							</tr>
						</thead>
						<tbody>
							{data?.documents.map((doc) => (
								<tr
									key={doc.id}
									className={`border-b border-border ${
										(doc as any).supersededById
											? "opacity-60"
											: "hover:bg-muted/50"
									}`}
								>
									<td className="max-w-xs truncate px-4 py-3 text-foreground">
										{doc.title}
										{(doc as any).supersededById && (
											<Badge variant="warning" className="ml-2">Ersatt</Badge>
										)}
									</td>
									<td className="px-4 py-3 text-muted-foreground">{doc.source}</td>
									<td className="px-4 py-3">
										<Badge variant={statusBadgeVariant(doc.status)}>{doc.status}</Badge>
									</td>
									<td className="px-4 py-3 text-muted-foreground">
										{(doc as any).chunkCount ?? "-"}
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
										{formatDate(doc.createdAt)}
									</td>
									<td className="px-4 py-3">
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													setSelectedId(doc.id);
													setChunkPage(1);
												}}
											>
												Visa
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleReprocess(doc.id)}
												disabled={reprocessing}
											>
												Försök igen
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setDeleteId(doc.id)}
												className="text-destructive"
											>
												Ta bort
											</Button>
										</div>
									</td>
								</tr>
							))}
							{data?.documents.length === 0 && (
								<tr>
									<td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
										Inga dokument hittades
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</Card>
			)}

			<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

			{/* Detail Sheet (was Drawer) */}
			<Sheet open={!!selectedId} onOpenChange={(isOpen) => !isOpen && setSelectedId(null)}>
				<SheetContent side="right" className="w-full max-w-lg overflow-auto">
					<SheetHeader>
						<SheetTitle>Dokumentdetaljer</SheetTitle>
					</SheetHeader>
					{detailLoading ? (
						<div className="flex h-32 items-center justify-center">
							<Spinner />
						</div>
					) : detail ? (
						<div className="space-y-4">
							<div>
								<p className="text-xs font-medium text-muted-foreground">Titel</p>
								<p className="text-sm text-foreground">{detail.title}</p>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-xs font-medium text-muted-foreground">Källa</p>
									<p className="text-sm">{detail.source}</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Status</p>
									<Badge variant={statusBadgeVariant(detail.status)}>{detail.status}</Badge>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Chunks</p>
									<p className="text-sm">{detail.chunkCount}</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Skapad</p>
									<p className="text-sm">{formatDate(detail.createdAt)}</p>
								</div>
								{detail.docType && (
									<div>
										<p className="text-xs font-medium text-muted-foreground">Dokumenttyp</p>
										<p className="text-sm">{detail.docType}</p>
									</div>
								)}
								{detail.audience && (
									<div>
										<p className="text-xs font-medium text-muted-foreground">Målgrupp</p>
										<p className="text-sm">{detail.audience}</p>
									</div>
								)}
								{detail.taxArea && (
									<div>
										<p className="text-xs font-medium text-muted-foreground">Skatteområde</p>
										<p className="text-sm">{detail.taxArea}</p>
									</div>
								)}
								<div>
									<p className="text-xs font-medium text-muted-foreground">Uppdateringspolicy</p>
									<p className="text-sm">{detail.refreshPolicy}</p>
								</div>
								{detail.lastCheckedAt && (
									<div>
										<p className="text-xs font-medium text-muted-foreground">Senast kontrollerad</p>
										<p className="text-sm">{formatDate(detail.lastCheckedAt)}</p>
									</div>
								)}
							</div>
							{detail.errorMessage && (
								<div>
									<p className="text-xs font-medium text-destructive">Felmeddelande</p>
									<p className="text-sm text-destructive">{detail.errorMessage}</p>
								</div>
							)}
							{detail.supersededNote && (
								<div>
									<p className="text-xs font-medium text-amber-500">Ersatt</p>
									<p className="text-sm text-amber-700 dark:text-amber-400">{detail.supersededNote}</p>
								</div>
							)}
							{detail.sourceUrl && (
								<div>
									<p className="text-xs font-medium text-muted-foreground">Käll-URL</p>
									<p className="truncate text-sm text-primary">{detail.sourceUrl}</p>
								</div>
							)}

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

			{/* Delete Dialog */}
			<Dialog open={!!deleteId} onOpenChange={(isOpen) => !isOpen && setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ta bort dokument</DialogTitle>
						<DialogDescription>
							Är du säker? Dokumentet och alla dess chunks tas bort permanent, inklusive vektorer i Qdrant.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteId(null)}>Avbryt</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
							{deleting && <Loader2 className="animate-spin" />}
							Ta bort
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
