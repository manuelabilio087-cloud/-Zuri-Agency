# Zuri Agency

Plataforma de inteligência comercial: encontra empresas locais, avalia a sua maturidade digital (Sales Score, Lead Temperature) e gera abordagem comercial com IA.

Monorepo com dois projetos independentes:

```
backend/    Node.js + Express + TypeScript + Prisma + PostgreSQL (deploy: Railway)
frontend/   Next.js 14 (App Router) + TypeScript + Tailwind (deploy: Vercel)
```

Cada pasta tem o seu próprio `README.md` com instruções de setup local e deploy.

## Estado atual

- ✅ Auth completo (registo, login, refresh token, logout)
- ✅ Schema de base de dados (User, Company, CompanyAnalysis, Lead, LeadNote, GeneratedContent, UsageLog)
- ✅ Controlo de limites por plano (Free/Starter/Pro)
- ✅ Pesquisa de empresas via Google Places API, com cache de 30 dias
- ✅ Website Analyzer + AI Sales Score + Lead Temperature + recomendação de serviço
- ✅ Geração de conteúdo comercial (script, email, WhatsApp, proposta)
- ✅ CRM completo (status, notas, follow-ups) + IA de Priorização Diária (Pro)
- ✅ Exportação: Excel (Starter+) e PDF de propostas (Pro)
- ✅ Painel administrativo (utilizadores, métricas, MRR)
- ✅ Dashboard principal (frontend) — dados reais, sessão persistente entre reloads
- ⏳ Frontend: pesquisa, CRM visual, priorização, detalhe do lead
- ⏳ Billing (Paysuite/Quick-e-Pay) — conta em criação

## Deploy

- **Backend → Railway**: serviço Node + serviço PostgreSQL. Ver `backend/README.md`.
- **Frontend → Vercel**: importar a subpasta `frontend/` como root directory do projeto Vercel. Ver `frontend/README.md`.
