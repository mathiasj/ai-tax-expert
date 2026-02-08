import { Card } from "@/components/ui/card";

interface StatCardProps {
	label: string;
	value: string | number;
	description?: string;
}

export function StatCard({ label, value, description }: StatCardProps) {
	return (
		<Card className="p-4">
			<p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
			<p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
			{description && (
				<p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{description}</p>
			)}
		</Card>
	);
}
