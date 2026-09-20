#!/usr/bin/env node
// Static check (phase-1-site-and-builder.md §9): no price constants anywhere
// in frontend or backend code. Prices live only in data/catalog.json.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SCAN_DIRS = ["app", "components", "lib"];
// Matches a bare dollar-sign literal price like `$500` or `500` assigned as
// a number literal outside of data/catalog.json. We flag `$<digits>` and
// suspicious numeric literals named like prices; everything real should come
// through catalog.ts / m.price / catalog.pricing.*, not a literal.
const PRICE_LITERAL = /\$\d{2,}|(?<![\w.])(price|total)\s*[:=]\s*\d+/i;
const ALLOWLIST_SUBSTRINGS = ["${", "toLocaleString"]; // template interpolation of computed values

let violations = [];

function scan(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      scan(p);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      const src = readFileSync(p, "utf8");
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (PRICE_LITERAL.test(line) && !ALLOWLIST_SUBSTRINGS.some((s) => line.includes(s))) {
          violations.push(`${p}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

for (const d of SCAN_DIRS) scan(d);

if (violations.length > 0) {
  console.error("Hard-coded price literals found outside data/catalog.json:");
  violations.forEach((v) => console.error("  " + v));
  process.exit(1);
} else {
  console.log("OK: no hard-coded price literals found in app/, components/, lib/.");
}
