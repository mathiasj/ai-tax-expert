import { parseArgs } from "node:util";
import { LagrummetClient } from "../src/scraping/lagrummet-client.js";
import { RiksdagenClient } from "../src/scraping/riksdagen-client.js";
import { SkatteverketScraper } from "../src/scraping/skatteverket-scraper.js";
import type { BaseScraper } from "../src/scraping/base-scraper.js";

const { values } = parseArgs({
	options: {
		target: { type: "string", short: "t", default: "all" },
		limit: { type: "string", short: "l", default: "50" },
		"dry-run": { type: "boolean", default: false },
	},
});

const limit = Number.parseInt(values.limit ?? "50", 10);
const target = values.target ?? "all";
const dryRun = values["dry-run"] ?? false;

interface ScraperConfig {
	factory: () => BaseScraper;
	healthUrl: string;
}

const scraperMap: Record<string, ScraperConfig> = {
	skatteverket: {
		factory: () => new SkatteverketScraper({ limit }),
		healthUrl: "https://api.firecrawl.dev",
	},
	lagrummet: {
		factory: () => new LagrummetClient({ limit }),
		healthUrl: "https://data.lagrummet.se",
	},
	riksdagen: {
		factory: () => new RiksdagenClient({ limit }),
		healthUrl: "https://data.riksdagen.se/dokumentlista/?sok=skatt&utformat=json&sz=1",
	},
};

interface ScraperResult {
	name: string;
	status: "success" | "skipped" | "error";
	documents: number;
	elapsedMs: number;
	error?: string;
}

async function checkHealth(name: string, url: string): Promise<boolean> {
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 5000);
		try {
			const response = await fetch(url, {
				method: "HEAD",
				signal: controller.signal,
				headers: {
					"User-Agent":
						"SkatteAssistenten/0.1 (Swedish Tax Research; academic/research use)",
				},
			});
			return response.ok || response.status < 500;
		} finally {
			clearTimeout(timer);
		}
	} catch {
		return false;
	}
}

async function main() {
	const targets = target === "all" ? Object.keys(scraperMap) : [target];
	const results: ScraperResult[] = [];

	if (dryRun) {
		console.log("=== Dry Run: Health Check ===\n");
		for (const t of targets) {
			const config = scraperMap[t];
			if (!config) {
				console.log(`  ${t}: UNKNOWN (not a valid scraper target)`);
				continue;
			}
			const ok = await checkHealth(t, config.healthUrl);
			const status = ok ? "\x1b[32mREACHABLE\x1b[0m" : "\x1b[31mUNREACHABLE\x1b[0m";
			console.log(`  ${t}: ${status}  (${config.healthUrl})`);
		}
		console.log("\nDry run complete. No documents scraped.");
		return;
	}

	console.log(`Starting scraping: target=${target}, limit=${limit}\n`);
	const totalStart = Date.now();

	for (const t of targets) {
		const config = scraperMap[t];
		if (!config) {
			console.error(`Unknown scraper target: ${t}`);
			results.push({
				name: t,
				status: "error",
				documents: 0,
				elapsedMs: 0,
				error: "Unknown target",
			});
			continue;
		}

		console.log(`--- Running ${t} scraper ---`);
		const start = Date.now();

		try {
			const scraper = config.factory();
			const docs = await scraper.scrape();
			const elapsed = Date.now() - start;
			results.push({ name: t, status: "success", documents: docs.length, elapsedMs: elapsed });
			console.log(`${t}: scraped ${docs.length} documents in ${formatTime(elapsed)}\n`);
		} catch (error) {
			const elapsed = Date.now() - start;
			const msg = error instanceof Error ? error.message : String(error);
			results.push({ name: t, status: "error", documents: 0, elapsedMs: elapsed, error: msg });
			console.error(`${t}: FAILED after ${formatTime(elapsed)} — ${msg}\n`);
		}
	}

	// Summary
	const totalElapsed = Date.now() - totalStart;
	console.log("=== Summary ===");
	console.log(
		`${"Source".padEnd(16)} ${"Status".padEnd(10)} ${"Docs".padEnd(6)} ${"Time".padEnd(10)} Error`,
	);
	console.log("-".repeat(60));
	for (const r of results) {
		console.log(
			`${r.name.padEnd(16)} ${r.status.padEnd(10)} ${String(r.documents).padEnd(6)} ${formatTime(r.elapsedMs).padEnd(10)} ${r.error ?? ""}`,
		);
	}
	console.log("-".repeat(60));
	const totalDocs = results.reduce((sum, r) => sum + r.documents, 0);
	console.log(`Total: ${totalDocs} documents in ${formatTime(totalElapsed)}`);
}

function formatTime(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

main().catch((error) => {
	console.error("Scraping failed:", error);
	process.exit(1);
});
