FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Release — Bun runs TypeScript directly, no build step needed
FROM base AS release
COPY --from=install /app/node_modules node_modules
COPY package.json bun.lock drizzle.config.ts ./
COPY src/ src/
COPY scripts/ scripts/
COPY drizzle/ drizzle/

RUN mkdir -p data/raw/riksdagen data/raw/skatteverket data/raw/lagrummet && chown -R bun:bun data

USER bun
EXPOSE 3000/tcp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD curl -f http://localhost:3000/health || exit 1

CMD ["bun", "run", "src/index.ts"]
