FROM node:20-alpine3.18

# OpenSSL 1.1 para Prisma Client (Alpine 3.18 tem OpenSSL 1.1)
RUN apk add --no-cache openssl
RUN npm install -g pnpm@10.33.0

WORKDIR /app

# ── Dependências (camada cacheada) ───────────────────────────────────────────
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/types/package.json        packages/types/package.json
COPY packages/validators/package.json   packages/validators/package.json
COPY specs/database/package.json        specs/database/package.json
COPY apps/api/package.json              apps/api/package.json

RUN pnpm install --frozen-lockfile

# ── Código-fonte ─────────────────────────────────────────────────────────────
COPY packages/types/      packages/types/
COPY packages/validators/ packages/validators/
COPY specs/database/      specs/database/
COPY apps/api/            apps/api/

# ── Build ─────────────────────────────────────────────────────────────────────
RUN pnpm --filter @fretecheck/types build && \
    pnpm --filter @fretecheck/validators build && \
    pnpm --filter @fretecheck/database generate && \
    pnpm --filter @fretecheck/api build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "apps/api/dist/main"]
