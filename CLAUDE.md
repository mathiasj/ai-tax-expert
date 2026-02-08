# CLAUDE.md — Project Context for AI Assistants

## Project: SkatteAssistenten (AI Tax Expert)

An AI-powered Swedish tax advisory system using RAG (Retrieval-Augmented Generation) over Swedish tax law, court decisions, and Skatteverket guidance.

## Tech Stack

- **Runtime**: Bun 1.3.9 (macOS arm64)
- **Language**: TypeScript (strict mode)
- **API Framework**: Hono
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Vector DB**: Qdrant (cosine similarity, 1536 dimensions)
- **Queue**: BullMQ + Redis 7
- **Embeddings**: OpenAI `text-embedding-3-large` (1536 dims)
- **Reranking**: Cohere (planned)
- **Scraping**: Cheerio (HTML), pdf-parse (PDFs)
- **Chunking**: LangChain RecursiveCharacterTextSplitter
- **Linter/Formatter**: Biome (tabs, double quotes, semicolons)
- **Containerization**: Docker Compose (Qdrant, PostgreSQL, Redis)

## Project Structure

```
src/
├── config/env.ts          # Zod-validated environment config
├── db/schema.ts           # Drizzle tables: documents, chunks, queries, users
├── db/client.ts           # Drizzle PostgreSQL client
├── scraping/
│   ├── base-scraper.ts    # Abstract base with rate limiting + retry
│   ├── skatteverket-scraper.ts
│   ├── lagrummet-client.ts
│   └── riksdagen-client.ts
├── processing/
│   ├── pdf-parser.ts      # PDF → clean text
│   ├── chunker.ts         # Text → chunks (Swedish legal separators)
│   ├── embedder.ts        # Chunks → OpenAI embeddings
│   └── indexer.ts         # Embeddings → Qdrant
├── workers/
│   └── document-processor.ts  # BullMQ worker: parse → chunk → embed → index
├── api/
│   ├── routes/health.ts
│   ├── routes/query.ts    # Placeholder (Phase 3)
│   └── middleware/error-handler.ts
├── core/                  # RAG pipeline (Phase 2)
└── index.ts               # Hono server entry point
scripts/
├── scrape-all.ts          # CLI: bun run scrape --target <name> --limit <n>
└── process-documents.ts   # CLI: bun run process
```

## Commands

```bash
bun run dev          # Start dev server (port 3000, --watch)
bun run scrape       # Run scrapers (--target skatteverket|lagrummet|riksdagen|all --limit N)
bun run process      # Process raw documents → chunks → embeddings → Qdrant
bun run worker       # Start BullMQ document processing worker
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Run Drizzle migrations
bun run lint         # Biome check
bun run test         # Bun test runner
docker compose up -d # Start Qdrant, PostgreSQL, Redis
```

## Key Patterns

- **Environment**: All config via Zod-validated `env.ts` — crashes on startup if invalid
- **Scrapers**: Extend `BaseScraper` — automatic rate limiting (2-3s), retry (3x), User-Agent header
- **Chunking**: Swedish legal separators: `§`, `Kap.`, `Kapitel`, `Avdelning`, `Avsnitt`
- **Embedding**: Batched (100/batch), OpenAI text-embedding-3-large at 1536 dimensions
- **Indexing**: Qdrant upsert in batches of 100, cosine distance
- **Worker pipeline**: download → parse → chunk → embed → index (BullMQ, concurrency 2)
- **Server**: Hono with `export default { port, fetch: app.fetch }` pattern for Bun

## Data Sources

| Source | What | Format |
|--------|------|--------|
| Skatteverket | Ställningstaganden, handledningar | HTML, PDF |
| Lagrummet | HFD tax court cases | JSON/Atom feed, PDF |
| Riksdagen | Tax propositions (prop), SOU reports | JSON API, PDF |

## Current Status

**Phase 1: COMPLETE** — Scaffolding + data collection pipeline

## Known Issues

- Skatteverket scraper CSS selectors need tuning to match actual site structure
- `bun.lock` (not `bun.lockb`) is the lockfile format for Bun 1.3.9
- PATH must include `$HOME/.bun/bin` explicitly when running from scripts

## Conventions

- Use absolute imports where possible
- Biome formatting: tabs, double quotes, semicolons, 100 char line width
- All async errors should be caught and logged with pino
- Database IDs are UUIDs (defaultRandom in Drizzle)
- Swedish text handling: preserve å, ä, ö in content; sanitize in filenames
