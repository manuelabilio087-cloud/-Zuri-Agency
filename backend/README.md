# Zuri Agency — Backend

API em Node.js + Express + TypeScript + Prisma (PostgreSQL). Já inclui autenticação completa (registo, login, refresh token via cookie httpOnly, logout) e controlo de limites por plano (Free/Starter/Pro).

## Estrutura

```
src/
├── config/          # env, database (Prisma), constantes (limites de plano)
├── modules/
│   ├── auth/         # registo, login, refresh, logout — completo
│   └── companies/    # stub — pronto para integrar Google Places API
├── middlewares/       # error handler, controlo de limites por plano
├── database/          # (migrations vivem em /prisma)
└── app.ts / server.ts
prisma/
└── schema.prisma      # User, Company, Analysis, Lead, UsageLog
```

## Correr localmente

1. `npm install`
2. Copia `.env.example` para `.env` e preenche `DATABASE_URL` (podes usar um Postgres local ou já a instância do Railway).
3. `npm run prisma:migrate:dev` — cria as tabelas na base de dados.
4. `npm run dev` — arranca em `http://localhost:4000`.

## Deploy no Railway

1. Cria um novo projeto no Railway e adiciona um serviço PostgreSQL (Railway gera automaticamente a `DATABASE_URL`).
2. Adiciona um segundo serviço a partir deste repositório GitHub (`zuri-agency-backend`).
3. Em **Variables**, define: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL` (o domínio do Vercel), e liga a `DATABASE_URL` do serviço PostgreSQL (Railway permite referenciar variáveis entre serviços).
4. Define o **Build Command**: `npm run build && npm run prisma:migrate`
5. Define o **Start Command**: `npm start`
6. Railway atribui automaticamente `PORT` — o código já lê `process.env.PORT`.

## Endpoints disponíveis

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cria conta (nome, email, password) |
| POST | `/api/auth/login` | Login (email, password) |
| POST | `/api/auth/refresh` | Novo access token via cookie de refresh |
| POST | `/api/auth/logout` | Termina sessão |
| GET | `/api/companies/search` | Placeholder — protegido, respeita limite do plano |
| GET | `/health` | Health check |

## Próximos passos técnicos

- Implementar `places.service.ts` (Google Places API) dentro de `modules/companies`.
- Implementar `website-analyzer.service.ts` + fila BullMQ/Redis para análise assíncrona.
- Módulo `ai` (scoring + geração de conteúdo comercial via Anthropic API).
- Módulo `billing` (Paysuite/Quick-e-Pay).
