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
			timeout: 10000,
			...options,
		});
	}

	async scrape(): Promise<ScrapedDocument[]> {
		const documents: ScrapedDocument[] = [];
		const limit = this.options.limit ?? 50;

		this.logger.info("Checking Lagrummet API availability...");

		const reachable = await this.healthCheck(BASE_URL, 5000);
		if (!reachable) {
			this.logger.warn(
				"Lagrummet API is unreachable at data.lagrummet.se — API may be temporarily down. Try again later.",
			);
			return [];
		}

		this.logger.info("Fetching HFD tax cases from Lagrummet");

		try {
			const entries = await this.fetchTaxCases(limit);

			for (const entry of entries) {
				try {
					const doc = await this.fetchDocument(entry);
					documents.push(doc);
					if (this.options.onDocument) await this.options.onDocument(doc);
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

		let data: unknown;
		try {
			data = await response.json();
		} catch {
			const text = await response.text().catch(() => "(unreadable)");
			this.logger.error(
				{ responsePreview: text.slice(0, 200) },
				"Failed to parse Lagrummet JSON response",
			);
			return [];
		}

		const entries: LagrummetEntry[] = [];
		const obj = data as Record<string, unknown>;
		const items = Array.isArray(data) ? data : (obj?.items ?? obj?.entry ?? []) as unknown[];

		for (const item of items) {
			const rec = item as Record<string, unknown>;
			entries.push({
				id: String(rec.id ?? rec["@id"] ?? ""),
				title: String(rec.title ?? rec.label ?? "Untitled"),
				url: String(rec.url ?? rec.link ?? rec["@id"] ?? ""),
				published: String(rec.published ?? rec.issued ?? ""),
				type: String(rec.type ?? "case"),
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

		const docType = entry.type.toLowerCase().includes("referat")
			? "rattsfallsreferat"
			: "rattsfallsnotis";

		await this.saveMetadata(filePath, {
			title: entry.title,
			sourceUrl: entry.url,
			source: "lagrummet",
			caseId: entry.id,
			published: entry.published,
			docType,
			audience: "specialist",
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
				docType,
				audience: "specialist",
			},
		};
	}
}

function sanitizeId(id: string): string {
	return id.replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 80);
}
