/**
 * Proof-section data. Every field traces to an artifact in data/
 * (the hash-pinned snapshot of Layer8's own readiness/audit docs).
 * A field with value `null` renders as "Not yet published" -- it is
 * never filled in with an invented number.
 */
import proofFacts from "@/data/proof_facts.json";
import feedCapabilities from "@/data/feed_capabilities.json";
import { snapshot } from "@/lib/catalog";

export interface ProofFact {
  label: string;
  value: string | null;
}

export function getProofFacts(): ProofFact[] {
  return [
    { label: "Test-suite result", value: proofFacts.test_suite_result?.value ?? null },
    { label: "Capture duration tested", value: proofFacts.capture_duration_tested },
    { label: "Feeds tested (live)", value: proofFacts.feeds_tested_live },
    { label: "Disconnect / reconnect result", value: proofFacts.disconnect_reconnect_result },
    { label: "Gap detection", value: proofFacts.gap_detection_result },
    { label: "Clock-health result", value: proofFacts.clock_health_result },
    { label: "Restart persistence", value: proofFacts.restart_persistence_result },
    { label: "Report date", value: proofFacts.report_date },
    { label: "Artifact snapshot hash", value: snapshot.files["FOUNDING_NODE_READINESS.md"].slice(0, 16) + "…" },
  ];
}

export function getFeedList() {
  return feedCapabilities.feeds as Array<{
    provider: string;
    venue: string;
    market: string;
    capture_status: string;
    transport: string;
    known_gaps: string;
    geographic_or_jurisdiction_limits: string;
  }>;
}
