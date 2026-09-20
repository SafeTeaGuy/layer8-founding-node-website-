"use client";

import { useState } from "react";
import {
  catalog,
  CORE_MODULE_ID,
  calculateTotal,
  bundleSavings,
  deselectModule,
  getModule,
  isAvailableNow,
  selectModule,
} from "@/lib/catalog";

const TRADE_ID = "layer8-trade";

export function NodeBuilder() {
  const [selected, setSelected] = useState<Set<string>>(new Set([CORE_MODULE_ID]));

  const toggle = (id: string) => {
    if (id === CORE_MODULE_ID) return; // never deselectable
    setSelected((prev) => (prev.has(id) ? deselectModule(prev, id) : selectModule(prev, id)));
  };

  const { lineItems, individualTotal, finalTotal } = calculateTotal(selected);
  const savings = bundleSavings();
  const trade = getModule(TRADE_ID);

  return (
    <section className="section" id="builder">
      <div className="container">
        <div className="eyebrow">Node Builder</div>
        <p style={{ color: "var(--text-dim)", margin: "12px 0 24px" }}>
          Layer8 TA + Core is always included and can&rsquo;t be deselected: Observer, Market Map,
          Storyteller, Module Registry, the TA research system, local capture, and Market Memory.
        </p>

        <div className="grid">
          {catalog.modules
            .filter((m) => m.id !== TRADE_ID)
            .map((m) => {
              const isCore = m.id === CORE_MODULE_ID;
              const available = isAvailableNow(m);
              const checked = selected.has(m.id);
              const disabled = isCore || !available;
              return (
                <div key={m.id} className={`card module-card ${disabled && !isCore ? "disabled" : ""}`}>
                  <div>
                    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: disabled ? "default" : "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(m.id)}
                        aria-label={`Select ${m.name}`}
                      />
                      <span>
                        <div style={{ fontWeight: 600 }}>
                          {m.name} {isCore && <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(required)</span>}
                        </div>
                        <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 4 }}>{m.description}</div>
                        {m.dependencies.length > 0 && (
                          <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 6, fontFamily: "var(--mono)" }}>
                            requires: {m.dependencies.join(", ")}
                          </div>
                        )}
                      </span>
                    </label>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--mono)", marginBottom: 6 }}>${m.price}</div>
                    <span className={`badge ${isCore ? "badge-required" : available ? "badge-available" : "badge-coming-later"}`}>
                      {isCore ? "REQUIRED" : available ? "AVAILABLE NOW" : "COMING LATER"}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {trade && (
          <div className="card" style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Layer8 Trade</div>
            <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>
              Layer8 Trade is the downstream decision and paper-execution research system. It requires
              Falsification, Quant Validation, and Execution; the builder adds them automatically. It does
              not include live exchange execution and places no live orders unless a separately
              implemented, explicitly enabled execution adapter exists.
            </p>
            <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, cursor: isAvailableNow(trade) ? "pointer" : "default" }}>
              <input
                type="checkbox"
                checked={selected.has(TRADE_ID)}
                disabled={!isAvailableNow(trade)}
                onChange={() => toggle(TRADE_ID)}
              />
              <span>
                Add Layer8 Trade — ${trade.price}{" "}
                <span className={`badge ${isAvailableNow(trade) ? "badge-available" : "badge-coming-later"}`} style={{ marginLeft: 8 }}>
                  {isAvailableNow(trade) ? "AVAILABLE NOW" : "COMING LATER"}
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Your node</div>
          {lineItems.map((li) => (
            <div className="price-row" key={li.moduleId}>
              <span>{li.name}</span>
              <span>${li.price.toLocaleString()}</span>
            </div>
          ))}
          <div className="price-row price-total">
            <span>Total</span>
            <span>${finalTotal.toLocaleString()}</span>
          </div>
          {finalTotal < individualTotal && (
            <div style={{ color: "var(--accent)", fontSize: 12, marginTop: 6, fontFamily: "var(--mono)" }}>
              Bundle savings applied: -${(individualTotal - finalTotal).toLocaleString()}
            </div>
          )}
          <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 12 }}>
            All 24 modules together: ${catalog.pricing.complete_bundle.toLocaleString()} (${savings.toLocaleString()} less than buying every module individually).
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700 }}>Founding Node count</div>
          <div style={{ color: "var(--text-dim)", marginTop: 6 }}>Founding Node count goes live with ordering.</div>
        </div>

        <p style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 16 }}>
          This is a display only. No payments, orders, or accounts exist in this phase — the server
          recalculates everything at checkout once Phase 2 is live.
        </p>
      </div>
    </section>
  );
}
