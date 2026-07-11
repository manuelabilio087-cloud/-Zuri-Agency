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
│   └── dashboard/         # área autenticada (placeholder)
├── lib/
│   ├── api.ts             # cliente HTTP para o backend
│   └── auth-context.tsx   # sessão em memória (user + access token)
```

## Próximos passos técnicos

- Fluxo de onboarding (tipo de serviço + cidade) após registo.
- Página de pesquisa de empresas + lista de resultados com scores.
- Detalhe da empresa + geração de abordagem comercial (IA).
- CRM (guardar leads, pipeline por status).
