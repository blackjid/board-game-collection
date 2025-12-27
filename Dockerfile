# Stage 1: Dependencies
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

# Install dependencies
RUN npm ci

# Install Playwright browsers (chromium only for scraping)
RUN npx playwright install chromium --with-deps

# Set DATA_PATH and DATABASE_URL for prisma generate (config needs it)
ENV DATA_PATH="/data"
ENV DATABASE_URL="file:/data/games.db"

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Builder
FROM node:22-slim AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set DATA_PATH and DATABASE_URL for build time (actual values set at runtime)
ENV DATA_PATH="/data"
ENV DATABASE_URL="file:/data/games.db"

# Generate Prisma client (needed for build)
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
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

# Copy standalone build (server.js and minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema and migrations
COPY --from=builder /app/prisma ./prisma

# Copy production Prisma config (JavaScript version for runtime)
COPY prisma.config.prod.js ./prisma.config.js

# Copy full node_modules from deps stage to enable prisma CLI
# This replaces the minimal standalone node_modules
COPY --from=deps /app/node_modules ./node_modules

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
