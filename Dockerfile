# ── Stage 1: install all dependencies (needed for build) ─────────────────────
FROM node:24-alpine AS deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# ── Stage 2: build the client ─────────────────────────────────────────────────
FROM node:24-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/client/node_modules ./packages/client/node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules
COPY . .

# Outputs built client assets to packages/server/public/
RUN pnpm --filter client build

# ── Stage 3: production image ─────────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# pnpm virtual store (root) + server-local node_modules (contains tsx binary)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules

# Server source + client build output (in packages/server/public/)
COPY --from=builder /app/packages/server/src ./packages/server/src
COPY --from=builder /app/packages/server/drizzle ./packages/server/drizzle
COPY --from=builder /app/packages/server/public ./packages/server/public
COPY --from=builder /app/packages/server/package.json ./packages/server/

# Shared package is resolved via the node_modules/shared symlink → packages/shared
COPY --from=builder /app/packages/shared ./packages/shared

EXPOSE 3000
CMD ["node", "packages/server/node_modules/tsx/dist/cli.mjs", "packages/server/src/index.ts"]
