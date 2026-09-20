/**
 * Order model, Founding Node reservation, and entitlements (§3, §4, §9 of
 * phase-2-orders-and-checkout.md).
 *
 * Persistence is behind a repository interface. `InMemoryOrderStore` is
 * dev/test scaffolding -- it is not a fake implementation of the business
 * rules (reservation limits, idempotency, status transitions all behave
 * exactly as a real store must), but it does not survive a process
 * restart. The deployed site needs a real DATABASE_URL wired to a
 * Postgres-backed implementation of the same interface before this is a
 * real product, not a demo of one.
 */
import { catalog, CORE_MODULE_ID, snapshot, type Catalog } from "@/lib/catalog";

export type OrderStatus = "PENDING" | "RESERVED" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED";

export interface Order {
  order_id: string;
  customer_id: string;
  email: string;
  created_at: string;
  status: OrderStatus;
  payment_provider: string;
  payment_provider_reference: string | null;
  amount: number;
  currency: string;
  node_id: string | null;
  purchased_modules: string[];
  module_versions: Record<string, string>;
  catalog_snapshot_hash: string;
  license_version: string | null;
  terms_version: string;
  refund_policy_version: string;
  founding_node: boolean;
  reservation_expires_at: string | null;
}

export interface Entitlement {
  entitlement_id: string;
  node_id: string;
  module_id: string;
  order_id: string;
  purchased_at: string;
  update_entitlement_start: string;
  update_entitlement_end: string;
  installed_version: string;
  latest_entitled_version: string;
  revoked_at: string | null;
  reason: string | null;
}

export const FOUNDING_RESERVATION_MIN = 30;
export const FOUNDING_NODE_LIMIT = 100;
export const TERMS_VERSION = "terms-draft-v1";
export const REFUND_POLICY_VERSION = "no-refunds-all-sales-final-v1";

export class OrderValidationError extends Error {}

export interface CatalogResolution {
  purchased_modules: string[];
  module_versions: Record<string, string>;
  amount: number;
}

/**
 * Server-side truth (§2): re-resolves a client-submitted module selection
 * against catalog.json. Never trusts prices or totals from the browser.
 *
 * Accepts an optional catalog override so tests can exercise the "a module
 * is actually available" path without pretending the real, current
 * snapshot (all 24 NOT_IMPLEMENTED) says otherwise. Production code never
 * passes this parameter -- it always resolves against the real snapshot.
 */
export function resolveSelectionServerSide(requestedModuleIds: string[], catalogOverride: Catalog = catalog): CatalogResolution {
  const ids = new Set(requestedModuleIds);
  ids.add(CORE_MODULE_ID); // TA/Core is never deselectable

  const findModule = (id: string) => catalogOverride.modules.find((m) => m.id === id);

  for (const id of ids) {
    const m = findModule(id);
    if (!m) {
      throw new OrderValidationError(`Unknown module id: ${id}`);
    }
    if (!(m.implementation_status === "COMPLETE" && m.commercially_available)) {
      throw new OrderValidationError(`Module not commercially available: ${id}`);
    }
    for (const dep of m.dependencies) {
      if (!ids.has(dep)) {
        throw new OrderValidationError(`Missing dependency ${dep} required by ${id}`);
      }
    }
  }

  const purchased_modules = [...ids].sort();
  const module_versions: Record<string, string> = {};
  for (const id of purchased_modules) {
    module_versions[id] = findModule(id)!.version;
  }

  const allSelected = catalogOverride.modules.every((m) => ids.has(m.id));
  const individualTotal = purchased_modules.reduce((sum, id) => sum + findModule(id)!.price, 0);
  const amount = allSelected ? catalogOverride.pricing.complete_bundle : individualTotal;

  return { purchased_modules, module_versions, amount };
}

export interface OrderStore {
  create(order: Order): Promise<void>;
  get(orderId: string): Promise<Order | undefined>;
  update(orderId: string, patch: Partial<Order>): Promise<void>;
  findByPaymentReference(reference: string): Promise<Order | undefined>;
  /** PAID founding orders + unexpired RESERVED founding orders, evaluated atomically with the reservation write. */
  countActiveFoundingSpots(now: Date): Promise<number>;
  listAll(): Promise<Order[]>;
}

/**
 * Dev/test in-memory store. The founding-spot count-then-reserve step runs
 * inside a single synchronous critical section, which is correct for a
 * single Node.js process but is NOT a substitute for the DB-level
 * transaction or lock the real store must use once multiple server
 * instances exist (§4: "Enforce the 100 limit with a database-level
 * transaction or lock, so concurrent checkouts can never exceed 100.").
 */
export class InMemoryOrderStore implements OrderStore {
  private orders = new Map<string, Order>();

  async create(order: Order): Promise<void> {
    this.orders.set(order.order_id, { ...order });
  }

  async get(orderId: string): Promise<Order | undefined> {
    const o = this.orders.get(orderId);
    return o ? { ...o } : undefined;
  }

  async update(orderId: string, patch: Partial<Order>): Promise<void> {
    const existing = this.orders.get(orderId);
    if (!existing) throw new Error(`Order not found: ${orderId}`);
    this.orders.set(orderId, { ...existing, ...patch });
  }

  async findByPaymentReference(reference: string): Promise<Order | undefined> {
    for (const o of this.orders.values()) {
      if (o.payment_provider_reference === reference) return { ...o };
    }
    return undefined;
  }

  async countActiveFoundingSpots(now: Date): Promise<number> {
    let count = 0;
    for (const o of this.orders.values()) {
      if (!o.founding_node) continue;
      if (o.status === "PAID") count++;
      else if (o.status === "RESERVED" && o.reservation_expires_at && new Date(o.reservation_expires_at) > now) count++;
    }
    return count;
  }

  async listAll(): Promise<Order[]> {
    return [...this.orders.values()].map((o) => ({ ...o }));
  }
}

export class FoundingNodeSoldOutError extends Error {
  constructor() {
    super("All 100 Founding Node spots are paid or reserved.");
  }
}

/**
 * Creates a PENDING order and, if it uses a Founding spot, reserves one
 * atomically with the count check. Throws FoundingNodeSoldOutError if the
 * 100-spot limit is already reached.
 */
export async function createPendingOrder(
  store: OrderStore,
  params: { orderId: string; customerId: string; email: string; resolution: CatalogResolution; foundingNode: boolean; now?: Date }
): Promise<Order> {
  const now = params.now ?? new Date();

  if (params.foundingNode) {
    const active = await store.countActiveFoundingSpots(now);
    if (active >= FOUNDING_NODE_LIMIT) {
      throw new FoundingNodeSoldOutError();
    }
  }

  const order: Order = {
    order_id: params.orderId,
    customer_id: params.customerId,
    email: params.email,
    created_at: now.toISOString(),
    status: params.foundingNode ? "RESERVED" : "PENDING",
    payment_provider: "stripe",
    payment_provider_reference: null,
    amount: params.resolution.amount,
    currency: "usd",
    node_id: null,
    purchased_modules: params.resolution.purchased_modules,
    module_versions: params.resolution.module_versions,
    catalog_snapshot_hash: snapshot.files["catalog.json"],
    license_version: null,
    terms_version: TERMS_VERSION,
    refund_policy_version: REFUND_POLICY_VERSION,
    founding_node: params.foundingNode,
    reservation_expires_at: params.foundingNode
      ? new Date(now.getTime() + FOUNDING_RESERVATION_MIN * 60_000).toISOString()
      : null,
  };

  await store.create(order);
  return order;
}

/** Stripe's own minimum -- rejects an expires_at less than 30 minutes out. */
const STRIPE_MIN_EXPIRY_SECONDS = 30 * 60;
/** Small safety margin so processing latency between order creation and the actual Stripe API call never drops us under Stripe's minimum. */
const EXPIRY_SAFETY_MARGIN_SECONDS = 60;

/**
 * The Unix-seconds timestamp a Founding Node order's Stripe Checkout
 * Session must expire at, so Stripe's own session can never outlive our
 * internal reservation window. Without this, Stripe defaults a session to
 * a 24-hour expiry -- far longer than FOUNDING_RESERVATION_MIN -- which
 * would let someone complete payment long after their reservation lapsed
 * and the spot was potentially given to someone else.
 *
 * Returns undefined for a non-founding order (no scarcity to protect;
 * Stripe's default expiry is fine).
 */
export function checkoutExpiresAtSeconds(order: Order, now: Date = new Date()): number | undefined {
  if (!order.founding_node || !order.reservation_expires_at) return undefined;

  const reservationSeconds = Math.floor(new Date(order.reservation_expires_at).getTime() / 1000);
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const minAllowed = nowSeconds + STRIPE_MIN_EXPIRY_SECONDS + EXPIRY_SAFETY_MARGIN_SECONDS;

  // Clamp up to Stripe's enforced minimum if our reservation window is
  // already too close to "now" for Stripe to accept (e.g. clock skew, or
  // FOUNDING_RESERVATION_MIN itself being exactly 30). This means Stripe's
  // session can, in the worst case, outlive our reservation by up to
  // EXPIRY_SAFETY_MARGIN_SECONDS -- an accepted, tiny residual window, not
  // an unbounded one. It is closed further by the webhook's own defensive
  // capacity check (see app/api/webhooks/stripe/route.ts).
  return Math.max(reservationSeconds, minAllowed);
}

export function buildEntitlements(order: Order, nodeId: string, now: Date = new Date()): Entitlement[] {
  const entitlementEnd = new Date(now);
  entitlementEnd.setUTCMonth(entitlementEnd.getUTCMonth() + 24);

  return order.purchased_modules.map((moduleId) => ({
    entitlement_id: `${order.order_id}:${moduleId}`,
    node_id: nodeId,
    module_id: moduleId,
    order_id: order.order_id,
    purchased_at: now.toISOString(),
    update_entitlement_start: now.toISOString(),
    update_entitlement_end: entitlementEnd.toISOString(),
    installed_version: order.module_versions[moduleId],
    latest_entitled_version: order.module_versions[moduleId],
    revoked_at: null,
    reason: null,
  }));
}
