import { BaseScraper, type ScrapedDocument, type ScraperOptions } from "./base-scraper.js";

// Lagrummet provides Swedish legal data via a REST/SPARQL interface
const BASE_URL = "https://data.lagrummet.se";

interface LagrummetEntry {
	id: string;
	title: string;
	url: string;
	published: string;
	type: string;
}

export class LagrummetClient extends BaseScraper {
	constructor(options?: Partial<ScraperOptions>) {
		super("lagrummet", {
			outputDir: "data/raw/lagrummet",
			rateLimit: 3000,
			...options,
		});
	}

	async scrape(): Promise<ScrapedDocument[]> {
		const documents: ScrapedDocument[] = [];
		const limit = this.options.limit ?? 50;

		this.logger.info("Fetching HFD tax cases from Lagrummet");

		try {
			const entries = await this.fetchTaxCases(limit);

			for (const entry of entries) {
				try {
					const doc = await this.fetchDocument(entry);
					documents.push(doc);
					this.logger.info({ title: doc.title, total: documents.length }, "Fetched case");
				} catch (error) {
					this.logger.error({ id: entry.id, error }, "Failed to fetch document");
				}
			}
		} catch (error) {
			this.logger.error({ error }, "Failed to fetch case list");
		}

		this.logger.info({ total: documents.length }, "Lagrummet scraping complete");
		return documents;
	}

	private async fetchTaxCases(limit: number): Promise<LagrummetEntry[]> {
		// Query the Atom feed for HFD (Högsta förvaltningsdomstolen) tax decisions
		const feedUrl = `${BASE_URL}/set/hfd?_limit=${limit}&_type=rattsfallsnotis,rattsfallsreferat`;

		const response = await this.fetchWithRetry(feedUrl, {
			headers: { Accept: "application/json" },
		});

		const data = await response.json();
		const entries: LagrummetEntry[] = [];

		const items = Array.isArray(data) ? data : data?.items ?? data?.entry ?? [];
		for (const item of items) {
			entries.push({
				id: item.id ?? item["@id"] ?? "",
				title: item.title ?? item.label ?? "Untitled",
				url: item.url ?? item.link ?? item["@id"] ?? "",
				published: item.published ?? item.issued ?? "",
				type: item.type ?? "case",
			});
		}

		return entries;
	}

	private async fetchDocument(entry: LagrummetEntry): Promise<ScrapedDocument> {
		const response = await this.fetchWithRetry(entry.url, {
			headers: { Accept: "application/json, text/html" },
		});

		const contentType = response.headers.get("content-type") ?? "";
		let content: string;
		let filePath: string;

		if (contentType.includes("application/pdf")) {
			const buffer = Buffer.from(await response.arrayBuffer());
			const filename = `hfd_${sanitizeId(entry.id)}.pdf`;
			filePath = await this.saveFile(filename, buffer);
			content = "";
		} else {
			content = await response.text();
			const filename = `hfd_${sanitizeId(entry.id)}.txt`;
			filePath = await this.saveFile(filename, content);
		}

		await this.saveMetadata(filePath, {
			title: entry.title,
			sourceUrl: entry.url,
			source: "lagrummet",
			caseId: entry.id,
			published: entry.published,
		});

		return {
			title: entry.title,
			sourceUrl: entry.url,
			content,
			filePath,
			metadata: {
				source: "lagrummet",
				caseId: entry.id,
				published: entry.published,
				type: entry.type,
			},
		};
	}
}

function sanitizeId(id: string): string {
	return id.replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 80);
}
