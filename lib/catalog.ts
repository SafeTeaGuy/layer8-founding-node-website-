/**
 * Catalog loading and pure business logic.
 *
 * Every product claim on this site (module list, price, dependencies,
 * availability) is read from data/catalog.json — a versioned,
 * hash-pinned snapshot of Layer8's modules/catalog.json (see
 * data/snapshot.json). No price or availability constant lives here or
 * in any component; this file only *reads* the snapshot and computes.
 */
import catalogData from "@/data/catalog.json";
import snapshotData from "@/data/snapshot.json";

export type ModuleStatus = "COMPLETE" | "NOT_IMPLEMENTED" | "PARTIAL" | "BLOCKED_BY_DATA" | "BLOCKED_BY_SPEC" | "OUT_OF_SCOPE";

export interface CatalogModule {
  id: string;
  name: string;
  description: string;
  version: string;
  implementation_status: ModuleStatus;
  commercially_available: boolean;
  dependencies: string[];
  required_feeds: string[];
  price: number;
  installable: boolean;
  enabled: boolean;
}

export interface Catalog {
  catalog_version: string;
  generated_from: string;
  note: string;
  pricing: {
    layer8_ta: number;
    specialist_module: number;
    layer8_trade: number;
    complete_bundle: number;
    upgrade_pricing_rule: string;
  };
  modules: CatalogModule[];
}

export interface SnapshotManifest {
  snapshot_version: string;
  source_repo: string;
  source_commit: string;
  source_branch: string;
  snapshot_taken_at: string;
  files: Record<string, string>;
}

export const catalog: Catalog = catalogData as Catalog;
export const snapshot: SnapshotManifest = snapshotData as SnapshotManifest;

/** The module every node is built on. Never deselectable (§4). */
export const CORE_MODULE_ID = "layer8-ta";

export function getModule(id: string): CatalogModule | undefined {
  return catalog.modules.find((m) => m.id === id);
}

/** A module is AVAILABLE NOW only if implementation is COMPLETE and it's flagged commercially available. */
export function isAvailableNow(m: CatalogModule): boolean {
  return m.implementation_status === "COMPLETE" && m.commercially_available;
}

/**
 * Selecting a module auto-selects its dependencies (recursively).
 * Deselecting a module also deselects anything that depends on it.
 * The core module can never be removed from the resulting set.
 */
export function selectModule(selected: Set<string>, id: string): Set<string> {
  const next = new Set(selected);
  const addWithDeps = (moduleId: string) => {
    if (next.has(moduleId)) return;
    next.add(moduleId);
    const m = getModule(moduleId);
    m?.dependencies.forEach(addWithDeps);
  };
  addWithDeps(id);
  next.add(CORE_MODULE_ID);
  return next;
}

export function deselectModule(selected: Set<string>, id: string): Set<string> {
  if (id === CORE_MODULE_ID) return new Set(selected); // never deselectable
  const next = new Set(selected);
  next.delete(id);
  // cascade: drop anything whose dependency chain required the removed module
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of catalog.modules) {
      if (next.has(m.id) && m.dependencies.some((dep) => !next.has(dep))) {
        next.delete(m.id);
        changed = true;
      }
    }
  }
  next.add(CORE_MODULE_ID);
  return next;
}

export interface PriceBreakdown {
  moduleId: string;
  name: string;
  price: number;
}

export function calculateTotal(selected: Set<string>): {
  lineItems: PriceBreakdown[];
  individualTotal: number;
  isCompleteBundleCheaper: boolean;
  finalTotal: number;
} {
  const lineItems = catalog.modules
    .filter((m) => selected.has(m.id))
    .map((m) => ({ moduleId: m.id, name: m.name, price: m.price }));
  const individualTotal = lineItems.reduce((sum, li) => sum + li.price, 0);
  const allSelected = catalog.modules.every((m) => selected.has(m.id));
  const finalTotal = allSelected ? catalog.pricing.complete_bundle : individualTotal;
  return {
    lineItems,
    individualTotal,
    isCompleteBundleCheaper: allSelected && catalog.pricing.complete_bundle < individualTotal,
    finalTotal,
  };
}

export function bundleSavings(): number {
  const individualTotal = catalog.modules.reduce((sum, m) => sum + m.price, 0);
  return individualTotal - catalog.pricing.complete_bundle;
}
