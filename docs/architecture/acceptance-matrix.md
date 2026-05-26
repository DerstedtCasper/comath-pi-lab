# Acceptance Matrix

## Design Documentation Acceptance

| Requirement | Evidence |
| --- | --- |
| Complete project design exists | `COMATH_PI_LAB_DEV_PLAN.md` contains product thesis, architecture, roadmap, milestones, and completion criteria. |
| Goal-mode execution is bounded | `CODEX_GOAL_RUNBOOK.md` contains Phase 0-17 scopes, definitions of done, validation, and stop rules. |
| End-state behavior is defined | `docs/architecture/end-state-blueprint.md`. |
| Phase acceptance is defined | This file and `CODEX_GOAL_RUNBOOK.md`. |
| Agent collaboration is bounded | `docs/architecture/agent-operating-model.md` and `docs/architecture/subagent-concurrency.md`. |
| Risks are explicit | `docs/architecture/risk-register.md`. |
| Handoff exists | `docs/progress/design-handoff.md`. |
| Smoke test covers design docs | `scripts/phase0-smoke.mjs`. |

## Phase Acceptance

| Phase | Acceptance Evidence |
| --- | --- |
| 0 Repo bootstrap | install/build/typecheck/test pass; `TODO.md` and `REVIEW.md` updated. |
| 1 Contracts | schema/type tests for IDs, claims, artifacts, GraphPatch, and statement hash pass. |
| 2 Service foundation | project init/open/status integration tests and path-policy unit tests pass. |
| 3 Artifact/audit | hash stability, safe copy, path traversal, audit JSONL tests pass. |
| 4 Claims/gate | promotion route fails closed; direct `formally_checked` assignment impossible. |
| 5 Memory | in-memory adapter and StableIdMap tests pass; Trivium shim fails clearly if unavailable. |
| 6 Pi extension | typecheck passes; package manifest points to an installable Pi extension entry; Pi tools/commands register through official APIs; `comath.research.start` drives project init plus workstream spawn; mutating tools are guarded by Pi `tool_call` confirmation and call `comathd`; `phase24-pi-sdk-autonomous-lean.test.mjs` proves a Pi `AgentSession` can receive a model-authored `comath_lean_check` call and return the CoMath Lean result through `turn_end.toolResults`. |
| 7 Workstreams | workstream lifecycle tests pass; GraphPatch does not auto-apply. |
| 8 Subagents | agent prompts constrain write scope; safe parallelism docs exist. |
| 9 MathProve bridge | bridge mock returns structured fail-closed JSON and gate consumes vetoes. |
| 10 Compute | runner timeout/sandbox/replay tests pass. |
| 11 Literature | citation artifact and condition matching stub tests pass. |
| 12 Paper | paper check fails on overclaim and missing provenance. |
| 13 TriviumDB | capability probe, fallback/default-safe factory behavior, optional native snapshot/restore tests, and StableIdMap boundary tests pass without requiring native TriviumDB in default CI. |
| 14 Braid domain | ontology, prompts, sample project, and computation protocols exist. |
| 15 Dashboard | read-only/degraded text/TUI renderer tests pass; dashboard does not read/write `.comath/` directly or repair state. |
| 16 Snapshot/replay | service routes, export/verify/restore smoke tests, replay manifest verification, tamper checks, and secret scan gates pass. |
| 17 Evaluation/audits | security review, math integrity review, and evaluation suite exist. |

## Production Formal Workbench Acceptance

| Slice | Acceptance Evidence |
| --- | --- |
| P1 Formal proof authority | `phase18-formal-proof-authority.test.mjs` passes; `formally_checked` requires a trusted Lean4 kernel proof run bound to claim and artifacts plus separate formalization, dependency-closure, and audit certification provenance; raw proof-run append, raw gate-promotion writer, and raw gate-decision applier are not exported from the public barrel; caller-supplied Lean executables cannot become proof authority; MathProve manifests cannot promote a claim by themselves. |
| P2 Provenance ledger and paper spans | `phase19-provenance-ledger.test.mjs` passes; provenance events are append-only; paper spans are stored and checked against margin notes. |
| P3 MathGraphIndex / Trivium derived index | `phase20-math-graph-index.test.mjs` passes; index health reports backend, truth source, derived-index state, degraded status, and rebuildability; TriviumDB remains optional and derived. |
| P4 Pi official adapter | `phase18-pi-official-adapter.test.mjs` and `phase24-pi-sdk-autonomous-lean.test.mjs` pass; descriptors map to official Pi registration shape; headless mode avoids UI calls; autonomous Lean workflow evidence must come from Pi tool results rather than a host-side direct `/lean/check` call. |
| P5 Session lock / mutation queue | `phase21-session-lock.test.mjs` passes; concurrent acquire is rejected through exclusive lock-file creation; stale lock recovery is explicit and serialized with a recovery mutex; owner release is enforced; mutation queue IDs are collision-resistant and not read-then-sequential. |
| P6 Final docs and verification | `TODO.md`, `REVIEW.md`, `SECURITY_REVIEW.md`, `MATH_INTEGRITY_REVIEW.md`, and `docs/progress/production-formal-workbench-retrospective.md` record status, validation, and residual risks; runtime `jsonSchemas` loads the root `schemas/*.schema.json` artifacts rather than placeholder descriptors. |

## Security Acceptance

| Invariant | Evidence |
| --- | --- |
| No outside-root writes | path-policy tests. |
| No unsafe shell by default | runner permission envelope and deny tests. |
| Secrets not imported or snapshotted | artifact import and snapshot export secret-scan tests. |
| Runtime state not committed | `.gitignore` and smoke test. |
| Native backends optional | TriviumDB probe/fallback tests. |

## Mathematical Integrity Acceptance

| Invariant | Evidence |
| --- | --- |
| Reviewer approval is not proof | gate tests and claim promotion rules. |
| Formal proof requires kernel evidence | Lean4 formal proof run schema/store/gate tests; `formally_checked` requires a trusted kernel-checked run bound to claim and artifacts plus separate formalization, dependency, and audit certification provenance; MathProve is evidence producer only. |
| Float-only output cannot be symbolic proof | compute/gate tests. |
| Literature support requires exact artifact-grounded citation | literature/gate tests require quoted statements present in source artifacts. |
| Failed routes preserved | workstream/evidence tests. |
| Paper wording cannot overclaim | paper check tests require block-bound margin provenance and reject theorem-like unsupported syntax. |
