import { getProofFacts } from "@/lib/readiness";

export function ProofSection() {
  const facts = getProofFacts();
  return (
    <section className="section" id="proof">
      <div className="container">
        <div className="eyebrow">Don&rsquo;t trust the pitch. Look at the test.</div>
        <p style={{ color: "var(--text-dim)", maxWidth: 640, margin: "12px 0 24px" }}>
          Every field below comes from a real artifact in this repository&rsquo;s current snapshot, or it
          says so plainly. Nothing here is a placeholder number.
        </p>
        <table className="proof-table">
          <tbody>
            {facts.map((f) => (
              <tr key={f.label}>
                <td>{f.label}</td>
                <td className={f.value ? "" : "proof-not-published"}>{f.value ?? "Not yet published"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
