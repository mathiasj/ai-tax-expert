export function cn(...classes: (string | false | null | undefined)[]): string {
	return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string | Date): string {
	return new Intl.DateTimeFormat("sv-SE", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(date));
}

export function formatMs(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}
