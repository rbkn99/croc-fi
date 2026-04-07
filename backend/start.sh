#!/bin/sh
set -e

echo "[start] Running Prisma migrations..."
npx prisma migrate deploy --schema=shared/prisma/schema.prisma

echo "[start] Starting API server..."
exec node api/dist/index.js
