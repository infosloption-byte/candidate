#!/bin/sh
# Applies pending Prisma migrations, then starts the API.
set -e

attempt=1
max=15
until ./node_modules/.bin/prisma migrate deploy; do
  if [ "$attempt" -ge "$max" ]; then
    echo "[buildhire_api] migrations still failing after $attempt attempts -- giving up" >&2
    exit 1
  fi
  echo "[buildhire_api] migrate deploy failed (attempt $attempt/$max), retrying in 4s..." >&2
  attempt=$((attempt + 1))
  sleep 4
done

echo "[buildhire_api] migrations OK -- starting: $*"
exec "$@"
