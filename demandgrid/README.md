# DemandGrid — production starter
Next.js 14 + TypeScript + Prisma + PostgreSQL. Included: tenant-isolated schema (all 15 brief models + AuditLog), explainable forecasting (weighted moving average + trend, swappable), FEFO billing/receipt API (GST-inclusive MRP), reorder recommendations API.

## Run locally
1. `cp .env.example .env`, set `DATABASE_URL` (Neon / Supabase / local Postgres)
2. `npm install && npx prisma db push`
3. `npm run test` (checks 40 stock / 10 per day -> 130) then `npm run dev`

## Deploy
GitHub -> Vercel import -> env vars -> managed Postgres (Mumbai region).

## Not done yet (needed before real customers)
- Real phone-OTP auth + sessions (lib/auth.ts is a DEV stub) and role checks on every route
- UI pages (port the prototype demandgrid.html to React), GST invoice PDF, batch/expiry fields in UI
- Orders routes (POST/GET/PATCH /api/orders), supplier/manufacturer views, device events + certs, rate limiting, backups, Sentry
- Postgres row-level security as a second tenant-isolation layer
- DPDP Act review, privacy policy, terms; GST/pharmacy billing rules checked with an accountant/pharmacist
