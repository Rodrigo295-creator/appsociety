# App Society

Projeto React + Vite com animações e backend Supabase.

## Links

- **GitHub:** https://github.com/Rodrigo295-creator/appsociety
- **Localhost:** http://localhost:5173

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Supabase

1. Crie o projeto `appsociety` no [Supabase Dashboard](https://supabase.com/dashboard).
2. Copie **Project URL** e **anon key** para `.env.local`.
3. Aplique as migrations:

```bash
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
```
