# FreteCheck

Plataforma SaaS de **certificação de tempo de espera no transporte de fretes**, construída para proteger transportadoras e motoristas dos prejuízos causados por espera excessiva em terminais e portos.

> Base legal: Lei 11.442/2007, Art. 11 · Assinatura digital: ICP-Brasil (MP 2.200-2/2001)

---

## O Problema

Transportadoras e motoristas perdem estimados **R$ 5 bilhões/ano** por espera excessiva em terminais, sem prova técnica de quem causou o atraso. Isso resulta em cobranças indevidas na cadeia logística e responsabilidade solidária incorreta em processos judiciais.

## A Solução

Três pilares principais:

- **CERTIFICAR** — Registro imutável de chegada/saída com geolocalização, identificação do causador e marca d'água nas evidências fotográficas
- **COBRAR** — Geração automática de certificados PDF com assinatura ICP-Brasil e cálculo do valor a receber
- **MAPEAR** — Dados agregados de eficiência logística com score público de terminais

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend Web | Next.js 14 + Tailwind CSS |
| Backend API | NestJS (TypeScript) |
| Banco de Dados | PostgreSQL via Supabase |
| Storage | Supabase Storage |
| Monorepo | Turborepo + pnpm workspaces |
| Assinatura Digital | ICP-Brasil |

---

## Estrutura do Repositório

```
fretecheck/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Next.js
├── packages/
│   ├── types/        # Tipos TypeScript compartilhados
│   └── validators/   # Validações compartilhadas (Zod)
└── specs/
    └── database/     # Schema Prisma + migrações
```

---

## Requisitos

- Node.js >= 20
- pnpm >= 9
- PostgreSQL (via Supabase)

---

## Configuração

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Variáveis de ambiente

**`apps/api/.env`**
```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### 3. Banco de dados

```bash
pnpm db:generate
pnpm db:migrate
```

### 4. Rodar em desenvolvimento

```bash
pnpm dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001/api/v1](http://localhost:3001/api/v1)
- Swagger: [http://localhost:3001/docs](http://localhost:3001/docs)

---

## Funcionalidades Implementadas

- Autenticação JWT com refresh token
- Check-in com geolocalização e foto da chegada
- Apontamento de causa do atraso com evidências (com marca d'água automática)
- Check-out com cálculo automático do tempo excedente e valor estimado
- Geração de certificado PDF com QR Code e assinatura ICP-Brasil
- Página pública de validação de certificados (`/certificado/[numero]`)
- Score e ranking de terminais

---

## Cálculo de Valor

```
valor = (minutos_excedentes ÷ 60) × peso_ton × R$ 1,38/t/h
tempo_livre = 300 minutos (5 horas — Lei 11.442/2007, Art. 11)
```

---

## Licença

Proprietário — todos os direitos reservados.
