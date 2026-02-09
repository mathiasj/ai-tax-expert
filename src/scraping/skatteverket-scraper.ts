import Firecrawl from "@mendable/firecrawl-js";
import { BaseScraper, type ScrapedDocument, type ScraperOptions } from "./base-scraper.js";

const BASE_URL = "https://www4.skatteverket.se";

const SECTIONS = [
	{
		name: "stallningstaganden",
		url: `${BASE_URL}/rattsligvagledning/121.html`,
		label: "Ställningstaganden",
	},
	{
		name: "handledningar",
		url: `${BASE_URL}/rattsligvagledning/110.html`,
		label: "Handledningar",
	},
];

export class SkatteverketScraper extends BaseScraper {
	private firecrawl: Firecrawl;

	constructor(
		options?: Partial<ScraperOptions> & { firecrawlApiKey?: string },
	) {
		super("skatteverket", {
			outputDir: "data/raw/skatteverket",
			...options,
		});

		const apiKey = options?.firecrawlApiKey || process.env.FIRECRAWL_API_KEY;
		if (!apiKey) {
			throw new Error(
				"FIRECRAWL_API_KEY is required for Skatteverket scraper (www4 domain requires WAF bypass)",
			);
		}
		this.firecrawl = new Firecrawl({ apiKey });
	}

	async scrape(): Promise<ScrapedDocument[]> {
		const documents: ScrapedDocument[] = [];
		const limit = this.options.limit ?? Number.POSITIVE_INFINITY;

		for (const section of SECTIONS) {
			if (documents.length >= limit) break;

			this.logger.info({ section: section.name, url: section.url }, "Scraping section");

			try {
				const links = await this.extractDocumentLinks(section.url);
				this.logger.info(
					{ section: section.name, found: links.length },
					"Found document links",
				);

				const remaining = limit - documents.length;
				const toProcess = links.slice(0, remaining);

				for (const link of toProcess) {
					try {
						await this.sleep(this.options.rateLimit);
						const doc = await this.scrapeDocument(link.url, link.title, section.name);
						if (doc) {
							documents.push(doc);
							this.logger.info(
								{ title: doc.title, total: documents.length },
								"Scraped document",
							);
						}
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
		const result = await this.firecrawl.scrape(sectionUrl, {
			formats: ["links", "markdown"],
		});

		const allLinks = (result.links ?? []) as string[];

		// Filter for document pages within rättslig vägledning
		// Document links have numeric IDs like /rattsligvagledning/470363.html
		const docLinks: Array<{ url: string; title: string }> = [];
		const seen = new Set<string>();

		for (const link of allLinks) {
			const match = link.match(/\/rattsligvagledning\/(\d+)\.html/);
			if (!match) continue;

			// Strip query params for dedup
			const cleanUrl = link.split("?")[0];
			if (seen.has(cleanUrl)) continue;
			seen.add(cleanUrl);

			// Extract title from the markdown content if possible
			const docId = match[1];
			docLinks.push({ url: cleanUrl, title: `Dokument ${docId}` });
		}

		return docLinks;
	}

	private async scrapeDocument(
		url: string,
		fallbackTitle: string,
		section: string,
	): Promise<ScrapedDocument | null> {
		const result = await this.firecrawl.scrape(url, {
			formats: ["markdown"],
		});

		const markdown = result.markdown ?? "";
		if (!markdown || markdown.length < 100) {
			this.logger.debug({ url, length: markdown.length }, "Skipping page with insufficient content");
			return null;
		}

		// Extract title from first markdown heading or metadata
		const title = extractTitle(markdown) || (result.metadata as Record<string, string>)?.title || fallbackTitle;

		// Clean the markdown: remove navigation chrome, keep content
		const content = cleanMarkdown(markdown);
		if (content.length < 100) {
			this.logger.debug({ url, length: content.length }, "Skipping page after cleaning");
			return null;
		}

		const filename = `${section}_${sanitizeFilename(title)}.txt`;
		const filePath = await this.saveFile(filename, content);
		await this.saveMetadata(filePath, {
			title,
			sourceUrl: url,
			source: "skatteverket",
			section,
		});

		return {
			title,
			sourceUrl: url,
			content,
			filePath,
			metadata: { source: "skatteverket", section, type: "html" },
		};
	}
}

function extractTitle(markdown: string): string | null {
	// Try first line if it looks like a heading
	const firstLine = markdown.split("\n")[0]?.trim();
	if (firstLine && !firstLine.startsWith("[") && !firstLine.startsWith("-")) {
		// Remove markdown heading markers and pipe-separated suffixes
		return firstLine
			.replace(/^#+\s*/, "")
			.replace(/\s*\|.*$/, "")
			.replace(/\\\|/g, "|")
			.trim() || null;
	}
	return null;
}

function cleanMarkdown(markdown: string): string {
	const lines = markdown.split("\n");
	const cleaned: string[] = [];
	let foundContent = false;

	for (const line of lines) {
		// Skip navigation/archive links at the top
		if (!foundContent) {
			if (line.startsWith("- [20") || line.startsWith("  - [20")) continue;
			if (line.trim() === "- Arkiv") continue;
			if (line.trim().length > 20) foundContent = true;
		}

		if (foundContent) {
			cleaned.push(line);
		}
	}

	return cleaned.join("\n").trim();
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
