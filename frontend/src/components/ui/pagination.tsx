import { Button } from "./button";

interface PaginationProps {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
	if (totalPages <= 1) return null;

	return (
		<div className="flex items-center justify-between">
			<p className="text-sm text-gray-500 dark:text-gray-400">
				Sida {page} av {totalPages}
			</p>
			<div className="flex gap-2">
				<Button
					variant="secondary"
					size="sm"
					onClick={() => onPageChange(page - 1)}
					disabled={page <= 1}
				>
					Föregående
				</Button>
				<Button
					variant="secondary"
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
