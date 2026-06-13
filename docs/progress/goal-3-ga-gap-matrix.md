# Goal 3 GA Gap Matrix

Date: 2026-05-29

Scope: current `D:\MATH _Studio\comath-pi-lab` `main` worktree against the 2026-05-29 no-reinvent audit, open formal workbench design, and agent prompt protocol. This is a planning and audit artifact for Goal 3 Task 1. It is not a GA completion claim.

## Current-State Baseline

| Surface | Current evidence | Task 1 classification |
| --- | --- | --- |
| Active repo worktree | `git status -sb` reports `## main`; `git log --oneline --decorate --max-count=8` starts at `1a7f7b5 (HEAD -> main) Align P0 quarantine regression matrix`. | Use current `main` as the effective Goal 3 execution surface. |
| Historical worktree | `git worktree list --porcelain` also shows `.worktrees/production-formal-workbench` on branch `production-formal-workbench`, HEAD `93c954b`. Its source tree uses `campaign-engine.ts` / `final-authority.ts`, while current `main` uses `campaign-tick.ts`, `clean-replay.ts`, and related Phase 18-81 modules. | Historical state evidence only. Do not implement future Goal 3 tasks in that older worktree unless the user redirects. |
| Goal workspace | `goal-3/input.md`, `goal-3/plan.md`, and `goal-3/tasks.md` exist but are currently untracked. | Goal 3 initialization exists; Task 1 should commit these tracking files with this matrix. |
| Other untracked file | `services/comathd/tests/unit/phase82-controlled-equivalence-proof-execution.test.mjs` is untracked and belongs to the older Goal 2/Phase 82 line, not Task 1. | Leave untouched in Task 1. Later statement-equivalence work may inspect it deliberately. |
| Product status docs | `README.md` describes Research Alpha plus Phase 18-81 vertical slices and explicitly says the project is not a production arbitrary theorem prover. `TODO.md` known deferred items still list broad proof synthesis, MathProve proof authority, Pi/Codex production hardening, sandboxing, and richer statement equivalence as open. | Existing evidence is useful but not GA completion. |

## M0: Remove Internal Theorem Proving

| Requirement | Current evidence | Gap classification | Next task |
| --- | --- | --- | --- |
| No production theorem-family recognizer. | `services/comathd/src/proof-kernel/lean/theorem-family.ts` still exports theorem family metadata for Nat identities, but `findTheoremFamilyForGoal()` and `findTheoremFamilyForObligation()` now return `undefined`. `goal4-p0-no-reinvent-violations.test.mjs` checks both paths. | Reused/quarantined. The production recognizer path is disabled, but the metadata module remains in `src`, so Task 2 should move or fence it as fixture material. | Task 2 |
| No synthetic V1 winner. | `services/comathd/src/proof-kernel/ensemble/candidate-runner.ts` now emits all variants as `candidate_blocked` with hard veto `business_layer_theorem_prover_forbidden`; `goal4-p0-no-reinvent-violations.test.mjs` checks V1 is not a synthetic kernel-checked winner. | Reused/quarantined. Still deterministic fixture output, not real agent work. | Tasks 2, 14 |
| No default `n : Nat`. | `goal4-p0-no-reinvent-violations.test.mjs` checks unknown goals do not get `n : Nat`; current `campaign-tick.ts` writes empty `assumptions.md` for the default path. | Reused for the narrow P0 check. Needs FormalSpecLock/AssumptionLedger before proof obligations are trusted. | Task 4 |
| No Nat-only production path or Nat linear theorem prover. | Current `campaign-tick.ts` still contains theorem-specific target/proof-body paths, `synthesis_scope`, and bounded Nat linear artifacts. `TODO.md` and `README.md` describe Phase 81 controlled Nat linear identity synthesis as bounded and not arbitrary theorem proving. | Contradictory/obsolete for Goal 3 GA. Treat Phase 72-81 as historical vertical-slice evidence until moved behind smoke/fixture boundaries. | Task 2 |

## M1: FormalSpecLock, AssumptionLedger, StatementDiffGate

| Requirement | Current evidence | Gap classification | Next task |
| --- | --- | --- | --- |
| First-class `FormalSpecLock`. | Current code has claim statements, statement hashes, problem-lock markdown, and formal spec JSON for bounded targets, but no first-class `FormalSpecLock` schema matching the 2026-05-29 design. | Missing. | Task 4 |
| First-class `AssumptionLedger`. | `Claim.assumptions` and `ProofObligation.assumptions` remain string arrays; candidate manifests include assumption lists/deltas but not source/approval/evidence-anchor ledger entries. | Missing. | Task 4 |
| Unknown/ambiguous goal fail-closed as `needs_formal_spec_lock`. | Current start/tick flow can create conjectural claims and planning artifacts for unsupported goals, but the 2026-05-29 status vocabulary and lock-required state are not yet first-class. | Insufficient. | Task 4 |
| Exact statement diff gate by default. | `checkStatementEquivalence()` binds target signatures and fails on `statement_drift`; registered alias/logical/transitive witness metadata and Phase 79/80 artifacts exist. | Partially reusable but insufficient: metadata-backed equivalence is not enough for Goal 3 non-exact equivalence, which must require Lean-proved equivalence replay. | Task 5 |
| Statement Drift Red Team. | Phase 62/63/68 evidence includes drift rejection and red-team style artifacts; no dedicated Goal 3 `StatementDiffGate` plus red-team report contract exists. | Insufficient. | Task 5 |

## M2: LeanRunner And LeanRunManifest v3

| Requirement | Current evidence | Gap classification | Next task |
| --- | --- | --- | --- |
| Service-owned Lean execution. | `runCleanLeanReplay()` and `createLeanProjectForTheorem()` own bounded replay paths; Pi remains a thin client. | Reusable foundation. | Task 7 |
| `LeanRunManifest v3` for every Lean command. | Current final replay manifests bind logs/reports and Phase 64 hash checks, but no canonical `comath.lean_run_manifest.v3` schema with command/cwd/input/binary/toolchain fields for all Lean invocations. | Insufficient. | Task 7 |
| Fail closed on toolchain unknown. | `lean-project.ts` still contains fallback `leanprover/lean4:v${match?.[1] ?? "4.27.0"}`. | Contradictory with 2026-05-29 audit. | Task 7 |
| Reject agent-written Lean stdout/stderr/pass logs. | Gate code requires service-owned final replay evidence, but ownership is not represented as a v3 manifest invariant for all Lean logs. | Insufficient. | Task 7 |

## M3: External Wheel Registry And Adapter Contracts

| Requirement | Current evidence | Gap classification | Next task |
| --- | --- | --- | --- |
| Theorem search adapters for Loogle/LeanSearch/Moogle/LeanExplore/LeanDojo. | Existing code has agent adapter packages and local runner surfaces, but no unified `TheoremSearchAdapter` registry. | Missing. | Task 11 |
| Retrieval adapters for arXiv/Semantic Scholar/OpenAlex/Crossref/Unpaywall/Jina/AnySearch/local ingestion. | Literature code and docs have arXiv/OpenAlex/Semantic Scholar/Zotero descriptors and citation checks, but not the full 2026-05-29 adapter contract with provider/query/hash/terms/prompt-injection fields. | Insufficient. | Task 11 |
| Proof-search backend adapters. | Codex CLI/API package adapters exist as untrusted agent execution surfaces, not a formal proof-search backend registry with Lean-check routing. | Insufficient. | Task 11 |
| Computation adapters. | SymPy, counterexample, Sage placeholder, and SAT placeholder runners exist with `proof_authority: none` boundaries. | Reusable foundation; missing unified `ComputationAdapter` registry and z3/cvc5/Sage policy surface. | Task 11 |
| External Lean repo registry. | No first-class external Lean repo dependency state machine (`planning_reference -> trusted_replay_dependency`) is implemented. | Missing. | Task 11 |

## M4: MathProve-Native Workflow

| Requirement | Current evidence | Gap classification | Next task |
| --- | --- | --- | --- |
| Native S0-S10 stage machine. | Current campaign stages include `problem_locked`, `knowledge_pack`, `notation_gate`, `skeleton_gate`, `line_map_gate`, `candidate_generation`, `refutation_red_team`, `integration_refactor`, `final_static_audit`, `final_global_replay`, and `memory_update`. | Partially reused; names and artifacts are close but not the exact S0-S10 schema and blocker contract. | Task 13 |
| Every stage has schema, hard vetoes, blocker certificates, resume state. | Stage-gate repair/resume and missing-artifact blockers exist, but not complete per-stage schemas and blocker certificates. | Insufficient. | Task 13 |
| MathProve-Skill principles internalized, external output evidence-only. | Phase 25/58 bridge output is fail-closed evidence only. | Reusable foundation; not yet native workflow replacement. | Task 13 |

## M5: Real 1+8 Agent Workflow

| Requirement | Current evidence | Gap classification | Next task |
| --- | --- | --- | --- |
| A0 + A1-A8 prompt pack. | `.pi/agents`, `.pi/prompts`, and `services/comathd/src/agents/agent-profiles.ts` define coordinator/librarian/computation/proof-route/formalization/reviewer/graph/security/math-integrity profiles. | Reused but insufficient: it does not exactly implement the 2026-05-29 A0-A8 team or specialist output schema. | Task 14 |
| Stage-local V1-V8 independent variants. | `variant-registry.ts` defines V1-V8 and `candidate-runner.ts` writes artifacts, but current output is deterministic blocked fixture evidence. | Insufficient/obsolete for GA; useful as schema fixture only. | Task 14 |
| Aggregator precedence hard veto > Lean evidence > integrity > score > vote. | `decision-forest.ts` uses evidence-weighted selection and hard vetoes, with tests through Phase 62. | Reusable foundation, but must be tied to real agent candidate packs and votes remain advisory only. | Task 14 |
| Failure memory. | `failure-aggregator.ts` and Phase 65 proof-memory retrieval exist. | Reusable foundation. | Task 14 |

## M6: Lean Authority v3

| Requirement | Current evidence | Gap classification | Next task |
| --- | --- | --- | --- |
| Hermetic final replay. | `clean-replay.ts` builds clean replay artifacts and final manifests for bounded slices. | Partially reused; needs v3 clean workspace hash, before/after source hashes, network/sandbox policy, binary hashes where available, and third-party pack. | Task 8 |
| Append-only replay registry. | Replay ids and final manifests exist, but no explicit append-only registry with overwrite prevention for every replay. | Insufficient. | Task 8 |
| DependencyLock / DependencyClosureV2. | `dependency-closure.ts` and final replay artifact hash binding exist. | Insufficient for Lake package graph, mathlib revision, external repo pin/license/import closure/untracked imports/symlink policy. | Task 10 |
| LeanIntegrityScannerV2 / No-Cheat Gate. | `static-cheat-scan.ts` exists as regex-oriented precheck and Phase 31 trust-profile tests exist. | Reusable precheck only; insufficient for Lean-aware scanner. | Task 10 |
| AxiomProfileV2. | `axiom-profile.ts` parses Lean output and trust-profile tests exist. | Insufficient; v2 must bind theorem name, type/source hashes, environment fingerprint, and LeanRunManifest id. | Task 10 |
| Third-party replay pack. | Snapshot/replay and release package evidence exist, but no complete v3 evidence pack with `README_REPLAY.md` and all required locks/manifests for arbitrary promoted proof artifacts. | Insufficient. | Task 8 |

## M7: Pi Goal-Mode

| Requirement | Current evidence | Gap classification | Next task |
| --- | --- | --- | --- |
| `/cm:research --goal --paper --attach --workspace-ref --mode goal --strict --budget`. | Existing Pi tools cover `/cm:research`, paper/workspace paths, strict mode, campaign status/tick/final-audit/replay, and installed-session e2e. | Reusable foundation; missing exact GA command/option contract and attach/budget/mode semantics. | Task 16 |
| Default goal mode; bounded tick debug only. | Current docs and tests still describe bounded campaign loops and bounded log sessions. | Contradictory/insufficient. | Task 16 |
| Allowed terminal states. | Current internal/external terminal vocabulary uses `completed_formal_proof`, `completed_refutation`, `blocked_with_replayable_reason`, `cancelled_by_user`, and external v3 projections. | Insufficient; Goal 3 requires `formal_replay_passed`, `formal_counterexample_confirmed`, `needs_user_statement_disambiguation`, `blocked_with_replayable_certificate`, `budget_exhausted_with_resume_state`. | Task 16 |
| Dashboard fields. | Current dashboards and read models expose useful claim/evidence/gate/campaign/agent surfaces. | Insufficient for the full GA dashboard list. | Task 16 |

## M8: Release Hardening

| Requirement | Current evidence | Gap classification | Next task |
| --- | --- | --- | --- |
| README required wording and forbidden-claim cleanup. | README says not arbitrary theorem prover, but also foregrounds Phase 18-81 proof slices and historical Nat paths. | Insufficient; resync after implementation. | Task 19 |
| Threat model / SECURITY / CONTRIBUTING / config samples. | Security and integrity review docs exist; config samples and adapter package docs exist. | Reusable foundation; needs Goal 3 GA threat model and adapter examples after Tasks 10-17. | Task 19 |
| GA negative acceptance suite. | Many negative tests exist, including Goal 4 P0 and Phase 68; not yet the full 2026-05-29 trust-core list. | Insufficient. | Task 17 |
| Positive proof research workflow. | Positive vertical slices rely on registered theorem-family or Nat linear paths now quarantined/historical. | Obsolete for Goal 3 acceptance; need workflow that does not rely on production theorem recognizers. | Task 17 |
| Open-source release quality. | Package/runtime/docs evidence exists; no final Goal 3 GA audit yet. | Deferred. | Tasks 18-20 |

Task342 selected-tranche next packaging currentness check-debug adds release-hardening regression coverage over the latest Task340/341 selected-tranche packaging/currentness loop and its Task338/335/334/326/300/301 authority boundaries. This records status/smoke/default-discovery/docs synchronization only; it does not add a route, Pi consumer, Lean replay, packaging writer, proof-breadth closure, final-audit unblock, claim promotion, certificate issuance, or GA certification.

Task343 selected-tranche next closure recheck adds the Task341-bound selected-tranche currentness-to-Task300 handoff. It consumes only current Task341 id/path/hash material, re-hashes selected canonical PM packaging reports, records append-only non-certifying provenance, and keeps Task300 as aggregate proof-breadth closure authority plus Task301 as final-audit binding authority. It does not run Lean, write packaging reports, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert incomplete selected-tranche packaging into verified proof breadth.

Task344 selected-tranche next closure execution bridge adds the Task343-bound handoff back into selected-tranche next execution planning. It consumes only current Task343 id/path/hash material, preserves Task343-bound Task300 closure and selected PM packaging-report currentness checks through Task338 semantics, records append-only non-certifying provenance, and keeps Task338/Task326 as bounded next-tranche execution-planning plumbing. It does not run Lean, synthesize proofs, write packaging/currentness/closure/final-audit artifacts, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert selected-tranche continuation into global proof-breadth closure.

Task345 selected-tranche next closure bridge check-debug adds regression coverage over the Task343/344 closure-to-next-execution bridge and the adjacent Task338/326/300/301 authority chain. It records status/smoke/default-discovery/docs synchronization only, keeps Task344 Task343-hash-bound and Task338-delegating, keeps Task343 Task300-reusing, and keeps no-Pi-public-surface boundaries. It does not add a route, Pi consumer, Lean replay, proof synthesis, packaging/currentness/closure/final-audit writer, final-audit unblock, claim promotion, certificate issuance, or GA certification.

Task346 selected-tranche next closure packaging follow-through adds the Task344-bound handoff into the existing selected-tranche packaging path. It consumes only current Task344 id/path/hash material, re-hashes Task344's delegated Task338 bridge, requires its delegated Task326 bridge reference to remain bound, rejects missing next bridges and evidence outside Task344's next selected PM task ids, delegates packaging through Task340/Task334, and records append-only non-certifying provenance. It does not run Lean, synthesize proofs, write Task300 closure or Task301 final-audit artifacts, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert selected-tranche packaging into global proof-breadth closure.

Task347 selected-tranche next closure packaging results follow-up adds the Task346-bound currentness handoff over selected-tranche next closure packaging results. It consumes only current Task346 id/path/hash material, canonical-validates Task346-embedded Task344/Task338 provenance, delegates Task346's Task340 packaging output through Task341 currentness reuse, preserves Task335 currentness transitively through Task341, and records append-only non-certifying provenance. It does not run Lean, synthesize proofs, write Task300 closure, Task301 final-audit, or GA-certificate artifacts, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert selected-tranche packaging results into global proof-breadth closure.

Task348 selected-tranche next closure packaging/currentness check-debug adds regression coverage over the Task346/347 packaging/currentness loop and adjacent Task344/338/341/335/334/300/301/303 authority boundaries. It records status/smoke/default-discovery/docs synchronization only; it does not add a route, Pi consumer, Lean replay, proof synthesis, packaging/currentness/closure/final-audit/certificate writer, final-audit unblock, claim promotion, certificate issuance, or GA certification.

Task349 selected-tranche next closure packaging results closure recheck adds the Task347-bound handoff back into existing Task343/Task300 selected-tranche closure recheck semantics. It consumes only current Task347 id/path/hash material, revalidates Task347's Task346/344/338/340/341/335/334 currentness references, records append-only non-certifying provenance, and keeps Task300 as aggregate proof-breadth closure authority plus Task301/303 as separate final-audit/certificate gates. It does not run Lean, synthesize proofs, call Task326/334/340/341 producer paths directly, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert selected-tranche recheck evidence into global proof-breadth completion.

Task350 selected-tranche next closure packaging results closure execution bridge adds the Task349-bound handoff back into existing Task344/338 selected-tranche closure execution bridge semantics. It consumes only current Task349 id/path/hash material, records append-only non-certifying provenance, and keeps Task300 as aggregate proof-breadth closure authority plus Task301/303 as separate final-audit/certificate gates. It does not run Lean, synthesize proofs, call Task326/338 producer paths directly, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert selected-tranche execution evidence into global proof-breadth completion.

Task351 selected-tranche next closure results-to-execution check-debug adds regression coverage over the Task349/350 closure-results-to-execution loop and adjacent Task344/338/326/300/301/303 authority boundaries. It records status/smoke/default-discovery/docs synchronization only; it does not add a route, Pi consumer, Lean replay, proof synthesis, packaging/currentness/closure/final-audit/GA-certificate writer, final-audit unblock, claim promotion, certificate issuance, or GA certification.

Task352 selected-tranche next closure execution packaging follow-through adds the Task350-bound handoff back into existing Task346/340/334 selected-tranche packaging semantics. It consumes only current Task350 id/path/hash material, records append-only non-certifying provenance, rejects unselected evidence through delegated packaging checks, and keeps Task300 as aggregate proof-breadth closure authority plus Task301/303 as separate final-audit/certificate gates. It does not run Lean, synthesize proofs, call Task326/334/338/340 producer paths directly, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert selected-tranche packaging evidence into global proof-breadth completion.

Task353 selected-tranche next closure execution packaging results follow-up adds the Task352-bound handoff back into existing Task347/341/335 selected-tranche packaging-results currentness semantics. It consumes only current Task352 id/path/hash material, validates the Task352-bound delegated Task346 packaging reference, records append-only non-certifying provenance, and keeps Task300 as aggregate proof-breadth closure authority plus Task301/303 as separate final-audit/certificate gates. It does not run Lean, synthesize proofs, call producer paths directly, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert selected-tranche currentness evidence into global proof-breadth completion.

Task354 selected-tranche closure execution packaging results currentness check-debug adds regression coverage over the Task352/353 loop. It keeps Task352 bound to Task350 and existing Task346/340/334 packaging semantics, keeps Task353 bound to Task352 and existing Task347/341/335 currentness semantics, verifies route/export/status/smoke/default discovery, and preserves Task300/301/303 authority separation. It does not add a route, run Lean, synthesize proofs, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert selected-tranche currentness evidence into global proof-breadth completion.

Task355 selected-tranche next closure execution packaging results closure recheck adds the Task353-bound handoff back into existing Task349/343/300 selected-tranche closure recheck semantics. It consumes only current Task353 id/path/hash material, validates the Task353-bound delegated Task347 packaging-results reference, records append-only non-certifying provenance, and keeps Task300 as aggregate proof-breadth closure authority plus Task301/303 as separate final-audit/certificate gates. It does not run Lean, synthesize proofs, call producer paths directly, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert selected-tranche closure recheck evidence into global proof-breadth completion.

Task356 selected-tranche next closure execution packaging results closure execution bridge adds the Task355-bound handoff back into existing Task350/344/338 selected-tranche closure execution semantics. It consumes only current Task355 id/path/hash material, validates the Task355-bound delegated Task349 closure-recheck reference, records append-only non-certifying provenance, and keeps Task300 as aggregate proof-breadth closure authority plus Task301/303 as separate final-audit/certificate gates. It does not run Lean, synthesize proofs, call producer paths directly outside the existing Task350 wrapper, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert selected-tranche closure execution evidence into global proof-breadth completion.

Task357 selected-tranche closure recheck-to-execution check-debug adds regression coverage over the Task355/356 loop. It keeps Task355 bound to Task353 and existing Task349/343/300 closure-recheck semantics, keeps Task356 bound to Task355 and existing Task350/344/338 closure-execution semantics, verifies route/export/status/smoke/default discovery, and preserves Task300/301/303 authority separation. It does not add a route, run Lean, synthesize proofs, expose Pi/public authority, promote claims, issue certificates, certify GA, or convert selected-tranche closure execution evidence into global proof-breadth completion.

## Phase 18-81 Evidence Classification

| Evidence family | Reuse classification | Reason |
| --- | --- | --- |
| Phase 18 proof-kernel campaign/gate/replay slices | Reused with restrictions | Provides service-owned campaign and replay shape; proof-positive Nat path is no longer sufficient GA evidence. |
| Phase 19/61/62 candidate manifests, failure aggregation, decision forest | Reused | Candidate/decision schemas and fail-closed arbitration are good foundations. |
| Phase 23/57 theorem-family registry | Obsolete for production proof support | Keep only as smoke/fixture material after M0. |
| Phase 63 native stage-gate artifacts and Phase 71 repair/resume | Reused | Useful for S0-S10 implementation, but incomplete. |
| Phase 64 Lean Authority v2 hash-bound final gate | Reused | Strong v2 gate material; still below Lean Authority v3. |
| Phase 65 proof-memory retrieval | Reused | Failure memory model should carry forward. |
| Phase 66/69 Pi goal-compatible/v3 vocabulary | Reused with changes | Good thin-client and projection foundations; terminal vocabulary must align to Goal 3. |
| Phase 70 broad planning slice | Reused | Correct fail-closed broad theorem behavior; not proof synthesis. |
| Phase 72-81 bounded theorem/Nat linear synthesis | Contradictory for Goal 3 production | Useful only as historical fixture/smoke evidence; business-layer Nat synthesis must not certify product proof artifacts. |
| Phase 77 runner network policy | Reused with restrictions | Service-level policy is useful; not OS-enforced sandboxing. |
| Phase 79/80 statement-equivalence plan/materialization | Reused as non-authoritative planning metadata | Needs Lean-proved equivalence execution before any non-exact equivalence authority. |

## Source-Level Touch Map

| Task | Likely files/tests |
| --- | --- |
| Task 2 | `services/comathd/src/proof-kernel/lean/theorem-family.ts`; `services/comathd/src/proof-kernel/campaign/campaign-tick.ts`; `services/comathd/src/proof-kernel/ensemble/candidate-runner.ts`; `services/comathd/src/status.ts`; `services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs`; Phase 72-81 tests/docs. |
| Task 4 | `services/comathd/src/types/schemas.ts`; new formal-spec/assumption ledger modules; `services/comathd/src/proof-kernel/campaign/campaign-tick.ts`; campaign start/tick tests. |
| Task 5 | `services/comathd/src/proof-kernel/lean/statement-equivalence.ts`; new `StatementDiffGate`/red-team module; Phase 32/37/54/56/78/79/80 tests; the untracked Phase 82 test may be inspected deliberately here. |
| Task 7 | `services/comathd/src/proof-kernel/lean/lean-project.ts`; `services/comathd/src/proof-kernel/lean/clean-replay.ts`; `services/comathd/src/types/schemas.ts`; new LeanRunManifest tests. |
| Task 8 | `services/comathd/src/proof-kernel/lean/clean-replay.ts`; snapshot/replay artifacts; release/evidence-pack modules; replay overwrite/network/symlink tests. |
| Task 10 | `services/comathd/src/proof-kernel/lean/dependency-closure.ts`; `static-cheat-scan.ts`; `axiom-profile.ts`; new V2 modules/tests. |
| Task 11 | New adapter registry modules under `services/comathd/src/adapters` or equivalent; `services/comathd/src/literature`; `services/comathd/src/verification/runner-contracts.ts`; network-free adapter tests. |
| Task 13 | `services/comathd/src/proof-kernel/campaign/campaign-tick.ts`; `services/comathd/src/proof-kernel/campaign/research-campaign.ts`; stage artifact modules; MathProve bridge tests. |
| Task 14 | `.pi/agents`; `.pi/prompts`; `services/comathd/src/agents`; `services/comathd/src/proof-kernel/ensemble`; `extensions/comath-pi/src/subagents.ts`; agent schema tests. |
| Task 16 | `extensions/comath-pi/src/index.ts`; `extensions/comath-pi/src/research-loop.ts`; service campaign routes; dashboard/read-model files; Pi e2e tests. |
| Task 17 | New GA acceptance tests under `services/comathd/tests` and root `tests`; evidence-pack/proof workflow fixtures. |
| Task 19 | `README.md`; `AGENTS.md`; `SECURITY_REVIEW.md`; `MATH_INTEGRITY_REVIEW.md`; `docs/architecture/*`; config samples; prompt docs. |

## Lightweight Verification Used By Task 1

Task 1 verification should check that this matrix references real files and that the intentionally ignored Phase 82 draft remains untracked. Suggested commands:

```text
rg -n "Goal 3 GA Gap Matrix|M0: Remove Internal Theorem Proving|Task 2|phase82" docs/progress/goal-3-ga-gap-matrix.md goal-3/tasks.md
rg --files services/comathd/src/proof-kernel services/comathd/tests/unit extensions/comath-pi/src docs/progress | rg "(theorem-family|campaign-tick|candidate-runner|goal4-p0-no-reinvent|goal-3-ga-gap-matrix|research-loop)"
git -c safe.directory='D:/MATH _Studio/comath-pi-lab' status --porcelain=v1
```
