# Zuri Agency — Backend

API em Node.js + Express + TypeScript + Prisma (PostgreSQL). Já inclui autenticação completa (registo, login, refresh token via cookie httpOnly, logout) e controlo de limites por plano (Free/Starter/Pro).

## Estrutura

```
src/
├── config/          # env, database (Prisma), constantes (limites de plano)
├── modules/
│   ├── auth/         # registo, login, refresh, logout — completo
│   └── companies/    # pesquisa (Google Places), website analyzer, scoring — completo
├── middlewares/       # error handler, controlo de limites por plano
├── database/          # (migrations vivem em /prisma)
└── app.ts / server.ts
prisma/
└── schema.prisma      # User, Company, CompanyAnalysis, Lead, UsageLog
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
| POST | `/api/companies/search` | Pesquisa empresas por `category` + `city` (cache 30 dias → Google Places API), dispara análise em background |
| GET | `/api/companies/:id` | Ficha completa da empresa, com `analysis` (Website Score, SEO Score, Sales Score, Lead Temperature, serviço recomendado) |
| GET | `/api/companies/:id/analysis-status` | Polling: `{ status: "pending" \| "done", analysis }` |
| GET | `/health` | Health check |

### Google Places — configuração necessária

Preenche `GOOGLE_PLACES_API_KEY` no `.env` com uma chave com a **Places API (New)** ativada no Google Cloud Console. Sem esta chave, `/api/companies/search` devolve erro 503 (a não ser que já existam resultados em cache válidos para essa categoria/cidade).

### Website Analyzer + Scoring — como funciona

Depois de uma pesquisa devolver empresas, o sistema dispara automaticamente (em background, sem bloquear a resposta) a análise de cada empresa nova:

1. **Sinais técnicos** (`website-analyzer.service.ts`) — HTTPS, viewport mobile, velocidade de resposta, título/meta description, headings, dados estruturados — tudo calculado sem IA.
2. **Sinais qualitativos** — se `ANTHROPIC_API_KEY` estiver definida, o conteúdo do website é enviado ao modelo `claude-haiku-4-5-20251001` (custo-eficiente, adequado para esta tarefa estruturada) para avaliar qualidade de conteúdo, clareza de contacto, CTA e frescura visual. Sem chave configurada, estes fatores ficam a 0 (o resto do score continua a funcionar).
3. **Scoring** (`scoring.service.ts`) — combina os sinais acima com os dados da própria empresa (rating, reviews, contacto) em `salesScore`, `leadTemperature`, `recommendedService` e `closeProbability`, e persiste tudo em `CompanyAnalysis`.

O número de análises disparadas por pesquisa respeita o limite `analysesPerMonth` do plano do utilizador — se o limite for atingido, as empresas ficam sem análise (`status: "pending"` no endpoint de status) até ao próximo mês ou upgrade.

> Nota de arquitetura: isto corre in-process (fire-and-forget) por já não haver fila configurada. Para produção a sério, mover para BullMQ + Redis, conforme o PRD original — fica marcado como próximo passo abaixo.

## Próximos passos técnicos

- Mover a análise de empresas para uma fila real (BullMQ + Redis) em vez de fire-and-forget in-process.
- Guardar `photos`/`regularOpeningHours` da Google Places API no schema, para o `googleBusinessScore` deixar de usar proxies.
- Módulo `ai/generate-content` (scripts, emails, WhatsApp, propostas) via Anthropic API.
- Módulo `billing` (Paysuite/Quick-e-Pay).
