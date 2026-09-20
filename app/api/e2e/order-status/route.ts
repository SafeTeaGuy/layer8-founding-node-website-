/**
 * E2E-test-only inspection endpoint. Returns an order's status and
 * entitlements so an automated test can verify the webhook actually
 * produced a Node ID and entitlements, without needing the Phase 3
 * customer portal (which doesn't exist yet). Gated exactly like the
 * fixture catalog -- see lib/e2eFixtureCatalog.ts's safety design.
 */
import { NextRequest, NextResponse } from "next/server";
import { isE2EFixtureActive } from "@/lib/e2eFixtureCatalog";
import { getEntitlementStore, getOrderStore } from "@/lib/server";

export async function GET(req: NextRequest) {
  if (!isE2EFixtureActive()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const orderId = req.nextUrl.searchParams.get("order_id");
  if (!orderId) {
    return NextResponse.json({ error: "order_id query param required" }, { status: 400 });
  }

  const order = await getOrderStore().get(orderId);
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
  const entitlements = await getEntitlementStore().listByOrderId(orderId);

  return NextResponse.json({ order, entitlements });
}
