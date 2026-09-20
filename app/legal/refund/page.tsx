export default function RefundPage() {
  return (
    <main className="section">
      <div className="container">
        <h1>Refund terms</h1>
        <p className="proof-not-published">NOT YET PUBLISHED as a final legal document.</p>
        <p style={{ color: "var(--text-dim)" }}>
          The founder-decided commercial policy for this build is <strong>no refunds — all sales final</strong>.
          That policy still requires a founder-supplied legal document before checkout can point to it as a
          binding term; see <code>docs/business/founding-node-pricing-draft.md</code> in the Layer8
          repository for the record of that decision.
        </p>
      </div>
    </main>
  );
}
