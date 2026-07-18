# Gate-12 Phase 1 — Expansion Request System

## Purpose

This rules-only system governs a new program request from structured intake through Gate-11 compatibility checking, a `Draft Only` Expansion Blueprint, Human Sign-off, and a contract-only Asset Generation Permission. It creates no UI, API, database, user system, asset-generation interface, garment, image, procurement order or production instruction.

## Read-only inputs

- Gate-11 Phase 1 Asset Expansion Rules at `../asset-expansion-rules/`
- Gate-11 Phase 2 Compatibility Boundary System at `../compatibility-boundary-system/`

Their Manifests, Rule IDs, pipeline, matrices, constraints and semantics are inherited by reference and are not redefined.

## Mandatory flow

`Expansion Request → Schema/Evidence Validation → Compatibility Boundary Check → Strictest Reuse Decision → Draft Only Expansion Blueprint → Human Sign-off → Permission Guard`

Compatibility Boundary checking cannot be skipped. Boundary decisions use this strictness order: Direct Reuse, Conditional Reuse, Review Required, Full Gate Revalidation.

## Lifecycle

Main path: `Draft → Compatibility Check → Review Required → Human Sign-off → Approved → Asset Generation Permission`.

Failure states: `Rejected`, `Blocked`, and `Expired`. Only allowlisted transitions are valid; source or content changes invalidate prior approval.

## Draft and permission boundaries

Every Expansion Blueprint is `Draft Only`. Before a valid Permission it cannot enter Production Specification, Asset Generation or Procurement and cannot replace a Frozen Gate output. Permission is a governance record only: this delivery provides no executable generation interface and generates no asset.

## Frozen scope

Gate-01 through Gate-11, existing Blueprint, Production Specification and Visual Assets remain unchanged. Build changes are confined to this directory and await independent Gate-12 Phase 1 Human Sign-off.
