import { NextRequest, NextResponse } from "next/server";
import { buildEntitlements } from "@/lib/orders";
import { generateNodeId } from "@/lib/nodeId";
import { sendReceiptEmail } from "@/lib/notifications";
import { getEntitlementStore, getOrderStore, getPaymentProvider } from "@/lib/server";
import { WebhookVerificationError } from "@/lib/payments/stripe";

/**
 * §7 Webhooks. Verifies every signature; rejects unsigned/invalid webhooks.
 * Idempotent on the provider event ID and order ID -- repeated delivery
 * never creates a second Node ID, entitlement, or email.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  const provider = getPaymentProvider();
  let verified;
  try {
    verified = provider.verifyWebhook(rawBody, signature);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.warn(`[webhook] rejected: ${err.message}`);
      return NextResponse.json({ error: "invalid signature" }, { status: 400 });
    }
    throw err;
  }

  const orderStore = getOrderStore();

  if (verified.eventType === "checkout.session.completed") {
    if (!verified.orderId) {
      return NextResponse.json({ error: "missing order_id in session metadata" }, { status: 400 });
    }
    const order = await orderStore.get(verified.orderId);
    if (!order) {
      return NextResponse.json({ error: "unknown order_id" }, { status: 400 });
    }

    // Idempotency: a repeat delivery for an already-PAID order is a no-op.
    if (order.status === "PAID") {
      return NextResponse.json({ ok: true, idempotent: true });
    }

    // Defense in depth: re-confirm payment status with the provider rather
    // than trusting the event body alone.
    const status = verified.paymentReference ? await provider.getPaymentStatus(verified.paymentReference) : "unknown";
    if (status !== "paid") {
      return NextResponse.json({ ok: true, ignored: `payment status is ${status}` });
    }

    const nodeId = generateNodeId();
    await orderStore.update(order.order_id, {
      status: "PAID",
      node_id: nodeId,
      payment_provider_reference: verified.paymentReference,
    });

    const entitlements = buildEntitlements({ ...order, node_id: nodeId }, nodeId);
    await getEntitlementStore().createMany(entitlements);

    await sendReceiptEmail(
      order.email,
      `Your Layer8 Founding Node -- ${nodeId}`,
      `Your Node ID is ${nodeId}. Modules: ${order.purchased_modules.join(", ")}.`
    );

    return NextResponse.json({ ok: true });
  }

  if (verified.eventType === "checkout.session.expired") {
    if (verified.orderId) {
      const order = await orderStore.get(verified.orderId);
      // §7: a failed or expired payment creates no Node ID/entitlement and releases the reservation.
      if (order && order.status !== "PAID") {
        await orderStore.update(order.order_id, { status: "EXPIRED" });
      }
    }
    return NextResponse.json({ ok: true });
  }

  // Unhandled event types are acknowledged, not errors.
  return NextResponse.json({ ok: true, ignored: verified.eventType });
}
