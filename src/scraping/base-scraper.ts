import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pino from "pino";

export interface ScrapedDocument {
	title: string;
	sourceUrl: string;
	content?: string;
	filePath?: string;
	metadata: Record<string, unknown>;
}

export interface ScraperOptions {
	outputDir: string;
	rateLimit: number; // ms between requests
	maxRetries: number;
	limit?: number;
}

const defaultOptions: ScraperOptions = {
	outputDir: "data/raw",
	rateLimit: 2000,
	maxRetries: 3,
};

export abstract class BaseScraper {
	protected logger: pino.Logger;
	protected options: ScraperOptions;

	constructor(name: string, options?: Partial<ScraperOptions>) {
		this.options = { ...defaultOptions, ...options };
		this.logger = pino({ name: `scraper:${name}` });
	}

	abstract scrape(): Promise<ScrapedDocument[]>;

	protected async sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	protected async fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
			try {
				await this.sleep(this.options.rateLimit);
				const response = await fetch(url, {
					...init,
					headers: {
						"User-Agent":
							"SkatteAssistenten/0.1 (Swedish Tax Research; academic/research use)",
						...init?.headers,
					},
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				return response;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				this.logger.warn(
					{ attempt, maxRetries: this.options.maxRetries, url, error: lastError.message },
					"Request failed, retrying...",
				);

				if (attempt < this.options.maxRetries) {
					await this.sleep(this.options.rateLimit * attempt);
				}
			}
		}

		throw lastError;
	}

	protected async saveFile(filename: string, data: Buffer | string): Promise<string> {
		const dir = this.options.outputDir;
		await mkdir(dir, { recursive: true });
		const filePath = join(dir, filename);
		await writeFile(filePath, data);
		this.logger.info({ filePath }, "Saved file");
		return filePath;
	}

	protected async saveMetadata(
		filePath: string,
		meta: { title: string; sourceUrl: string; source: string; [key: string]: unknown },
	): Promise<void> {
		const metaPath = `${filePath}.meta.json`;
		await writeFile(metaPath, JSON.stringify(meta, null, 2));
	}
}
