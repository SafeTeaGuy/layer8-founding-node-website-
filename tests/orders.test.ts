import { beforeEach, describe, expect, it } from "vitest";
import {
  FoundingNodeSoldOutError,
  FOUNDING_NODE_LIMIT,
  InMemoryOrderStore,
  OrderValidationError,
  buildEntitlements,
  createPendingOrder,
  resolveSelectionServerSide,
} from "@/lib/orders";
import type { Catalog } from "@/lib/catalog";
import { CORE_MODULE_ID } from "@/lib/catalog";

// A fixture catalog with one module actually available, used only to test
// the "a module is purchasable" path -- the real data/catalog.json still
// honestly shows all 24 as NOT_IMPLEMENTED (see lib/catalog.ts tests).
const fixtureCatalog: Catalog = {
  catalog_version: "test-fixture",
  generated_from: "test fixture",
  note: "test fixture",
  pricing: {
    layer8_ta: 500,
    specialist_module: 100,
    layer8_trade: 2000,
    complete_bundle: 4000,
    upgrade_pricing_rule: "bundle minus paid",
  },
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
    {
      id: "microstructure",
      name: "Layer8 Microstructure",
      description: "test",
      version: "1.0.0",
      implementation_status: "COMPLETE",
      commercially_available: true,
      dependencies: [CORE_MODULE_ID],
      required_feeds: [],
      price: 100,
      installable: true,
      enabled: true,
    },
    {
      id: "quant",
      name: "Layer8 Quant",
      description: "test",
      version: "1.0.0",
      implementation_status: "NOT_IMPLEMENTED",
      commercially_available: false,
      dependencies: [CORE_MODULE_ID],
      required_feeds: [],
      price: 100,
      installable: false,
      enabled: false,
    },
  ],
};

describe("resolveSelectionServerSide: tampering rejected", () => {
  it("rejects an unknown module id", () => {
    expect(() => resolveSelectionServerSide(["not-a-real-module"], fixtureCatalog)).toThrow(OrderValidationError);
  });

  it("rejects a module that isn't commercially available (server-side truth, ignores client claims)", () => {
    expect(() => resolveSelectionServerSide(["quant"], fixtureCatalog)).toThrow(/not commercially available/);
  });

  it("always includes and prices Core even if the client omits it", () => {
    const r = resolveSelectionServerSide([], fixtureCatalog);
    expect(r.purchased_modules).toEqual([CORE_MODULE_ID]);
    expect(r.amount).toBe(500);
  });

  it("computes the total from the catalog, not from a client-submitted amount", () => {
    const r = resolveSelectionServerSide(["microstructure"], fixtureCatalog);
    expect(r.purchased_modules.sort()).toEqual([CORE_MODULE_ID, "microstructure"].sort());
    expect(r.amount).toBe(600); // 500 + 100, never trusts a submitted total
  });

  it("still validates against the real (all NOT_IMPLEMENTED) catalog by default", () => {
    expect(() => resolveSelectionServerSide(["microstructure"])).toThrow(/not commercially available/);
  });
});

describe("Founding Node reservation limit", () => {
  it("allows up to FOUNDING_NODE_LIMIT reservations, then throws", async () => {
    const store = new InMemoryOrderStore();
    const resolution = resolveSelectionServerSide([], fixtureCatalog);
    for (let i = 0; i < FOUNDING_NODE_LIMIT; i++) {
      await createPendingOrder(store, {
        orderId: `order-${i}`,
        customerId: `c${i}`,
        email: `c${i}@example.com`,
        resolution,
        foundingNode: true,
      });
    }
    await expect(
      createPendingOrder(store, {
        orderId: "order-101",
        customerId: "c101",
        email: "c101@example.com",
        resolution,
        foundingNode: true,
      })
    ).rejects.toThrow(FoundingNodeSoldOutError);
  });

  it("an expired reservation releases its spot", async () => {
    const store = new InMemoryOrderStore();
    const resolution = resolveSelectionServerSide([], fixtureCatalog);
    const past = new Date(Date.now() - 60 * 60_000);
    for (let i = 0; i < FOUNDING_NODE_LIMIT; i++) {
      await createPendingOrder(store, {
        orderId: `order-${i}`,
        customerId: `c${i}`,
        email: `c${i}@example.com`,
        resolution,
        foundingNode: true,
        now: past,
      });
    }
    // All 100 reservations above are now expired (reserved 30+ min ago).
    await expect(
      createPendingOrder(store, {
        orderId: "order-fresh",
        customerId: "cfresh",
        email: "cfresh@example.com",
        resolution,
        foundingNode: true,
      })
    ).resolves.toBeDefined();
  });

  it("a PAID founding order counts against the limit even without an active reservation window", async () => {
    const store = new InMemoryOrderStore();
    const resolution = resolveSelectionServerSide([], fixtureCatalog);
    const order = await createPendingOrder(store, {
      orderId: "paid-order",
      customerId: "c",
      email: "c@example.com",
      resolution,
      foundingNode: true,
    });
    await store.update(order.order_id, { status: "PAID", reservation_expires_at: null });
    const count = await store.countActiveFoundingSpots(new Date());
    expect(count).toBe(1);
  });
});

describe("entitlements", () => {
  it("builds one entitlement per purchased module, each with a 24-month window from now", async () => {
    const store = new InMemoryOrderStore();
    const resolution = resolveSelectionServerSide(["microstructure"], fixtureCatalog);
    const order = await createPendingOrder(store, {
      orderId: "o1",
      customerId: "c",
      email: "c@example.com",
      resolution,
      foundingNode: true,
    });
    const now = new Date("2026-01-01T00:00:00Z");
    const entitlements = buildEntitlements(order, "L8-NODE-TESTTEST", now);
    expect(entitlements).toHaveLength(2);
    for (const e of entitlements) {
      expect(e.node_id).toBe("L8-NODE-TESTTEST");
      expect(new Date(e.update_entitlement_end).getUTCFullYear()).toBe(2028);
      expect(e.revoked_at).toBeNull();
    }
  });
});
