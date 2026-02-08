import * as cheerio from "cheerio";
import { BaseScraper, type ScrapedDocument, type ScraperOptions } from "./base-scraper.js";

const BASE_URL = "https://www4.skatteverket.se";

const SECTIONS = [
	{
		name: "stallningstaganden",
		url: `${BASE_URL}/rattsligvagledning/stallningstaganden.html`,
		label: "Ställningstaganden",
	},
	{
		name: "handledningar",
		url: `${BASE_URL}/rattsligvagledning/handledningar.html`,
		label: "Handledningar",
	},
];

export class SkatteverketScraper extends BaseScraper {
	constructor(options?: Partial<ScraperOptions>) {
		super("skatteverket", {
			outputDir: "data/raw/skatteverket",
			...options,
		});
	}

	async scrape(): Promise<ScrapedDocument[]> {
		const documents: ScrapedDocument[] = [];
		const limit = this.options.limit ?? Number.POSITIVE_INFINITY;

		for (const section of SECTIONS) {
			if (documents.length >= limit) break;

			this.logger.info({ section: section.name }, "Scraping section");

			try {
				const links = await this.extractDocumentLinks(section.url);
				const remaining = limit - documents.length;
				const toProcess = links.slice(0, remaining);

				for (const link of toProcess) {
					try {
						const doc = await this.scrapeDocument(link.url, link.title, section.name);
						documents.push(doc);
						this.logger.info(
							{ title: doc.title, total: documents.length },
							"Scraped document",
						);
					} catch (error) {
						this.logger.error({ url: link.url, error }, "Failed to scrape document");
					}
				}
			} catch (error) {
				this.logger.error({ section: section.name, error }, "Failed to scrape section");
			}
		}

		this.logger.info({ total: documents.length }, "Scraping complete");
		return documents;
	}

	private async extractDocumentLinks(
		sectionUrl: string,
	): Promise<Array<{ url: string; title: string }>> {
		const response = await this.fetchWithRetry(sectionUrl);
		const html = await response.text();
		const $ = cheerio.load(html);

		const links: Array<{ url: string; title: string }> = [];

		$("a[href]").each((_, el) => {
			const href = $(el).attr("href");
			const title = $(el).text().trim();

			if (href && title && (href.endsWith(".html") || href.endsWith(".pdf"))) {
				const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
				links.push({ url: fullUrl, title });
			}
		});

		return links;
	}

	private async scrapeDocument(
		url: string,
		title: string,
		section: string,
	): Promise<ScrapedDocument> {
		if (url.endsWith(".pdf")) {
			const response = await this.fetchWithRetry(url);
			const buffer = Buffer.from(await response.arrayBuffer());
			const filename = `${section}_${sanitizeFilename(title)}.pdf`;
			const filePath = await this.saveFile(filename, buffer);
			await this.saveMetadata(filePath, { title, sourceUrl: url, source: "skatteverket", section });

			return {
				title,
				sourceUrl: url,
				filePath,
				metadata: { source: "skatteverket", section, type: "pdf" },
			};
		}

		const response = await this.fetchWithRetry(url);
		const html = await response.text();
		const $ = cheerio.load(html);

		// Extract main content area
		const content = $(".main-content, #main-content, article, .content-body")
			.text()
			.replace(/\s+/g, " ")
			.trim();

		const filename = `${section}_${sanitizeFilename(title)}.txt`;
		const filePath = await this.saveFile(filename, content);
		await this.saveMetadata(filePath, { title, sourceUrl: url, source: "skatteverket", section });

		return {
			title,
			sourceUrl: url,
			content,
			filePath,
			metadata: { source: "skatteverket", section, type: "html" },
		};
	}
}

function sanitizeFilename(name: string): string {
	return name
		.toLowerCase()
		.replace(/[åä]/g, "a")
		.replace(/ö/g, "o")
		.replace(/[^a-z0-9]/g, "_")
		.replace(/_+/g, "_")
		.slice(0, 80);
}
