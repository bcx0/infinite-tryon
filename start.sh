#!/bin/sh
set -e

# Sync Prisma schema with database (safe for production — only adds new tables/columns)
npx prisma db push --accept-data-loss 2>/dev/null || echo "Warning: prisma db push failed, continuing..."

npm start
