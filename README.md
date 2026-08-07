# MaghrebVoyage

A marketplace where verified travel agencies publish fixed-price group trips and sell seats online, with secure card deposits via Stripe — built against the `CDC_FINAL_MAGHREBVOYAGE.pdf` spec. See [CLAUDE.md](CLAUDE.md) for the full product/architecture brief and business rules.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma 7 + PostgreSQL · NextAuth v5 · Stripe Checkout · Cloudinary · Groq (AI chat) + Vapi (voice) · Upstash Redis · Resend.

## Prerequisites

- Node.js 20+
- A PostgreSQL database (local, or a hosted one like Supabase/Neon/Railway)
- Accounts/API keys for the services you want working (see [Environment variables](#environment-variables) — everything degrades gracefully if a key is missing, except the database)

## Setup

```bash
git clone https://github.com/mehdi18lhmer/Maghebvoyage.git
cd Maghebvoyage
npm install
```

### 1. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | App connection. On a pooled provider (Supabase, PgBouncer) use the **pooler** URI (e.g. port 6543). |
| `DIRECT_URL` | Yes | **Direct** connection (port 5432) — `prisma migrate` needs this; the pooler can't run DDL/advisory locks. Falls back to `DATABASE_URL` if unset, so a plain local Postgres only needs one variable. |
| `GROQ_API_KEY` | For AI chat | Powers the AI planner's grounded chat + trip matching (`services/ai.service.ts`). |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` / `VAPI_PRIVATE_KEY` | For voice | Voice mode in the AI planner. The public key is safe client-side by design. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Recommended | Rate limiting. Falls back to in-process memory without it (fine for local dev, not for multi-instance deploys). |
| `RESEND_API_KEY` / `RESEND_FROM` / `ADMIN_EMAIL` | For emails | The 14 transactional emails. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | For payments | Booking deposits. Use Stripe test keys locally. |
| `NEXT_PUBLIC_APP_URL` | Yes | e.g. `http://localhost:3000` — used to build Stripe redirect/webhook URLs. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | For uploads | Trip photos and agency verification documents. |

### 2. Database

```bash
npx prisma migrate dev   # creates the schema
npx prisma db seed       # seeds 4 agencies + 8 trips + 1 booking + admin account
```

Seeded accounts (password for all of them: `Password123`):

| Role | Email | Status |
|---|---|---|
| Admin | `admin@maghrebvoyage.com` | — |
| Agency | `contact@atlasnomad.ma` | Verified |
| Agency | `hello@carthageheritage.tn` | Verified |
| Agency | `team@essaouirablue.ma` | Verified |
| Agency | `info@saharastarscamp.ma` | Under review |

### 3. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run a production build |
| `npm run lint` | ESLint |
| `npx prisma studio` | Browse the database |
| `npx prisma migrate dev` | Apply/create migrations |

## Stripe webhook (local testing)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## Project structure

```
src/
  app/            routes — (public), (auth), agency/, admin/, booking/, legal/, api/
  components/     UI, grouped by feature (trips, bookings, agency, admin, ai)
  services/       all business logic — never called from components directly
  lib/            prisma/stripe singletons, matching, formatting, mappers
prisma/
  schema.prisma   full data model
  seed.ts         demo fixtures
```

See [CLAUDE.md](CLAUDE.md) for the complete spec, business rules, and email list.

## Known gaps

- The public marketplace pages (`/voyages`, `/trip/[slug]`, `/agence/[slug]`) and the standalone `/booking/[slug]`, `/booking/success`, `/booking/cancel` pages still render from `src/lib/mock-data.ts`, not the real database. The AI planner's chat-based booking flow (`/demande`) is fully wired to Postgres end-to-end, including the Stripe redirect — but reaching a real trip's booking page directly (the "Lien Magique" share-link path) currently shows mock data instead.
- Agency and admin dashboards are fully wired to real data.
- The E1 confirmation email and the E14 7-day-reminder cron aren't wired yet — both depend on `TravelRequest` rows that nothing currently writes to Postgres.
