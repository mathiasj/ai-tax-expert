import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

// TODO: Replace with real API data when GET /api/documents is implemented
const mockDocuments = [
	{ id: "1", title: "Skatteverkets ställningstagande 2024:1", source: "skatteverket", status: "indexed" as const },
	{ id: "2", title: "HFD 2023 ref. 45", source: "lagrummet", status: "indexed" as const },
	{ id: "3", title: "Prop. 2023/24:100", source: "riksdagen", status: "pending" as const },
];

const statusVariant = {
	pending: "warning" as const,
	indexed: "success" as const,
	failed: "danger" as const,
};

export function DocumentsPage() {
	return (
		<div className="p-6">
			<h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100">Dokument</h2>
			<Card>
				<div className="mb-4">
					<EmptyState
						title="Dokumenthantering kommer snart"
						description="API-endpoint för dokumentlistning är ännu inte implementerad. Nedan visas exempeldata."
					/>
				</div>
				<table className="w-full text-left text-sm">
					<thead>
						<tr className="border-b border-gray-200 dark:border-gray-700">
							<th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Titel</th>
							<th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Källa</th>
							<th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Status</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
						{mockDocuments.map((doc) => (
							<tr key={doc.id}>
								<td className="py-3 text-gray-900 dark:text-gray-100">{doc.title}</td>
								<td className="py-3">
									<Badge variant="info">{doc.source}</Badge>
								</td>
								<td className="py-3">
									<Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</Card>
		</div>
	);
}
