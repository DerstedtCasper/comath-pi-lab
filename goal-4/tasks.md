# Goal 4 Tasks

Rule for every continuation: execute exactly the first unchecked task, verify it, update this file, and stop.

Status legend:

- `[ ]` pending
- `[x]` completed
- `[!]` blocked or requires follow-up

## Task List

### Task 1: Baseline Repository and Document Audit

- [x] Inspect current repository structure, package scripts, existing goal directories, docs, prompt packs, and the P0 files named by the audit.
- [x] Produce a concise baseline map in this task record: files/modules relevant to theorem-family, campaign tick, candidate runner, Lean runner, replay, dependency closure, integrity scan, Pi goal-mode, prompts, and tests.
- [x] Verify with read-only commands only: `git status -sb`, package script inspection, and targeted `rg` searches.

Completion record:

- Work performed:
  - Read all required goal-4 files for this continuation: `goal-4/input.md`, `goal-4/plan.md`, `goal-4/tasks.md`.
  - Rechecked the source-document assumption from `plan.md`: the referenced audit/design files are present in the documentation directory as `CoMath_No_Reinvent_GA_Audit_v2_2026-05-29.md` and `CoMath_Open_Formal_Workbench_GA_Design_v2_2026-05-29.md`; prompt source is `COMATH_AGENT_TEAM_AND_PROMPTS_V2_20260526.md`.
  - Inspected repository structure and scripts. Root package has `build`, `typecheck`, and `test`; `services/comathd/package.json` has a long explicit test chain through Phase 81; `extensions/comath-pi/package.json` covers Pi extension tests through Phase 66.
  - Baseline map:
    - `services/comathd/src/proof-kernel/lean/theorem-family.ts`: exports `theoremFamilies`, `findTheoremFamilyForGoal`, and `findTheoremFamilyForObligation`; current business theorem recognizer is three hard-coded Nat template families: `n + 0 = n`, `n * 0 = 0`, `0 + n = n`.
    - `services/comathd/src/proof-kernel/campaign/campaign-tick.ts`: exports campaign start/tick/replay/repair flow; currently writes `n : Nat` into problem lock, claim assumptions, and proof obligations; contains registered Nat-linear target table, controlled Nat-linear expression synthesis, theorem-specific Lean target generation, `by omega` proof-body synthesis, bounded authority previews, and final replay/promotion path.
    - `services/comathd/src/proof-kernel/ensemble/candidate-runner.ts`: generates 8 candidate artifacts from `defaultVariants`; V1 is deterministic `candidate_kernel_checked` winner and V2-V8 are failed-route/search/stress artifacts, so this is a synthetic ensemble facade rather than real A0+A1..A8 execution.
    - `services/comathd/src/proof-kernel/ensemble/variant-registry.ts`: defines V1-V8 names and purposes only; no real per-variant runner binding.
    - `services/comathd/src/proof-kernel/lean/clean-replay.ts`: copies a Lean project to `.comath/lean/final_replay/RPLY-*/clean`, runs `lake env lean`, `lake build`, and audit, then writes claim-scoped `final_replay_manifest.json`; current implementation still takes static/dependency/hash inputs primarily from original `leanRoot`, not exclusively the clean copy.
    - `services/comathd/src/proof-kernel/lean/dependency-closure.ts`: records toolchain, lakefile hash, local Lean file hashes, and direct import lines; pass criterion is shallow because non-empty local file hashes pass.
    - `services/comathd/src/proof-kernel/lean/static-cheat-scan.ts`: regex scanner for `sorry`, `admit`, `axiom`, `constant`, `unsafe`, `opaque`, with skeleton `sorry` allowlist; not Lean AST-level.
    - `services/comathd/src/proof-kernel/lean/axiom-profile.ts`: parses `#print axioms` stdout with default trust profile allowing `propext`, `Quot.sound`, `Classical.choice`; parser is heuristic and can misattribute multi-output logs.
    - `services/comathd/src/proof-kernel/campaign/external-terminal-vocabulary.ts`: maps internal terminal states to external v3 names `formal_proof_verified`, `verified_counterexample`, `user_visible_theorem_repair_required`, `replayable_environment_blocker`, `user_cancelled`.
    - `extensions/comath-pi/src/research-loop.ts`: Pi-side bounded `/cm:research --goal` loop with host confirmation, `max_ticks`, dashboard aggregation, and external v3 terminal projection; it is bounded campaign-loop UX, not full GA Pi goal-mode research automation.
    - `extensions/comath-pi/src/subagents.ts`: defines named roles such as coordinator/librarian/computation/formalization/reviewer/security/math-integrity; no A0-A8 numbered prompt pack.
    - `docs/architecture/acceptance-matrix.md` and `docs/architecture/risk-register.md`: broad acceptance/risk coverage exists; there is no standalone threat-model document by that name.
    - `prompts/domain-braid-statistics.md`: only prompt file in repo `prompts/`; the external A0-A8 and V1-V8 prompt protocol lives in the documentation directory, not yet as native repo prompt pack.
  - Current working tree before Task 1 record update already had untracked `goal-3/`, `goal-4/`, and `services/comathd/tests/unit/phase82-controlled-equivalence-proof-execution.test.mjs`; these were not reverted or deleted.
- Verification:
  - `Get-Content -Raw goal-4/input.md`, `goal-4/plan.md`, `goal-4/tasks.md` completed for continuation context.
  - `rg --files` mapped repo files and confirmed P0 locations under `services/comathd/src/proof-kernel`.
  - `Get-Content -Raw package.json`, `services/comathd/package.json`, and `extensions/comath-pi/package.json` inspected script surfaces.
  - Targeted `rg` and `Select-String` searches covered `theoremFamily`, `findTheoremFamily`, `registeredNat`, `n : Nat`, `omega`, `synthetic`, `V1`, `winner`, `clean replay`, `DependencyClosure`, `AxiomProfile`, `FormalSpecLock`, `AssumptionLedger`, `StatementDiffGate`, `terminal`.
  - Two read-only explorer subagents cross-checked P0 proof-kernel and docs/Pi-surface baselines; both reported no file modifications.
  - No project tests were run in Task 1 because this task was explicitly read-only audit.
- Residual risk:
  - `goal-4/input.md` displays mojibake under current PowerShell `Get-Content`; semantic authority remains the active `goal_context`, `plan.md`, and the two GA v2 docs.
  - Task 1 is an audit map only. It does not fix the P0 violations: default `n : Nat`, theorem-family recognizer, Nat-linear synthesis, synthetic V1 winner, bounded tick loop, shallow dependency closure, and regex/stdout integrity gates remain present.
  - A0-A8 prompt pack and real agent workflow are not yet native code; existing named subagents and V1-V8 configs are partial scaffolding.
  - Phase 82 test file is untracked and not in the default service test script; ownership/status must be handled in a later task if relevant.
- Next task: Task 2, add failing P0 negative tests for no-reinvent violations before changing production code.

### Task 2: P0 Negative Tests for No-Reinvent Violations

- [x] Add failing tests that expose current wrong trusted paths:
  - default `n : Nat` obligation pollution
  - Nat-only theorem synthesis promotion
  - synthetic V1 winner / synthetic swarm promotion
  - agent vote or synthetic pass without trusted Lean replay
- [x] Run the focused tests and confirm they fail for the intended reason before implementation.

Completion record:

- Work performed:
  - Added `services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs` as a dedicated RED-only P0 regression test for the two 2026-05-29 GA/no-reinvent documents.
  - The test accumulates P0 failures instead of stopping at the first assertion, so Task 3 has a concrete removal/quarantine checklist.
  - Covered current wrong trusted paths:
    - production `findTheoremFamilyForGoal()` still recognizes Nat theorem-family goals;
    - campaign start still injects `n : Nat` into unknown-goal obligations / lock material;
    - controlled Nat linear business-layer synthesis can still reach `completed_formal_proof` and `formally_checked`;
    - `runTrivialNatAddZeroCandidates()` still hard-codes V1 as `candidate_kernel_checked` with score `15500`;
    - `decideCandidate()` still passes/selects synthetic candidate metadata before a real per-candidate trusted replay artifact exists.
  - No production implementation was modified in this task.
- Verification:
  - `node services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs` exited 1 for the intended RED reasons after fixing only test fixture IDs.
  - Initial RED run exposed the same P0 surfaces plus two invalid fixture IDs; fixture IDs were corrected from `CAM-P0`/`PO-P0` to schema-valid `CAM-0001`/`PO-0001`.
  - Final RED output reported the five intended violations: theorem-family recognizer, default `n : Nat`, Nat linear promotion, synthetic V1 winner, and synthetic arbitration pass.
- Residual risk:
  - This task intentionally leaves the P0 production defects in place. The new test is expected to fail until Task 3 removes or quarantines the toy/Nat-only trusted paths.
  - `goal-4/input.md` remains mojibake under current PowerShell reading, but `plan.md` records the resolved source-document assumption and current task scope.
  - Pre-existing untracked `goal-3/` and `services/comathd/tests/unit/phase82-controlled-equivalence-proof-execution.test.mjs` remain untouched.
- Next task: Task 3, remove or fail-close theorem-family recognizer, Nat-linear synthesis, default `n : Nat`, and synthetic winner paths from production promotion, then make this RED test pass.
- Commit: `b120465` (`Add Goal 4 P0 no-reinvent RED tests`).

### Task 3: Remove or Quarantine Toy/Nat-Only Trusted Paths

- [ ] Remove or fail-close theorem-family recognizer, Nat-linear synthesis, default `n : Nat`, and synthetic winner path from production promotion.
- [ ] Preserve legitimate Lean tactic use such as `omega` only as agent-generated candidate Lean code checked by Lean, not as business-layer proof authority.
- [ ] Run focused tests from Task 2 and update docs only if needed for changed behavior.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

## Major Checkpoint A: After Tasks 1-3

- [ ] Run a broad no-reinvent check-debug loop:
  - requirement drift check against the two GA v2 docs
  - `git diff` review
  - focused unit tests
  - available typecheck/build
  - confirmation no production path can promote toy/Nat-only evidence
- [ ] Record findings here.

Checkpoint record:

- Commands:
- Findings:
- Fixes applied:
- Remaining risk:

### Task 4: FormalSpecLock and AssumptionLedger Schemas

- [ ] Implement or revise repository-native schemas/types for FormalSpecLock and AssumptionLedger.
- [ ] Include source, approval, notation, variable, conclusion, allowed dependency, and hash/provenance fields required by the GA design.
- [ ] Add unit tests for valid locks, missing locks, unsourced assumptions, and unapproved assumption transitions.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 5: StatementDiffGate and Statement Drift Red Team

- [ ] Implement exact-default statement boundary comparison.
- [ ] Reject hidden assumptions, weakened conclusions, changed binders, changed domains, notation-only disguise, and unauthorized theorem repair.
- [ ] Add negative tests and a red-team fixture suite for statement drift.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 6: Promotion Gate Integration for Spec Locks

- [ ] Wire FormalSpecLock, AssumptionLedger, and StatementDiffGate into claim/proof promotion paths.
- [ ] Ensure no proof search or promotion starts without an approved lock where required.
- [ ] Add tests proving unlocked candidates remain draft/candidate only.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

## Major Checkpoint B: After Tasks 4-6

- [ ] Run check-debug loop for lock/statement integrity:
  - focused schema/gate tests
  - typecheck/build
  - negative tests for hidden assumptions and weakening
  - API/status review for draft/candidate/proven separation
- [ ] Record findings here.

Checkpoint record:

- Commands:
- Findings:
- Fixes applied:
- Remaining risk:

### Task 7: External Wheel Registry Core

- [ ] Implement adapter registry interfaces for theorem search, literature retrieval, ingestion, computation, and proof search.
- [ ] Mark every adapter output as hint/evidence/refutation source, never proof authority.
- [ ] Add config sample and unit tests for adapter registration, capability metadata, provenance, and fail-closed unavailable adapters.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 8: Lean Search and Literature/Ingestion Adapters

- [ ] Add adapters or stubs with real interfaces for Loogle/LeanSearch/Moogle, arXiv/Semantic Scholar/OpenAlex/Crossref/Unpaywall/Jina/AnySearch, and PDF/TeX/Markdown ingestion.
- [ ] Include source/license/terms/provenance fields and prompt-injection isolation for retrieved content.
- [ ] Add tests using fixtures/mocks, not live network as the default test path.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 9: CAS/SMT/SAT Hint Adapters

- [ ] Add CAS/SMT/SAT adapter interfaces and fixtures for exact computation or refutation evidence.
- [ ] Enforce non-authority semantics and require Lean replay for theorem promotion.
- [ ] Add negative tests proving CAS/SMT/SAT success cannot mark a theorem proven.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

## Major Checkpoint C: After Tasks 7-9

- [ ] Run check-debug loop for external wheel registry:
  - adapter unit tests
  - prompt injection fixture tests
  - no-authority promotion tests
  - typecheck/build
  - config/docs consistency
- [ ] Record findings here.

Checkpoint record:

- Commands:
- Findings:
- Fixes applied:
- Remaining risk:

### Task 10: Agent Prompt Pack and A0-A8 Workflow Types

- [ ] Move or synchronize Coordinator plus A1-A8 prompts into repository-native prompt pack artifacts.
- [ ] Implement workflow types for AgentTask, AgentOutput, AgentCandidatePack, votes, hard vetoes, and terminal states.
- [ ] Add tests for prompt loading, role completeness, and forbidden self-certification language.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 11: Stage-Local V1-V8 Candidate Orchestration

- [ ] Replace synthetic fixed winners with real stage-local candidate task generation, review, voting, hard veto, and elimination semantics.
- [ ] Ensure candidate packs carry lock/provenance/replay references but cannot write trusted manifests.
- [ ] Add tests for eight variant creation, aggregator behavior, hard vetoes, and no synthetic promotion.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 12: MathProve-Native Stage Machine

- [ ] Implement S0-S10 stage machine inside CoMath native workflow.
- [ ] Include gates: formal spec/notation, blueprint/skeleton, line map, lemma sprint, refutation, integration/refactor, final replay, proof memory update.
- [ ] Add tests for stage ordering, fail-closed transitions, and terminal state vocabulary.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

## Major Checkpoint D: After Tasks 10-12

- [ ] Run check-debug loop for agent workflow:
  - workflow/prompt tests
  - terminal vocabulary tests
  - synthetic winner regression tests
  - typecheck/build
  - review against prompt document
- [ ] Record findings here.

Checkpoint record:

- Commands:
- Findings:
- Fixes applied:
- Remaining risk:

### Task 13: Lean Authority v3 Manifests and Trusted Runtime Boundary

- [ ] Implement LeanRunManifest, DependencyLock, FinalReplayManifest, append-only manifest behavior, and provenance audit events.
- [ ] Ensure agents cannot write trusted replay manifests or trusted pass logs.
- [ ] Add tests for manifest hashing, append-only behavior, provenance, and agent-written log rejection.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 14: Per-Candidate Replay and Final Hermetic Clean Replay

- [ ] Implement per-candidate Lean replay and final clean workspace replay semantics.
- [ ] Pin toolchain/dependency metadata and bind replay result to artifact hashes.
- [ ] Add tests for candidate replay pass/fail, clean replay blocker, and no promotion without final replay.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 15: DependencyClosureV2, LeanIntegrityScannerV2, AxiomProfileV2, No-Cheat Gate

- [ ] Implement dependency closure audit beyond file-exists checks.
- [ ] Implement Lean integrity scanner for forbidden constructs, imports, generated logs, and escape hatches.
- [ ] Implement axiom profile extraction/audit and No-Cheat Gate integration.
- [ ] Add negative and positive tests for each integrity component.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

## Major Checkpoint E: After Tasks 13-15

- [ ] Run check-debug loop for Lean Authority v3:
  - manifest/replay/integrity tests
  - clean replay where environment permits
  - no-cheat negative tests
  - dependency/axiom reports
  - typecheck/build
- [ ] Record findings here.

Checkpoint record:

- Commands:
- Findings:
- Fixes applied:
- Remaining risk:

### Task 16: Pi Goal-Mode Workspace Creation and Policy

- [ ] Implement Pi goal-mode command/policy for user research goal plus attachments/paper locations.
- [ ] Create workspace structure, intake artifacts, FormalSpecLock draft flow, and allowed terminal states.
- [ ] Add tests for workspace creation, attachment handling, policy defaults, and blocked/disambiguation states.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 17: Pi Goal-Mode End-to-End Research Loop

- [ ] Wire planning, retrieval, lemma decomposition, Lean skeleton generation, Lean replay, repair attempts, red-team review, and terminal reporting.
- [ ] Include a minimal runnable end-to-end proof research fixture.
- [ ] Add tests that demonstrate proof/counterexample/blocker terminal outcomes with evidence manifests.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 18: Evidence Pack and Open Reproducibility

- [ ] Implement GA evidence pack generation with FormalSpecLock, AssumptionLedger, dependency lock, toolchain hash, artifact hash, replay manifests, logs, and provenance audit.
- [ ] Add replay instructions and tests validating evidence pack completeness.
- [ ] Ensure third-party replay failure prevents `proven` status.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

## Major Checkpoint F: After Tasks 16-18

- [ ] Run check-debug loop for Pi goal-mode and evidence pack:
  - end-to-end tests
  - clean replay or replayable blocker path
  - artifact completeness audit
  - UI/CLI/Pi interaction review
  - typecheck/build
- [ ] Record findings here.

Checkpoint record:

- Commands:
- Findings:
- Fixes applied:
- Remaining risk:

### Task 19: Documentation, Threat Model, and Release Criteria

- [ ] Update README required wording, architecture docs, config samples, prompt documentation, threat model, GA acceptance criteria, and release notes.
- [ ] Ensure docs do not overclaim GA or proof authority beyond clean Lean replay.
- [ ] Add or update doc tests/lint checks where the repo supports them.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 20: GA Acceptance Test Matrix

- [ ] Add comprehensive GA acceptance tests:
  - trust-core negative tests
  - positive minimal proof workflow
  - adapter non-authority tests
  - prompt injection fixtures
  - no-cheat and statement drift tests
  - evidence pack replay tests
- [ ] Integrate into package scripts/CI without requiring live network by default.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

### Task 21: Final Global Review, Fixes, and Completion Gate

- [ ] Perform final broad review from product, code, security, data consistency, permissions, error handling, tests, build, docs, rollback, and open-source GA perspectives.
- [ ] Run the broadest feasible verification suite, including `corepack pnpm run ci`.
- [ ] Fix any known high-risk issues discovered.
- [ ] Mark the Codex goal complete only after no known GA-blocking risk remains.

Completion record:

- Work performed:
- Verification:
- Residual risk:
- Next task:

## Major Checkpoint G: Final Completion Review

- [ ] Confirm all tasks and checkpoints are complete.
- [ ] Confirm no promoted proof artifact lacks clean Lean replay and manifests.
- [ ] Confirm repository docs and code agree on proof authority.
- [ ] Confirm no known high-risk blocker remains.

Checkpoint record:

- Commands:
- Findings:
- Fixes applied:
- Remaining risk:
