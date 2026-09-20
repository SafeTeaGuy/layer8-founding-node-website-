import { describe, expect, it, vi } from "vitest";

const createMock = vi.fn().mockResolvedValue({ id: "cs_test_123", url: "https://checkout.stripe.com/test" });

vi.mock("stripe", () => {
  return {
    default: class FakeStripe {
      checkout = { sessions: { create: createMock } };
    },
  };
});

const { StripePaymentProvider } = await import("@/lib/payments/stripe");

describe("StripePaymentProvider forwards expiresAt to Stripe (never lets a session outlive a reservation)", () => {
  it("includes expires_at in the Stripe API call when provided", async () => {
    createMock.mockClear();
    const provider = new StripePaymentProvider("sk_test_fake", "whsec_fake");
    const expiresAt = Math.floor(Date.now() / 1000) + 1800;

    await provider.createCheckoutSession({
      orderId: "order-1",
      amountCents: 50000,
      currency: "usd",
      customerEmail: "test@example.com",
      description: "test",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      expiresAt,
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.expires_at).toBe(expiresAt);
  });

  it("omits expires_at entirely when not provided (non-founding orders use Stripe's default)", async () => {
    createMock.mockClear();
    const provider = new StripePaymentProvider("sk_test_fake", "whsec_fake");

    await provider.createCheckoutSession({
      orderId: "order-2",
      amountCents: 10000,
      currency: "usd",
      customerEmail: "test@example.com",
      description: "test",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.expires_at).toBeUndefined();
  });
});
