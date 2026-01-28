# syntax=docker/dockerfile:1.4

# Stage 1: Dependencies (for building)
FROM node:22-slim AS deps
WORKDIR /app

# Install build dependencies with apt cache mount
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends openssl

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install all dependencies with npm cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Set DATA_PATH and DATABASE_URL for prisma generate (config needs it)
ENV DATA_PATH="/data"
ENV DATABASE_URL="file:/data/games.db"

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Builder
FROM node:22-slim AS builder
WORKDIR /app

# Copy dependencies from deps stage (includes generated Prisma client)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set DATA_PATH and DATABASE_URL for build time
ENV DATA_PATH="/data"
ENV DATABASE_URL="file:/data/games.db"

# Build-time ARG for public base URL (for share links/QR codes)
# Pass with: docker build --build-arg NEXT_PUBLIC_BASE_URL=https://games.example.com
ARG NEXT_PUBLIC_BASE_URL=""
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

# Build-time ARG for app version (git tag or "latest" for CI builds)
# Pass with: docker build --build-arg APP_VERSION=v1.0.0
ARG APP_VERSION="dev"
ENV NEXT_PUBLIC_APP_VERSION=${APP_VERSION}

# Build-time ARG for commit SHA
# Pass with: docker build --build-arg APP_COMMIT_SHA=abc1234...
ARG APP_COMMIT_SHA=""
ENV NEXT_PUBLIC_APP_COMMIT_SHA=${APP_COMMIT_SHA}

# Build Next.js application with build cache mount for faster rebuilds
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Compile custom server using esbuild (much faster than tsc)
# esbuild is already available via Next.js dependencies
RUN npx esbuild server.ts --bundle --platform=node --target=node22 --outfile=dist/server.js \
    --external:next --external:socket.io --external:@prisma/client --external:prisma

# Prune dev dependencies to get production-only node_modules
# This eliminates the need for a separate prod-deps stage
RUN --mount=type=cache,target=/root/.npm \
    npm prune --omit=dev

# Regenerate Prisma client after pruning (since @prisma/client was kept)
RUN npx prisma generate

# Stage 3: Runner (lightweight Node.js image)
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install openssl for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 nodejs && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy Next.js build output (not standalone - we use custom server)
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Copy compiled custom server
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# Copy Prisma schema and migrations
COPY --from=builder /app/prisma ./prisma

# Copy production Prisma config (JavaScript version for runtime)
COPY prisma.config.prod.js ./prisma.config.js

# Copy production node_modules (already pruned in builder stage)
COPY --from=builder /app/node_modules ./node_modules

# Copy package.json for next to find config
COPY --from=builder /app/package.json ./package.json

# Copy next.config.ts for runtime
COPY --from=builder /app/next.config.ts ./next.config.ts

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create data directory for SQLite database
RUN mkdir -p /data && chown -R nextjs:nodejs /data

USER nextjs

EXPOSE 3000

# Default data path (can be overridden at runtime via -e DATA_PATH=/custom/path)
ENV DATA_PATH="/data"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use entrypoint to run migrations before starting
ENTRYPOINT ["./docker-entrypoint.sh"]
