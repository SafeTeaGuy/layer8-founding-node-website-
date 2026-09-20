import { describe, expect, it } from "vitest";
import { getProofFacts } from "@/lib/readiness";

describe("proof section shows only artifact-backed fields", () => {
  it("every fact is either a real value or explicitly null (renders as Not yet published)", () => {
    const facts = getProofFacts();
    expect(facts.length).toBeGreaterThan(0);
    for (const f of facts) {
      expect(["string", "object"]).toContain(typeof f.value === "string" ? "string" : typeof f.value);
    }
  });

  it("does not claim a live capture demonstration that never happened", () => {
    const facts = getProofFacts();
    const captureFact = facts.find((f) => f.label === "Capture duration tested");
    expect(captureFact?.value).toBeNull();
    const gapFact = facts.find((f) => f.label === "Gap detection");
    expect(gapFact?.value).toBeNull();
  });

  it("does surface the real, cited test-suite result", () => {
    const facts = getProofFacts();
    const testFact = facts.find((f) => f.label === "Test-suite result");
    expect(testFact?.value).toBe("188 passed");
  });
});
