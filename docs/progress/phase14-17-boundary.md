# Phase 14-17 Boundary

## Phase 14: Braid Statistics Domain Pack

Allowed files:

- `services/comathd/src/domain/braid-statistics/`
- `skills/braid-statistics/`
- `prompts/domain-braid-statistics.md`
- `python/braid/`
- examples and fixtures

Invariants:

- Braid/YBE/Hecke/fusion checks are evidence producers only.
- Domain scripts must feed Phase 10 runner/evidence paths, not claim promotion.
- `symbolically_checked` requires exact symbolic evidence, never float-only numerics.
- Domain helpers must preserve category level, assumptions, notation, and physical interpretation boundaries.

Checklist:

- Add ontology for braid groups, braid words, representations, R-matrices, YBE, Hecke algebras, tensor categories, DHR sectors, parastatistics sectors, and anyon models.
- Add templates for known objects and benchmark claims.
- Add exact computation protocols for braid relations, YBE, Hecke relations, fusion checks, and small counterexample search.
- Add Lean formalization map for elementary algebraic fragments.
- Add risk flags including `notation_drift`, `category_level_mismatch`, `semisimplicity_assumption_missing`, `q_root_of_unity_case_split`, and `physical_interpretation_overclaim`.

## Phase 15: TUI Dashboard

Allowed files:

- `extensions/comath-pi/src/widgets.ts`
- `extensions/comath-pi/src/renderers.ts`
- `extensions/comath-pi/src/tools/review.ts`
- dashboard tests

Invariants:

- Dashboard renderers are read-only over `comathd` client data.
- No direct `.comath/` reads or writes from Pi extension code.
- No service-internal imports from extension code.
- Any mutation must go through explicit tools with confirmation.

Checklist:

- Claim board: status, evidence level, audit state, blockers.
- Workstream board: lifecycle state, report/patch presence, stale states.
- Evidence board: artifact IDs, hashes, replayability, verifier kind.
- Blocker board: gate vetoes, failed computations, missing dependencies.
- Tests prove read-only renderers do not call mutation endpoints.

## Phase 16: Snapshot And Replay

Allowed files:

- `services/comathd/src/artifacts/snapshots.ts`
- `services/comathd/src/artifacts/replay.ts`
- snapshot/replay tests

Invariants:

- Snapshot export must pass real secret scanning.
- Integrity hashes must cover manifest, artifacts, claims, evidence, audit logs, replay inputs, and runner outputs.
- Replay must be deterministic or explicitly marked unreplayable with reason, seed, environment, dependency versions, and status.
- Restore smoke tests must use a temp project root and must not mutate the source snapshot.
- Stable IDs remain external contracts; TriviumDB native IDs must not leak into replay manifests.

Checklist:

- Define canonical manifest ordering.
- Add content-addressed snapshot entries.
- Add secret-scan gate that fails closed.
- Add replay manifest with command envelope, seeds, dependency versions, input hashes, output hashes, timeout, and status.
- Add negative tests for tampered hash, missing artifact, secret hit, path traversal, and stale runner output.

## Phase 17: Evaluation, Security, Math-Integrity Audit

Allowed files:

- `tests/evaluation/`
- `SECURITY_REVIEW.md`
- `MATH_INTEGRITY_REVIEW.md`
- `docs/progress/`
- benchmark fixtures

Invariants:

- Reviewer approval is not proof.
- Agent consensus is not proof.
- `formally_checked` requires kernel evidence, dependency closure, and audit pass.
- `literature_supported` requires exact citation artifacts and condition matching.
- `computationally_supported` requires successful bound computation/counterexample runner output, plus replay metadata and stale-output checks.
- Failed proof routes and failed computations remain durable evidence.

Checklist:

- Add fixtures with expected gate failures and safe passes.
- Add mathematical safety suite for overclaim, missing assumptions, float-only exactness, undefined symbols, citation mismatch, and unreplayable computation.
- Add paper correctness suite after Phase 12 exists.
- Add dashboard read-only regression test.
- Add snapshot/replay tamper and secret tests.
- Update security and math-integrity review files with inspected files, findings, residual risk, and validation commands.
