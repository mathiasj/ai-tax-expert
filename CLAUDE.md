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
- **LLM**: Configurable — OpenAI GPT-4o (default) or Anthropic Claude via `LLM_PROVIDER` env var
- **Reranking**: Cohere `rerank-multilingual-v3.0` (Swedish support)
- **Scraping**: Firecrawl (Skatteverket WAF bypass), Cheerio (HTML), pdf-parse (PDFs)
- **Chunking**: LangChain RecursiveCharacterTextSplitter
- **Frontend**: React 18, Vite 6, Tailwind CSS v4, React Router v7
- **Linter/Formatter**: Biome (tabs, double quotes, semicolons)
- **Containerization**: Docker Compose (Qdrant, PostgreSQL, Redis)

## Project Structure

```
src/
├── config/env.ts          # Zod-validated environment config (LLM + RAG settings)
├── db/schema.ts           # Drizzle tables: documents, chunks, queries, users, conversations, sources
├── db/client.ts           # Drizzle PostgreSQL client
├── db/seed.ts             # Dev seed: test@example.se + admin@example.se
├── scraping/
│   ├── base-scraper.ts    # Abstract base with rate limiting, retry, .meta.json sidecar
│   ├── skatteverket-scraper.ts
│   ├── lagrummet-client.ts
│   └── riksdagen-client.ts
├── processing/
│   ├── pdf-parser.ts      # PDF → clean text
│   ├── chunker.ts         # Text → chunks (Swedish legal separators)
│   ├── embedder.ts        # Chunks → OpenAI embeddings
│   └── indexer.ts         # Embeddings → Qdrant (includes filtered search, delete, collection info)
├── workers/
│   ├── queue.ts               # Shared BullMQ queue instance (used by worker + admin routes)
│   └── document-processor.ts  # BullMQ worker: parse → chunk → embed → index
├── core/
│   ├── types.ts           # Shared RAG types (RetrievedChunk, RAGResponse, etc.)
│   ├── llm/
│   │   ├── llm-provider.ts      # LLMProvider interface
│   │   ├── openai-provider.ts   # OpenAI GPT-4o
│   │   ├── anthropic-provider.ts # Anthropic Claude
│   │   └── llm-factory.ts       # Factory + cached singleton
│   ├── retriever.ts       # Query embed → Qdrant filtered search → RetrievedChunk[]
│   ├── reranker.ts        # Cohere rerank-multilingual-v3.0
│   ├── context-assembler.ts # Dedup, doc-grouped ordering, token budget
│   ├── prompts.ts         # Swedish tax system/user/eval prompts + conversation builder
│   ├── rag-pipeline.ts    # Orchestrator: retrieve → rerank → assemble → generate (with fallbacks)
│   ├── cache.ts           # Redis cache: get/set/delete, SHA-256 query cache key
│   ├── conversation.ts    # Create conversation, fetch history (last 5 turns)
│   ├── fallbacks.ts       # Swedish-language fallback responses
│   └── evaluation/
│       ├── types.ts              # Eval types (EvaluationSummary, etc.)
│       ├── test-questions.ts     # 17 Swedish tax test questions
│       ├── relevance-scorer.ts   # LLM-based chunk relevance scoring
│       ├── faithfulness-checker.ts # LLM-based answer grounding check
│       ├── metrics.ts            # Citation accuracy, keyword coverage, precision
│       └── runner.ts             # Eval orchestrator + CLI entry point
├── auth/
│   ├── jwt.ts             # sign/verify JWT (Hono JWT, HS256)
│   └── password.ts        # Bun.password argon2id hash/verify
├── api/
│   ├── routes/health.ts
│   ├── routes/auth.ts     # POST /auth/register, /auth/login, GET /auth/me
│   ├── routes/query.ts    # POST /api/query — full RAG pipeline, POST /api/queries/:id/feedback
│   ├── routes/analytics.ts # GET /analytics/summary, /analytics/popular
│   ├── routes/documents.ts # GET /api/documents — list with search/filter/chunkCount
│   ├── routes/admin.ts    # /api/admin/* — documents CRUD, sources CRUD, queries/feedback, system health
│   ├── middleware/auth.ts  # optionalAuth + requireAuth JWT middleware
│   ├── middleware/admin.ts # requireAdmin (requireAuth + role === "admin")
│   ├── middleware/rate-limiter.ts  # Redis sliding window per IP/user
│   └── middleware/error-handler.ts # X-Request-Id, structured errors
└── index.ts               # Hono server entry point
scripts/
├── scrape-all.ts          # CLI: bun run scrape --target <name> --limit <n>
└── process-documents.ts   # CLI: bun run process (reads .meta.json for title/source)
frontend/
├── index.html, vite.config.ts, tsconfig.json
├── src/
│   ├── main.tsx, App.tsx, index.css
│   ├── lib/
│   │   ├── api-client.ts      # Fetch wrapper with Bearer token, 401 redirect
│   │   ├── auth.ts            # localStorage token get/set/remove, parsePayload, isExpired
│   │   └── utils.ts           # cn() class helper, formatDate, formatMs
│   ├── types/
│   │   ├── api.ts             # Mirror backend: QueryResponse, SourceCitation, Admin* types
│   │   └── app.ts             # Frontend-only: ChatMessage, Conversation, Theme
│   ├── hooks/
│   │   ├── use-auth.ts        # login/register/logout actions
│   │   ├── use-query-mutation.ts  # POST /api/query with loading state
│   │   ├── use-analytics.ts   # GET /api/analytics/*
│   │   ├── use-admin.ts       # All admin data hooks (docs, sources, queries, health)
│   │   ├── use-feedback.ts    # POST /api/queries/:id/feedback
│   │   ├── use-conversations.ts   # localStorage-based conversation list
│   │   ├── use-theme.ts       # dark/light/system toggle
│   │   └── use-local-storage.ts   # Generic typed localStorage hook
│   ├── contexts/
│   │   └── auth-context.tsx   # AuthProvider, verifies token on mount via GET /auth/me
│   ├── components/
│   │   ├── ui/                # button, input, textarea, card, badge, spinner, empty-state,
│   │   │                      # error-boundary, toast, select, dialog, drawer, pagination
│   │   ├── layout/            # app-layout (sidebar+header+outlet), sidebar, header
│   │   ├── admin/             # admin-layout, admin-sidebar (separate from user layout)
│   │   ├── auth/              # login-form, register-form, protected-route, admin-route
│   │   ├── chat/              # chat-container, conversation-sidebar, message-list, message-bubble,
│   │   │                      # assistant-message (markdown+citations+feedback), citation-list,
│   │   │                      # citation-badge, chat-input, source-filter, typing-indicator
│   │   ├── dashboard/         # stat-card, stats-grid, popular-questions
│   │   └── settings/          # profile-form, theme-toggle
│   ├── pages/
│   │   ├── login-page.tsx, register-page.tsx
│   │   ├── chat-page.tsx      # Main page at /chat
│   │   ├── dashboard-page.tsx # /dashboard (auth required)
│   │   ├── documents-page.tsx # /documents (stub)
│   │   ├── evaluation-page.tsx # /evaluation (stub with sample data)
│   │   ├── settings-page.tsx  # /settings
│   │   └── admin/
│   │       ├── admin-overview-page.tsx   # /admin — key metrics + quick links
│   │       ├── admin-documents-page.tsx  # /admin/documents — search, filter, detail drawer, CRUD
│   │       ├── admin-sources-page.tsx    # /admin/sources — add/edit/delete source URLs
│   │       ├── admin-queries-page.tsx    # /admin/queries — browse with feedback filter
│   │       └── admin-system-page.tsx     # /admin/system — Qdrant/Redis/PG/BullMQ health
│   └── data/
│       └── sample-eval-results.ts  # Static eval data for stub page
└── public/favicon.svg
```

## Commands

```bash
bun run dev            # Start backend dev server (port 3000, --watch)
bun run frontend:dev   # Start Vite dev server (port 5173, proxies /api to :3000)
bun run frontend:build # Production build → frontend/dist/
bun run frontend:preview # Preview production build
bun run dev:all        # Start both backend and frontend
bun run scrape         # Run scrapers (--target skatteverket|lagrummet|riksdagen|all --limit N --dry-run)
bun run process        # Process raw documents → chunks → embeddings → Qdrant
bun run worker         # Start BullMQ document processing worker
bun run eval           # Run RAG evaluation suite (17 test questions)
bun run db:generate    # Generate Drizzle migrations
bun run db:migrate     # Run Drizzle migrations
bun run lint           # Biome check
bun run test           # Bun test runner
docker compose up -d   # Start Qdrant, PostgreSQL, Redis
```

## Key Patterns

- **Environment**: All config via Zod-validated `env.ts` with `.refine()` for conditional keys — crashes on startup if invalid
- **Scrapers**: Extend `BaseScraper` — automatic rate limiting (2-3s), retry (3x), request timeout (30s default), health check, `.meta.json` sidecar files for title/source/URL metadata
- **Skatteverket scraper**: Uses Firecrawl API to bypass F5 WAF on `www4.skatteverket.se`. Scrapes ställningstaganden (2500+) and handledningar from `/rattsligvagledning/`. Requires `FIRECRAWL_API_KEY` env var.
- **Lagrummet scraper**: Fast-fails with warning when API is unreachable (data.lagrummet.se is intermittently down)
- **Riksdagen scraper**: Deduplicates against existing files on disk, Cheerio-based HTML stripping
- **Chunking**: Swedish legal separators: `§`, `Kap.`, `Kapitel`, `Avdelning`, `Avsnitt`
- **Embedding**: Batched (100/batch), OpenAI text-embedding-3-large at 1536 dimensions
- **Indexing**: Qdrant upsert in batches of 100, cosine distance, metadata filter support (source, documentId)
- **RAG pipeline**: retrieve (top-K=20) → rerank (Cohere, top-N=5) → assemble (dedup, token budget=6000) → generate (LLM with Swedish tax system prompt) → cite sources as [Källa N]
- **LLM providers**: Factory pattern with cached singleton; switch via `LLM_PROVIDER=openai|anthropic`
- **Worker pipeline**: download → parse → chunk → embed → index (BullMQ, concurrency 2)
- **Auth**: JWT (Hono HS256) + Bun.password (argon2id); `optionalAuth` on all `/api/*`, `requireAuth` on analytics, `requireAdmin` on `/api/admin/*`
- **Admin**: Separate admin section (`/admin/*`) with own layout, sidebar, and route guard; admin seed user `admin@example.se`/`admin123`; BullMQ queue shared via `src/workers/queue.ts`
- **Caching**: Redis with SHA-256 query key; skips cache for conversation follow-ups; graceful on Redis failure
- **Rate limiting**: Redis sliding window (60s); anonymous 10/min, authenticated 60/min; X-RateLimit-* headers
- **Conversations**: Last 5 turns prepended as user/assistant messages to LLM; new conversation created per query if none provided
- **Fallbacks**: Try/catch per pipeline stage — retrieval failure → Swedish fallback, reranker failure → vector scores, LLM failure → fallback + citations
- **Server**: Hono with `export default { port, fetch: app.fetch }` pattern for Bun
- **User feedback**: Thumbs up/down on assistant messages; stored via `POST /api/queries/:id/feedback`; `queryId` returned from RAG pipeline
- **Frontend routing**: React Router v7 — `/login`, `/register` public; `/chat`, `/dashboard`, `/documents`, `/evaluation`, `/settings` protected; `/admin/*` admin-only (separate layout)
- **Frontend state**: React context (auth) + local state (chat) — no state library
- **Frontend conversations**: localStorage-backed (no backend list endpoint); conversationId from first query response used for follow-ups
- **Frontend theme**: Tailwind v4 dark mode via class on `<html>`, persisted in localStorage
- **Frontend proxy**: Vite dev server proxies `/api/*` and `/health` to `http://localhost:3000`

## API

### Authentication
- `POST /api/auth/register` — `{ email, password, name? }` → `{ token, user }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `GET /api/auth/me` — requires Bearer token → `{ user }`

### POST /api/query
```json
{
  "question": "Hur beskattas kapitalvinst vid bostadsförsäljning?",
  "topK": 20,
  "rerankerTopN": 5,
  "tokenBudget": 6000,
  "temperature": 0.1,
  "conversationId": "uuid (optional, for follow-ups)",
  "filters": { "source": ["riksdagen"], "documentId": [] }
}
```
Returns: `{ answer, citations, conversationId, queryId, cached, timings, metadata }`

### Feedback (requires auth)
- `POST /api/queries/:id/feedback` — `{ rating: 1|-1, comment? }`

### Documents (requires auth)
- `GET /api/documents` — `?source=&status=&search=&limit=&offset=` → `{ documents, total }` (includes chunkCount, errorMessage, supersededById)

### Analytics (requires auth)
- `GET /api/analytics/summary` — total queries, 24h/7d/30d counts, avg response time
- `GET /api/analytics/popular` — top 20 most frequent questions

### Admin (requires admin role)
All endpoints under `/api/admin/` require `requireAdmin` middleware.

#### Documents
- `GET /admin/documents/:id` — detail + chunkCount + errorMessage + supersededBy
- `GET /admin/documents/:id/chunks` — paginated chunk list with content
- `DELETE /admin/documents/:id` — remove document + chunks (PG cascade) + Qdrant points
- `POST /admin/documents/:id/reprocess` — reset to pending, queue in BullMQ
- `PATCH /admin/documents/:id` — update supersededById/supersededNote

#### Sources
- `GET /admin/sources` — list with filter (source, status) + documentCount
- `POST /admin/sources` — add (`{ url, source, label }`)
- `PATCH /admin/sources/:id` — change status/label
- `DELETE /admin/sources/:id` — remove (does not delete documents)

#### Queries
- `GET /admin/queries` — paginated list: question, answer (truncated), feedback, timing; filter by feedback
- `GET /admin/queries/:id` — full answer + metadata + sources + feedback
- `GET /admin/queries/stats` — feedback statistics: positive/negative/none counts

#### System Health
- `GET /admin/health` — Qdrant stats, BullMQ queue counts, Redis ping, documents by status/source, total chunks

## Data Sources

| Source | What | Format |
|--------|------|--------|
| Skatteverket | Tax guidance from www.skatteverket.se (skatter, deklaration, fastigheter) | HTML via Playwright |
| Lagrummet | HFD tax court cases | JSON/Atom feed, PDF |
| Riksdagen | Tax propositions (prop), SOU reports | JSON API, HTML |

## Current Status

**Phase 1: COMPLETE** — Scaffolding + data collection pipeline
**Phase 2: COMPLETE** — RAG pipeline core (LLM providers, retriever, reranker, context assembler, prompts, orchestrator, query endpoint, evaluation framework)
**Phase 3: COMPLETE** — JWT auth (Hono JWT + argon2id), conversation history (last 5 turns), Redis cache (SHA-256 key), sliding-window rate limiter, Swedish fallbacks, analytics endpoints
**Phase 4: COMPLETE** — React 18 + Vite 6 + Tailwind v4 frontend: chat UI with markdown + citation badges, conversation history (localStorage), source filters, dashboard with analytics, documents stub, evaluation stub with sample data, settings with theme toggle, JWT auth flow (login/register/protected routes), responsive sidebar layout
**Phase 5: COMPLETE** — Admin dashboard: separate admin layout/sidebar/routes (`/admin/*`), documents CRUD (search/filter/detail drawer/delete/reprocess/mark superseded), sources CRUD (add/edit status/delete URLs), queries browser (feedback filter, expandable answers, feedback stats), system health monitoring (Qdrant/Redis/PG/BullMQ auto-refresh), user feedback (thumbs up/down in chat, stored per query), `requireAdmin` middleware, admin seed user, `sources` table, superseded/feedback fields on documents/queries

## Known Issues

- Skatteverket `www4` subdomain blocked by F5 WAF — scraper uses Firecrawl API to bypass (requires `FIRECRAWL_API_KEY`)
- Lagrummet API (`data.lagrummet.se`) is intermittently unreachable — scraper fast-fails with warning
- `bun.lock` (not `bun.lockb`) is the lockfile format for Bun 1.3.9
- PATH must include `$HOME/.bun/bin` explicitly when running from scripts
- Port 3000 and 5000 often occupied on macOS — use `BACKEND_API_PORT=4000` as alternative
- Vite 6 required (not v7) — Node 20.9.0 lacks `crypto.hash` needed by Vite 7
- `@types/react` must be v18.x to match React 18 (not v19)
- Frontend stub pages (documents, evaluation) need backend endpoints: `GET /api/documents`, `GET /api/eval/results/latest`, `PATCH /api/auth/me`

## Conventions

- Use absolute imports where possible
- Biome formatting: tabs, double quotes, semicolons, 100 char line width
- All async errors should be caught and logged with pino
- Database IDs are UUIDs (defaultRandom in Drizzle)
- Swedish text handling: preserve å, ä, ö in content; sanitize in filenames
- Frontend uses `@/` path alias (mapped to `frontend/src/` via Vite + tsconfig)
- Frontend UI text is in Swedish
- Tailwind v4: `@import "tailwindcss"` + `@tailwindcss/vite` plugin (no PostCSS config)
- Dark mode: `@custom-variant dark (&:where(.dark, .dark *))` + class toggled on `<html>`
