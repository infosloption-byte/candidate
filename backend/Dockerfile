# BuildHire API (Fastify + Prisma 7 + MariaDB/MySQL driver adapter)
FROM node:22-bookworm-slim

# openssl: needed by Prisma's schema engine (`prisma migrate deploy` at start-up)
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Everything below runs as the unprivileged `node` user so that anything Prisma downloads
# (engines, cache) is owned by -- and readable by -- the user that runs the app.
RUN mkdir -p /app /data/documents && chown -R node:node /app /data
WORKDIR /app
USER node

ENV PRISMA_HIDE_UPDATE_MESSAGE=1 \
    CHECKPOINT_DISABLE=1

# `prisma generate` (run by the postinstall + build scripts) loads prisma.config.ts, which throws if
# DATABASE_URL is *unset* -- even though generate never connects. This dummy value exists only
# at build time; the real DATABASE_URL is supplied at runtime from backend/.env.
ARG BUILD_DATABASE_URL="mysql://build:build@localhost:3306/build"

# 1) dependencies (dev deps are kept on purpose: the `prisma` CLI runs migrations, `tsx` runs the seed)
COPY --chown=node:node package.json package-lock.json* ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts ./
RUN DATABASE_URL="$BUILD_DATABASE_URL" sh -c 'if [ -f package-lock.json ]; then npm ci; else npm install; fi'

# 2) source + build (prisma generate -> src/generated, then tsc -> dist/)
COPY --chown=node:node . .
RUN sed -i 's/\r$//' docker-entrypoint.sh \
 && DATABASE_URL="$BUILD_DATABASE_URL" npm run build

EXPOSE 4000
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
