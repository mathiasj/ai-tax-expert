# SkatteAssistenten — AI Swedish Tax Expert

An AI-powered advisory system that answers Swedish tax questions using RAG (Retrieval-Augmented Generation) over authoritative sources: tax law, court decisions, and Skatteverket guidance.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Skatteverket│     │  Riksdagen  │     │  Lagrummet   │
│  (Firecrawl) │     │  (Open Data)│     │  (REST/Atom) │
└──────┬───────┘     └──────┬──────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────┐
│                    Scrapers                          │
│  Classify: docType · audience · taxArea              │
│  Output: .txt/.pdf + .meta.json sidecar              │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│              Processing Pipeline (BullMQ)            │
│  Parse → Classify → Chunk → Embed → Index            │
│  Content hash (SHA-256) for change detection         │
└───────┬──────────────┬───────────────┬───────────────┘
        │              │               │
        ▼              ▼               ▼
   ┌─────────┐   ┌──────────┐   ┌───────────┐
   │PostgreSQL│   │  Qdrant  │   │   Redis   │
   │(Drizzle) │   │(Vectors) │   │(BullMQ/   │
   │          │   │          │   │ Cache)    │
   └────┬─────┘   └────┬─────┘   └─────┬─────┘
        │              │               │
        ▼              ▼               ▼
┌──────────────────────────────────────────────────────┐
│                  RAG Pipeline (Hono API)             │
│  Retrieve → Rerank → Assemble → Generate             │
│  Source hierarchy · Metadata filters                 │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│            Frontend (React + Vite + Tailwind)        │
│  Chat UI · Dashboard · Admin Panel                   │
└──────────────────────────────────────────────────────┘
```

## Data Sources

| Source | Content | URL |
|--------|---------|-----|
| **Skatteverket** | Tax guidance, ställningstaganden, handledningar | skatteverket.se |
| **Lagrummet** | HFD court decisions on tax cases | data.lagrummet.se |
| **Riksdagen** | Tax propositions, SOU reports | data.riksdagen.se |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Bun 1.3.9 |
| API | Hono |
| Database | PostgreSQL 16 + Drizzle ORM |
| Vectors | Qdrant (cosine, 1536 dims) |
| Queue | BullMQ + Redis 7 |
| Embeddings | OpenAI text-embedding-3-large |
| LLM | OpenAI GPT-4o (default) or Anthropic Claude |
| Reranking | Cohere rerank-multilingual-v3.0 |
| Scraping | Firecrawl (Skatteverket), Cheerio, pdf-parse |
| Chunking | LangChain RecursiveCharacterTextSplitter |
| Frontend | React 18 + Vite 6 + Tailwind CSS v4 |
| Linter | Biome |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.3+)
- [Docker](https://docker.com) (for Qdrant, PostgreSQL, Redis)
- API keys: `OPENAI_API_KEY`, `COHERE_API_KEY`, optionally `FIRECRAWL_API_KEY` and `ANTHROPIC_API_KEY`

### Setup

```bash
# Install dependencies
bun install
cd frontend && bun install && cd ..

# Copy environment config
cp .env.example .env
# Edit .env with your API keys

# Start infrastructure
docker compose up -d

# Run database migrations
bun run db:migrate

# Start development servers
bun run dev:all  # Backend on :3000, Frontend on :5173
```

### Default Users (dev mode)

On startup, two seed users are created automatically:

| Email | Password | Role |
|-------|----------|------|
| `test@example.se` | `test123` | user |
| `admin@example.se` | `admin123` | admin |

### Ingest Data

```bash
# Check source health
bun run scrape -- --dry-run

# Scrape a specific source with a limit
bun run scrape -- --target riksdagen --limit 10
bun run scrape -- --target skatteverket --limit 5  # Requires FIRECRAWL_API_KEY

# Process scraped documents into vector embeddings
bun run process

# Or run the background worker for async processing
bun run worker
```

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start backend dev server (port 3000, --watch) |
| `bun run frontend:dev` | Start Vite dev server (port 5173, proxies /api to :3000) |
| `bun run dev:all` | Start both backend and frontend |
| `bun run scrape` | Run scrapers (`--target`, `--limit`, `--dry-run`) |
| `bun run process` | Process raw documents into Qdrant |
| `bun run worker` | Start BullMQ document processing worker |
| `bun run refresh-worker` | Start refresh scheduler (checks for stale documents) |
| `bun run eval` | Run RAG evaluation suite (17 test questions) |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Run Drizzle migrations |
| `bun run lint` | Biome lint check |
| `bun run test` | Run tests |

## Data Pipeline

```
Scrape → Classify → Chunk → Embed → Index
```

1. **Scrape**: Source-specific scrapers fetch documents and save `.txt`/`.pdf` files with `.meta.json` sidecars containing title, sourceUrl, source, section, docType, audience.
2. **Classify**: Auto-classification assigns `docType`, `audience`, and `taxArea` based on source metadata and content analysis (see `src/processing/classifier.ts`).
3. **Chunk**: LangChain `RecursiveCharacterTextSplitter` with Swedish legal separators (§, Kapitel, Avdelning, Avsnitt). Chunk size 1500, overlap 200.
4. **Embed**: OpenAI `text-embedding-3-large` at 1536 dimensions, batched 100 at a time.
5. **Index**: Qdrant upsert with full metadata payload (source, title, sourceUrl, docType, audience, taxArea).

## Metadata Fields

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `docType` | enum | `stallningstagande`, `handledning`, `proposition`, `sou`, `rattsfallsnotis`, `rattsfallsreferat`, `ovrigt` | Document classification |
| `audience` | enum | `allman`, `foretag`, `specialist` | Target audience |
| `taxArea` | varchar | `inkomstskatt`, `kapitalvinst`, `mervardesskatt`, `fastighetsskatt`, `arbetsgivaravgifter`, `punktskatt`, `foretagsbeskattning`, `internationell_beskattning` | Primary tax domain |
| `refreshPolicy` | enum | `once`, `weekly`, `monthly`, `quarterly` | How often to check for updates |
| `contentHash` | varchar(64) | SHA-256 hex | Content fingerprint for change detection |

## Source Hierarchy

The RAG pipeline prioritizes sources by legal authority (instructed in the system prompt):

1. **Lagtext** (propositioner, SOU) — Highest authority, binding
2. **Rättsfall** (rättsfallsreferat/-notiser) — Precedent-setting, especially HFD
3. **Ställningstaganden** — Skatteverket's interpretation, guiding but not binding
4. **Handledningar** — Educational, lowest authority

When sources conflict, the system weighs them by hierarchy and explains the conflict. Context labels show document type instead of raw source name (e.g., `[Källa 1: Ställningstagande - Titel]`).

## Refresh Scheduler

Documents can be automatically re-checked for updates based on their `refreshPolicy`:

- **once**: Never re-checked (default for all documents)
- **weekly**: Re-checked if last check was 7+ days ago
- **monthly**: Re-checked if last check was 30+ days ago
- **quarterly**: Re-checked if last check was 90+ days ago

The scheduler runs daily at 03:00 (configurable) and compares content hashes (SHA-256). If content is unchanged, only `lastCheckedAt` is updated. If content changed, the document goes through the full processing pipeline.

- Set refresh policy via admin: `PATCH /api/admin/documents/:id { refreshPolicy: "weekly" }`
- Manual trigger: `POST /api/admin/refresh/trigger`
- Run standalone: `bun run refresh-worker`

## API Reference

### Authentication
- `POST /api/auth/register` — `{ email, password, name? }` → `{ token, user }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `GET /api/auth/me` — Current user info (requires auth)

### Query (RAG)
- `POST /api/query` — Ask a question with optional filters

```json
{
  "question": "Hur beskattas kapitalvinst vid bostadsförsäljning?",
  "topK": 20,
  "rerankerTopN": 5,
  "tokenBudget": 6000,
  "temperature": 0.1,
  "conversationId": "uuid (optional)",
  "filters": {
    "source": ["riksdagen"],
    "docType": ["proposition", "sou"],
    "audience": ["specialist"],
    "taxArea": ["kapitalvinst"]
  }
}
```

Returns: `{ answer, citations, conversationId, queryId, cached, timings, metadata }`

### Feedback
- `POST /api/queries/:id/feedback` — `{ rating: 1|-1, comment? }` (requires auth)

### Documents
- `GET /api/documents` — `?source=&status=&search=&limit=&offset=` → `{ documents, total }`

### Analytics
- `GET /api/analytics/summary` — Query statistics
- `GET /api/analytics/popular` — Top 20 questions

### Admin (requires admin role)
All endpoints under `/api/admin/` require `requireAdmin` middleware.

- `GET /api/admin/documents/:id` — Document detail with chunkCount
- `GET /api/admin/documents/:id/chunks` — Paginated chunk list
- `DELETE /api/admin/documents/:id` — Delete document + chunks + Qdrant points
- `POST /api/admin/documents/:id/reprocess` — Re-queue document
- `PATCH /api/admin/documents/:id` — Update superseded/refreshPolicy
- `GET/POST/PATCH/DELETE /api/admin/sources[/:id]` — Source URL CRUD
- `GET /api/admin/queries` — Browse queries with feedback filter
- `GET /api/admin/queries/stats` — Feedback statistics
- `GET /api/admin/queries/:id` — Full query detail
- `GET /api/admin/health` — System health (Qdrant/Redis/PG/BullMQ/Refresh Scheduler)
- `POST /api/admin/refresh/trigger` — Manual refresh trigger

## Frontend

The frontend runs at `http://localhost:5173` and proxies API requests to the backend.

- **Chat** (`/chat`) — Main chat interface with source filters, markdown answers, citation badges, and thumbs up/down feedback
- **Dashboard** (`/dashboard`) — Analytics overview
- **Admin** (`/admin`) — Separate admin dashboard (admin users only) for managing documents, sources, queries, and monitoring system health including the refresh scheduler

## Project Structure

```
src/
├── config/env.ts           # Zod-validated environment config
├── db/schema.ts            # Drizzle tables + enums (docType, audience, refreshPolicy)
├── db/client.ts            # Drizzle PostgreSQL client
├── db/seed.ts              # Dev seed users
├── auth/                   # JWT + password hashing
├── scraping/
│   ├── base-scraper.ts     # Abstract base with rate limiting, retry
│   ├── skatteverket-scraper.ts  # Firecrawl-based (WAF bypass)
│   ├── riksdagen-client.ts      # Open Data API
│   └── lagrummet-client.ts      # REST/Atom feed
├── processing/
│   ├── pdf-parser.ts       # PDF → text
│   ├── classifier.ts       # Auto-classify docType, audience, taxArea
│   ├── chunker.ts          # Text → chunks (Swedish legal separators)
│   ├── embedder.ts         # Chunks → OpenAI embeddings
│   └── indexer.ts          # Embeddings → Qdrant (with metadata filters)
├── workers/
│   ├── queue.ts            # Shared BullMQ queue instance
│   ├── document-processor.ts  # Worker: parse → classify → chunk → embed → index
│   └── refresh-scheduler.ts   # Refresh scheduler: daily cron + manual trigger
├── core/
│   ├── types.ts            # Shared types (MetadataFilter, SourceCitation, etc.)
│   ├── llm/                # LLM provider factory (OpenAI/Anthropic)
│   ├── retriever.ts        # Query → Qdrant filtered search
│   ├── reranker.ts         # Cohere multilingual reranker
│   ├── context-assembler.ts # Dedup, ordering, token budget, docType labels
│   ├── prompts.ts          # Swedish tax system prompt with source hierarchy
│   ├── rag-pipeline.ts     # Orchestrator: retrieve → rerank → assemble → generate
│   ├── cache.ts            # Redis cache
│   ├── conversation.ts     # Conversation history
│   ├── fallbacks.ts        # Swedish fallback responses
│   └── evaluation/         # Evaluation framework
├── api/
│   ├── routes/             # health, auth, query, documents, analytics, admin
│   └── middleware/          # auth, admin, rate-limiter, error-handler
└── index.ts                # Hono server entry point
frontend/
├── src/
│   ├── components/         # ui/, layout/, admin/, auth/, chat/, dashboard/, settings/
│   ├── pages/              # User pages + admin/ subdirectory
│   ├── hooks/              # Data fetching, auth, feedback, admin
│   ├── types/              # API type mirrors
│   └── contexts/           # Auth context
scripts/                    # CLI tools for scraping and processing
```

## Development Phases

- **Phase 1** ✅ — Project scaffolding, scraping infra, processing pipeline, BullMQ worker, Hono API
- **Phase 2** ✅ — RAG pipeline core (LLM providers, retriever, reranker, context assembler, prompts, orchestrator, evaluation)
- **Phase 3** ✅ — JWT auth, conversation history, Redis cache, rate limiter, Swedish fallbacks, analytics
- **Phase 4** ✅ — Frontend (React SPA with chat UI, dashboard, documents, evaluation, settings, auth flows)
- **Phase 5** ✅ — Admin dashboard (documents/sources/queries CRUD, system health, user feedback)
- **Phase 6** ✅ — Scraper fixes (all three scrapers working)
- **Phase 7** ✅ — Metadata-enriched pipeline (docType/audience/taxArea classification, source hierarchy, refresh scheduler)

## License

Private — All rights reserved.
