# Veer Vatsalya Dhara — milk token app

Mobile-first web app where customers sign in with Google, buy milk tokens
(1 token = one 0.5 L packet) via Cashfree, and admins mark daily deliveries,
which deducts tokens. Tokens expire 45 days after purchase.

**Stack:** Next.js 16 (App Router) · Auth.js (Google) · Neon Postgres + Drizzle ORM · Cashfree PG · Tailwind. Deploys to Vercel.

## How tokens work
- Every purchase (or manual grant by admin) is a separate *token pack* with its own 45‑day expiry.
- When a delivery is marked, tokens are taken from the pack that expires soonest first.
- One delivery record per customer per day (with a packet count). It can be undone, which puts the tokens back.
- Payment is credited once, whether confirmed by the return page or the Cashfree webhook.

## Setup

1. **Database** — create a Postgres DB on [Neon](https://neon.tech) (or Vercel → Storage → Neon). Copy the connection string.
2. **Google sign-in** — Google Cloud Console → APIs & Services → Credentials → *OAuth client ID* (Web application).
   Authorised redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR-DOMAIN/api/auth/callback/google`
3. **Cashfree** — merchant dashboard → Developers → API keys (start with Test/Sandbox keys).
   After deploying, add a webhook in Cashfree for `https://YOUR-DOMAIN/api/cashfree/webhook` (Payment events).
   Also whitelist your domain in Cashfree (required for production).
4. **Env** — `cp .env.example .env` and fill it in. Generate `AUTH_SECRET` with `npx auth secret`.
5. Run:
   ```bash
   npm install
   npm run db:migrate   # creates tables
   npm run db:seed      # adds Weekly and Monthly plans at ₹60/packet — edit in /admin/plans
   npm run dev
   ```

Admins are whoever is listed in `ADMIN_EMAILS`; they see an **Admin** tab.

## Deploy to Vercel
Push to GitHub, import the repo in Vercel, add the same env vars (with `APP_URL` = your
https URL and `NEXT_PUBLIC_CASHFREE_MODE=production` when going live), and deploy.
Run `npm run db:migrate` against the production `DATABASE_URL` whenever the schema changes.

## Pages
| Path | Who | What |
|---|---|---|
| `/` | everyone | Landing + Google sign-in |
| `/profile` | customer | WhatsApp number (required on first login) and address |
| `/dashboard` | customer | Token balance, expiry, buy plans, deliveries, payments |
| `/payment/return` | customer | Confirms payment after Cashfree checkout |
| `/admin` | admin | Daily delivery sheet: mark / undo, “mark all”, date navigation, search |
| `/admin/customers` | admin | Customer list with balances, detail page, manual token grant |
| `/admin/plans` | admin | Create/edit plans and prices |

## Test mode
Set `TEST_MODE=true` to charge ₹1 per packet on every plan and show “Test only” plans.
Remove it (or set it to anything else) for real plan prices; test-only plans are then
hidden.
