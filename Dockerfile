# Stage 1: Dependencies (for building)
FROM node:22-slim AS deps
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Skip Playwright browser download - we'll use system Chromium in runner
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install all dependencies (including dev for building)
RUN npm ci

# Set DATA_PATH and DATABASE_URL for prisma generate (config needs it)
ENV DATA_PATH="/data"
ENV DATABASE_URL="file:/data/games.db"

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Builder
FROM node:22-slim AS builder
WORKDIR /app

# Skip Playwright browser download
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

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

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Compile custom server (TypeScript to JavaScript)
RUN npx tsc server.ts lib/socket-events.ts --outDir dist --esModuleInterop --module NodeNext --moduleResolution NodeNext --target ES2022 --skipLibCheck

# Stage 3: Production dependencies only
FROM node:22-slim AS prod-deps
WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Skip Playwright browser download
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install production dependencies only (prisma is now in dependencies)
RUN npm ci --omit=dev

# Set DATA_PATH and DATABASE_URL for prisma generate
ENV DATA_PATH="/data"
ENV DATABASE_URL="file:/data/games.db"

# Generate Prisma client for production
RUN npx prisma generate

# Stage 4: Runner
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies including Chromium for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Tell Playwright to use system chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

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

# Copy production node_modules (includes prisma CLI, socket.io, etc.)
COPY --from=prod-deps /app/node_modules ./node_modules

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
