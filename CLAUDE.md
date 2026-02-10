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
- **Frontend**: React 18, Vite 6, Tailwind CSS v4, React Router v7, shadcn/ui (Radix primitives + CVA)
- **Linter/Formatter**: Biome (tabs, double quotes, semicolons)
- **Containerization**: Docker Compose (Qdrant, PostgreSQL, Redis)

## Project Structure

```
src/
├── config/env.ts          # Zod-validated environment config (LLM + RAG settings)
├── db/schema.ts           # Drizzle tables + enums: documents (sourceId FK, rawContent), chunks, queries, users, conversations, sources (maxDocuments, scrapeIntervalMinutes, rateLimitMs, isActive); docType, audience, refreshPolicy enums
├── db/client.ts           # Drizzle PostgreSQL client
├── db/seed.ts             # Dev seed: test@example.se + admin@example.se
├── scraping/
│   ├── base-scraper.ts    # Abstract base with rate limiting, retry, .meta.json sidecar, onDocument callback
│   ├── skatteverket-scraper.ts
│   ├── lagrummet-client.ts
│   └── riksdagen-client.ts
├── processing/
│   ├── pdf-parser.ts      # PDF → clean text
│   ├── classifier.ts      # Auto-classify docType, audience, taxArea from source metadata + content
│   ├── chunker.ts         # Text → chunks (Swedish legal separators)
│   ├── embedder.ts        # Chunks → OpenAI embeddings
│   └── indexer.ts         # Embeddings → Qdrant (filtered search by source, docType, audience, taxArea)
├── workers/
│   ├── queue.ts               # Shared BullMQ queue + IORedis connection (used by worker + admin routes + schedulers)
│   ├── document-processor.ts  # BullMQ worker: parse → classify → chunk → embed → index; content fallback: job data > DB rawContent > file on disk
│   ├── refresh-scheduler.ts   # Refresh scheduler: daily cron + manual trigger, content hash comparison
│   └── scrape-scheduler.ts    # Scrape scheduler: source-based BullMQ jobs, per-source config (scrapeIntervalMinutes), 5-min schedule check, stores rawContent in DB
├── core/
│   ├── types.ts           # Shared RAG types (RetrievedChunk, RAGResponse, etc.)
│   ├── llm/
│   │   ├── llm-provider.ts      # LLMProvider interface
│   │   ├── openai-provider.ts   # OpenAI GPT-4o
│   │   ├── anthropic-provider.ts # Anthropic Claude
│   │   └── llm-factory.ts       # Factory + cached singleton
│   ├── retriever.ts       # Query embed → Qdrant filtered search → RetrievedChunk[]
│   ├── reranker.ts        # Cohere rerank-multilingual-v3.0
│   ├── context-assembler.ts # Dedup, doc-grouped ordering, token budget, docType → Swedish labels
│   ├── prompts.ts         # Swedish tax system prompt (with source hierarchy), user/eval prompts
│   ├── rag-pipeline.ts    # Orchestrator: retrieve → rerank → assemble → generate (with fallbacks)
│   ├── cache.ts           # Redis cache: get/set/delete, SHA-256 query cache key
│   ├── conversation.ts    # Create conversation, fetch history (last 5 turns)
│   ├── fallbacks.ts       # Swedish-language fallback responses
│   └── evaluation/
│       ├── types.ts              # Eval types (EvaluationSummary, EvalCategory, etc.)
│       ├── test-questions.ts     # 17 Swedish tax test questions
│       ├── faq-questions.ts      # 25 Skatteverket FAQ-based eval questions with reference answers
│       ├── relevance-scorer.ts   # LLM-based chunk relevance scoring
│       ├── faithfulness-checker.ts # LLM-based answer grounding check
│       ├── metrics.ts            # Citation accuracy, keyword coverage, precision
│       └── runner.ts             # Eval orchestrator + CLI entry point (--faq, --all flags)
├── auth/
│   ├── jwt.ts             # sign/verify JWT (Hono JWT, HS256)
│   └── password.ts        # Bun.password argon2id hash/verify
├── api/
│   ├── routes/health.ts
│   ├── routes/auth.ts     # POST /auth/register, /auth/login, GET /auth/me
│   ├── routes/query.ts    # POST /api/query — full RAG pipeline, POST /api/queries/:id/feedback
│   ├── routes/analytics.ts # GET /analytics/summary, /analytics/popular
│   ├── routes/documents.ts # GET /api/documents — list with search/filter/chunkCount
│   ├── routes/admin.ts    # /api/admin/* — documents CRUD, sources CRUD, queries/feedback, system health, refresh/scrape trigger
│   ├── middleware/auth.ts  # optionalAuth + requireAuth JWT middleware
│   ├── middleware/admin.ts # requireAdmin (requireAuth + role === "admin")
│   ├── middleware/rate-limiter.ts  # Redis sliding window per IP/user
│   └── middleware/error-handler.ts # X-Request-Id, structured errors
└── index.ts               # Hono server entry point
scripts/
├── scrape-all.ts          # CLI: bun run scrape --target <name> --limit <n>
├── process-documents.ts   # CLI: bun run process (imports existing files on disk → DB records with rawContent → queues for worker)
└── backfill-content.ts    # One-time: backfill rawContent from files on disk for existing documents
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
│   │   ├── ui/                # shadcn/ui: button, input, textarea, label, card, badge, select,
│   │   │                      # dialog, alert-dialog, sheet, dropdown-menu, separator, sonner
│   │   │                      # custom: spinner, pagination, empty-state, error-boundary
│   │   ├── layout/            # app-layout (sidebar+header+outlet), sidebar, header
│   │   ├── admin/             # admin-layout, admin-sidebar, pipeline-steps (extracted components)
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
│   │       ├── admin-sources-page.tsx    # /admin/sources — table, row click → detail page; exports shared helpers
│   │       ├── admin-source-detail-page.tsx # /admin/sources/:id — config form, paginated doc table, doc detail Sheet
│   │       ├── admin-queries-page.tsx    # /admin/queries — browse with feedback filter
│   │       └── admin-system-page.tsx     # /admin/system — Qdrant/Redis/PG/BullMQ/Refresh/Scrape health
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
bun run process        # Import raw documents from disk → create DB records → queue for worker
bun run worker         # Start BullMQ document processing worker
bun run refresh-worker # Start refresh scheduler (checks for stale documents daily at 03:00)
bun run scrape-worker  # Start scrape scheduler (per-source interval, 5-min check cycle)
bun run eval           # Run RAG evaluation suite (17 test questions; --faq for 25 FAQ questions, --all for both)
bun run db:generate    # Generate Drizzle migrations
bun run db:migrate     # Run Drizzle migrations
bun run lint           # Biome check
bun run test           # Bun test runner
docker compose up -d                    # Start Qdrant, PostgreSQL, Redis (dev)
docker compose -f docker-compose.prod.yml up -d  # Start all services (prod)
```

## Key Patterns

- **Environment**: All config via Zod-validated `env.ts` with `.refine()` for conditional keys — crashes on startup if invalid
- **Scrapers**: Extend `BaseScraper` — automatic rate limiting (2-3s), retry (3x), request timeout (30s default), health check, `.meta.json` sidecar files for title/source/URL metadata
- **Skatteverket scraper**: Uses Firecrawl API to bypass F5 WAF on `www4.skatteverket.se`. Scrapes ställningstaganden (2500+) and handledningar from `/rattsligvagledning/`. Requires `FIRECRAWL_API_KEY` env var.
- **Lagrummet scraper**: Fast-fails with warning when API is unreachable (data.lagrummet.se is intermittently down)
- **Riksdagen scraper**: Fetches propositions/SOU + gällande SFS (lagtext) via multiple tax-related search terms (skatt, avgift, avdrag, tull, taxering). Deduplicates by dok_id and against files on disk. Cheerio-based HTML stripping. Supports `doktyp` config param to fetch only specific types (e.g. `sfs` or `prop,sou`)
- **Chunking**: Swedish legal separators: `§`, `Kap.`, `Kapitel`, `Avdelning`, `Avsnitt`
- **Embedding**: Batched (100/batch), OpenAI text-embedding-3-large at 1536 dimensions
- **Metadata classification**: Auto-classify `docType` (ställningstagande, handledning, proposition, sou, lagtext, etc.), `audience` (allmän, företag, specialist), `taxArea` (inkomstskatt, moms, etc.) via `src/processing/classifier.ts`
- **Indexing**: Qdrant upsert in batches of 100, cosine distance, metadata filter support (source, documentId, docType, audience, taxArea)
- **RAG pipeline**: retrieve (top-K=20) → rerank (Cohere, top-N=5) → assemble (dedup, token budget=6000) → generate (LLM with Swedish tax system prompt + source hierarchy) → cite sources as [Källa N: Dokumenttyp - Titel]
- **Source hierarchy**: System prompt instructs LLM to prioritize: lagtext (SFS) > propositioner/SOU > rättsfall > ställningstaganden > handledningar
- **LLM providers**: Factory pattern with cached singleton; switch via `LLM_PROVIDER=openai|anthropic`
- **Worker pipeline**: parse → classify → chunk → embed → index (BullMQ, concurrency 2); content fallback chain: job data `content` > DB `rawContent` > file on disk; `existsSync` check before file read; computes SHA-256 contentHash for change detection
- **Refresh scheduler**: BullMQ repeatable job (daily 03:00) checks documents with `refreshPolicy != "once"` and stale `lastCheckedAt`; re-queues for processing; skips unchanged content via hash comparison
- **Scrape scheduler**: Source-based — each source has its own config (maxDocuments, scrapeIntervalMinutes, rateLimitMs, isActive). BullMQ `scrape-jobs` queue (concurrency 1); 5-minute check cycle triggers sources due for scraping based on `scrapeIntervalMinutes` (0 = manual only); health check → scrape with `onDocument` callback (creates DB record with `sourceId` FK + stores `rawContent` in DB + queues processing) → update `sources.lastScrapedAt`; admin API trigger via `sourceId`; configurable via `SCRAPE_SCHEDULE_ENABLED`
- **Graceful shutdown**: `SIGTERM`/`SIGINT` handlers in `src/index.ts` close all BullMQ queues + Redis connection before exit
- **Auth**: JWT (Hono HS256) + Bun.password (argon2id); `optionalAuth` on all `/api/*`, `requireAuth` on analytics, `requireAdmin` on `/api/admin/*`
- **Admin**: Separate admin section (`/admin/*`) with own layout, sidebar, and route guard; admin seed user `admin@example.se`/`admin123`; BullMQ queue shared via `src/workers/queue.ts`; sources list page → detail page (`/admin/sources/:id`) with inline config form, paginated document table, document detail Sheet
- **Caching**: Redis with SHA-256 query key; skips cache for conversation follow-ups; graceful on Redis failure
- **Rate limiting**: Redis sliding window (60s); anonymous 10/min, authenticated 60/min; X-RateLimit-* headers
- **Conversations**: Last 5 turns prepended as user/assistant messages to LLM; new conversation created per query if none provided
- **Fallbacks**: Try/catch per pipeline stage — retrieval failure → Swedish fallback, reranker failure → vector scores, LLM failure → fallback + citations
- **Server**: Hono with `export default { port, fetch: app.fetch }` pattern for Bun
- **User feedback**: Thumbs up/down on assistant messages; stored via `POST /api/queries/:id/feedback`; `queryId` returned from RAG pipeline
- **Frontend routing**: React Router v7 — `/login`, `/register` public; `/chat`, `/dashboard`, `/documents`, `/evaluation`, `/settings` protected; `/admin/*` admin-only (separate layout; `/admin/sources/:id` detail page with paginated docs)
- **Frontend state**: React context (auth) + local state (chat) — no state library
- **Frontend conversations**: localStorage-backed (no backend list endpoint); conversationId from first query response used for follow-ups
- **Frontend UI**: shadcn/ui components (Radix primitives + CVA); `components.json` config; Badge extended with success/warning/info/danger variants; Spinner uses lucide Loader2; Pagination uses shadcn Button; Sheet replaces Drawer; Sonner replaces custom toast; Dialog/Select/DropdownMenu are Radix-based
- **Frontend theme**: Tailwind v4 dark mode via class on `<html>`, persisted in localStorage; CSS variables for shadcn color tokens (oklch) in `:root` and `.dark`
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
  "filters": { "source": ["riksdagen"], "documentId": [], "docType": ["proposition"], "audience": ["specialist"], "taxArea": ["kapitalvinst"] }
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
- `PATCH /admin/documents/:id` — update supersededById/supersededNote/refreshPolicy

#### Sources
- `GET /admin/sources` — list with filter (source, status) + documentCount (via sourceId FK)
- `GET /admin/sources/:id` — single source detail with documentCount
- `POST /admin/sources` — add (`{ url, source, label, maxDocuments?, scrapeIntervalMinutes?, rateLimitMs?, isActive? }`)
- `PATCH /admin/sources/:id` — update config (url, label, isActive, maxDocuments, scrapeIntervalMinutes, rateLimitMs, status)
- `DELETE /admin/sources/:id` — remove (does not delete documents, FK SET NULL)

#### Queries
- `GET /admin/queries` — paginated list: question, answer (truncated), feedback, timing; filter by feedback
- `GET /admin/queries/:id` — full answer + metadata + sources + feedback
- `GET /admin/queries/stats` — feedback statistics: positive/negative/none counts

#### Refresh
- `POST /admin/refresh/trigger` — manually trigger refresh check for stale documents

#### Scraping
- `POST /admin/scrape/trigger` — `{ sourceId: uuid }` → `{ jobId }` (uses source config for limit, rateLimit, doktyp)
- `GET /admin/scrape/status` — queue stats (waiting, active, completed, failed)

#### Activity Log
- `GET /admin/activity` — paginated documents (sorted updatedAt DESC) + BullMQ queue stats + total count; params: `?sourceId=uuid`, `?source=riksdagen`, `?limit=50`, `?offset=0`

#### System Health
- `GET /admin/health` — Qdrant stats, BullMQ queue counts, refresh/scrape scheduler stats, Redis ping, documents by status/source, total chunks

## Data Sources

| Source | What | Format |
|--------|------|--------|
| Skatteverket | Tax guidance from www.skatteverket.se (skatter, deklaration, fastigheter) | HTML via Firecrawl |
| Lagrummet | HFD tax court cases | JSON/Atom feed, PDF |
| Riksdagen | Tax propositions (prop), SOU reports, gällande SFS lagtext | JSON API, HTML |

## Current Status

**Phase 1: COMPLETE** — Scaffolding + data collection pipeline
**Phase 2: COMPLETE** — RAG pipeline core (LLM providers, retriever, reranker, context assembler, prompts, orchestrator, query endpoint, evaluation framework)
**Phase 3: COMPLETE** — JWT auth (Hono JWT + argon2id), conversation history (last 5 turns), Redis cache (SHA-256 key), sliding-window rate limiter, Swedish fallbacks, analytics endpoints
**Phase 4: COMPLETE** — React 18 + Vite 6 + Tailwind v4 frontend: chat UI with markdown + citation badges, conversation history (localStorage), source filters, dashboard with analytics, documents stub, evaluation stub with sample data, settings with theme toggle, JWT auth flow (login/register/protected routes), responsive sidebar layout
**Phase 5: COMPLETE** — Admin dashboard: separate admin layout/sidebar/routes (`/admin/*`), documents CRUD (search/filter/detail drawer/delete/reprocess/mark superseded), sources CRUD (add/edit status/delete URLs), queries browser (feedback filter, expandable answers, feedback stats), system health monitoring (Qdrant/Redis/PG/BullMQ auto-refresh), user feedback (thumbs up/down in chat, stored per query), `requireAdmin` middleware, admin seed user, `sources` table, superseded/feedback fields on documents/queries
**Phase 7: COMPLETE** — Metadata-enriched pipeline: `docType`/`audience`/`taxArea` enums + columns on documents table, auto-classification via `classifier.ts`, scrapers emit structured metadata, worker passes rich metadata to Qdrant, context assembler shows Swedish docType labels, system prompt with source hierarchy (lagtext > rättsfall > ställningstaganden > handledningar), new Qdrant filters (docType/audience/taxArea), query API supports new filter fields, content hash (SHA-256) for change detection, refresh scheduler (daily cron + manual trigger), admin refresh endpoint + UI
**Phase 8: COMPLETE** — Production deploy + scheduled scraping: Dockerfile fixed (bun.lock, multi-stage, healthcheck), `.dockerignore`, `docker-compose.prod.yml` (backend/worker/refresh-worker/scrape-worker), graceful shutdown (SIGTERM/SIGINT), BullMQ scrape scheduler (`scrape-jobs` queue, weekly cron, admin trigger/status API), scrape scheduler UI (system health card, per-source scrape button), GitHub Actions CI (lint + Docker build)
**Phase 9: COMPLETE** — Activity log + pipeline fixes: admin log page (`/admin/log`) with pipeline step visualization (pending→parsing→chunking→embedding→indexed), source URL links, pipeline duration display, auto-refresh every 5s, queue summary cards; scrape scheduler streams documents to DB immediately via `onDocument` callback; `bun run process` rewritten to import existing files into DB + queue for worker; shared Docker volume (`raw_data`) for scraped files across containers; Dockerfile `ENTRYPOINT` → `CMD` fix
**Phase 10: COMPLETE** — SFS lagtext + evaluation: riksdagen scraper extended with gällande SFS documents (multiple search terms: skatt, avgift, avdrag, tull, taxering with dedup), `lagtext` docType added to schema/classifier/context-assembler, source hierarchy updated (lagtext > propositioner > rättsfall > ställningstaganden > handledningar), 25 Skatteverket FAQ-based evaluation questions with reference answers (`bun run eval --faq`), admin dark mode toggle
**Phase 11: COMPLETE** — Source as primary entity: per-source config (maxDocuments, scrapeIntervalMinutes, rateLimitMs, isActive), `sourceId` FK on documents, riksdagen scraper `doktyp` param, source-based scrape scheduler (5-min check cycle, per-source interval in minutes, 0=manual), admin sources page with drawer (config + activity tabs, editable URL, interval presets + custom), pipeline-steps extracted components, log page removed
**Phase 12: COMPLETE** — shadcn/ui migration: all UI primitives replaced with shadcn/ui (Radix + CVA); CSS variables for theming (oklch); Button uses disabled+Loader2 instead of isLoading prop; Input/Textarea use separate Label component; Select is Radix-based (onValueChange); Dialog/Sheet are Radix-based; DropdownMenu is Radix-based; Toast replaced by Sonner; Badge extended with success/warning/info/danger variants; Spinner uses lucide Loader2; Pagination uses shadcn Button
**Phase 13: COMPLETE** — Source detail page + DB-stored content: dedicated `/admin/sources/:id` page with inline config form, paginated document table (activity endpoint supports limit/offset/total), document detail Sheet with reprocess/delete; `rawContent` text column on documents table stores scraped content in DB (eliminates Docker shared volume dependency for content); worker content fallback chain: job data > DB rawContent > file on disk; `GET /admin/sources/:id` endpoint; sources list page row click navigates to detail; backfill script for existing documents

## Known Issues

- Skatteverket `www4` subdomain blocked by F5 WAF — scraper uses Firecrawl API to bypass (requires `FIRECRAWL_API_KEY`)
- Lagrummet API (`data.lagrummet.se`) is intermittently unreachable — scraper fast-fails with warning
- `bun.lock` (not `bun.lockb`) is the lockfile format for Bun 1.3.9
- PATH must include `$HOME/.bun/bin` explicitly when running from scripts
- Port 3000 and 5000 often occupied on macOS — use `BACKEND_API_PORT=4000` as alternative
- Vite 6 required (not v7) — Node 20.9.0 lacks `crypto.hash` needed by Vite 7
- `@types/react` must be v18.x to match React 18 (not v19)
- Frontend stub pages (documents, evaluation) need backend endpoints: `GET /api/documents`, `GET /api/eval/results/latest`, `PATCH /api/auth/me`
- Dockerfile uses `CMD` (not `ENTRYPOINT`) so docker-compose `command:` overrides work correctly
- Docker prod `raw_data` volume still used for file-based fallback but no longer required — `rawContent` column in DB is the primary content source
- `drizzle-kit` is a devDependency, not available in prod image — `db:migrate` in docker-compose command has `|| true` fallback

## Conventions

- **Documentation maintenance**: CLAUDE.md and README.md must always be reviewed and updated when adding new features, changing architecture, or modifying key patterns. Ensure project status, file structure, API endpoints, commands, and data sources reflect the current state of the codebase. Add new logic and patterns when relevant.
- Use absolute imports where possible
- Biome formatting: tabs, double quotes, semicolons, 100 char line width
- All async errors should be caught and logged with pino
- Database IDs are UUIDs (defaultRandom in Drizzle)
- Swedish text handling: preserve å, ä, ö in content; sanitize in filenames
- Frontend uses `@/` path alias (mapped to `frontend/src/` via Vite + tsconfig)
- Frontend UI text is in Swedish
- Tailwind v4: `@import "tailwindcss"` + `@tailwindcss/vite` plugin (no PostCSS config)
- Dark mode: `@custom-variant dark (&:where(.dark, .dark *))` + class toggled on `<html>`; CSS variables in `:root`/`.dark` for shadcn theming
- UI components: shadcn/ui (Radix primitives + CVA); `components.json` at `frontend/`; components are copied into `frontend/src/components/ui/` and can be customized; use `bunx --bun shadcn@latest add <component>` to add new ones; `cn()` uses clsx + tailwind-merge
- Buttons: use `disabled={loading}` + `<Loader2 className="animate-spin" />` child for loading states (no `isLoading` prop)
- Form fields: use separate `<Label>` component above `<Input>`/`<Textarea>`; no `label` prop on inputs
- Selects: Radix-based — use `<Select value onValueChange>` + `<SelectTrigger>/<SelectContent>/<SelectItem>`; use `"_all"` sentinel value for "show all" option (Radix requires non-empty string values)
- Dialogs: Radix-based — compose `<Dialog>/<DialogContent>/<DialogHeader>/<DialogTitle>/<DialogFooter>`
- Side panels: use `<Sheet>` (not Drawer); Radix-based with `side="right"`
- Toasts: use `sonner` — `<Toaster />` in layouts, `toast.success()`/`toast.error()` to trigger
