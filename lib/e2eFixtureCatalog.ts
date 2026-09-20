/**
 * E2E-test-only catalog override. This exists to let the Stripe
 * checkout -> webhook -> entitlement path be exercised end-to-end without
 * editing data/catalog.json (the real product data, honestly showing 0/24
 * modules implemented) or lying to a real visitor's browser about what's
 * available.
 *
 * SAFETY DESIGN -- two independent conditions must both hold, and neither
 * is something an operator can satisfy by mistake through project config:
 *
 * 1. `process.env.VERCEL_ENV !== "production"` -- VERCEL_ENV is a system
 *    variable Vercel injects itself based on the actual deployment
 *    context ("production" / "preview" / "development"). It is not a
 *    project environment variable a person sets in the dashboard, so it
 *    cannot be accidentally left on for the production deployment the way
 *    a custom env var could be. This is the hard, code-level block.
 * 2. `E2E_FIXTURE_CATALOG=true` must also be explicitly set. Belt and
 *    suspenders: even on a preview deployment, the fixture stays off
 *    unless this is set too.
 *
 * This module is imported ONLY by the checkout API route below, gated
 * behind isE2EFixtureActive(). It is never imported by lib/catalog.ts,
 * never by any page or component that renders to a real visitor -- the
 * Node Builder, proof section, and every other page always render the
 * real snapshot regardless of this flag.
 */
import type { Catalog } from "@/lib/catalog";
import fixtureCatalogData from "@/data/catalog.e2e-fixture.json";

const fixtureCatalog = fixtureCatalogData as Catalog;

export function isE2EFixtureActive(): boolean {
  const isProduction = process.env.VERCEL_ENV === "production";
  const requested = process.env.E2E_FIXTURE_CATALOG === "true";
  return requested && !isProduction;
}

export function getE2EFixtureCatalog(): Catalog {
  return fixtureCatalog;
}
