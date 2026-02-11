import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
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
import { Spinner } from "@/components/ui/spinner";
import {
	useCreateSource,
	useDeleteSource,
	useSources,
} from "@/hooks/use-admin";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 30;

// ─── Exported helpers (reused by detail page) ────────────────

export const sourceTypeOptions = [
	{ value: "skatteverket", label: "Skatteverket" },
	{ value: "lagrummet", label: "Lagrummet" },
	{ value: "riksdagen", label: "Riksdagen" },
	{ value: "manual", label: "Manual" },
];

export const INTERVAL_PRESETS = [
	{ value: "0", label: "Manuell" },
	{ value: "30", label: "Var 30:e minut" },
	{ value: "60", label: "Varje timme" },
	{ value: "360", label: "Var 6:e timme" },
	{ value: "720", label: "Var 12:e timme" },
	{ value: "1440", label: "Dagligen" },
	{ value: "10080", label: "Veckovis" },
	{ value: "43200", label: "Månadsvis" },
	{ value: "custom", label: "Anpassad..." },
];

export function intervalLabel(minutes: number): string {
	if (minutes <= 0) return "Manuell";
	if (minutes < 60) return `Var ${minutes}:e min`;
	if (minutes < 1440) {
		const h = Math.round(minutes / 60);
		return h === 1 ? "Varje timme" : `Var ${h}:e timme`;
	}
	if (minutes < 10080) {
		const d = Math.round(minutes / 1440);
		return d === 1 ? "Dagligen" : `Var ${d}:e dag`;
	}
	if (minutes < 43200) {
		const w = Math.round(minutes / 10080);
		return w === 1 ? "Veckovis" : `Var ${w}:e vecka`;
	}
	const m = Math.round(minutes / 43200);
	return m === 1 ? "Månadsvis" : `Var ${m}:e månad`;
}

export function intervalBadgeVariant(minutes: number): "default" | "success" | "warning" | "info" {
	if (minutes <= 0) return "default";
	if (minutes <= 60) return "info";
	if (minutes <= 1440) return "info";
	if (minutes <= 10080) return "success";
	return "warning";
}

export function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-4">
			<span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
			<span className="truncate text-right text-xs text-foreground">{value}</span>
		</div>
	);
}

// ─── Page ────────────────────────────────────────────────────

export function AdminSourcesPage() {
	const navigate = useNavigate();
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
	const [showReset, setShowReset] = useState(false);
	const [resetting, setResetting] = useState(false);

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

	const handleReset = async () => {
		setResetting(true);
		try {
			await api.post("/api/admin/reset", { confirm: "RESET_ALL", includeSources: true });
			toast.success("Alla data rensade");
			setShowReset(false);
			refetch();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Kunde inte rensa data");
		} finally {
			setResetting(false);
		}
	};

	return (
		<div className="space-y-4 p-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-bold text-foreground">Källor</h2>
				<div className="flex items-center gap-2">
					{import.meta.env.DEV && (
						<Button size="sm" variant="destructive" onClick={() => setShowReset(true)}>
							<Trash2 className="h-3.5 w-3.5" />
							Rensa allt
						</Button>
					)}
					<Button size="sm" onClick={() => setShowAdd(true)}>
						Lägg till källa
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="flex h-32 items-center justify-center">
					<Spinner />
				</div>
			) : (
				<Card className="overflow-x-auto p-0">
					<table className="w-full text-left text-sm">
						<thead className="border-b bg-muted/50">
							<tr>
								<th className="px-4 py-3 font-medium text-muted-foreground">Etikett</th>
								<th className="px-4 py-3 font-medium text-muted-foreground">Schema</th>
								<th className="px-4 py-3 font-medium text-muted-foreground">Dokument</th>
								<th className="px-4 py-3 font-medium text-muted-foreground">Senast scrapad</th>
							</tr>
						</thead>
						<tbody>
							{data?.sources.map((src) => (
								<tr
									key={src.id}
									className="cursor-pointer border-b border-border hover:bg-muted/50"
									onClick={() => navigate(`/admin/sources/${src.id}`)}
								>
									<td className="px-4 py-3">
										<div className="font-medium text-foreground">
											{src.label ?? src.source}
										</div>
										{!src.isActive && (
											<span className="text-xs text-muted-foreground">Inaktiv</span>
										)}
									</td>
									<td className="px-4 py-3">
										<Badge variant={intervalBadgeVariant(src.scrapeIntervalMinutes)}>
											{intervalLabel(src.scrapeIntervalMinutes)}
										</Badge>
									</td>
									<td className="px-4 py-3 text-muted-foreground">{src.documentCount}</td>
									<td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
										{src.lastScrapedAt ? formatDate(src.lastScrapedAt) : "-"}
									</td>
								</tr>
							))}
							{data?.sources.length === 0 && (
								<tr>
									<td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
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
			<Dialog open={showAdd} onOpenChange={(isOpen) => !isOpen && setShowAdd(false)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Lägg till källa</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div className="space-y-2">
							<Label>URL</Label>
							<Input
								placeholder="https://..."
								value={newUrl}
								onChange={(e) => setNewUrl(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Typ</Label>
							<Select value={newSource} onValueChange={setNewSource}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{sourceTypeOptions.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Etikett (valfritt)</Label>
							<Input
								placeholder="t.ex. Ställningstaganden 2024"
								value={newLabel}
								onChange={(e) => setNewLabel(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowAdd(false)}>Avbryt</Button>
						<Button onClick={handleAdd} disabled={creating}>
							{creating && <Loader2 className="animate-spin" />}
							Lägg till
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Dialog */}
			<Dialog open={!!deleteId} onOpenChange={(isOpen) => !isOpen && setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ta bort källa</DialogTitle>
						<DialogDescription>
							Är du säker? Källan tas bort men tillhörande dokument påverkas inte.
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

			{/* Reset All Dialog (dev only) */}
			<Dialog open={showReset} onOpenChange={(isOpen) => !isOpen && setShowReset(false)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rensa alla data</DialogTitle>
						<DialogDescription>
							Detta raderar alla källor, dokument, chunks, frågor, konversationer och
							Qdrant-vektorer. Användare behålls. Kan inte ångras.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowReset(false)}>Avbryt</Button>
						<Button variant="destructive" onClick={handleReset} disabled={resetting}>
							{resetting && <Loader2 className="animate-spin" />}
							Rensa allt
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
