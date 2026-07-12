# Zuri Agency — Backend

API em Node.js + Express + TypeScript + Prisma (PostgreSQL). Já inclui autenticação completa (registo, login, refresh token via cookie httpOnly, logout) e controlo de limites por plano (Free/Starter/Pro).

## Estrutura

```
src/
├── config/          # env, database (Prisma), constantes (limites de plano)
├── modules/
│   ├── auth/         # registo, login, refresh, logout — completo
│   ├── companies/    # pesquisa (Google Places), website analyzer, scoring — completo
│   ├── leads/         # CRM completo: guardar, listar+filtros, status, notas, follow-ups, exportação
│   ├── ai/            # geração de conteúdo comercial + priorização diária (Pro) — completo
│   └── admin/          # painel administrativo (users, métricas, MRR) — completo
├── middlewares/       # error handler, controlo de limites por plano, controlo de plano, admin
├── database/          # (migrations vivem em /prisma)
└── app.ts / server.ts
prisma/
└── schema.prisma      # User (com role), Company, CompanyAnalysis, Lead, LeadNote, GeneratedContent, UsageLog
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
| POST | `/api/leads` | Guarda uma empresa como lead (`{ companyId }`) |
| GET | `/api/leads` | Lista os leads do utilizador, com filtros `?status=` e `?temperature=` |
| PATCH | `/api/leads/:id` | Atualiza o status do lead (regista `closedAt` se Fechado/Perdido) |
| POST | `/api/leads/:id/notes` | Adiciona uma nota ao histórico do lead |
| GET | `/api/leads/follow-ups` | Leads ativos sem contacto há 7+ dias |
| POST | `/api/ai/generate-content` | Gera conteúdo comercial para um lead (`{ leadId, type }`, `type` = `script`\|`email`\|`whatsapp`\|`proposta`) |
| GET | `/api/ai/daily-priorities` | Top 15 leads a priorizar hoje, com justificação por IA — **exclusivo do plano Pro** |
| GET | `/api/leads/export/excel` | Excel com todos os leads do utilizador — **Starter e Pro** |
| GET | `/api/leads/:id/export/pdf` | Proposta comercial (já gerada) formatada em PDF — **exclusivo do plano Pro** |
| GET | `/api/admin/users` | Lista todos os utilizadores (plano, role, nº de leads) — **exclusivo de administradores** |
| GET | `/api/admin/metrics` | Total de utilizadores, distribuição por plano, uso do mês, MRR — **exclusivo de administradores** |
| GET | `/api/admin/users/:id` | Detalhe de uso de um utilizador específico — **exclusivo de administradores** |
| GET | `/health` | Health check |

### Painel administrativo — como promover um utilizador a admin

Não existe endpoint para se auto-promover a admin (seria um risco de segurança). Depois do utilizador se registar normalmente, promove-o diretamente na base de dados:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'teu-email@exemplo.com';
```

Ou via Prisma Studio (`npm run prisma:studio`), editando o campo `role` do utilizador para `ADMIN`.

### Google Places — configuração necessária

Preenche `GOOGLE_PLACES_API_KEY` no `.env` com uma chave com a **Places API (New)** ativada no Google Cloud Console. Sem esta chave, `/api/companies/search` devolve erro 503 (a não ser que já existam resultados em cache válidos para essa categoria/cidade).

### Website Analyzer + Scoring — como funciona

Depois de uma pesquisa devolver empresas, o sistema dispara automaticamente (em background, sem bloquear a resposta) a análise de cada empresa nova:

1. **Sinais técnicos** (`website-analyzer.service.ts`) — HTTPS, viewport mobile, velocidade de resposta, título/meta description, headings, dados estruturados — tudo calculado sem IA.
2. **Sinais qualitativos** — se `ANTHROPIC_API_KEY` estiver definida, o conteúdo do website é enviado ao modelo `claude-haiku-4-5-20251001` (custo-eficiente, adequado para esta tarefa estruturada) para avaliar qualidade de conteúdo, clareza de contacto, CTA e frescura visual. Sem chave configurada, estes fatores ficam a 0 (o resto do score continua a funcionar).
3. **Scoring** (`scoring.service.ts`) — combina os sinais acima com os dados da própria empresa (rating, reviews, contacto) em `salesScore`, `leadTemperature`, `recommendedService` e `closeProbability`, e persiste tudo em `CompanyAnalysis`.

O número de análises disparadas por pesquisa respeita o limite `analysesPerMonth` do plano do utilizador — se o limite for atingido, as empresas ficam sem análise (`status: "pending"` no endpoint de status) até ao próximo mês ou upgrade.

> Nota de arquitetura: isto corre in-process (fire-and-forget) por já não haver fila configurada. Para produção a sério, mover para BullMQ + Redis, conforme o PRD original — fica marcado como próximo passo abaixo.

### Geração de conteúdo comercial — como funciona

`POST /api/ai/generate-content` recebe `leadId` + `type` e:

1. Busca o lead (empresa + análise já calculada) e o utilizador (para saber `serviceType`, o que ele vende).
2. Deriva as "lacunas" da empresa (`keyGaps`) a partir da análise (ex: "sem website", "poucas avaliações online").
3. Monta o prompt correspondente ao `type` pedido — os 4 templates exatos do PRD (script de chamada, email, WhatsApp, proposta comercial).
4. Chama o modelo `claude-sonnet-5` — mais avançado que o usado no scoring, porque aqui a qualidade do texto tem impacto direto na conversão.
5. Persiste o resultado em `GeneratedContent`, associado ao lead, para o utilizador poder reutilizar/editar sem gerar de novo.

Cada geração consome uma unidade do limite `aiGenerationsPerMonth` do plano do utilizador.

Se o lead ainda não tiver `CompanyAnalysis` pronta (análise em background ainda a decorrer), o endpoint devolve `409` — o frontend deve fazer polling em `/api/companies/:id/analysis-status` antes de permitir gerar conteúdo.

## Próximos passos técnicos

- Mover a análise de empresas para uma fila real (BullMQ + Redis) em vez de fire-and-forget in-process.
- Guardar `photos`/`regularOpeningHours` da Google Places API no schema, para o `googleBusinessScore` deixar de usar proxies.
- Módulo `billing` (Paysuite/Quick-e-Pay) — falta a conta e chaves de API ativas para implementar a integração real.
- Onboarding no frontend para capturar `serviceType`/`city` do utilizador (hoje só existem no schema, o formulário falta).
