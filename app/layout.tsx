import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { snapshot } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Layer8 Founding Nodes",
  description: "Build your own Layer8: a local AI market-research node that captures evidence first.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="topnav">
          <div className="container">
            <Link href="/" style={{ color: "var(--text)", textDecoration: "none", fontWeight: 700 }}>
              LAYER8
            </Link>
            <div className="links">
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/#proof">Proof</Link>
              <Link href="/#builder">Build your node</Link>
              <Link href="/feeds">Feeds</Link>
              <Link href="/requirements">Requirements</Link>
              <Link href="/faq">FAQ</Link>
            </div>
          </div>
        </nav>
        {children}
        <footer className="sitefoot">
          <div className="container">
            <div>Layer8 Nodes do not earn tokens, yield, revenue share or investment returns. Buying one is buying software.</div>
            <div style={{ marginTop: 8 }}>
              Product data snapshot: {snapshot.source_commit.slice(0, 10)} · {snapshot.snapshot_taken_at}
              {" · "}
              <Link href="/legal/license">License</Link> · <Link href="/legal/refund">Refund</Link> ·{" "}
              <Link href="/legal/delivery">Delivery</Link> · <Link href="/update-policy">Update policy</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
