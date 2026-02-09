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
| Frontend | React 18 + Vite 6 + Tailwind CSS v4 |

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

# Start backend dev server
bun run dev

# Start frontend dev server (in separate terminal)
bun run frontend:dev

# Or start both at once
bun run dev:all
```

### Default Users (dev mode)

On startup, two seed users are created automatically:

| Email | Password | Role |
|-------|----------|------|
| `test@example.se` | `test123` | user |
| `admin@example.se` | `admin123` | admin |

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

# Query
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Hur beskattas kapitalvinst vid bostadsförsäljning?"}'
```

### Frontend

The frontend runs at `http://localhost:5173` and proxies API requests to the backend.

- **Chat** (`/chat`) — Main chat interface with source filters, markdown answers, citation badges, and thumbs up/down feedback
- **Admin** (`/admin`) — Separate admin dashboard (admin users only) for managing documents, sources, queries, and monitoring system health

## Development Phases

### Phase 1: Data Collection & Processing Pipeline ✅

- [x] Project scaffolding (Bun, TypeScript, Biome, Docker Compose)
- [x] Database schema (Drizzle ORM — documents, chunks, queries, users)
- [x] Scraping infrastructure (Skatteverket, Lagrummet, Riksdagen)
- [x] Processing pipeline (PDF parse → chunk → embed → Qdrant index)
- [x] BullMQ worker (async document processing)
- [x] Hono API server

### Phase 2: RAG Pipeline Core ✅

- [x] Query embedding + Qdrant similarity search with metadata filtering
- [x] Cohere reranking of retrieved chunks
- [x] Context assembly (deduplication, ordering, token budget)
- [x] LLM answer generation with source citations ([Källa N])
- [x] Prompt engineering for Swedish tax domain
- [x] Evaluation framework (relevance, faithfulness, citation accuracy)

### Phase 3: Query API & Refinements ✅

- [x] `/api/query` endpoint — full RAG pipeline
- [x] JWT auth (Hono HS256 + argon2id) + conversation history (last 5 turns)
- [x] Redis cache (SHA-256 query key) + sliding-window rate limiter
- [x] Swedish-language fallback responses + analytics endpoints

### Phase 4: Frontend ✅

- [x] React 18 + Vite 6 + Tailwind v4 chat interface
- [x] Markdown rendering + citation badges + source filters
- [x] Conversation history (localStorage) + responsive sidebar
- [x] Dashboard, settings, theme toggle, JWT auth flow

### Phase 5: Admin Dashboard ✅

- [x] Separate admin layout, sidebar, and routes (`/admin/*`)
- [x] Document management (search, filter, detail drawer, delete, reprocess, mark superseded)
- [x] Source URL management (CRUD with status)
- [x] Query browser with feedback stats and expandable answers
- [x] System health monitoring (Qdrant, Redis, PostgreSQL, BullMQ — auto-refresh)
- [x] User feedback (thumbs up/down on chat answers, stored per query)
- [x] `requireAdmin` middleware + admin seed user

### Phase 6: Production & Ops

- [ ] Deployment pipeline (Docker, CI/CD)
- [ ] Monitoring and alerting
- [ ] Scheduled scraping (keep data fresh)
- [ ] A/B testing for prompt variations
- [ ] Cost optimization (caching, model selection)

## Project Structure

```
src/
├── config/          # Zod-validated environment config
├── db/              # Drizzle schema, client, seed
├── auth/            # JWT signing/verification, password hashing
├── scraping/        # Data source scrapers (Skatteverket, Lagrummet, Riksdagen)
├── processing/      # PDF parsing, chunking, embedding, Qdrant indexing
├── workers/         # BullMQ queue + document processing worker
├── core/            # RAG pipeline, LLM providers, evaluation framework
├── api/
│   ├── routes/      # health, auth, query, documents, analytics, admin
│   └── middleware/   # auth, admin, rate-limiter, error-handler
└── index.ts         # Hono server entry point
frontend/
├── src/
│   ├── components/  # ui/, layout/, admin/, auth/, chat/, dashboard/, settings/
│   ├── pages/       # User pages + admin/ subdirectory
│   ├── hooks/       # Data fetching, auth, feedback, admin
│   └── contexts/    # Auth context
scripts/             # CLI tools for scraping and processing
data/
├── raw/             # Downloaded documents (gitignored)
└── processed/       # Parsed output (gitignored)
```

## License

Private — All rights reserved.
