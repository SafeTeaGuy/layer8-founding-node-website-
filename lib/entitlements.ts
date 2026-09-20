import type { Entitlement } from "@/lib/orders";

export interface EntitlementStore {
  createMany(entitlements: Entitlement[]): Promise<void>;
  listByNodeId(nodeId: string): Promise<Entitlement[]>;
  listByOrderId(orderId: string): Promise<Entitlement[]>;
}

/** Dev/test in-memory store -- see lib/orders.ts's InMemoryOrderStore note; same caveat applies. */
export class InMemoryEntitlementStore implements EntitlementStore {
  private entitlements: Entitlement[] = [];

  async createMany(entitlements: Entitlement[]): Promise<void> {
    this.entitlements.push(...entitlements);
  }

  async listByNodeId(nodeId: string): Promise<Entitlement[]> {
    return this.entitlements.filter((e) => e.node_id === nodeId);
  }

  async listByOrderId(orderId: string): Promise<Entitlement[]> {
    return this.entitlements.filter((e) => e.order_id === orderId);
  }
}
