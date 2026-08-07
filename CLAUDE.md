# MaghrebVoyage — implementation brief

Source of truth: `CDC_FINAL_MAGHREBVOYAGE.pdf` (April 2026, "cahier des charges — version finale et unique"). This document restates that spec in English, adds the system-design decisions needed to implement it correctly, and flags where this brief deliberately extends or corrects the source. **Where this brief and the PDF conflict, this brief wins** — it exists specifically to close gaps the PDF left open (the race condition, cron idempotency, deposit floor).

## 0. The pivot — read this before touching old code

If any earlier scaffold exists based on a prior version of this spec, it used a different model: client submits a request → agencies submit competing offers → admin matches → client pays. **That model is dead.** The current model is direct booking:

- Agencies publish fixed trips (`GroupTrip`) with a fixed price, fixed dates, fixed capacity.
- Clients book and pay a deposit immediately — no offer, no admin-mediated matching.
- The AI form still exists, but it now *recommends existing `GroupTrip` rows* — it does not create new offers.

Concretely: `TravelRequestAgencyAssignment` and `Offer` tables are gone. `GroupTrip` and `Booking` are the two new central entities. Everything else (auth, Stripe, emails, folder structure) carries over unchanged.

## 1. Product summary

**One-liner:** a platform where verified travel agencies publish group trips and sell seats online, with secure card deposits, primarily to European/North American diaspora travelers.

**In scope (V1):**
- Agency publishing + verification workflow
- Two client paths to a booking: AI-guided form (Chemin A) and direct share link (Chemin B, "Lien Magique")
- Stripe Checkout deposit payment, single platform account
- Client + agency + admin dashboards
- Automated transactional emails (14 total, see §9)
- Public marketplace with filters

**Explicitly out of scope (do not build):**
- Real-time flight/hotel booking
- Custom trip requests with agency-submitted offers (the old model)
- Native mobile app
- Real-time chat
- Stripe Connect / automatic agency payouts
- Multi-provider price comparison
- Full CRM
- Microservices / multi-tenant architecture

## 2. Tech stack — fixed, do not substitute

| Layer | Choice |
|---|---|
| Framework | Next.js 14+, App Router, fullstack |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS + shadcn/ui |
| ORM | Prisma (schema in `schema.prisma`, included alongside this brief) |
| Database | PostgreSQL — Neon or Railway |
| Auth | NextAuth / Auth.js — three roles: `ADMIN`, `AGENCY`, `CLIENT` |
| Payments | Stripe Checkout (hosted) + webhooks — single account, no Connect |
| Email | Resend |
| Images | Cloudinary (or Supabase Storage) — store URL only, never the binary |
| Cron | Vercel Cron (`cron.json`) — used only for the 7-day reminder |
| Deploy | Vercel + managed Postgres |

## 3. Repository structure

```
src/
  app/
    (public)/        landing, /voyages, /trip/[slug], /agence/[slug]
    (auth)/           login, register (client, agency)
    agency/           agency dashboard — protected, role=AGENCY
    admin/            admin dashboard — protected, role=ADMIN
    booking/          /success, /cancel
    legal/            cgu, confidentialite, remboursements, mentions
    api/
      auth/           NextAuth handlers
      trips/          GroupTrip CRUD
      bookings/       initiate, cancel
      payments/       create-checkout-session
      webhooks/stripe/ webhook handler
      admin/          admin-only endpoints
      ai/             structuring + matching
      cron/            pre-trip reminder
  components/
    ui/               shadcn + custom primitives
    trips/            TripCard, TripDetail, TripFilters
    bookings/         BookingForm, ReservationConfirmation
    agency/           TripForm, AgencyDashboard
    admin/            AdminDashboard, AgencyValidation
  services/            ALL business logic lives here — never in components
    trips.service.ts
    bookings.service.ts
    payments.service.ts
    ai.service.ts      every AI call goes through here, nowhere else
    email.service.ts
    agency.service.ts
  lib/
    prisma.ts          singleton client
    stripe.ts          singleton client
    slug.ts
    utils.ts
  prisma/
    schema.prisma
    seed.ts            3 verified agencies, 8 varied trips for demo/dev
    migrations/
```

## 4. Non-negotiable code rules

- Business logic lives in `/services/` only. Components render; they don't compute.
- Every API route validates its input server-side (zod).
- Every protected route calls `getServerSession()` and checks role before doing anything.
- **Agency data isolation is mandatory on every agency-scoped query**: `where: { agencyId: session.agencyId }`. Write one shared helper (e.g. `assertAgencyOwnsTrip(tripId, session)`) and use it everywhere rather than re-checking inline — a route that forgets this check leaks one agency's bookings to another.
- Any operation touching more than one table runs inside `prisma.$transaction(...)`.
- Every external call (Stripe, Resend, Cloudinary, the LLM) is wrapped in try/catch with a defined fallback — none of them may throw uncaught into a route handler.
- Secrets live only in `.env`, never in source.
- One feature per branch, PR + review before merge.

## 5. Data model

Full schema is in `schema.prisma`. Two things worth knowing before you read it:

1. **`Booking.paymentId` and `Payment.bookingId` aren't a real circular FK.** `Payment.bookingId` is the actual Prisma relation (a payment always belongs to exactly one booking). `Booking.paymentId` is a denormalized plain string, written by the webhook once the `Payment` row exists, so a booking read doesn't need a join to show its payment id.
2. **`Booking.remindedAt` is not in the original spec.** It exists purely to make the E14 cron idempotent — without it, re-running the cron (a redeploy, a manual retrigger) double-sends the 7-day reminder to every client.

### State machines

```
GroupTrip:  DRAFT → PUBLISHED → FULL (auto) → CLOSED (agency) → CANCELLED (agency)
Booking:    PENDING_PAYMENT → CONFIRMED → CANCELLED | REFUNDED | NO_SHOW
Agency:     PENDING → UNDER_REVIEW → VERIFIED | REJECTED | SUSPENDED
Payment:    PENDING → SUCCEEDED | FAILED | CANCELLED | REFUNDED
TravelRequest: SUBMITTED → AI_PROCESSED → MATCH_SUGGESTED → CLIENT_CONFIRMED
               → PAYMENT_PENDING → PAID → CLOSED | CANCELLED
```

### GroupTrip business rules

- Only an agency with `verificationStatus = VERIFIED` may publish.
- Publishing goes `DRAFT → PUBLISHED` directly — **no admin approval step for individual trips.** The admin only intervenes after the fact (suspend / reactivate).
- `bookedSpots` is incremented **only** by the Stripe webhook and decremented **only** by the cancellation endpoint. No third code path may touch this field — treat that as an invariant, not a style preference.
- `bookedSpots === totalSpots` → auto-transition to `FULL`.
- Agency cancels a trip → trip → `CANCELLED` → every `CONFIRMED` booking on it cascades to `CANCELLED`.
- In `PUBLISHED`, only `description`, `images`, and `meetingPoint` are editable — never price, dates, or capacity.
- `startDate` must be more than 7 days out at creation time (gives the agency a minimum lead time to fill seats).
- **Added rule, not in the source spec:** enforce `depositAmount >= 0.10 * totalPrice` server-side. The spec lets an agency set any deposit below total price with no floor; without a minimum, a careless agency can set a token deposit on an expensive trip, which converts a no-show into your support problem, not theirs.

### Booking business rules

- `cancellationToken` is `crypto.randomUUID()` — real entropy, not derived from the booking id or any guessable value. This token is the client's *only* credential for cancelling; there's no login.
- `confirmationCode` format: `MV-` + 6 random digits, generated by the webhook at confirmation time, not at booking creation.

## 6. Critical flows

### 6.1 Chemin A — via the AI form
1. Client fills the 5-step form (see §7 for exact fields) → `TravelRequest` created, status `SUBMITTED`.
2. Confirmation email (E1) sent.
3. AI structuring phase runs → `AI_PROCESSED`.
4. Matching phase runs against `GroupTrip` → `MATCH_SUGGESTED`, 1–3 results shown.
5. Client picks a trip → same booking form as Chemin B, `travelRequestId` set on the resulting `Booking`.

### 6.2 Chemin B — via the Lien Magique
1. Client opens `/trip/[slug]` directly (WhatsApp/Instagram/email share) — no account, no form.
2. Page shows only that trip. No cross-agency suggestions, no AI form on this page — this isolation is explicit in the spec and matters for trust (an agency doesn't want its clients funneled to a competitor's trip mid-checkout).
3. "Réserver ma place" → booking form → Stripe → confirmed.

### 6.3 Booking + payment (the flow that matters most)

```
Client submits booking form
        ↓  POST /api/bookings/initiate
Backend checks availability → creates Booking (PENDING_PAYMENT) + cancellationToken
        ↓
Creates Stripe Checkout session, redirects client
        ↓
Client pays on Stripe's hosted page
        ↓
Stripe → POST /api/webhooks/stripe (checkout.session.completed)
        ↓
Verify signature → check idempotency (stripeSessionId already processed? return 200) →
atomic transaction: verify capacity, increment bookedSpots, create Payment,
confirm Booking, generate confirmationCode
        ↓
Async: send E2 (client) + E3 (agency) → redirect target: /booking/success
```

**The race condition fix — implement exactly this, not the naive check-then-write:**

Two webhooks can arrive for the last seat within milliseconds of each other. A `SELECT` followed by a conditional `UPDATE` has a gap where both can pass the check. Close it with a single atomic statement:

```ts
const result = await prisma.groupTrip.updateMany({
  where: { id: groupTripId, bookedSpots: { lt: totalSpots } },
  data: { bookedSpots: { increment: numberOfSeats } },
});
if (result.count === 0) {
  // Capacity was already exhausted by a concurrent webhook.
  // Do not confirm the booking. Flag for manual refund review — never
  // silently mark it CONFIRMED, and never silently drop it either.
}
```

Run this inside the same `prisma.$transaction([...])` as the `Payment` create and `Booking` update, so all three commit or none do. This single-statement conditional update is what makes the operation atomic — a separate read followed by a separate write is not, no matter how tight the code around it looks.

**Idempotency**: before doing anything else in the webhook, check whether a `Payment` with this `stripeSessionId` already exists. If it does, return `200` immediately. Stripe redelivers webhooks — this is not a hypothetical edge case, it will happen in production.

### 6.4 Cancellations

**Client-initiated** (token-based, no account):
1. Email contains `/booking/cancel?token=[cancellationToken]`.
2. Confirm screen → `POST /api/bookings/cancel?token=...`.
3. Booking → `CANCELLED`, `cancelledAt` set.
4. `GroupTrip.bookedSpots` decremented atomically (same care as the increment path — use the same conditional-update pattern in reverse). If the trip was `FULL`, it reverts to `PUBLISHED`.
5. Emails: E8 (client), E9 (agency).
6. Refund is **manual in V1** — admin processes it from the Stripe dashboard, then marks the booking `REFUNDED` in-app (E10 notifies admin there's a refund pending; E13 confirms to the client once done).

**Agency-initiated** (whole trip cancelled):
1. Agency cancels with a required reason → trip `CANCELLED`.
2. Every `CONFIRMED` booking on that trip → `CANCELLED`.
3. E11 to every affected client, E12 to admin with the refund batch.

**Added guardrail, not in the source spec:** surface a "cancelled >N days ago, still not refunded" alert in the admin dashboard. The spec makes refunds fully manual with no staleness check — a cancelled booking that nobody ever marks `REFUNDED` is invisible without one, and it's the kind of thing that turns into an angry client email a month later.

## 7. AI matching engine — two independent phases

Keep these physically separate inside `ai.service.ts`. Never call the LLM from a UI component.

**Phase 1 — structuring** (one LLM call per submitted form):
Input: the raw 5-step form answers. Output: strict JSON —
```
{ summary: string, tags: string[], complexity: 1|2|3|4|5,
  destinationNormalized: string, budgetLevel: 'low'|'medium'|'high'|'premium',
  dominantTripType: TripType }
```
Force JSON-mode / a schema on the call. Log every call (input + output) for later prompt tuning.

**Phase 2 — matching** (pure SQL/Prisma, no AI):
- Hard filter: `status = PUBLISHED`, `bookedSpots < totalSpots`, `startDate` in the future.
- Score: destination match +3, dates within range +3, `totalPrice <= budgetMax` +2, `tripType === dominantTripType` +2, +1 per shared tag between `GroupTrip.aiTags` and the request's tags.
- Return top 1–3 by score.

**Mandatory fallback:** if phase 1 fails or exceeds 5 seconds, skip straight to phase 2's hard filters with no scoring, sorted by soonest `startDate`, return the top 3. The user must never see a blank result screen. Structure `matchTrips()` so it cannot throw — any upstream LLM failure degrades to this fallback automatically rather than propagating an error.

**Form fields (5 steps, for the form itself):**
1. Destination (free text, required), date flexibility (required), exact dates or desired duration depending on flexibility
2. Traveler count, adult/child split, budget slider — all required
3. Trip type (multi-chip, required), style, accommodation, transport-included toggle — all optional except type
4. Preferred activities, free-text constraints, preferred language — all optional
5. Name, email (required), phone, country, GDPR consent (required, blocking), T&C acceptance (required, blocking)

Persist to `localStorage` between steps so an accidental tab close doesn't lose progress.

## 8. Stripe implementation

Env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, `NEXT_PUBLIC_APP_URL`.

Fixed decisions — do not revisit these mid-build:
- Stripe Checkout hosted page. No custom card form.
- Single platform Stripe account. No Connect, no split payouts.
- Deposit amount only is charged. Balance is settled by the client with the agency on-site.
- The webhook is the only source of truth for payment state. Never trust the browser's return from `success_url` to confirm a booking — a client can land on `/booking/success` without ever paying (closed tab, back button, etc.); only the webhook confirms.

Checkout session creation (`POST /api/payments/create-checkout-session`):
```ts
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'eur',
      unit_amount: Math.round(depositAmount * 100),
      product_data: {
        name: `Acompte — ${trip.title}`,
        description: `${trip.destination} · ${dates}`,
      },
    },
    quantity: numberOfSeats,
  }],
  mode: 'payment',
  customer_email: clientEmail,
  success_url: `${APP_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${APP_URL}/trip/${trip.slug}`,
  metadata: { bookingId, groupTripId, agencyId, clientEmail, numberOfSeats: String(numberOfSeats) },
});
```

Webhook handler (`POST /api/webhooks/stripe`) — logic, in order:
1. Verify signature with `stripe.webhooks.constructEvent`.
2. Only process `checkout.session.completed`; ignore everything else.
3. Idempotency check on `stripeSessionId` (see §6.3).
4. Atomic transaction: capacity check + increment, `Payment` create, `Booking` confirm, `confirmationCode` generation (see §6.3 for the exact update pattern).
5. Fire emails asynchronously — don't block the response to Stripe on email delivery.
6. Return `200`.

## 9. Automated emails

| ID | Trigger | To | Notes |
|---|---|---|---|
| E1 | AI form submitted | Client | |
| E2 | Booking confirmed | Client | Must include: confirmation code (large/prominent), trip title/destination/dates, agency contact, deposit paid + balance due on-site, meeting point if set, cancellation link (`/booking/cancel?token=...`), footer with legal links |
| E3 | Booking confirmed | Agency | |
| E4 | Agency registration submitted | Agency | |
| E5 | Agency registration submitted | Admin | |
| E6 | Agency verified | Agency | |
| E7 | Agency rejected | Agency | Include rejection reason |
| E8 | Client cancels | Client | |
| E9 | Client cancels | Agency | |
| E10 | Client cancels | Admin | Refund to process |
| E11 | Agency cancels trip | Each affected client | |
| E12 | Agency cancels trip | Admin | Refund batch |
| E13 | Refund marked done | Client | |
| E14 | 7 days before `startDate`, daily cron | Client | Query `Booking` where `status = CONFIRMED`, trip starts in 7 days, `remindedAt IS NULL`; set `remindedAt = now()` after sending each one |

## 10. Security checklist

- Server-side validation on every input, never trust the client.
- Role check in every protected handler, not just in middleware/UI.
- Agency-scoping on every agency query (see §4).
- Webhook signature verification before any DB write.
- Rate limit `POST /api/bookings/initiate` — 5 attempts / IP / hour (this is the endpoint that creates Stripe sessions; it's the abuse surface).
- Cancellation token: random UUID, effectively single-use in practice (checking `status` before honoring the cancel prevents replay of an already-cancelled token).
- HTTPS everywhere in production; basic Next.js security headers (`X-Frame-Options`, a baseline CSP).
- GDPR: explicit consent checkboxes on every form that collects client data, minimal data collection, accessible privacy policy.
- Explicitly out of scope for V1: 2FA, external security audit, encryption at rest.

## 11. Testing priorities (highest leverage first, not spec order)

1. **Race condition** — fire two simultaneous webhook-equivalent requests at the last open seat; exactly one must succeed.
2. **Webhook idempotency** — replay the same `checkout.session.completed` event twice; the second must be a no-op.
3. **Cancellation restores capacity** — cancel a `FULL` trip's booking, confirm it reverts to `PUBLISHED` and the seat count is right.
4. **AI fallback** — force the LLM call to fail or time out; confirm the user still gets 3 trips, never a blank screen.
5. **Role boundaries** — an `AGENCY` session hitting any `/admin/*` route must be rejected.
6. Then the rest of the spec's end-to-end scenarios (agency publish → link → book → pay → emails; admin validate/reject agency; sold-out badge/disabled button; declined card 4000 0000 0000 0002; oversized/malformed image upload).

## 12. Legal pages — hard Stripe blocker

`/legal/cgu`, `/legal/confidentialite`, `/legal/remboursements`, `/legal/mentions` — static content, linked in every footer, referenced from Checkout and from every consent checkbox. **Stripe will not activate the account for live payments without these being publicly reachable.** Have them done well before you attempt the production Stripe cutover, not the week of.

## 13. Suggested build order

The spec's own week-by-week roadmap (12 weeks, AI form in weeks 3–4, GroupTrip/booking in weeks 5–6) builds the AI layer before the thing that generates revenue exists. Build in this order instead:

1. **Weeks 1–4**: auth (3 roles) → `GroupTrip` CRUD → `/trip/[slug]` (Lien Magique) → Stripe checkout + webhook, fully working end to end. This alone is the entire value proposition and doesn't touch AI at all.
2. **Weeks 5–6**: AI form + structuring + matching (Chemin A), layered on top of the now-working `GroupTrip`/`Booking` skeleton.
3. **Weeks 7–9**: agency dashboard, admin dashboard, all 14 emails, both cancellation flows.
4. **Weeks 10–12**: legal pages (must land by week 10), marketplace + landing page, QA against §11, polish, production deploy.

## 14. Definition of done, per module

A module isn't done when the UI renders — it's done when: the happy path works, the failure path degrades gracefully (never a blank screen, never a silent data-integrity drift), the relevant role check is in place, and it's covered by at least the §11 test relevant to it. `GroupTrip` publishing isn't done without the deposit-floor check (§5). The booking flow isn't done without the atomic capacity update (§6.3). The cron isn't done without the `remindedAt` guard (§5, §9).
