import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { DropdownItem, DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useCreateSource, useDeleteSource, useSources, useTriggerScrape } from "@/hooks/use-admin";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 30;

const sourceTypeOptions = [
	{ value: "skatteverket", label: "Skatteverket" },
	{ value: "lagrummet", label: "Lagrummet" },
	{ value: "riksdagen", label: "Riksdagen" },
	{ value: "manual", label: "Manual" },
];

export function AdminSourcesPage() {
	const [page, setPage] = useState(1);
	const [showAdd, setShowAdd] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [newUrl, setNewUrl] = useState("");
	const [newSource, setNewSource] = useState("skatteverket");
	const [newLabel, setNewLabel] = useState("");

	const { data, isLoading, refetch } = useSources({
		limit: PAGE_SIZE,
		offset: (page - 1) * PAGE_SIZE,
	});

	const { create, isLoading: creating } = useCreateSource();
	const { deleteSource, isLoading: deleting } = useDeleteSource();
	const { trigger: triggerScrape } = useTriggerScrape();
	const [scrapingSource, setScrapingSource] = useState<string | null>(null);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Auto-refresh while scraping
	useEffect(() => {
		if (scrapingSource) {
			pollRef.current = setInterval(refetch, 5000);
			return () => { if (pollRef.current) clearInterval(pollRef.current); };
		}
		if (pollRef.current) clearInterval(pollRef.current);
	}, [scrapingSource, refetch]);

	const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

	const handleAdd = async () => {
		const ok = await create({
			url: newUrl,
			source: newSource,
			label: newLabel || undefined,
		});
		if (ok) {
			setShowAdd(false);
			setNewUrl("");
			setNewLabel("");
			refetch();
		}
	};

	const handleDelete = async () => {
		if (!deleteId) return;
		const ok = await deleteSource(deleteId);
		if (ok) {
			setDeleteId(null);
			refetch();
		}
	};

	const handleScrape = async (source: string) => {
		setScrapingSource(source);
		const ok = await triggerScrape(source);
		if (ok) {
			setTimeout(refetch, 2000);
			setTimeout(() => setScrapingSource(null), 5 * 60 * 1000);
		} else {
			setScrapingSource(null);
		}
	};

	return (
		<div className="space-y-4 p-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Källor</h2>
				<Button size="sm" onClick={() => setShowAdd(true)}>
					Lägg till källa
				</Button>
			</div>

			{isLoading ? (
				<div className="flex h-32 items-center justify-center">
					<Spinner />
				</div>
			) : (
				<Card className="overflow-x-auto p-0">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
							<tr>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Etikett</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Typ</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">URL</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Dokument</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Senast scrapad</th>
								<th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400" />
							</tr>
						</thead>
						<tbody>
							{data?.sources.map((src) => (
								<tr
									key={src.id}
									className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/30"
								>
									<td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
										{src.label ?? "-"}
									</td>
									<td className="px-4 py-3 text-gray-600 dark:text-gray-400">{src.source}</td>
									<td className="max-w-xs truncate px-4 py-3 text-gray-500 dark:text-gray-400">
										{src.url}
									</td>
									<td className="px-4 py-3 text-gray-600 dark:text-gray-400">{src.documentCount}</td>
									<td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
										{scrapingSource === src.source ? (
											<span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
												<Spinner size="sm" />
												Skrapar...
											</span>
										) : (
											src.lastScrapedAt ? formatDate(src.lastScrapedAt) : "-"
										)}
									</td>
									<td className="px-4 py-3 text-right">
										<DropdownMenu>
											{src.source !== "manual" && (
												<DropdownItem
													onClick={() => handleScrape(src.source)}
													disabled={!!scrapingSource}
												>
													Skrapa
												</DropdownItem>
											)}
											<DropdownItem
												variant="danger"
												onClick={() => setDeleteId(src.id)}
											>
												Ta bort
											</DropdownItem>
										</DropdownMenu>
									</td>
								</tr>
							))}
							{data?.sources.length === 0 && (
								<tr>
									<td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
										Inga källor hittades
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</Card>
			)}

			<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

			{/* Add Source Dialog */}
			<Dialog
				open={showAdd}
				onClose={() => setShowAdd(false)}
				title="Lägg till källa"
				confirmLabel="Lägg till"
				onConfirm={handleAdd}
				isLoading={creating}
			>
				<div className="space-y-3">
					<Input
						label="URL"
						placeholder="https://..."
						value={newUrl}
						onChange={(e) => setNewUrl(e.target.value)}
					/>
					<Select
						label="Typ"
						options={sourceTypeOptions}
						value={newSource}
						onChange={(e) => setNewSource(e.target.value)}
					/>
					<Input
						label="Etikett (valfritt)"
						placeholder="t.ex. Ställningstaganden 2024"
						value={newLabel}
						onChange={(e) => setNewLabel(e.target.value)}
					/>
				</div>
			</Dialog>

			{/* Delete Dialog */}
			<Dialog
				open={!!deleteId}
				onClose={() => setDeleteId(null)}
				title="Ta bort källa"
				description="Är du säker? Källan tas bort men tillhörande dokument påverkas inte."
				variant="danger"
				confirmLabel="Ta bort"
				onConfirm={handleDelete}
				isLoading={deleting}
			/>
		</div>
	);
}
