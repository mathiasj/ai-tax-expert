import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import type { DocumentsResponse, DocumentInfo } from "@/types/api";

const statusVariant: Record<string, "warning" | "success" | "danger"> = {
	pending: "warning",
	downloading: "warning",
	parsing: "warning",
	chunking: "warning",
	embedding: "warning",
	indexed: "success",
	failed: "danger",
};

export function DocumentsPage() {
	const [documents, setDocuments] = useState<DocumentInfo[]>([]);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		api.get<DocumentsResponse>("/api/documents")
			.then((res) => {
				setDocuments(res.documents);
				setTotal(res.total);
			})
			.catch((err) => {
				setError(err instanceof Error ? err.message : "Kunde inte ladda dokument");
			})
			.finally(() => setIsLoading(false));
	}, []);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-12">
				<Spinner />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6">
				<h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100">Dokument</h2>
				<Card>
					<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
				</Card>
			</div>
		);
	}

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dokument</h2>
				<span className="text-sm text-gray-500 dark:text-gray-400">{total} totalt</span>
			</div>
			<Card>
				{documents.length === 0 ? (
					<p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
						Inga dokument hittades
					</p>
				) : (
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Titel</th>
								<th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Källa</th>
								<th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Status</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
							{documents.map((doc) => (
								<tr key={doc.id}>
									<td className="py-3 text-gray-900 dark:text-gray-100">{doc.title}</td>
									<td className="py-3">
										<Badge variant="info">{doc.source}</Badge>
									</td>
									<td className="py-3">
										<Badge variant={statusVariant[doc.status] ?? "warning"}>
											{doc.status}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</Card>
		</div>
	);
}
