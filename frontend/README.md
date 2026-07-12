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
│   ├── page.tsx          # landing
│   ├── register/         # criar conta
│   ├── login/             # entrar
│   └── dashboard/         # dashboard principal — completo, com dados reais
├── components/
│   ├── dashboard-shell.tsx    # sidebar + navegação (reutilizado por todas as páginas autenticadas)
│   ├── temperature-donut.tsx  # gráfico de distribuição de temperatura dos leads
│   └── usage-bar.tsx          # barra de progresso de uso do plano
├── lib/
│   ├── api.ts              # cliente HTTP para o backend
│   └── auth-context.tsx    # sessão (user + token), restaurada automaticamente via cookie ao recarregar a página
```

## Design

Dashboard escuro com glassmorphism (inspirado numa referência visual fintech fornecida). Tokens definidos em `globals.css`:
- Fundo com gradientes ambiente (`--bg-deep` + blobs radiais)
- Painéis em vidro (`--panel`, `.glass-panel`)
- Accent principal roxo (`--accent`)
- Escala de cor de temperatura de leads (`--temp-frio` → `--temp-muito-quente`) — o elemento visual central do produto

## Páginas que ainda faltam

O menu lateral já referencia `/search`, `/leads`, `/priorities` e `/leads/export` — estas páginas ainda não existem (dão 404 por agora). O backend já suporta tudo isto; falta construir as telas.

## Próximos passos técnicos

- Página de pesquisa (`/search`) — formulário categoria+cidade, ligado a `POST /api/companies/search`
- Página de leads (`/leads`) — CRM visual completo (mudar status, notas)
- Página de priorização (`/priorities`, Pro)
- Onboarding — capturar `serviceType`/`city` do utilizador após registo
- Detalhe do lead + geração de conteúdo (script/email/whatsapp/proposta)
