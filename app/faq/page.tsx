const FAQS = [
  {
    q: "Does a Founding Node earn tokens, yield, or investment returns?",
    a: "No. Layer8 Nodes do not earn tokens, yield, revenue share, or investment returns. Buying one is buying software. Any future network terms will be published separately and are not part of this purchase.",
  },
  {
    q: "What happens when my node is offline?",
    a: "It records a gap. Layer8 never fabricates or silently backfills missing history.",
  },
  {
    q: "What am I actually getting today?",
    a: "See the Proof section on the homepage and docs/FOUNDING_NODE_READINESS.md in the Layer8 repository for the current, honest state of every component. Nothing is oversold here.",
  },
  {
    q: "What's the update policy?",
    a: "See the Update Policy page — 24 months of compatible updates per module, starting from that module's own purchase date.",
  },
];

export default function FaqPage() {
  return (
    <main className="section">
      <div className="container">
        <h1>FAQ</h1>
        <div className="grid" style={{ marginTop: 24 }}>
          {FAQS.map((f) => (
            <div className="card" key={f.q}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{f.q}</div>
              <div style={{ color: "var(--text-dim)" }}>{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
