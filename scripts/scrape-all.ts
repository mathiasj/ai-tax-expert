import { parseArgs } from "node:util";
import { LagrummetClient } from "../src/scraping/lagrummet-client.js";
import { RiksdagenClient } from "../src/scraping/riksdagen-client.js";
import { SkatteverketScraper } from "../src/scraping/skatteverket-scraper.js";
import type { BaseScraper } from "../src/scraping/base-scraper.js";

const { values } = parseArgs({
	options: {
		target: { type: "string", short: "t", default: "all" },
		limit: { type: "string", short: "l", default: "50" },
	},
});

const limit = Number.parseInt(values.limit ?? "50", 10);
const target = values.target ?? "all";

const scraperMap: Record<string, () => BaseScraper> = {
	skatteverket: () => new SkatteverketScraper({ limit }),
	lagrummet: () => new LagrummetClient({ limit }),
	riksdagen: () => new RiksdagenClient({ limit }),
};

async function main() {
	console.log(`Starting scraping: target=${target}, limit=${limit}`);

	const targets = target === "all" ? Object.keys(scraperMap) : [target];

	for (const t of targets) {
		const factory = scraperMap[t];
		if (!factory) {
			console.error(`Unknown scraper target: ${t}`);
			continue;
		}

		console.log(`\n--- Running ${t} scraper ---`);
		const scraper = factory();
		const docs = await scraper.scrape();
		console.log(`${t}: scraped ${docs.length} documents`);
	}

	console.log("\nDone.");
}

main().catch((error) => {
	console.error("Scraping failed:", error);
	process.exit(1);
});
