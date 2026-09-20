/**
 * Payment provider interface (§1 of phase-2-orders-and-checkout.md).
 * No provider-specific logic outside an adapter that implements this.
 */
export interface CheckoutSessionParams {
  orderId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface WebhookVerificationResult {
  eventId: string;
  eventType: string;
  orderId: string | null;
  paymentReference: string | null;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "unknown";

export interface PaymentProvider {
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
  verifyWebhook(rawBody: string, signatureHeader: string | null): WebhookVerificationResult;
  getPaymentStatus(paymentReference: string): Promise<PaymentStatus>;
  refund(paymentReference: string): Promise<void>;
}
