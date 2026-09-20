export default function UpdatePolicyPage() {
  return (
    <main className="section">
      <div className="container">
        <h1>Update policy</h1>
        <p>
          Each purchased Layer8 module includes <strong>24 months of compatible software updates</strong>{" "}
          beginning on the date that specific module is purchased. Layer8 TA/Core&rsquo;s window begins on
          the original TA/Core purchase date. Modules added later each get their own 24-month window from
          their own purchase date.
        </p>
        <p style={{ color: "var(--text-dim)" }}>
          When an update window ends, the software keeps working — this is not a subscription. Updates are
          never installed silently; the node shows what changed and you approve it. Module updates never
          erase or silently rewrite your captured evidence or Market Memory.
        </p>
        <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 24 }}>
          This is draft commercial policy pending legal review, not a final legal document. See the founder
          decisions recorded for this build in the Layer8 repository&rsquo;s{" "}
          <code>docs/business/update-policy-draft.md</code>.
        </p>
      </div>
    </main>
  );
}
