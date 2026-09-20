export default function RequirementsPage() {
  return (
    <main className="section">
      <div className="container">
        <h1>System requirements</h1>
        <p style={{ color: "var(--text-dim)" }}>
          Every figure below comes from a measured benchmark, or it says <code>NOT_YET_BENCHMARKED</code>.
          Layer8&rsquo;s <code>layer8 benchmark</code> command (Node Productization Phase 4) has not run yet.
        </p>
        <table className="proof-table" style={{ marginTop: 24 }}>
          <tbody>
            <tr><td>CPU</td><td className="proof-not-published">NOT_YET_BENCHMARKED</td></tr>
            <tr><td>RAM</td><td className="proof-not-published">NOT_YET_BENCHMARKED</td></tr>
            <tr><td>Network throughput</td><td className="proof-not-published">NOT_YET_BENCHMARKED</td></tr>
            <tr><td>Disk usage per day</td><td className="proof-not-published">NOT_YET_BENCHMARKED</td></tr>
            <tr><td>Records per second</td><td className="proof-not-published">NOT_YET_BENCHMARKED</td></tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
