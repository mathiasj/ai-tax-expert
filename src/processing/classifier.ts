/**
 * Automatic classification of document metadata based on source and content.
 * Maps scraper output to structured enum values for docType, audience, and taxArea.
 */

export type DocType =
	| "stallningstagande"
	| "handledning"
	| "proposition"
	| "sou"
	| "rattsfallsnotis"
	| "rattsfallsreferat"
	| "ovrigt";

export type Audience = "allman" | "foretag" | "specialist";

/**
 * Classify document type based on source and metadata from scrapers.
 */
export function classifyDocType(
	source: string,
	metadata: Record<string, unknown>,
): DocType {
	if (source === "skatteverket") {
		const section = String(metadata.section ?? "").toLowerCase();
		if (section.includes("stallningstaganden") || section.includes("ställningstaganden")) {
			return "stallningstagande";
		}
		if (section.includes("handledningar")) {
			return "handledning";
		}
		return "ovrigt";
	}

	if (source === "riksdagen") {
		const doktyp = String(metadata.doktyp ?? metadata.docType ?? "").toLowerCase();
		if (doktyp === "prop") return "proposition";
		if (doktyp === "sou") return "sou";
		return "ovrigt";
	}

	if (source === "lagrummet") {
		const entryType = String(metadata.type ?? "").toLowerCase();
		if (entryType.includes("referat") || entryType.includes("rattsfallsreferat")) {
			return "rattsfallsreferat";
		}
		return "rattsfallsnotis";
	}

	return "ovrigt";
}

/**
 * Classify target audience based on source and document type.
 */
export function classifyAudience(
	source: string,
	metadata: Record<string, unknown>,
): Audience {
	if (source === "skatteverket") {
		const section = String(metadata.section ?? "").toLowerCase();
		if (section.includes("handledningar")) return "allman";
		return "specialist";
	}

	// Court cases and propositions are specialist-level
	if (source === "lagrummet" || source === "riksdagen") {
		return "specialist";
	}

	return "allman";
}

const TAX_AREA_PATTERNS: Array<{ pattern: RegExp; area: string }> = [
	{ pattern: /fåmansföretag|3:12|k10|kvalificerade\s+andelar/i, area: "foretagsbeskattning" },
	{ pattern: /mervärdesskatt|moms/i, area: "mervardesskatt" },
	{ pattern: /kapitalvinst|kapitalförlust|reavinst/i, area: "kapitalvinst" },
	{ pattern: /inkomstskatt|inkomstskattelag/i, area: "inkomstskatt" },
	{ pattern: /fastighetsskatt|fastighetsavgift/i, area: "fastighetsskatt" },
	{ pattern: /arbetsgivaravgift/i, area: "arbetsgivaravgifter" },
	{ pattern: /punktskatt|energiskatt|alkoholskatt|tobaksskatt/i, area: "punktskatt" },
	{ pattern: /internationell\s+beskattning|skatteavtal|CFC|BEPS/i, area: "internationell_beskattning" },
];

/**
 * Detect the primary tax area from title and the beginning of the content.
 * Returns null if no clear match is found.
 */
export function detectTaxArea(
	title: string,
	contentPrefix?: string,
): string | null {
	const searchText = `${title} ${contentPrefix ?? ""}`;

	for (const { pattern, area } of TAX_AREA_PATTERNS) {
		if (pattern.test(searchText)) {
			return area;
		}
	}

	return null;
}
