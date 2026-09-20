# Layer8 Founding Node Website

Sales and configuration interface for the Layer8 Node product. This repo is
intentionally separate from [SafeTeaGuy/Layer8](https://github.com/SafeTeaGuy/Layer8)
(the research architecture) — see that repo's `docs/build-phases/website/` for the
phase specs this was built against, and `docs/business/` for the commercial drafts
(pricing, update policy) this site reads facts from.

**Phase 1 of 3 (Site and Node Builder) is done.** **Phase 2 (Orders and Checkout)
is in progress**: payment abstraction, order model, Founding Node reservation,
Stripe checkout session creation, webhook handling, Node ID issuance, and
entitlements are built and unit-tested (see `lib/orders.ts`, `lib/payments/`,
`app/api/checkout/`, `app/api/webhooks/stripe/`). **Not yet verified against a
live Stripe test-mode round trip or a real deployment** — see "Known risk"
below and the Layer8 repo's `docs/build-phases/BUILD_QUEUE.md` for current
status.

## Founder decisions locked for this build

```
PAYMENT_PROVIDER_PRIMARY:    Stripe
PAYMENT_PROVIDER_SECONDARY:  none
FRAMEWORK:                   Next.js
HOSTING:                     Vercel
REPO:                        this one (separate from the Layer8 architecture repo)
CUSTOMER_SIGN_IN:            magic-link email (default)
TRANSACTIONAL_EMAIL:         Resend
SALES_TAX_HANDLING:          Stripe Tax
UPGRADE_PRICING_RULE:        bundle price minus what's already paid
FOUNDING_RESERVATION_MIN:    30
UPDATE_POLICY:               24 months per module from that module's own purchase date
REFUND_POLICY:               no refunds, all sales final
```

## Canonical data (`data/`)

Every product claim on this site — module list, price, dependency, availability,
readiness fact — is read from `data/`, a versioned, hash-pinned snapshot of the
Layer8 repository's own canonical files. Nothing here is invented:

| File | Snapshotted from |
|---|---|
| `data/catalog.json` | Layer8 `modules/catalog.json` |
| `data/feed_capabilities.json` | Layer8 `docs/feed_capabilities.json` |
| `data/FOUNDING_NODE_READINESS.md` | Layer8 `docs/FOUNDING_NODE_READINESS.md` |
| `data/proof_facts.json` | Hand-extracted structured facts from the readiness doc above; every field is either a cited real value or `null` |
| `data/snapshot.json` | The manifest recording the Layer8 commit this snapshot was taken at, plus a sha256 of each file above |

`data/snapshot.json`'s `source_commit` and the per-file hashes are shown in the
site footer. To refresh the snapshot after a Layer8 change, re-copy those three
files from the Layer8 repo and regenerate `snapshot.json`'s hashes and commit
pointer (there is no automated sync job yet — that's a reasonable Phase 2+ addition,
not invented here).

Because every module in the current snapshot is `NOT_IMPLEMENTED` and
`commercially_available: false` (per the frozen Phase 1 productization audit), the
Node Builder correctly shows everything — including Layer8 TA — as `COMING LATER`.
That's the accurate state, not a bug.

## Phase 2: orders, checkout, webhooks, entitlements

- `lib/orders.ts` — `Order` model, `resolveSelectionServerSide` (server-side
  truth: never trusts a module list, price, or total from the browser),
  Founding Node reservation (100-spot limit, 30-minute reservation window),
  `buildEntitlements` (24-month update windows per module).
- `lib/payments/` — `PaymentProvider` interface + `StripePaymentProvider`
  (checkout session creation, webhook signature verification via
  `stripe.webhooks.constructEvent`, payment status lookup). No Stripe-specific
  code exists outside this one file.
- `app/api/checkout/route.ts` — validates terms acknowledgement and email,
  re-resolves the selection against the real catalog server-side, creates a
  PENDING/RESERVED order, creates the Stripe checkout session.
- `app/api/webhooks/stripe/route.ts` — verifies every signature, is
  idempotent on the order ID (a duplicate `checkout.session.completed`
  creates no second Node ID or entitlement), issues the Node ID only after
  re-confirming payment status with Stripe, builds entitlements.
- `lib/notifications.ts` — receipt email. With no `RESEND_API_KEY` configured
  it logs and returns `NOT_SENT_NO_PROVIDER_CONFIGURED` rather than claiming
  a send that didn't happen.

### Founding Node reservations don't leak past their own expiry

A Founding Node order is `RESERVED`, not `PAID`, the moment checkout begins,
with a `reservation_expires_at` 30 minutes out (`FOUNDING_RESERVATION_MIN`).
`countActiveFoundingSpots` already excludes lapsed reservations from the
100-spot count regardless of whether any webhook ever fires, so an abandoned
or bot-created session can't permanently consume a spot.

The part that needed fixing: Stripe defaults an unconfigured Checkout
Session to a **24-hour** expiry, far longer than a 30-minute reservation.
Without aligning the two, someone could open checkout, let their reservation
lapse (spot freed and possibly reassigned), and still complete payment on
Stripe hours later — the webhook would then issue a Node ID for a spot that
may no longer exist. `checkoutExpiresAtSeconds` (`lib/orders.ts`) computes a
Stripe `expires_at` that matches the reservation window (clamped up to
Stripe's own 30-minute minimum plus a small safety margin for processing
latency, never down — Stripe can, in the worst case, outlive the reservation
by that margin, never the reverse). The webhook route also logs loudly
(not silently) if it ever sees a payment confirmed after its reservation had
already lapsed, as a residual-risk detector rather than a claim that this is
now provably impossible.

### E2E test fixture (never active in production)

The real `data/catalog.json` snapshot honestly shows all 24 modules as
`NOT_IMPLEMENTED` — nothing is commercially available, so there is nothing a
real checkout flow could purchase. To exercise the Stripe path end-to-end
without editing that real data or lying to a visitor's browser,
`lib/e2eFixtureCatalog.ts` provides one artificially-available test module,
gated behind **two independent conditions**, both required:

1. `process.env.VERCEL_ENV !== "production"` — a system variable Vercel
   itself injects based on the actual deployment context, not something a
   person can set via project configuration. This is the hard, code-level
   block: even if `E2E_FIXTURE_CATALOG=true` were mistakenly set on the
   production Vercel project, this check still keeps the fixture off there.
2. `E2E_FIXTURE_CATALOG=true` must also be explicitly set.

Only `app/api/checkout/route.ts` and the test-only
`app/api/e2e/order-status/route.ts` (returns an order + its entitlements,
gated the same way, for verifying webhook results without the Phase 3
customer portal) ever import this module. `lib/catalog.ts`'s real `catalog`
export — used by every page and component a visitor actually sees — is
never touched by it.

### Known risk, not yet resolved: in-memory store on serverless

`InMemoryOrderStore` and `InMemoryEntitlementStore` (`lib/orders.ts`,
`lib/entitlements.ts`) hold state in a `globalThis` singleton within one
Node.js process. That's correct and fully sufficient for local dev and the
unit tests. It is very likely **not** sufficient once deployed to Vercel:
serverless function invocations are not guaranteed to share a warm
container, so the order created by a `/api/checkout` request may not be
visible to the `/api/webhooks/stripe` request that arrives moments later
from Stripe's servers. This needs a real `DATABASE_URL`-backed
implementation of `OrderStore`/`EntitlementStore` before Phase 2 is a real
product rather than a demonstration of the logic. Flagging this now,
before the live E2E test, rather than being surprised by it.

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest — catalog logic, dependency cascade, price calc, proof-section rules, order/reservation/entitlement logic, E2E fixture safety guard
npm run check:no-hardcoded-prices   # static check: no price literals outside data/catalog.json
npm run build
```

## Structure

- `app/` — Next.js App Router pages: landing + Node Builder (`/`), `/feeds`,
  `/requirements`, `/faq`, `/update-policy`, `/legal/{license,refund,delivery}`
  (placeholders reading "NOT YET PUBLISHED" until the founder supplies real legal
  documents, per the phase doc's own rule).
- `components/` — `Hero`, `HowItWorks`, `ProofSection`, `NodeBuilder` (client
  component: selection state, dependency cascade, price calc).
- `lib/catalog.ts` — all catalog business logic (selection, dependency cascade,
  pricing). No frontend component computes a price independently.
- `lib/readiness.ts` — proof-section and feed-page data access.
- `.env.example` — documents Phase 2's future secrets (Stripe, Resend, database);
  none are required for this phase.

## What's next (not built here, per "STOP at the end of this phase")

Phase 2 (Orders, Checkout, Node IDs, Entitlements) and Phase 3 (Customer Portal,
Add-ons, Admin, Acceptance) — see the Layer8 repo's
`docs/build-phases/website/phase-2-orders-and-checkout.md` and
`phase-3-portal-and-acceptance.md`.
