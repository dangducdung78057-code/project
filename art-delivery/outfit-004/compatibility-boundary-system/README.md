# Gate-11 Phase 2 — Compatibility Boundary System

## Purpose

This directory defines compatibility boundaries for reusing an approved StageOS costume configuration. It does not create, expand, render, or authorize any costume or visual asset.

## Frozen input contract

Phase 2 consumes `../asset-expansion-rules/` as a read-only contract. The Phase 1 Manifest, Rule IDs, validation cases, nine-stage pipeline, Age × Program Matrix, and palette constraints remain authoritative and are not redefined here.

Gate-01 through Gate-10, Blueprint, Production Specification, Visual Assets, and every Gate-11 Phase 1 file remain frozen.

## Four-level decision model

1. **Direct Reuse** — all relevant frozen identifiers and operating conditions are equivalent.
2. **Conditional Reuse** — identity and core structure remain frozen, but bounded local checks are required.
3. **Review Required** — evidence is incomplete or compatibility cannot be decided automatically.
4. **Full Gate Revalidation** — a frozen identity, structure, Material DNA, age, program, or team-recognition boundary changed.

When several rules match, the strictest decision wins. A lower-level rule can never downgrade a stricter boundary.

## File map

- `boundary-rules.json`: decision vocabulary, precedence, and resolution behavior.
- `reuse-compatibility-rules.json`: direct and conditional reuse combinations.
- `structural-conflict-rules.json`: prohibited mixing and incompatibility boundaries.
- `blueprint-inheritance-rules.json`: inheritable, locally validated, and prohibited Blueprint fields.
- `production-inheritance-rules.json`: size, material, process, cost, and lead-time inheritance.
- `visual-integrity-inheritance-rules.json`: color, lighting, veil, stage, and recognition inheritance.
- `revalidation-trigger-rules.json`: local-review and full-Gate escalation triggers.
- `validation-cases.json`: deterministic boundary scenarios.
- `GATE-11-PHASE-2-MANIFEST.json`: delivery inventory and validation record.
- `GATE-11-PHASE-2-REPORT.md`: build scope and verification report.

## Non-goals

No asset generation, garment generation, Blueprint editing, Production Specification editing, Visual Asset editing, Phase 1 editing, or later asset expansion is permitted by this ruleset.

## Status

Build completed. Human sign-off pending. No rule in this directory is Passed or Frozen until Gate-11 Phase 2 Human Sign-off is explicitly recorded.
