import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  FoundingNodeSoldOutError,
  OrderValidationError,
  createPendingOrder,
  resolveSelectionServerSide,
} from "@/lib/orders";
import { getOrderStore, getPaymentProvider } from "@/lib/server";
import { getE2EFixtureCatalog, isE2EFixtureActive } from "@/lib/e2eFixtureCatalog";

interface CheckoutRequestBody {
  moduleIds: string[];
  email: string;
  termsAccepted: boolean;
}

export async function POST(req: NextRequest) {
  let body: CheckoutRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // §5: checkout is blocked until every required acknowledgement is checked.
  if (body.termsAccepted !== true) {
    return NextResponse.json(
      { error: "Terms and disclosure acknowledgement is required before checkout." },
      { status: 400 }
    );
  }
  if (!body.email || !/.+@.+\..+/.test(body.email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  // §2: server-side truth. Never trust module IDs, prices, or totals from the browser.
  //
  // isE2EFixtureActive() is false in every real deployment (production is a
  // hard code-level block, see lib/e2eFixtureCatalog.ts) -- when it's
  // false, resolveSelectionServerSide falls back to its default parameter,
  // the real catalog, exactly as if this line didn't exist.
  const fixtureActive = isE2EFixtureActive();
  let resolution;
  try {
    resolution = fixtureActive
      ? resolveSelectionServerSide(body.moduleIds ?? [], getE2EFixtureCatalog())
      : resolveSelectionServerSide(body.moduleIds ?? []);
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const store = getOrderStore();
  const orderId = randomUUID();

  let order;
  try {
    // Phase 2 only sells new nodes; adding modules to an existing node is Phase 3 scope.
    order = await createPendingOrder(store, {
      orderId,
      customerId: body.email,
      email: body.email,
      resolution,
      foundingNode: true,
    });
  } catch (err) {
    if (err instanceof FoundingNodeSoldOutError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }

  const origin = req.nextUrl.origin;
  const provider = getPaymentProvider();
  const session = await provider.createCheckoutSession({
    orderId: order.order_id,
    amountCents: Math.round(order.amount * 100),
    currency: order.currency,
    customerEmail: order.email,
    description: `Layer8 Founding Node -- ${order.purchased_modules.length} module(s)`,
    successUrl: `${origin}/order/success?order_id=${order.order_id}`,
    cancelUrl: `${origin}/#builder`,
  });

  await store.update(order.order_id, { payment_provider_reference: session.sessionId });

  return NextResponse.json({ url: session.url, orderId: order.order_id, e2eFixtureActive: fixtureActive });
}
