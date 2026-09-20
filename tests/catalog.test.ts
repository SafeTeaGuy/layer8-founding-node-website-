import { describe, expect, it } from "vitest";
import {
  CORE_MODULE_ID,
  calculateTotal,
  catalog,
  deselectModule,
  getModule,
  isAvailableNow,
  selectModule,
} from "@/lib/catalog";

describe("catalog-driven rendering", () => {
  it("loads exactly the 24 modules from the snapshot, no invented entries", () => {
    expect(catalog.modules).toHaveLength(24);
  });

  it("every module currently shows NOT_IMPLEMENTED / not commercially available (matches the frozen audit)", () => {
    for (const m of catalog.modules) {
      expect(m.implementation_status).toBe("NOT_IMPLEMENTED");
      expect(m.commercially_available).toBe(false);
      expect(isAvailableNow(m)).toBe(false);
    }
  });
});

describe("TA/Core is never deselectable", () => {
  it("stays selected even if a caller tries to remove it", () => {
    const start = selectModule(new Set(), CORE_MODULE_ID);
    const afterAttemptedRemoval = deselectModule(start, CORE_MODULE_ID);
    expect(afterAttemptedRemoval.has(CORE_MODULE_ID)).toBe(true);
  });

  it("is added back onto any selection set by selectModule/deselectModule", () => {
    const s = deselectModule(new Set(["microstructure"]), "microstructure");
    expect(s.has(CORE_MODULE_ID)).toBe(true);
  });
});

describe("dependency auto-selection and cascade", () => {
  it("selecting a module auto-selects its declared dependencies", () => {
    const s = selectModule(new Set([CORE_MODULE_ID]), "microstructure");
    expect(s.has("microstructure")).toBe(true);
    expect(s.has(CORE_MODULE_ID)).toBe(true); // microstructure depends on layer8-ta
  });

  it("selecting Layer8 Trade pulls in Falsification, Quant Validation, and Execution", () => {
    const s = selectModule(new Set([CORE_MODULE_ID]), "layer8-trade");
    expect(s.has("falsification")).toBe(true);
    expect(s.has("quant-validation")).toBe(true);
    expect(s.has("execution")).toBe(true);
  });

  it("deselecting a dependency cascades to deselect modules that need it", () => {
    let s = selectModule(new Set([CORE_MODULE_ID]), "layer8-trade");
    expect(s.has("layer8-trade")).toBe(true);
    s = deselectModule(s, "execution");
    expect(s.has("execution")).toBe(false);
    expect(s.has("layer8-trade")).toBe(false); // trade required execution
  });
});

describe("unavailable modules are not selectable in practice", () => {
  it("isAvailableNow is false for every current module", () => {
    const m = getModule("microstructure")!;
    expect(isAvailableNow(m)).toBe(false);
  });
});

describe("price calculation matches catalog.json", () => {
  it("sums selected module prices from the catalog, not a hard-coded value", () => {
    const s = new Set([CORE_MODULE_ID, "microstructure"]);
    const { individualTotal } = calculateTotal(s);
    const expected = getModule(CORE_MODULE_ID)!.price + getModule("microstructure")!.price;
    expect(individualTotal).toBe(expected);
  });

  it("applies the complete-bundle price only when every module is selected", () => {
    const all = new Set(catalog.modules.map((m) => m.id));
    const { finalTotal } = calculateTotal(all);
    expect(finalTotal).toBe(catalog.pricing.complete_bundle);
  });

  it("does not apply the bundle price for a partial selection", () => {
    const s = new Set([CORE_MODULE_ID]);
    const { finalTotal, individualTotal } = calculateTotal(s);
    expect(finalTotal).toBe(individualTotal);
    expect(finalTotal).not.toBe(catalog.pricing.complete_bundle);
  });
});
