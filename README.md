# KOTU Asset Tracker

KOTU's IT asset register at **[asset.kotu.co.in](https://asset.kotu.co.in)**: laptops, monitors, phones and accessories — who has what, check-out / check-in with e-signed handover forms, AMC and warranty contracts, repairs, audits and reports.

## What's in it

| Area | Highlights |
|---|---|
| **Assets** | Register with saved views and filters, CSV import, printable QR labels, camera / USB barcode scanning |
| **Check-out & handovers** | Assign to people, handover forms signed online by the employee (`/sign/:id`), print / PDF |
| **My assets** | Every employee sees what they hold and their forms, and can report a problem with a device |
| **Maintenance** | AMC & warranty **contracts** (vendor, terms, invoice), repairs, employees' **repair requests** |
| **Audits** | Stock-takes per location by scanning; missing / misplaced / unexpected items |
| **People & locations** | Directory, offboarding returns, location breakdowns |
| **Roles** | Admin, IT Support, Warehouse, Finance, Viewer — page access and write permissions set in *Settings → Roles & permissions* and enforced in the database (row-level security) |
| **Email** | Asset summary, signature requests, repair requests to IT, daily AMC reminders (via Resend) |

## Tech

React 18 + Vite + TypeScript, Tailwind + shadcn/Radix UI, TanStack Query, Supabase (Postgres + RLS, Auth with Google, Storage, Edge Functions), hosted on Vercel.

```
src/
  pages/            one file per route (lazy-loaded)
  components/       app/ (shared primitives), layout/ (shell, palette, scanner), assets/, maintenance/, …
  components/ui/    shadcn/Radix building blocks
  services/         Supabase data access (supabaseService = core tables, collabService = roles, notes, audits, handovers, contracts, repair requests)
  hooks/            React Query hooks, useBarcodeCamera
  lib/              helpers (formatting, CSV, paging past Supabase's 1000-row limit, …)
supabase/
  schema.sql        base schema
  migrations/       apply in order after schema.sql (0001 → 0015)
  functions/        Edge Functions + _shared/ (mailer, email layout)
public/email/       device thumbnails used in emails
```

## Run locally

```bash
npm install
cp .env.example .env      # set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:8080
npm test                  # unit tests (Vitest)
npm run lint
npm run build
```

Only the two `VITE_` variables are read by the browser app. Everything else in `.env.example` belongs to Supabase (Auth, Edge Function secrets) — never prefix those with `VITE_`.

## Supabase setup (new project)

1. **Database** — in the SQL editor run `supabase/schema.sql`, then every file in `supabase/migrations/` in numeric order. Each migration is safe to re-run.
2. **Auth** — enable the Google provider (Authentication → Providers). Under URL Configuration set the Site URL to `https://asset.kotu.co.in` and add `https://asset.kotu.co.in/**` (plus any preview URLs) to Redirect URLs. Sign-in is limited to `@kotu.co.in`; new users start as **Viewer**, and `tech@kotu.co.in` is made Admin by migration 0009.
3. **Edge Functions** —
   ```bash
   npx supabase functions deploy send-asset-email      --use-api --project-ref <ref>
   npx supabase functions deploy send-handover-email   --use-api --project-ref <ref>
   npx supabase functions deploy notify-repair-request --use-api --project-ref <ref>
   npx supabase functions deploy amc-expiry-check      --use-api --project-ref <ref>
   ```
   Secrets (`npx supabase secrets set NAME=value --project-ref <ref>`):

   | Secret | Purpose |
   |---|---|
   | `RESEND_API_KEY` | Resend key (also `RESEND_API_KEY_ASSET_SUMMARY`, `RESEND_API_KEY_AMC` if you use separate keys — the mailer falls back between them) |
   | `MAIL_FROM` | e.g. `KOTU Asset Tracker <notifications@kotu.co.in>` — the domain must be verified in Resend |
   | `APP_URL` | `https://asset.kotu.co.in` — used for links and images in emails |
   | `AMC_NOTIFICATION_EMAIL` | inbox for the daily AMC report |
   | `REPAIR_NOTIFICATION_EMAIL` | optional; repair requests go to `tech@kotu.co.in` by default |
4. **AMC reminders** — schedule `amc-expiry-check` daily (Integrations → Cron, `0 8 * * *`), or use `0005_amc_expiry_cron.sql`.

## Deploying

Pushing to `main` deploys to Vercel (`vercel.json` handles SPA routing and long-term caching of hashed assets). Apply any new migration and redeploy changed Edge Functions alongside.
