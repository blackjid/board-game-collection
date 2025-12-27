#!/bin/sh
set -e

# Set database URL to the data directory (can be overridden by environment variable)
export DATABASE_URL="${DATABASE_URL:-file:/app/data/prod.db}"

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting Next.js server..."
exec node server.js
