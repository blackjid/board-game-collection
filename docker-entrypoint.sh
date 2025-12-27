#!/bin/sh
set -e

# Set data path (can be overridden by environment variable)
export DATA_PATH="${DATA_PATH:-/data}"

# Construct database URL from DATA_PATH if DATABASE_URL not explicitly set
export DATABASE_URL="${DATABASE_URL:-file:${DATA_PATH}/games.db}"

echo "Data path: ${DATA_PATH}"
echo "Database URL: ${DATABASE_URL}"

echo "Running database migrations..."
# Use --config to specify the JS config file
node node_modules/prisma/build/index.js migrate deploy --config prisma.config.js

echo "Starting custom server with Socket.IO..."
exec node dist/server.js
