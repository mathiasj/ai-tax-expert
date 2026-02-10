import { existsSync } from "node:fs";
import * as cheerio from "cheerio";
import { BaseScraper, type ScrapedDocument, type ScraperOptions } from "./base-scraper.js";

// Riksdagen Open Data API
const BASE_URL = "https://data.riksdagen.se";

interface RiksdagenDocument {
	dok_id: string;
	titel: string;
	undertitel?: string;
	doktyp: string;
	datum: string;
	filbilaga?: Array<{ fil_url: string; filtyp: string }>;
}

export class RiksdagenClient extends BaseScraper {
	constructor(options?: Partial<ScraperOptions>) {
		super("riksdagen", {
			outputDir: "data/raw/riksdagen",
			rateLimit: 2000,
			...options,
		});
	}

	async scrape(): Promise<ScrapedDocument[]> {
		const documents: ScrapedDocument[] = [];
		const limit = this.options.limit ?? 50;

		// Fetch propositions + SOU
		this.logger.info("Fetching tax-related propositions from Riksdagen");
		try {
			const results = await this.searchTaxPropositions(limit);
			await this.fetchResults(results, documents);
		} catch (error) {
			this.logger.error({ error }, "Failed to search propositions");
		}

		// Fetch SFS (gällande lagtext)
		this.logger.info("Fetching tax-related SFS (lagtext) from Riksdagen");
		try {
			const results = await this.searchTaxLaws(limit);
			await this.fetchResults(results, documents);
		} catch (error) {
			this.logger.error({ error }, "Failed to search SFS");
		}

		this.logger.info({ total: documents.length }, "Riksdagen scraping complete");
		return documents;
	}

	private async fetchResults(results: RiksdagenDocument[], documents: ScrapedDocument[]): Promise<void> {
		for (const item of results) {
			const txtPath = `${this.options.outputDir}/${item.doktyp}_${item.dok_id}.txt`;
			const pdfPath = `${this.options.outputDir}/${item.doktyp}_${item.dok_id}.pdf`;
			if (existsSync(txtPath) || existsSync(pdfPath)) {
				this.logger.info({ id: item.dok_id }, "Skipping already-scraped document");
				continue;
			}

			try {
				const doc = await this.fetchDocument(item);
				documents.push(doc);
				this.logger.info({ title: doc.title, total: documents.length }, "Fetched document");
			} catch (error) {
				this.logger.error({ id: item.dok_id, error }, "Failed to fetch document");
			}
		}
	}

	private async searchTaxPropositions(limit: number): Promise<RiksdagenDocument[]> {
		return this.searchDocuments({
			sok: "skatt",
			doktyp: "prop,sou",
			sort: "datum",
			sortorder: "desc",
			limit,
		});
	}

	private async searchTaxLaws(limit: number): Promise<RiksdagenDocument[]> {
		// Multiple searches to maximize coverage — API treats "+" as AND, so we search per term
		const searchTerms = ["skatt", "avgift", "avdrag", "tull", "taxering"];
		const seen = new Set<string>();
		const all: RiksdagenDocument[] = [];

		for (const term of searchTerms) {
			const perTermLimit = Math.ceil(limit / searchTerms.length);
			const results = await this.searchDocuments({
				sok: term,
				doktyp: "sfs",
				dokstat: "gällande sfs",
				sort: "rel",
				limit: perTermLimit,
			});
			for (const doc of results) {
				if (!seen.has(doc.dok_id)) {
					seen.add(doc.dok_id);
					all.push(doc);
				}
			}
		}

		this.logger.info({ terms: searchTerms.length, unique: all.length }, "SFS search complete (deduplicated)");
		return all;
	}

	private async searchDocuments(params: {
		sok: string;
		doktyp: string;
		dokstat?: string;
		sort: string;
		sortorder?: string;
		limit: number;
	}): Promise<RiksdagenDocument[]> {
		const url = new URL(`${BASE_URL}/dokumentlista/`);
		url.searchParams.set("sok", params.sok);
		url.searchParams.set("doktyp", params.doktyp);
		if (params.dokstat) url.searchParams.set("dokstat", params.dokstat);
		url.searchParams.set("sort", params.sort);
		if (params.sortorder) url.searchParams.set("sortorder", params.sortorder);
		url.searchParams.set("utformat", "json");
		url.searchParams.set("sz", String(params.limit));

		const response = await this.fetchWithRetry(url.toString());
		const data = await response.json();

		const docs = data?.dokumentlista?.dokument ?? [];
		return docs.map(
			(d: Record<string, unknown>): RiksdagenDocument => ({
				dok_id: String(d.dok_id ?? ""),
				titel: String(d.titel ?? ""),
				undertitel: d.undertitel ? String(d.undertitel) : undefined,
				doktyp: String(d.doktyp ?? ""),
				datum: String(d.datum ?? ""),
				filbilaga: d.filbilaga as RiksdagenDocument["filbilaga"],
			}),
		);
	}

	private async fetchDocument(item: RiksdagenDocument): Promise<ScrapedDocument> {
		// Try to get HTML version first via the document content API
		const htmlUrl = `${BASE_URL}/dokument/${item.dok_id}/json`;

		try {
			const response = await this.fetchWithRetry(htmlUrl);
			const data = await response.json();
			const htmlContent = data?.dokumentstatus?.dokument?.html ?? data?.html ?? "";

			if (htmlContent) {
				const filename = `${item.doktyp}_${item.dok_id}.txt`;
				const content = stripHtml(htmlContent);
				const filePath = await this.saveFile(filename, content);
				const sourceUrl = `https://www.riksdagen.se/sv/dokument-och-lagar/${item.dok_id}/`;
				const docType = item.doktyp.toLowerCase() === "prop" ? "proposition"
					: item.doktyp.toLowerCase() === "sou" ? "sou"
					: item.doktyp.toLowerCase() === "sfs" ? "lagtext"
					: "ovrigt";
				await this.saveMetadata(filePath, {
					title: item.titel,
					sourceUrl,
					source: "riksdagen",
					docId: item.dok_id,
					doktyp: item.doktyp,
					docType,
					audience: "specialist",
					date: item.datum,
					subtitle: item.undertitel,
				});

				return {
					title: item.titel,
					sourceUrl,
					content,
					filePath,
					metadata: {
						source: "riksdagen",
						docId: item.dok_id,
						doktyp: item.doktyp,
						docType,
						audience: "specialist",
						date: item.datum,
						subtitle: item.undertitel,
					},
				};
			}
		} catch {
			// Fall through to PDF download
		}

		// Fallback: download PDF attachment
		const pdfAttachment = item.filbilaga?.find((f) => f.filtyp === "pdf");
		if (pdfAttachment) {
			const response = await this.fetchWithRetry(pdfAttachment.fil_url);
			const buffer = Buffer.from(await response.arrayBuffer());
			const filename = `${item.doktyp}_${item.dok_id}.pdf`;
			const filePath = await this.saveFile(filename, buffer);
			const docType = item.doktyp.toLowerCase() === "prop" ? "proposition"
				: item.doktyp.toLowerCase() === "sou" ? "sou"
				: "ovrigt";
			await this.saveMetadata(filePath, {
				title: item.titel,
				sourceUrl: pdfAttachment.fil_url,
				source: "riksdagen",
				docId: item.dok_id,
				doktyp: item.doktyp,
				docType,
				audience: "specialist",
				date: item.datum,
			});

			return {
				title: item.titel,
				sourceUrl: pdfAttachment.fil_url,
				filePath,
				metadata: {
					source: "riksdagen",
					docId: item.dok_id,
					doktyp: item.doktyp,
					docType,
					audience: "specialist",
					date: item.datum,
					type: "pdf",
				},
			};
		}

		throw new Error(`No content available for ${item.dok_id}`);
	}
}

function stripHtml(html: string): string {
	const $ = cheerio.load(html);

	// Remove non-content elements
	$("script, style, nav, footer, header, noscript").remove();

	// Get clean text
	return $("body").text().replace(/\s+/g, " ").trim();
}
