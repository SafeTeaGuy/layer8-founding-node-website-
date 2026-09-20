export function HowItWorks() {
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <div className="eyebrow">How Layer8 works</div>
        <div className="chain" style={{ margin: "16px 0 28px" }}>
          <span>MARKET</span>→<span>CAPTURE</span>→<span>EVIDENCE</span>→<span>OBSERVER</span>→
          <span>MARKET MAP</span>→<span>AGENTS</span>→<span>STORYTELLER</span>
        </div>
        <ul style={{ color: "var(--text-dim)", lineHeight: 1.8, paddingLeft: 20 }}>
          <li>The node captures supported market feeds locally.</li>
          <li>The Observer coordinates installed research modules. Modules snap in and register themselves; none assumes another exists.</li>
          <li>The Market Map preserves typed observations, disagreement, uncertainty, provenance, and gaps.</li>
          <li>The Storyteller explains what Layer8 knows and what it does not know.</li>
          <li>When the node is offline, it records a gap. It never invents history.</li>
        </ul>
      </div>
    </section>
  );
}
