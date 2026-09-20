export default function OrderSuccessPage({ searchParams }: { searchParams: { order_id?: string } }) {
  return (
    <main className="section">
      <div className="container">
        <h1>Payment received</h1>
        <p style={{ color: "var(--text-dim)" }}>
          Order <code>{searchParams.order_id ?? "unknown"}</code> is being confirmed. Your Node ID and
          entitlements are issued once Stripe&rsquo;s signed webhook confirms payment — this page does not
          itself prove payment (per phase-2-orders-and-checkout.md §6: &ldquo;the frontend redirect is
          never proof of payment&rdquo;).
        </p>
      </div>
    </main>
  );
}
