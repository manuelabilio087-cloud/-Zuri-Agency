# Zuri Agency — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind. Já inclui páginas de landing, registo, login e um dashboard protegido, ligados à API do backend.

## Correr localmente

1. `npm install`
2. Copia `.env.example` para `.env.local` e ajusta `NEXT_PUBLIC_API_URL` (por defeito `http://localhost:4000`, o backend local).
3. `npm run dev` — arranca em `http://localhost:3000`.

> Corre o backend em paralelo (`zuri-agency-backend`, porta 4000) para o registo/login funcionarem.

## Deploy no Vercel

1. Importa o repositório GitHub (`zuri-agency-frontend`) no Vercel.
2. Em **Environment Variables**, define `NEXT_PUBLIC_API_URL` com o domínio do backend no Railway (ex: `https://zuri-agency-backend-production.up.railway.app`).
3. Vercel deteta Next.js automaticamente — build e deploy são automáticos a cada push.
4. No backend (Railway), garante que `FRONTEND_URL` aponta para o domínio do Vercel, para o CORS funcionar.

## Estrutura

```
src/
├── app/
│   ├── page.tsx              # landing
│   ├── register/             # criar conta
│   ├── login/                 # entrar
│   ├── dashboard/             # visão geral: leads, temperatura, uso do plano, follow-ups
│   ├── search/                 # pesquisa de empresas + resultados com polling de análise
│   ├── leads/
│   │   ├── page.tsx            # CRM: lista filtrável por status
│   │   ├── [id]/page.tsx        # detalhe do lead: scores, notas, geração de conteúdo, PDF
│   │   └── export/page.tsx      # exportação Excel
│   └── priorities/              # priorização diária por IA (Pro)
├── components/
│   ├── dashboard-shell.tsx      # sidebar + navegação (reutilizado por todas as páginas autenticadas)
│   ├── temperature-donut.tsx    # gráfico de distribuição de temperatura dos leads
│   ├── temperature-badge.tsx    # badge colorido de temperatura
│   ├── status-select.tsx        # dropdown de status do CRM
│   └── usage-bar.tsx            # barra de progresso de uso do plano
├── lib/
│   ├── api.ts              # cliente HTTP para o backend (inclui download de ficheiros)
│   └── auth-context.tsx    # sessão (user + token), restaurada automaticamente via cookie ao recarregar a página
```

## Design

Dashboard escuro com glassmorphism (inspirado numa referência visual fintech fornecida). Tokens definidos em `globals.css`:
- Fundo com gradientes ambiente (`--bg-deep` + blobs radiais)
- Painéis em vidro (`--panel`, `.glass-panel`)
- Accent principal roxo (`--accent`)
- Escala de cor de temperatura de leads (`--temp-frio` → `--temp-muito-quente`) — o elemento visual central do produto, reutilizado em todas as páginas (donut, badges, listas)

## Fluxo completo, hoje já navegável

Registo → Dashboard → Pesquisar (categoria+cidade) → resultados com análise em tempo real (polling) → Guardar como Lead → CRM (mudar status, notas) → Detalhe do lead → Gerar conteúdo comercial (script/email/whatsapp/proposta) → Exportar (Excel/PDF) → Priorização Diária (Pro).

## Próximos passos técnicos

- Onboarding — capturar `serviceType`/`city` do utilizador após registo
- Página de pricing/upgrade de plano (à espera do billing no backend)
- Paginação nos resultados de pesquisa e na lista de leads (hoje devolve tudo de uma vez)
