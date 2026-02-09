import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
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
			<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dokument</h2>

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
					<Select
						options={sourceOptions}
						placeholder="Alla källor"
						value={source}
						onChange={(e) => setSource(e.target.value)}
					/>
				</div>
				<div style={{ minWidth: "150px" }}>
					<Select
						options={statusOptions}
						placeholder="Alla statusar"
						value={status}
						onChange={(e) => setStatus(e.target.value)}
					/>
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
						<thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
							<tr>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Titel</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Källa</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Chunks</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Skapad</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Åtgärder</th>
							</tr>
						</thead>
						<tbody>
							{data?.documents.map((doc) => (
								<tr
									key={doc.id}
									className={`border-b border-gray-100 dark:border-gray-800 ${
										(doc as any).supersededById
											? "opacity-60"
											: "hover:bg-gray-50 dark:hover:bg-gray-800/30"
									}`}
								>
									<td className="max-w-xs truncate px-4 py-3 text-gray-900 dark:text-gray-100">
										{doc.title}
										{(doc as any).supersededById && (
											<Badge variant="warning" className="ml-2">Ersatt</Badge>
										)}
									</td>
									<td className="px-4 py-3 text-gray-600 dark:text-gray-400">{doc.source}</td>
									<td className="px-4 py-3">
										<Badge variant={statusBadgeVariant(doc.status)}>{doc.status}</Badge>
									</td>
									<td className="px-4 py-3 text-gray-600 dark:text-gray-400">
										{(doc as any).chunkCount ?? "-"}
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
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
												className="text-red-600 dark:text-red-400"
											>
												Ta bort
											</Button>
										</div>
									</td>
								</tr>
							))}
							{data?.documents.length === 0 && (
								<tr>
									<td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
										Inga dokument hittades
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</Card>
			)}

			<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

			{/* Detail Drawer */}
			<Drawer
				open={!!selectedId}
				onClose={() => setSelectedId(null)}
				title="Dokumentdetaljer"
			>
				{detailLoading ? (
					<div className="flex h-32 items-center justify-center">
						<Spinner />
					</div>
				) : detail ? (
					<div className="space-y-4">
						<div>
							<p className="text-xs font-medium text-gray-500 dark:text-gray-400">Titel</p>
							<p className="text-sm text-gray-900 dark:text-gray-100">{detail.title}</p>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400">Källa</p>
								<p className="text-sm">{detail.source}</p>
							</div>
							<div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</p>
								<Badge variant={statusBadgeVariant(detail.status)}>{detail.status}</Badge>
							</div>
							<div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400">Chunks</p>
								<p className="text-sm">{detail.chunkCount}</p>
							</div>
							<div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400">Skapad</p>
								<p className="text-sm">{formatDate(detail.createdAt)}</p>
							</div>
						</div>
						{detail.errorMessage && (
							<div>
								<p className="text-xs font-medium text-red-500">Felmeddelande</p>
								<p className="text-sm text-red-700 dark:text-red-400">{detail.errorMessage}</p>
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
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400">Käll-URL</p>
								<p className="truncate text-sm text-blue-600 dark:text-blue-400">{detail.sourceUrl}</p>
							</div>
						)}

						{/* Chunks */}
						<div className="border-t border-gray-200 pt-4 dark:border-gray-700">
							<h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
								Chunks ({chunksData?.total ?? 0})
							</h3>
							{chunksLoading ? (
								<Spinner size="sm" />
							) : (
								<div className="space-y-2">
									{chunksData?.chunks.map((chunk) => (
										<div
											key={chunk.id}
											className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
										>
											<p className="mb-1 text-xs text-gray-400">#{chunk.chunkIndex}</p>
											<p className="line-clamp-4 text-xs text-gray-700 dark:text-gray-300">
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
			</Drawer>

			{/* Delete Dialog */}
			<Dialog
				open={!!deleteId}
				onClose={() => setDeleteId(null)}
				title="Ta bort dokument"
				description="Är du säker? Dokumentet och alla dess chunks tas bort permanent, inklusive vektorer i Qdrant."
				variant="danger"
				confirmLabel="Ta bort"
				onConfirm={handleDelete}
				isLoading={deleting}
			/>
		</div>
	);
}
