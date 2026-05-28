# Product Readiness Matrix

Status date: 2026-05-29
Scope: Goal 2 v3 release-evidence synchronization for the current `comath-pi-lab` worktree.

## Readiness Boundary

The current product claim is bounded: CoMath Pi Lab is a local auditable research workbench at Research Alpha plus Phase 18-72 GA/v3 vertical-slice implementation. It is not final global v3 GA readiness until the remaining Goal 2 implementation and final requirement-by-requirement audit pass, and it is not an arbitrary theorem prover, not a MathProve proof-authority system, not a production Codex/Pi managed service, and not an OS-sandboxed execution platform.

For Goal 2, "current product output" means the implemented v3 slices are real `comathd` / Pi product surfaces with tests and release evidence, while remaining global-GA blockers stay explicit. The Phase 67 positive slice and Phase 68 negative slice runner are implementation evidence, not a license to overclaim arbitrary theorem synthesis.

## Requirement Matrix

| Requirement | Current evidence | Classification | Task follow-up |
| --- | --- | --- | --- |
| Preserve the existing repository, git history, and Goal Mode workspace. | `goal-2/input.md`, `goal-2/plan.md`, `goal-2/tasks.md`; branch `ga-v3-implementation-20260527`; commits through `e71f44d`. | In scope and active. | Continue one task per goal turn; Task 15 owns final completion audit. |
| Product must not be a rough scaffold. | `README.md` describes Phase 18-72 product surfaces; `TODO.md` marks Phases 60-72 complete; `REVIEW.md` records Phase 60-72 evidence. | In scope and product-real for registered slices plus fail-closed planning/repair/target-package evidence. | Continue one task per Goal 2 turn until final audit can prove completion. |
| Native proof-kernel is the GA proof authority for implemented formal slices. | Phase 18, 23, 57, 63, 64, and 67 tests; `phase67-v3-formal-campaign-slice.test.mjs`; `MATH_INTEGRITY_REVIEW.md`. | Implemented for registered elementary Nat theorem-family slices. | Broader theorem planning/synthesis remains deferred. |
| ResearchCampaign drives bounded resumable work through `comathd`. | Phase 20 state machine; Phase 60 pause/tick guard; Phase 63 v3 stage gates; Phase 66 Pi goal-compatible UX; Phase 67 formal campaign slice; Phase 69 terminal vocabulary projection; Phase 71 stage-gate repair/resume; Phase 72 theorem-specific target package. | Implemented for supported product slices. | Broad theorem generalization remains deferred. |
| 8-way candidate ensemble and evidence-weighted arbitration exist. | Phase 18 candidate artifacts, Phase 19 ensemble recovery, Phase 61 manifest contract, Phase 62 decision forest, Phase 67 slice summary. | Implemented for registered theorem-family slices. | Live external child-agent ensemble execution remains deferred. |
| Failed-route memory is first-class and retrievable. | Phase 61 failure aggregate and Phase 65 proof-memory retrieval; `recordFailedRoutes()`, `retrieveSimilarFailedRoutes()`, and warnings JSONL. | Implemented with deterministic conservative retrieval. | Semantic/vector failure-memory retrieval remains future hardening. |
| Lean Authority v2 controls `formally_checked` promotion. | Phase 31-37, 54, 56, 57, and 64 tests; final replay hash binding; statement equivalence, dependency closure, axiom profile, static audit, and clean replay artifacts. | Implemented for registered slices with fail-closed binding. | Broader proof-search-grade equivalence and deeper Lake/mathlib provenance remain deferred. |
| Pi remains a thin client over `comathd`. | Phase 22, 26, 30, 41-51, 66 tests; Phase 45 local install-session e2e. | Implemented for local automated and fake-host Pi surfaces. | Richer real-host Pi lifecycle/UI remains deferred. |
| Positive v3 formal campaign slice exists. | `phase67-v3-formal-campaign-slice.test.mjs` writes `.comath/campaign/<CAM>/v3_formal_campaign_slice.json` and verifies clean replay, promotion, replay route, and artifact bundle. | Implemented for `n + 0 = n` registered theorem family. | Not arbitrary theorem proving. |
| Required negative GA slices exist. | `phase68-v3-negative-ga-slices.test.mjs` and `POST /release/v3-negative-ga-slices` write `.comath/release/v3_negative_ga_slices.json` for statement drift, cheating Lean artifact, false theorem, all-candidate failure, and snapshot-only promotion rejection. | Implemented as release-level rejection evidence. | Not proof authority; final Task 15 audit still required. |
| Full v3 external-document terminal vocabulary compatibility exists. | `phase69-v3-terminal-vocabulary.test.mjs` covers all five external v3 names, and `phase22-research-loop.test.mjs` verifies Pi loop consumption of `external_v3_terminal_state`. | Implemented as read-only API/UX projection. | Internal canonical state and gates remain the proof authority. |
| Broad theorem planning/synthesis has a product slice beyond registered templates. | `phase70-broad-theorem-planning-slice.test.mjs` verifies non-template targets write `broad_synthesis_plan.json`, `broad_replay_target.json`, and `broad_synthesis_failure.json`, preserve problem-lock/DAG/line-map evidence, block promotion, and keep the claim conjectural; Phase 72 adds one bounded theorem-specific target package. | Implemented as fail-closed planning plus one unproved target-package slice. | Arbitrary proof synthesis remains deferred. |
| Blocked stage-gate campaigns can be repaired without bypassing proof authority. | `phase71-stage-gate-repair-resume.test.mjs` verifies blocked missing-artifact campaigns cannot use ordinary `/resume`, repair must cite `stage_gate_blocker.json` and the exact missing artifacts, valid repair writes `stage_gate_repair.json` with `proof_authority: none`, keeps claims conjectural, and resumes only to the producing gate. | Implemented for missing required stage-gate artifacts. | General theorem repair loops and proof synthesis remain deferred. |
| One theorem-specific Lean target package exists beyond broad planning. | `phase72-theorem-specific-lean-generation.test.mjs` verifies a bounded non-template `n + n = 2 * n` target writes `theorem_specific_lean_project.json`, Lean target, formal spec, Lake/toolchain files, replay-target binding, and a negative statement-binding guard, while leaving the campaign blocked and claim conjectural. | Implemented as unproved target-package evidence only. | Proof-body synthesis, authority reports, final clean replay, and arbitrary theorem proving remain deferred. |
| MathProve remains evidence-only. | Phase 9, 25, and 58 tests; `MATH_INTEGRITY_REVIEW.md`; `SECURITY_REVIEW.md`. | Implemented as non-authoritative runner bridges. | Broad MathProve proof search and MathProve-as-authority remain deferred. |
| TriviumDB remains optional behind adapters. | Phase 13 and 38 tests/evaluation. | Optional target-platform evidence exists; default backend remains memory. | Broader multi-platform native benchmarking remains future work. |
| Security and mathematical-integrity reviews are current. | `SECURITY_REVIEW.md`, `MATH_INTEGRITY_REVIEW.md`, `docs/architecture/risk-register.md`, and `docs/architecture/acceptance-matrix.md` now include Phase 68/69 boundaries. | Synchronized through Task 16. | Final scans and audit are still required before goal completion. |

## Deferred Item Classification

| Deferred item from `TODO.md` | Classification | Rationale | Completion impact for Goal 2 |
| --- | --- | --- | --- |
| Broad proof planning and theorem synthesis beyond the Phase 70 fail-closed planning slice, Phase 72 bounded target package, registered theorem families, and exact refutation. | Global-GA limitation. | Current product writes replayable planning evidence for non-template targets and one theorem-specific Lean target package, but does not synthesize arbitrary proof bodies, authority reports, or proofs. | Blocks arbitrary-theorem claims; does not invalidate current Phase 18-72 evidence. |
| Broad MathProve proof search and MathProve-as-proof-authority. | Mathematical authority limitation. | MathProve output is archived as runner evidence and promotion gates still require CoMath proof-kernel replay. | Overclaim would block completion; evidence-runner use is allowed. |
| Production Codex/Pi account/network/operator hardening. | Productization limitation. | Current adapter surfaces are bounded local/injected-client slices, not production account/network validation. | Does not block current local product evidence; blocks production-service claims. |
| Richer real-host Pi UX/service lifecycle management. | UX/deployment limitation. | Current Pi evidence is fake-host/runtime registration plus local install-session e2e. | Blocks real-host lifecycle claims. |
| OS-level process sandboxing and enforced network denial. | Security limitation. | Current controls are path policy, `shell:false`, allowlists, locks, timeouts, provenance, and environment gates. | Blocks hardened-sandbox claims. |
| Richer statement equivalence beyond registered aliases/witnesses. | Mathematical limitation. | Current equivalence is conservative, target-bound, and witness-backed. | Blocks broad semantic-equivalence claims. |

## Product-Readiness Tests Still Required By Goal 2

Task 17 adds fail-closed broad theorem planning evidence for non-template targets. The following evidence remains required before the goal can be marked complete:

1. Final root `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test` from the final worktree.
2. Final static scans for runtime artifacts, tracked generated files, secrets, gate bypasses, direct Pi trusted-state writes, and MathProve proof-authority overclaims.
3. Requirement-by-requirement audit against `Goal 指令.txt` and the four external v3 development documents.
4. Confirmation that `README.md`, `TODO.md`, `REVIEW.md`, `SECURITY_REVIEW.md`, `MATH_INTEGRITY_REVIEW.md`, acceptance matrix, risk register, and this matrix distinguish implemented v3 slices from remaining global-GA blockers.
5. A final release/audit commit if Task 15 changes files.

## Overclaim Guardrails

The following statements must remain false in final reporting unless later tasks implement and validate them with executable evidence:

- CoMath Pi Lab is a production arbitrary theorem prover.
- MathProve output can promote `formally_checked` or act as proof authority.
- `v3_negative_ga_slices.json` is proof authority for arbitrary claims.
- TriviumDB is the default production memory backend.
- Codex/Pi adapters are production-hardened against real account/network/operator lifecycle risk.
- Runner replay has OS-enforced network denial or process isolation.
- Statement equivalence handles arbitrary transitive semantic equivalence.
- Pi has a full real-host interactive lifecycle manager beyond current local package/e2e surfaces.
