# syntax=docker/dockerfile:1
# Debian slim (glibc), so sharp and better-sqlite3 install as prebuilt binaries.
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

FROM base AS build
# compilers for better-sqlite3 when no prebuilt binary fits (only in this stage, not in the final image)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# lib/auth validates its secret when the build loads it. A placeholder for this step only, the real one comes from .env at runtime.
RUN BETTER_AUTH_SECRET=build-placeholder-never-used-at-runtime-000000 pnpm build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 DATABASE_PATH=/data/lateshow.db
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle
# /data holds the database, .next/cache the resized images. Both are volumes, so they survive deploys.
RUN mkdir -p /data .next/cache && chown node:node /data .next/cache
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --start-interval=2s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
