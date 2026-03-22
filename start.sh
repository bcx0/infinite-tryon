#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  npx prisma migrate deploy
fi

npm start
