/**
 * Server-side singletons. In-memory order store persists only for the life
 * of the process -- fine for local dev and the tests in tests/, but the
 * deployed site needs DATABASE_URL wired to a real implementation of
 * OrderStore before any of this is real (see lib/orders.ts's own note).
 */
import { InMemoryOrderStore, type OrderStore } from "@/lib/orders";
import { InMemoryEntitlementStore, type EntitlementStore } from "@/lib/entitlements";
import { StripePaymentProvider } from "@/lib/payments/stripe";
import type { PaymentProvider } from "@/lib/payments/types";

declare global {
  // eslint-disable-next-line no-var
  var __layer8OrderStore: OrderStore | undefined;
  // eslint-disable-next-line no-var
  var __layer8EntitlementStore: EntitlementStore | undefined;
}

export function getOrderStore(): OrderStore {
  if (!globalThis.__layer8OrderStore) {
    globalThis.__layer8OrderStore = new InMemoryOrderStore();
  }
  return globalThis.__layer8OrderStore;
}

export function getEntitlementStore(): EntitlementStore {
  if (!globalThis.__layer8EntitlementStore) {
    globalThis.__layer8EntitlementStore = new InMemoryEntitlementStore();
  }
  return globalThis.__layer8EntitlementStore;
}

export function getPaymentProvider(): PaymentProvider {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new StripePaymentProvider(secretKey, webhookSecret ?? "");
}
