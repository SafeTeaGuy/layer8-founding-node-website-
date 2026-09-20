import { getFeedList } from "@/lib/readiness";

export default function FeedsPage() {
  const feeds = getFeedList();
  return (
    <main className="section">
      <div className="container">
        <h1>Supported feeds</h1>
        <p style={{ color: "var(--text-dim)" }}>
          From this repository&rsquo;s snapshotted feed capabilities. A feed listed here has code that
          normalizes its message shape — it does not mean live capture is running today.
        </p>
        <div className="grid" style={{ marginTop: 24 }}>
          {feeds.map((f) => (
            <div className="card" key={f.venue}>
              <div style={{ fontWeight: 700 }}>
                {f.provider} — {f.market}
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-dim)", marginTop: 8 }}>
                <div>Transport: {f.transport}</div>
                <div>Capture status: {f.capture_status}</div>
                <div>Geographic/jurisdiction limits: {f.geographic_or_jurisdiction_limits}</div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 10 }}>{f.known_gaps}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
