import { Button } from "@/components/ui/button";

interface PaginationProps {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
	if (totalPages <= 1) return null;

	return (
		<div className="flex items-center justify-between">
			<p className="text-sm text-muted-foreground">
				Sida {page} av {totalPages}
			</p>
			<div className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onPageChange(page - 1)}
					disabled={page <= 1}
				>
					Föregående
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onPageChange(page + 1)}
					disabled={page >= totalPages}
				>
					Nästa
				</Button>
			</div>
		</div>
	);
}
