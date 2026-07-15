# Gate-13 Asset Generation Pipeline

## Purpose

This directory defines the controlled rules layer that converts an Approved Expansion Blueprint into a Controlled Asset Generation Request. It does not generate, modify, or batch-process assets.

## Frozen inputs

Gate-01 through Gate-12 remain read-only and frozen. Gate-13 consumes the approved Blueprint, Gate-11 Compatibility Boundary evidence, Gate-12 Human Sign-off evidence, Asset Generation Permission evidence, and existing Character Unit, Material DNA, Palette, Cloud Collar, and Production Rules references.

## Fixed pipeline

Approved Expansion Blueprint → Asset Generation Input Validation → Character Unit Selection → Material DNA Binding → Palette Binding → Cloud Collar Binding → Generation Permission Check → Asset Generation Allowed.

Every stage is mandatory and ordered. A skipped, reordered, stale, mismatched, inferred, or incomplete input results in `BLOCKED`.

## Request states

1. `Draft Generation Request` prepares validated bindings only; generation is prohibited.
2. `Approved Generation Request` requires independent human approval and complete quality/visual evidence; generation remains subject to permission evaluation.
3. `Production Asset Generation` requires all four predicates to explicitly PASS: Expansion Blueprint Approved, Compatibility Boundary PASS, Human Sign-off PASS, and Asset Generation Permission PASS.

The default Asset Generation Guard is `BLOCKED`. Direct Draft-to-Production transition and batch generation are prohibited.

## Generation audit contract

Every permission evaluation must record Generator Type, Model Version, Prompt Version, Blueprint ID, Character Unit ID, Material DNA Version, Palette Version, Cloud Collar Version, and Approval Timestamp. The Guard output must include Permission Decision, Block Reason, Approval Reference, and Audit Evidence; any missing, empty, stale, mismatched, or unbound audit field forces `Generation Permission = BLOCKED`.

## First controlled test

The first case uses `outfit-004`, `Primary`, `Dance`, and one existing Character Unit. It references existing Material DNA, Palette, Cloud Collar, and Production Rules and outputs only an `Asset Generation Request Draft`.

No image, 3D model, garment file, procurement file, or production batch is produced.

## Human sign-off

Build validation does not mean Gate-13 has passed and does not authorize generation. Gate-13 remains Human Sign-off Pending until an independent read-only acceptance is explicitly completed.
