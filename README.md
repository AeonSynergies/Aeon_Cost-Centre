# Aeon Ops Controller

Financial operations platform for Aeon — tracks client revenue, resource costs,
department P&L and utilisation. Replaces three legacy Excel workbooks.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + **shadcn/ui** primitives
- **Prisma** ORM + **PostgreSQL** (AWS RDS)
- **NextAuth v5** (Credentials, bcrypt rounds 12)
- **Recharts**, **React Hook Form** + **Zod**, **Zustand**, **TanStack Table**, **date-fns**
- **Vitest** (unit) + **Playwright** (E2E)

## Build status — Phase 1 (Foundation) ✅

| Item | Status |
| --- | --- |
| Calculation engines (`src/lib/engines/`) | ✅ 7 engines |
| Unit tests (`npm run test`) | ✅ 54 tests passing |
| Prisma schema | ✅ complete |
| Seed (`prisma/seed.ts`) | ✅ idempotent (upsert) |
| Auth (login + protected routes) | ✅ NextAuth v5 |
| Production build (`npm run build`) | ✅ zero errors |

## Local development

```bash
npm install
npx prisma generate

# Push schema + seed (DATABASE_URL must point at a reachable Postgres)
DATABASE_URL="postgresql://ops_admin:PASSWORD@HOST:5432/postgres" npx prisma db push
DATABASE_URL="postgresql://ops_admin:PASSWORD@HOST:5432/postgres" npx tsx prisma/seed.ts

npm run test     # vitest
npm run dev      # http://localhost:3000
```

Login: `bharathprasad@aeonsynergies.com` / `Bharath25`

> The Prisma **CLI** reads `.env` (not `.env.local`), so `db push`/seed inline
> `DATABASE_URL` as shown. The Next.js app reads `.env.local` at runtime.

## Environment variables

See `.env.example`. Required: `DATABASE_URL`, `AUTH_SECRET` (and/or
`NEXTAUTH_SECRET`), `NEXTAUTH_URL`. Set `AUTH_TRUST_HOST=true` outside Vercel.

## Calculation engines

All pure functions in `src/lib/engines/`, each with a co-located `*.test.ts`:

- `currencyEngine` — Rates A/B/C/D (revenue, expense, Skydo, display)
- `feeEngine` — full revenue waterfall + Stripe/txn fees
- `prorateEngine` — client fee & salary proration (day-accurate, mid-month revisions)
- `utilisationEngine` — service-hour tiers, invoice rules, capacity status
- `costEngine` — fully-loaded resource cost (INR & USD)
- `revenueShareEngine` — resource & department revenue share
- `allocationEngine` — 2026/2027 net-revenue allocation

## Seed notes

The brief documents 10 resources explicitly and references an Excel salary sheet
for the full 26. That sheet is not available in this environment, so `seed.ts`
loads the 10 documented resources with their exact values and 16 **clearly
marked placeholder** resources (`placeholder: true`) so screens have realistic
volume. Replace the placeholders once the Excel data is on hand.
