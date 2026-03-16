#!/bin/sh
set -e

echo "=== Running Prisma db push ==="
npx prisma db push --skip-generate 2>&1 || echo "WARNING: Prisma db push failed"

echo "=== Starting Next.js ==="
exec node server.js
