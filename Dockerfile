FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM base AS build
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM base AS release
COPY --from=install /app/node_modules node_modules
COPY --from=build /app/dist dist
COPY --from=build /app/package.json .

USER bun
EXPOSE 3000/tcp
ENTRYPOINT ["bun", "run", "dist/index.js"]
