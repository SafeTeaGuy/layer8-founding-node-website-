# Layer8 Founding Node Website

Sales and configuration interface for the Layer8 Node product. This repo is
intentionally separate from [SafeTeaGuy/Layer8](https://github.com/SafeTeaGuy/Layer8)
(the research architecture) — see that repo's `docs/build-phases/website/` for the
phase specs this was built against, and `docs/business/` for the commercial drafts
(pricing, update policy) this site reads facts from.

**Current phase: Phase 1 of 3 — Site and Node Builder.** No payments, orders, or
accounts exist yet. STOP was honored at the end of Phase 1 per the phase doc's own
rule; Phase 2 (Orders and Checkout) has not been started.

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

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest — catalog logic, dependency cascade, price calc, proof-section rules
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
