# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@10.33.0

WORKDIR /app

# Copiar manifests primeiro (camadas cacheadas se package.json não mudar)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/types/package.json        packages/types/package.json
COPY packages/validators/package.json   packages/validators/package.json
COPY apps/web/package.json              apps/web/package.json

RUN pnpm install --frozen-lockfile

# Copiar código-fonte
COPY packages/types/      packages/types/
COPY packages/validators/ packages/validators/
COPY apps/web/            apps/web/

# Compilar pacotes compartilhados
RUN pnpm --filter @fretecheck/types build && \
    pnpm --filter @fretecheck/validators build

# NEXT_PUBLIC_* são injetadas em build-time pelo Next.js
# Configure no EasyPanel como Build Arg (ou Ambiente):
#   NEXT_PUBLIC_API_URL=https://projeto-fretecheck.fy3ze8.easypanel.host/api/v1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

ARG NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}

ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

ENV NEXT_TELEMETRY_DISABLED=1

# Criar pasta public vazia caso não exista (evita falha no COPY)
RUN mkdir -p apps/web/public

RUN pnpm --filter @fretecheck/web build

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuário sem privilégios
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone cria um servidor Node.js self-contained
# A estrutura em monorepo fica em: .next/standalone/apps/web/server.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public           ./apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
