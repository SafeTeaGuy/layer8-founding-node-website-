import Stripe from "stripe";
import type {
  CheckoutSessionParams,
  CheckoutSessionResult,
  PaymentProvider,
  PaymentStatus,
  WebhookVerificationResult,
} from "./types";

export class WebhookVerificationError extends Error {}

export class StripePaymentProvider implements PaymentProvider {
  private client: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    if (!secretKey) throw new Error("Stripe secret key is required");
    this.client = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const session = await this.client.checkout.sessions.create({
      mode: "payment",
      customer_email: params.customerEmail,
      line_items: [
        {
          price_data: {
            currency: params.currency,
            unit_amount: params.amountCents,
            product_data: { name: params.description },
          },
          quantity: 1,
        },
      ],
      metadata: { order_id: params.orderId },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout session URL");
    }
    return { sessionId: session.id, url: session.url };
  }

  /** Verify every signature (§7). Reject unsigned or invalid webhooks. */
  verifyWebhook(rawBody: string, signatureHeader: string | null): WebhookVerificationResult {
    if (!signatureHeader) {
      throw new WebhookVerificationError("Missing Stripe-Signature header");
    }
    let event: Stripe.Event;
    try {
      event = this.client.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);
    } catch (err) {
      throw new WebhookVerificationError(`Invalid webhook signature: ${(err as Error).message}`);
    }

    let orderId: string | null = null;
    let paymentReference: string | null = null;
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      orderId = session.metadata?.order_id ?? null;
      paymentReference = session.id;
    }

    return { eventId: event.id, eventType: event.type, orderId, paymentReference };
  }

  async getPaymentStatus(paymentReference: string): Promise<PaymentStatus> {
    const session = await this.client.checkout.sessions.retrieve(paymentReference);
    if (session.payment_status === "paid") return "paid";
    if (session.status === "expired") return "failed";
    return "pending";
  }

  /**
   * Not exposed to customers -- REFUND_POLICY is "no refunds, all sales
   * final" (docs/business/founding-node-pricing-draft.md). This exists
   * only as the provider-level primitive §1 requires, for a founder-
   * initiated manual override (e.g. a chargeback dispute response) via
   * the Phase 3 admin view, never automatically triggered by a customer.
   */
  async refund(paymentReference: string): Promise<void> {
    const session = await this.client.checkout.sessions.retrieve(paymentReference);
    if (typeof session.payment_intent === "string") {
      await this.client.refunds.create({ payment_intent: session.payment_intent });
    }
  }
}
