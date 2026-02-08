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

		this.logger.info("Fetching tax-related propositions from Riksdagen");

		try {
			const results = await this.searchTaxPropositions(limit);

			for (const item of results) {
				try {
					const doc = await this.fetchProposition(item);
					documents.push(doc);
					this.logger.info({ title: doc.title, total: documents.length }, "Fetched document");
				} catch (error) {
					this.logger.error({ id: item.dok_id, error }, "Failed to fetch proposition");
				}
			}
		} catch (error) {
			this.logger.error({ error }, "Failed to search propositions");
		}

		this.logger.info({ total: documents.length }, "Riksdagen scraping complete");
		return documents;
	}

	private async searchTaxPropositions(limit: number): Promise<RiksdagenDocument[]> {
		// Search for tax-related propositions (propositioner) and SOU reports
		const searchUrl =
			`${BASE_URL}/dokumentlista/?sok=skatt+inkomstskatt+mervärdesskatt` +
			`&doktyp=prop,sou&sort=datum&sortorder=desc&utformat=json&sz=${limit}`;

		const response = await this.fetchWithRetry(searchUrl);
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

	private async fetchProposition(item: RiksdagenDocument): Promise<ScrapedDocument> {
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

				return {
					title: item.titel,
					sourceUrl: `https://www.riksdagen.se/sv/dokument-och-lagar/${item.dok_id}/`,
					content,
					filePath,
					metadata: {
						source: "riksdagen",
						docId: item.dok_id,
						docType: item.doktyp,
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

			return {
				title: item.titel,
				sourceUrl: pdfAttachment.fil_url,
				filePath,
				metadata: {
					source: "riksdagen",
					docId: item.dok_id,
					docType: item.doktyp,
					date: item.datum,
					type: "pdf",
				},
			};
		}

		throw new Error(`No content available for ${item.dok_id}`);
	}
}

function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/\s+/g, " ")
		.trim();
}
