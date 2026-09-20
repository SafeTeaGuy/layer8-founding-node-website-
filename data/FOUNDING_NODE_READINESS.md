# Founding Node Readiness (Phase 1 Draft)

Per this phase's instruction: every line is `NOT READY` unless the
audit proves otherwise. None are proven otherwise — this repository
has tested library code, but no installer, no CLI, no packaging, no
benchmarks, and no live capture. "Ready" here means ready for a
stranger to install and run per Phase 4's goal, not "has passing unit
tests." Those are different bars, and every component below clears
only the first (where it clears anything at all).

```
CORE:               NOT READY
CAPTURE:             NOT READY
TA:                  NOT READY
MICROSTRUCTURE:      NOT READY
QUANT:               NOT READY
MACRO:               NOT READY
PREDICTION MARKETS:  NOT READY
TRADE:               NOT READY
LOCAL MEMORY:        NOT READY
INSTALLER:           NOT READY
BENCHMARKS:          NOT READY
NETWORK MODE:        NOT IMPLEMENTED
```

## Justification per line

- **CORE — NOT READY.** The evidence/gate/signing/append-only-store
  infrastructure (`layer8_core/`) is implemented and covered by 188
  passing tests, but it is a library, not an installable product
  component: no CLI, no config loading, no `.env` handling, no
  distribution layout exists.
- **CAPTURE — NOT READY.** Trade-message normalization exists for
  three venues (`layer8_node/adapters/`) but nothing actually captures
  live data — see `docs/FEED_CAPABILITIES.md`.
- **TA — NOT READY.** No code implementing technical analysis exists
  in this repository at all. See "Module classification" in
  `docs/productization_audit.md`.
- **MICROSTRUCTURE — NOT READY.** Not implemented in code.
- **QUANT — NOT READY.** Not implemented in code.
- **MACRO — NOT READY.** Not implemented in code.
- **PREDICTION MARKETS — NOT READY.** Not implemented in code.
- **TRADE — NOT READY.** Not implemented in code. (A `PAPER_TRADING_ONLY`
  status exists for this module in the separate, uncommitted `Layer8
  Modules v1.1.0` prompt package's catalog — see the open questions in
  `docs/productization_audit.md` — but there is no code in this
  repository that executes, simulates, or logs a trade of any kind.)
- **LOCAL MEMORY — NOT READY.** `layer8_agent/` (AgentMemoryStore,
  provenance verification) is implemented and tested, but again as a
  library only — no CLI exposes it, no config specifies where it lives
  on disk for an installed node, no backup/restore tooling exists.
- **INSTALLER — NOT READY.** No installer, no CLI, no `packages/`
  directory, no distribution layout exists anywhere in this
  repository.
- **BENCHMARKS — NOT READY.** No benchmark tooling exists. No hardware
  documentation has been generated from measured results because
  nothing has been measured.
- **NETWORK MODE: NOT IMPLEMENTED** — per this phase's explicit
  instruction. `layer8_node/fleet.py`'s `FleetCoordinator` is in-memory
  bookkeeping only (registration, feed assignment, heartbeats); it has
  no network server, no client, and does not persist across a restart
  (already tracked as the `fleet-coordinator-state-persistence` entry
  in `docs/architecture_gap_register.json`).
