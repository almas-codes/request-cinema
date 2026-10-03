# syntax=docker/dockerfile:1.4
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 cinema

COPY --from=builder --chown=cinema:nodejs /app/packages ./packages
COPY --from=builder --chown=cinema:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=cinema:nodejs /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder --chown=cinema:nodejs /app/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=cinema:nodejs /app/node_modules ./node_modules

USER cinema
EXPOSE 3000 4318

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

CMD ["node", "apps/server/dist/main.js"]
