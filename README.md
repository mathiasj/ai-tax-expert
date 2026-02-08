# SkatteAssistenten — AI Swedish Tax Expert

An AI-powered advisory system that answers Swedish tax questions using RAG (Retrieval-Augmented Generation) over authoritative sources: tax law, court decisions, and Skatteverket guidance.

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  Frontend    │───>│  Hono API    │───>│  RAG Engine  │
│  (React)     │<───│  Server      │<───│              │
└─────────────┘    └──────────────┘    └──────┬───────┘
                                              │
                   ┌──────────────┐    ┌──────▼───────┐
                   │  PostgreSQL  │    │   Qdrant     │
                   │  (metadata)  │    │  (vectors)   │
                   └──────────────┘    └──────────────┘
                          ▲                    ▲
                          │                    │
                   ┌──────┴────────────────────┴──┐
                   │     BullMQ Processing        │
                   │  parse → chunk → embed → idx │
                   └──────────────┬───────────────┘
                                  ▲
                   ┌──────────────┴───────────────┐
                   │         Scrapers             │
                   │  Skatteverket · Lagrummet    │
                   │       Riksdagen              │
                   └──────────────────────────────┘
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
| Runtime | Bun |
| API | Hono |
| Database | PostgreSQL + Drizzle ORM |
| Vectors | Qdrant |
| Queue | BullMQ + Redis |
| Embeddings | OpenAI text-embedding-3-large |
| Reranking | Cohere |
| Scraping | Cheerio + pdf-parse |
| Chunking | LangChain RecursiveCharacterTextSplitter |
| Frontend | React (Phase 4) |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.3+)
- [Docker](https://docker.com) (for Qdrant, PostgreSQL, Redis)

### Setup

```bash
# Install dependencies
bun install

# Copy environment config
cp .env.example .env
# Edit .env with your API keys (OPENAI_API_KEY, COHERE_API_KEY)

# Start infrastructure
docker compose up -d

# Run database migrations
bun run db:generate
bun run db:migrate

# Start dev server
bun run dev
```

### Ingest Data

```bash
# Scrape documents (all sources, limit 50 each)
bun run scrape

# Scrape a specific source with a limit
bun run scrape -- --target skatteverket --limit 10

# Process scraped documents into vector embeddings
bun run process

# Or run the background worker for async processing
bun run worker
```

### API

```bash
# Health check
curl http://localhost:3000/health

# Query (Phase 3)
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Hur beskattas kapitalvinst vid bostadsförsäljning?"}'
```

## Development Phases

### Phase 1: Data Collection & Processing Pipeline ✅

- [x] Project scaffolding (Bun, TypeScript, Biome, Docker Compose)
- [x] Database schema (Drizzle ORM — documents, chunks, queries, users)
- [x] Scraping infrastructure
  - [x] Base scraper with rate limiting and retry
  - [x] Skatteverket scraper (ställningstaganden, handledningar)
  - [x] Lagrummet client (HFD tax cases)
  - [x] Riksdagen client (propositions, SOU reports)
- [x] Processing pipeline
  - [x] PDF parser (pdf-parse + text cleaning)
  - [x] Chunker (Swedish legal separators: §, kap, Avdelning, Avsnitt)
  - [x] Embedder (OpenAI text-embedding-3-large, batched)
  - [x] Indexer (Qdrant upsert with metadata)
- [x] BullMQ worker (async document processing)
- [x] Hono API server (health check)

### Phase 2: RAG Pipeline Core

- [ ] Query embedding (same model as document embedding)
- [ ] Qdrant similarity search with metadata filtering
- [ ] Cohere reranking of retrieved chunks
- [ ] Context assembly (deduplication, ordering, token budget)
- [ ] LLM answer generation with source citations
- [ ] Prompt engineering for Swedish tax domain
- [ ] Evaluation framework (relevance, faithfulness, answer quality)

### Phase 3: Query API & Refinements

- [ ] `/api/query` endpoint — full RAG pipeline
- [ ] Conversation history / follow-up questions
- [ ] Query logging and analytics
- [ ] Source citation formatting with links
- [ ] Rate limiting and authentication
- [ ] Caching layer for frequent queries
- [ ] Error handling and fallback responses

### Phase 4: Frontend

- [ ] React app with chat interface
- [ ] Markdown rendering for answers
- [ ] Source panel with expandable citations
- [ ] Query history sidebar
- [ ] Swedish language UI
- [ ] Mobile-responsive design

### Phase 5: Production & Ops

- [ ] Deployment pipeline (Docker, CI/CD)
- [ ] Monitoring and alerting
- [ ] Scheduled scraping (keep data fresh)
- [ ] User feedback collection
- [ ] A/B testing for prompt variations
- [ ] Cost optimization (caching, model selection)

## Project Structure

```
src/
├── config/          # Zod-validated environment config
├── db/              # Drizzle schema and client
├── scraping/        # Data source scrapers
├── processing/      # PDF parsing, chunking, embedding, indexing
├── workers/         # BullMQ background jobs
├── core/            # RAG pipeline (Phase 2)
├── api/             # Hono routes and middleware
└── index.ts         # Server entry point
scripts/             # CLI tools for scraping and processing
tests/               # Test suites
data/
├── raw/             # Downloaded documents (gitignored)
└── processed/       # Parsed output (gitignored)
```

## License

Private — All rights reserved.
