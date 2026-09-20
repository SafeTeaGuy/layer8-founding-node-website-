import { catalog, getModule } from "@/lib/catalog";

export function Hero() {
  const ta = getModule("layer8-ta");
  const price = ta ? ta.price : catalog.pricing.layer8_ta;

  return (
    <section className="section hero">
      <div className="container">
        <div className="eyebrow">100 Founding Nodes</div>
        <h1>BUILD YOUR OWN LAYER8.</h1>
        <p className="sub">
          A local AI market-research node that captures evidence first, then lets you add the research
          brains you want. Starting at ${price.toLocaleString()}.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href="#builder">
            BUILD YOUR NODE
          </a>
          <a className="btn btn-secondary" href="#how-it-works">
            HOW LAYER8 WORKS
          </a>
        </div>
      </div>
    </section>
  );
}
