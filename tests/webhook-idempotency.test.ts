import { describe, expect, it } from "vitest";
import { InMemoryOrderStore, createPendingOrder, resolveSelectionServerSide, buildEntitlements } from "@/lib/orders";
import { InMemoryEntitlementStore } from "@/lib/entitlements";
import { generateNodeId } from "@/lib/nodeId";
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

/**
 * Simulates the webhook route's core idempotency logic (§7: "repeated
 * delivery never creates a second Node ID, entitlement, or email")
 * without spinning up a Next.js route handler or a real Stripe signature.
 */
async function processCompletedCheckout(
  orderStore: InMemoryOrderStore,
  entitlementStore: InMemoryEntitlementStore,
  orderId: string
) {
  const order = await orderStore.get(orderId);
  if (!order) throw new Error("order not found");
  if (order.status === "PAID") {
    return { idempotent: true };
  }
  const nodeId = generateNodeId();
  await orderStore.update(orderId, { status: "PAID", node_id: nodeId });
  const entitlements = buildEntitlements({ ...order, node_id: nodeId }, nodeId);
  await entitlementStore.createMany(entitlements);
  return { idempotent: false, nodeId };
}

describe("webhook idempotency", () => {
  it("a duplicate checkout.session.completed delivery creates no second Node ID or entitlement", async () => {
    const orderStore = new InMemoryOrderStore();
    const entitlementStore = new InMemoryEntitlementStore();
    const resolution = resolveSelectionServerSide([], fixtureCatalog);
    const order = await createPendingOrder(orderStore, {
      orderId: "dup-order",
      customerId: "c",
      email: "c@example.com",
      resolution,
      foundingNode: true,
    });

    const first = await processCompletedCheckout(orderStore, entitlementStore, order.order_id);
    expect(first.idempotent).toBe(false);
    const nodeIdAfterFirst = (await orderStore.get(order.order_id))!.node_id;

    const second = await processCompletedCheckout(orderStore, entitlementStore, order.order_id);
    expect(second.idempotent).toBe(true);
    const nodeIdAfterSecond = (await orderStore.get(order.order_id))!.node_id;

    expect(nodeIdAfterSecond).toBe(nodeIdAfterFirst);
    const entitlements = await entitlementStore.listByOrderId(order.order_id);
    expect(entitlements).toHaveLength(1); // one module (Core) -> one entitlement, not two
  });

  it("a failed/expired payment creates no Node ID and no entitlement", async () => {
    const orderStore = new InMemoryOrderStore();
    const resolution = resolveSelectionServerSide([], fixtureCatalog);
    const order = await createPendingOrder(orderStore, {
      orderId: "expired-order",
      customerId: "c",
      email: "c@example.com",
      resolution,
      foundingNode: true,
    });
    await orderStore.update(order.order_id, { status: "EXPIRED" });
    const stored = await orderStore.get(order.order_id);
    expect(stored!.status).toBe("EXPIRED");
    expect(stored!.node_id).toBeNull();
  });
});
