import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { documents } from "../db/schema.js";
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
		const scraped: ScrapedDocument[] = [];
		const limit = this.options.limit ?? 50;

		// Determine which document types to fetch based on doktyp config
		const doktyp = this.options.doktyp;
		const types = doktyp ? doktyp.split(",").map((t) => t.trim().toLowerCase()) : [];
		const fetchProps = types.length === 0 || types.includes("prop") || types.includes("sou");
		const fetchSfs = types.length === 0 || types.includes("sfs");

		if (fetchProps) {
			this.logger.info("Fetching tax-related propositions from Riksdagen");
			try {
				const results = await this.searchTaxPropositions(limit);
				await this.fetchResults(results, scraped);
			} catch (error) {
				this.logger.error({ error }, "Failed to search propositions");
			}
		}

		if (fetchSfs) {
			this.logger.info("Fetching tax-related SFS (lagtext) from Riksdagen");
			try {
				const results = await this.searchTaxLaws(limit);
				await this.fetchResults(results, scraped);
			} catch (error) {
				this.logger.error({ error }, "Failed to search SFS");
			}
		}

		this.logger.info({ total: scraped.length, doktyp: doktyp ?? "all" }, "Riksdagen scraping complete");
		return scraped;
	}

	private async fetchResults(results: RiksdagenDocument[], scraped: ScrapedDocument[]): Promise<void> {
		// Build set of already-known dok_ids from the database
		const existingDocs = await db
			.select({ sourceUrl: documents.sourceUrl })
			.from(documents)
			.where(eq(documents.source, "riksdagen"));
		const existingUrls = new Set(existingDocs.map((d) => d.sourceUrl).filter(Boolean));

		for (const item of results) {
			const sourceUrl = this.buildSourceUrl(item);
			if (existingUrls.has(sourceUrl)) {
				this.logger.info({ id: item.dok_id }, "Skipping already-scraped document");
				continue;
			}

			try {
				const doc = await this.fetchDocument(item);
				scraped.push(doc);
				existingUrls.add(sourceUrl); // prevent re-scraping within same run
				if (this.options.onDocument) await this.options.onDocument(doc);
				this.logger.info({ title: doc.title, total: scraped.length }, "Fetched document");
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

	private buildSourceUrl(item: RiksdagenDocument): string {
		const typeMap: Record<string, string> = {
			sfs: "svensk-forfattningssamling",
			prop: "proposition",
			sou: "statens-offentliga-utredningar",
		};
		const category = typeMap[item.doktyp.toLowerCase()] ?? item.doktyp.toLowerCase();
		return `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/${category}/_${item.dok_id}/`;
	}

	private async fetchDocument(item: RiksdagenDocument): Promise<ScrapedDocument> {
		// Try to get HTML version first via the document content API
		const htmlUrl = `${BASE_URL}/dokument/${item.dok_id}/json`;
		const sourceUrl = this.buildSourceUrl(item);

		try {
			const response = await this.fetchWithRetry(htmlUrl);
			const data = await response.json();
			const htmlContent = data?.dokumentstatus?.dokument?.html ?? data?.html ?? "";
			const textContent = (data?.dokumentstatus?.dokument?.text ?? "").trim();

			if (htmlContent || textContent) {
				const content = htmlContent ? stripHtml(htmlContent) : textContent;
				if (content.length < 50) {
					this.logger.warn({ id: item.dok_id, chars: content.length }, "Skipping document with too little content");
					throw new Error(`Too little content for ${item.dok_id} (${content.length} chars)`);
				}
				const filename = `${item.doktyp}_${item.dok_id}.txt`;
				const filePath = await this.saveFile(filename, content);
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
				sourceUrl,
				source: "riksdagen",
				docId: item.dok_id,
				doktyp: item.doktyp,
				docType,
				audience: "specialist",
				date: item.datum,
			});

			return {
				title: item.titel,
				sourceUrl,
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
