# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@10.33.0

WORKDIR /app

# Copiar manifests primeiro (camadas cacheadas se package.json não mudar)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/types/package.json        packages/types/package.json
COPY packages/validators/package.json   packages/validators/package.json
COPY specs/database/package.json        specs/database/package.json
COPY apps/api/package.json              apps/api/package.json

RUN pnpm install --frozen-lockfile

# Copiar código-fonte
COPY packages/types/      packages/types/
COPY packages/validators/ packages/validators/
COPY specs/database/      specs/database/
COPY apps/api/            apps/api/

# Compilar pacotes compartilhados
RUN pnpm --filter @fretecheck/types build
RUN pnpm --filter @fretecheck/validators build

# Gerar Prisma Client
RUN pnpm --filter @fretecheck/database generate

# Compilar API (NestJS)
RUN pnpm --filter @fretecheck/api build

# Criar bundle de produção isolado com pnpm deploy
RUN pnpm deploy --legacy --filter @fretecheck/api --prod /app/deploy

# Copiar o Prisma Client gerado para o bundle de produção
RUN cp -r /app/node_modules/.prisma /app/deploy/node_modules/.prisma

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiar apenas o bundle de produção
COPY --from=builder /app/deploy .

EXPOSE 3001

CMD ["node", "dist/main"]
