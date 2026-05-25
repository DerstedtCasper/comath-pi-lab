# Research Alpha Retrospective

Date: 2026-05-25

## Scope

This retrospective summarizes the Phase 0-17 Research Alpha implementation of CoMath Pi Lab. It is an engineering and audit record, not a claim of mathematical discovery or proof capability.

## Completed Capabilities

- Repository bootstrap, canonical development plan, runbook, agent model, risk register, and acceptance matrix.
- Typed contracts, schemas, stable IDs, statement hashing, and GraphPatch protected-field hardening.
- `comathd` project lifecycle, path policy, runtime layout, artifact store, audit JSONL, claim registry, and fail-closed promotion gate.
- In-memory `ResearchMemoryDB`, StableIdMap, optional TriviumDB capability probing and adapter boundary.
- Pi extension thin-client commands, tools, resources, subagent scaffolding, paper descriptors, snapshot/replay descriptors, and read-only dashboard renderers.
- Workstream lifecycle and GraphPatch proposal/review/apply boundary.
- MathProve bridge mock, exact SymPy runner, deterministic counterexample runner, Sage/SAT fail-closed placeholders.
- Literature system with BibTeX/PDF artifacts, citation records, condition matching, and fail-closed `literature_supported` gate integration.
- Working paper state with margin provenance, overclaim checks, TeX/Markdown export, and export rejection on failed paper checks.
- Braid statistics/parastatistics domain pack with ontology, protocols, risk flags, Lean map, prompts, skill, and exact-check script.
- Service-owned snapshot/replay export, verification, restore smoke, service routes, Pi descriptors, secret scanning, stale runner detection, and replay manifest extraction.
- Phase 17 evaluation suite covering gate binding, paper safety, dashboard read-only behavior, snapshot/replay tamper/secret checks, and memory retrieval benchmark fixture.

## Evidence Model

Research Alpha enforces these non-degradable distinctions:

- Reviewer approval and agent consensus are not mathematical proof.
- `formally_checked` still requires Lean/kernel evidence, dependency closure, and audit pass.
- `symbolically_checked` requires symbolic evidence, successful bound runner output artifacts, and trusted runner audit provenance; numeric/search evidence, forged runner reports, and failed symbolic runs are blocked from symbolic promotion.
- `computationally_supported` requires successful bound computation/counterexample runner output artifacts and trusted runner audit provenance; failed runs remain evidence but cannot promote claims.
- `literature_supported` requires successful citation-condition matching, exact literature artifacts, and quoted statement grounding inside source artifacts.
- Paper export is blocked when paper checks return vetoes, and claim blocks must bind to exact margin-note IDs and rendered block hashes.
- Snapshot verification detects missing entries, hash tamper, path traversal, secret hits, stale runner outputs, runner report host-path leaks, and replay `runs_sha256` tamper.

## Validation Surface

The final root validation command is:

```text
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
```

`corepack pnpm test` includes:

- root Phase 0/design smoke checks;
- all package tests for `@comath/comathd` and `@comath/pi-extension`;
- `tests/evaluation/phase17-integrity-evaluation.test.mjs`.

Final recorded validation on 2026-05-25 passed build, typecheck, root test, and repository-root runtime-state check with `.comath` absent.

## Residual Risks

- Real MathProve/Lean kernel execution remains deferred; current MathProve bridge is a fail-closed mock.
- Pi runtime registration is still descriptor/thin-client level and must be revalidated against the installed Pi API before production use.
- Secret scanning is pattern-based and conservative. It is a fail-closed Research Alpha import/export gate, not a full DLP system.
- Snapshot/replay records deterministic envelopes and verifies stale outputs, but does not re-execute runner commands.
- In-memory retrieval benchmark is a Research Alpha fixture, not a performance benchmark for native TriviumDB.
- The braid domain pack is rigorous scaffolding and evidence/task/proposal support, not a proof authority.

## Next Research Beta Candidates

- Real Lean/MathProve final-audit integration with kernel proof artifact validation.
- Dedicated service read routes for claim/evidence/gate listing so the dashboard no longer depends on degraded paper-derived read models.
- Native TriviumDB persistence/search evaluation behind the existing adapter boundary.
- Runner re-execution for replay manifests with sandboxed dependency/version checks.
- Richer braid/YBE exact matrix checks and Lean skeleton elaboration workflows.
