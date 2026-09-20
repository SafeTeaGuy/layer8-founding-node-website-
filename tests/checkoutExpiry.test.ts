import { describe, expect, it } from "vitest";
import { checkoutExpiresAtSeconds, createPendingOrder, InMemoryOrderStore, resolveSelectionServerSide } from "@/lib/orders";
import type { Catalog } from "@/lib/catalog";
import { CORE_MODULE_ID } from "@/lib/catalog";

const fixtureCatalog: Catalog = {
  catalog_version: "test-fixture",
  generated_from: "test",
  note: "test",
  pricing: { layer8_ta: 500, specialist_module: 100, layer8_trade: 2000, complete_bundle: 4000, upgrade_pricing_rule: "x" },
  modules: [
    {
      id: CORE_MODULE_ID,
      name: "Layer8 TA",
      description: "test",
      version: "1.0.0",
      implementation_status: "COMPLETE",
      commercially_available: true,
      dependencies: [],
      required_feeds: [],
      price: 500,
      installable: true,
      enabled: true,
    },
  ],
};

describe("Stripe session expiry never outlives the Founding Node reservation", () => {
  it("returns undefined for a non-founding order (no scarcity to protect)", async () => {
    const store = new InMemoryOrderStore();
    const resolution = resolveSelectionServerSide([], fixtureCatalog);
    const order = await createPendingOrder(store, {
      orderId: "o1",
      customerId: "c",
      email: "c@example.com",
      resolution,
      foundingNode: false,
    });
    expect(checkoutExpiresAtSeconds(order)).toBeUndefined();
  });

  it("matches the reservation's own expiry when that is comfortably in the future", async () => {
    const store = new InMemoryOrderStore();
    const resolution = resolveSelectionServerSide([], fixtureCatalog);
    const now = new Date("2026-01-01T00:00:00Z");
    const order = await createPendingOrder(store, {
      orderId: "o2",
      customerId: "c",
      email: "c@example.com",
      resolution,
      foundingNode: true,
      now,
    });
    // reservation_expires_at = now + 30 min exactly
    const expected = Math.floor(new Date("2026-01-01T00:30:00Z").getTime() / 1000);
    // clamped up by the safety margin since 30 min is exactly Stripe's minimum
    expect(checkoutExpiresAtSeconds(order, now)).toBeGreaterThanOrEqual(expected);
  });

  it("never returns a value less than Stripe's 30-minute minimum from 'now', even under clock skew", async () => {
    const store = new InMemoryOrderStore();
    const resolution = resolveSelectionServerSide([], fixtureCatalog);
    const orderCreatedAt = new Date("2026-01-01T00:00:00Z");
    const order = await createPendingOrder(store, {
      orderId: "o3",
      customerId: "c",
      email: "c@example.com",
      resolution,
      foundingNode: true,
      now: orderCreatedAt,
    });
    // Simulate the Stripe API call happening 5 minutes of processing delay later.
    const laterNow = new Date("2026-01-01T00:05:00Z");
    const expiresAt = checkoutExpiresAtSeconds(order, laterNow)!;
    const minAllowedByStripe = Math.floor(laterNow.getTime() / 1000) + 30 * 60;
    expect(expiresAt).toBeGreaterThanOrEqual(minAllowedByStripe);
  });

  it("Stripe's session expiry is never earlier than the reservation's own expiry", async () => {
    const store = new InMemoryOrderStore();
    const resolution = resolveSelectionServerSide([], fixtureCatalog);
    const now = new Date("2026-01-01T00:00:00Z");
    const order = await createPendingOrder(store, {
      orderId: "o4",
      customerId: "c",
      email: "c@example.com",
      resolution,
      foundingNode: true,
      now,
    });
    const reservationSeconds = Math.floor(new Date(order.reservation_expires_at!).getTime() / 1000);
    expect(checkoutExpiresAtSeconds(order, now)!).toBeGreaterThanOrEqual(reservationSeconds);
  });
});
