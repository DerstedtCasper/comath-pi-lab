# Product Readiness Matrix

Status date: 2026-05-28  
Scope: Goal 1 product-scope audit for the current `comath-pi-lab` worktree.

## Readiness Boundary

The current product claim is bounded: CoMath Pi Lab is a local auditable research workbench at Research Alpha plus Phase 18-58 GA vertical-slice implementation. It is not global GA readiness, not an arbitrary theorem prover, not a MathProve proof-authority system, not a production Codex/Pi managed service, and not an OS-sandboxed execution platform.

For Goal 1, "complete product" means the bounded product described by the current repository is coherent, tested, documented, and not overclaimed. Any capability outside this boundary must remain classified as a deferred global-GA extension until separately implemented and validated.

## Requirement Matrix

| Requirement | Current evidence | Classification | Task follow-up |
| --- | --- | --- | --- |
| Preserve the existing repository, git history, and Goal Mode workspace. | `goal-1/input.md`, `goal-1/plan.md`, `goal-1/tasks.md`; branch `ga-v3-implementation-20260527`; Task 1 commits `e3e24ce` and `fbb38f4`. | In scope and active. | Continue one task per goal turn. |
| Product must not be a rough scaffold. | `README.md` describes a working Research Alpha plus Phase 18-58 vertical slice; `TODO.md` marks Phases 0-58 complete; `REVIEW.md` records phase evidence. | In scope, evidence exists, still requires cross-surface audit. | Tasks 3-11 verify build/typecheck/test, Pi, service, proof, memory, docs, and final completion. |
| Local Pi package exposes commands, tools, dashboards, campaign and agent UX without trusted-state authority. | Phase 6, 15, 21, 22, 26, 30, 41-51 acceptance rows; Pi tests named in `README.md` and `docs/architecture/acceptance-matrix.md`. | In scope and implemented as thin-client surfaces. | Task 4 audits Pi command/tool completeness and direct `.comath` boundaries. |
| `comathd` owns runtime state, path policy, artifacts, audit logs, claim gates, memory adapters, runner orchestration, AgentRun surfaces, and writer locks. | Phase 2-5, 7, 10-13, 16-18, 24, 27-29, 31-58 acceptance rows; `AGENTS.md` write-boundary rules. | In scope and implemented. | Task 5 audits service/gate integrity and status capabilities. |
| Mathematical claims are evidence-gated and fail closed. | `CODEX_GOAL_RUNBOOK.md` hard rules; `MATH_INTEGRITY_REVIEW.md`; Phase 4, 17, 18, 31-37, 54, 56-58 tests. | In scope and safety-critical. | Tasks 5 and 7 audit gate bypass and proof authority. |
| Proof-kernel vertical slices support registered elementary Nat theorem families and exact refutation. | Phase 18, 19, 20, 23, 31-37, 54, 56, 57 review and acceptance evidence. | In scope and bounded. | Task 7 audits Lean/proof-kernel/replay semantics. |
| MathProve integration is evidence-only, including `verify_sympy.py` and `final_audit.py`. | Phase 9, 25, and 58 evidence; `phase58-mathprove-final-audit-runner.test.mjs`; `AGENTS.md` Phase 58 boundary. | In scope as non-authoritative evidence runner. | Task 7 audits sibling `MathProve-Skill` boundary and no proof-authority escalation. |
| TriviumDB remains optional behind `ResearchMemoryDB` and `StableIdMap`. | Phase 13 and 38 acceptance evidence; root optional dependency; `phase13-trivium-boundary.md`; `README.md` says optional backend. | In scope as optional adapter/evaluation, not default production backend. | Task 8 audits fallback, native capability, stable IDs, and docs. |
| Workstreams and subagents produce reports and GraphPatch proposals only. | Phase 7 and 8 evidence; `docs/workstream-model.md`; `CODEX_GOAL_RUNBOOK.md` parallelism rules. | In scope and implemented as controlled workflow. | Tasks 4-5 check GraphPatch and trusted mutation boundaries. |
| Working paper preserves claim/evidence/workstream/margin provenance and blocks overclaiming. | Phase 12 and 17 evidence; paper checker and evaluation suite. | In scope and implemented. | Task 8 audits paper/artifact/literature/snapshot surfaces. |
| Snapshot/replay provides inspectable, partially reproducible state and runner integrity checks. | Phase 16, 24, 36, and 55 evidence. | In scope as bounded replay/integrity infrastructure. | Tasks 7-9 audit runner/replay and root validation. |
| Security and mathematical-integrity reviews are current and accurate. | `SECURITY_REVIEW.md`, `MATH_INTEGRITY_REVIEW.md`, `docs/architecture/risk-register.md`, `docs/architecture/acceptance-matrix.md`. | In scope, documented, needs final sync check. | Task 10 syncs docs after audits. |
| Full validation must prove final completion. | Goal completion gate in `goal-1/plan.md`; root scripts in `package.json`; README runtime baseline. | Required before completion, not yet proven for whole product in Goal 1. | Tasks 3, 6, 9, and 11 run broad gates. |

## Deferred Item Classification

| Deferred item from `TODO.md` | Classification | Rationale | Completion impact for Goal 1 |
| --- | --- | --- | --- |
| Broad proof planning and theorem synthesis beyond Phase 33 planning artifacts, registered theorem families, and exact refutation. | Bounded product limitation; accepted non-goal for current product. | Current product explicitly supports registered elementary theorem-family slices only and rejects broad theorem-prover claims. | Does not block bounded product completion if docs/tests continue to prevent overclaiming. |
| Broad MathProve proof search and any MathProve-as-proof-authority path beyond Phase 25/58 evidence runners. | Bounded product limitation; accepted non-goal. | MathProve is deliberately evidence-only. Promoting MathProve to authority would violate `AGENTS.md`, `MATH_INTEGRITY_REVIEW.md`, and Phase 58 boundary. | Does not block bounded product completion; overclaim would block completion. |
| Production Codex/Pi adapter hardening beyond Phase 41-53 slices. | Product limitation; deferred global-GA hardening. | Current agent surfaces provide allowlisted execution, package registry, Codex API contract, retry telemetry, installed CLI validation, bounded logs/panels/cancellation, but not production account/network validation, indefinite sessions, richer controls, or OS isolation. | Does not block bounded local product; Task 4/5/10 must ensure docs do not call it production-hard. |
| Full interactive Pi UX beyond local install-session e2e, package loader smoke, and `/cm:agent` harness. | Product limitation; deferred UX/service-lifecycle hardening. | Current product has fake Pi/runtime harnesses and local e2e over a real HTTP server, not a full real-host interactive walkthrough or durable lifecycle manager. | Does not block bounded local product; Task 4 must audit usable Pi surfaces. |
| Stronger runner re-execution sandboxing beyond provenance/environment gates. | Security limitation; deferred global-GA hardening. | Phase 36/55 provide provenance and drift checks, not OS-enforced isolation or network denial. | Does not block bounded product if clearly documented and runner commands remain fixed/allowlisted. |
| OS-level process sandboxing beyond `shell:false`, allowlists, timeout, cancellation, scoped writes, and writer locks. | Security limitation; deferred global-GA hardening. | Current scheduler is safer application-level orchestration, not OS sandboxing. | Does not block bounded product if direct shell escape and path policy remain fail-closed. |
| Richer statement equivalence beyond declaration parsing, registered aliases, and registered logical-equivalence witnesses. | Mathematical limitation; accepted non-goal. | Current equivalence is conservative and witness-backed; broad semantic equivalence/proof search is intentionally absent. | Does not block bounded product; Task 7 must ensure conservative failure remains documented. |

## Product-Readiness Tests Still Required By Goal 1

Task 2 did not assert whole-product completion. Goal 1 Tasks 3, 6, and 9 have since run broad build/typecheck/test loops, Tasks 4-8 have run focused Pi, service, proof/runner, and memory/artifact audits, and Task 10 synchronizes the documentation layer. The following evidence still remains required before Goal 1 can be completed:

1. Root `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test` from the current final worktree.
2. Focused Pi extension audit and tests for `/cm:*`, tool descriptors, confirmation gates, read-only dashboards, agent controls, campaign controls, paper, snapshot, and replay.
3. Focused `comathd` audit for path policy, claim gates, GraphPatch apply, writer locks, AgentRun scheduler, replay provenance, and status capabilities.
4. Proof/MathProve/Lean/runner audit showing no proof authority outside clean CoMath proof-kernel replay and gate-mediated promotion.
5. Memory/Trivium/artifact/literature/paper/snapshot audit showing optional native behavior, stable IDs, provenance, and fail-closed checks.
6. Documentation synchronization after all audits, especially README, TODO, REVIEW, SECURITY_REVIEW, MATH_INTEGRITY_REVIEW, acceptance matrix, risk register, and design handoff. Task 10 owns this evidence and must keep Phase 58 boundaries explicit.
7. Final requirement-by-requirement completion audit with direct evidence for every explicit requirement and no unexpected runtime artifacts. Task 11 owns this evidence and is the only step allowed to mark Goal 1 complete.

## Overclaim Guardrails

The following statements must remain false in final reporting unless a later task implements and validates them with executable evidence:

- CoMath Pi Lab is a production arbitrary theorem prover.
- MathProve output can promote `formally_checked` or act as proof authority.
- TriviumDB is the default production memory backend.
- Codex/Pi adapters are production-hardened against real account/network/operator lifecycle risk.
- Runner replay has OS-enforced network denial or process isolation.
- Statement equivalence handles arbitrary transitive semantic equivalence.
- Pi has a full real-host interactive lifecycle manager beyond current local package/e2e surfaces.
