# Goal 3 Tasks

Status legend: `[ ]` pending, `[~]` in progress, `[x]` complete.

Rules:

- Execute only the first unfinished task in each continuation.
- At the start of every continuation, read `goal-3/input.md`, `goal-3/plan.md`, and this file in full.
- Each task must be independently verifiable.
- Every third task is a large comprehensive check-debug loop.
- Every completed task must fill its completion record: work done, verification evidence, residual risk, next step, and commit id if a commit was created.
- Do not modify code before the Goal 3 initialization files exist.
- Commit code changes after each completed task when tracked product files were changed and verification supports the change.

## Task 1: Rehydrate Goal 3 Context And Build Current-State GA Gap Matrix

- [x] Read all files listed in `plan.md` section 3.
- [x] Locate and verify the effective current worktree and branch state without changing global Git configuration.
- [x] Build a source-level gap matrix against M0-M8 from the 2026-05-29 design docs.
- [x] Explicitly classify existing Phase 18-80 vertical-slice evidence as reused, obsolete, insufficient, or contradictory with Goal 3.
- [x] Identify exact files/tests likely touched by Tasks 2-18.
- [x] Add/update a `docs/progress/goal-3-ga-gap-matrix.md` or equivalent current-state matrix.
- [x] Run a lightweight verification command or static scan proving the matrix references real files.

Completion record:

- Work done: confirmed the current goal anchor is `D:\MATH _Studio\comath-pi-lab\goal-3`, verified the branch/worktree state without changing global Git configuration, read the required v2 audit/design/agent documents, and validated the existing `docs/progress/goal-3-ga-gap-matrix.md` against real source/test files. The matrix classifies Phase 18-81 evidence and maps the next tasks to the right source surfaces.
- Verification evidence: `Get-ChildItem -LiteralPath 'D:\MATH _Studio\comath-pi-lab' -Directory -Filter 'goal-*'` showed only `goal-3` after cleanup; `rg -n "Goal 3 GA Gap Matrix|M0: Remove Internal Theorem Proving|Task 2|phase82" ...` matched the matrix and task file; `rg --files ... | rg '(theorem-family|campaign-tick|candidate-runner|goal4-p0-no-reinvent|goal-3-ga-gap-matrix|research-loop|phase82)'` returned the expected live source/test targets; `git -c safe.directory='D:/MATH _Studio/comath-pi-lab' status --short` showed the remaining goal-3 workspace files plus pre-existing goal-1 deletions.
- Residual risk: `goal-1` remains deleted in the working tree from earlier work and still appears in git status as tracked deletions; that is unrelated to Goal 3 Task 1 but may need separate repo cleanup if the user wants those staged/committed. `docs/progress/goal-3-ga-gap-matrix.md` remains untracked until the user chooses to commit it.
- Next step: Task 2 should remove the toy theorem recognizer and Nat-only production path under the correct Goal 3 workspace.
- Commit: not created

## Task 2: Remove Toy Theorem Recognizer And Nat-Only Production Path

- [x] Write failing tests proving production code cannot import or execute theorem-family smoke fixtures.
- [x] Move/rename any production theorem-family recognizer to test fixtures if it still exists.
- [x] Remove production Nat linear expression parser/synthesis and default theorem-family routing.
- [x] Add lint/runtime veto `business_layer_theorem_prover_forbidden`.
- [x] Keep Nat examples only as LeanRunner/final replay smoke tests.
- [x] Verify unknown goals do not become Nat proof obligations.

Completion record:

- Work done: removed the production theorem-family recognizer, synthetic candidate runner, theorem-specific/Nat-linear target generation, bounded proof-body synthesis, final replay promotion path, and hardcoded Nat refutation shortcut from `services/comathd/src`; moved the remaining Nat candidate demo into `services/comathd/tests/fixtures/proof-smoke/`; added `goal3-task2-no-toy-production-path.test.mjs`; updated status capabilities and older tests so Nat examples remain non-authoritative fixtures and production campaigns fail closed with `business_layer_theorem_prover_forbidden`.
- Verification evidence: `corepack pnpm --filter @comath/comathd build` passed; `node services/comathd/tests/unit/goal3-task2-no-toy-production-path.test.mjs` passed; `node services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs` passed; `node services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs` passed with no-reinvent blocker semantics; `node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs` passed; `node services/comathd/tests/unit/phase69-v3-terminal-vocabulary.test.mjs` passed; `node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs` passed; full `corepack pnpm --filter @comath/comathd test` passed. Static scan `rg -n "theorem-family|findTheoremFamily|runTheoremFamilyCandidates|runTrivialNatAddZeroCandidates|registeredNatLinear|controlled_nat_linear|parseNatLinear|normalizeNatLinear|bounded_theorem_specific|proof_kernel_theorem_template|theorem_specific_lean_target_package|default.*n : Nat|n : Nat|n \+ 1 = n|completeVerifiedCounterexample|isNatAddOneFalseObligation" services/comathd/src -g '!dist/**'` found only `services/comathd/src/release/v3-negative-ga-slices.ts`, which is negative test fixture material, not production campaign/proof support.
- Residual risk: Task 2 intentionally removes old positive proof/refutation shortcuts, so the current campaign path now blocks before real FormalSpecLock/LeanRunner v3 work is implemented in later tasks. Repository root still has untracked/dirty Goal 3 planning artifacts outside this product commit, and `production-formal-workbench` worktree still has the untracked Task 1 gap matrix.
- Next step: Task 3 comprehensive check-debug loop should re-run requirement drift checks, scan for any remaining toy/Nat/synthetic winner/direct promotion strings, and verify build/typecheck/test gates after this removal.
- Commit: bc2bb74

## Task 3: Comprehensive Check-Debug Loop 1

- [x] Check requirement drift against `input.md`, both GA docs, and Task 1 matrix.
- [x] Run focused tests from Task 2.
- [x] Run `corepack pnpm --filter @comath/comathd build`.
- [x] Run applicable typecheck/test gates.
- [x] Scan for `theorem-family`, Nat linear synthesis, synthetic V1 winner, default `n : Nat`, direct `formally_checked` bypass, agent-written proof evidence.
- [x] Repair any concrete high-risk defect found.
- [x] Record the check-debug result here.

Completion record:

- Work done: re-read the Goal 3 input/plan/tasks files, the v2 no-reinvent audit, the v2 open formal workbench design, the v2 agent prompt protocol, root AGENTS/README/TODO/REVIEW/runbook/module-boundary docs, and the Task 1 gap matrix. Compared the current post-Task-2 source state against M0 no-reinvent requirements and confirmed no implementation repair was required in this check-debug loop. The only source-side direct `applyGatePromotedClaim` outside the gate remains `release/v3-negative-ga-slices.ts`, where it deliberately creates an adversarial metadata-ready negative case that must still fail `promoteClaim`; it is not a normal promotion path.
- Verification evidence: `corepack pnpm --filter @comath/comathd build` exited 0; `node services/comathd/tests/unit/goal3-task2-no-toy-production-path.test.mjs` exited 0; `node services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs` exited 0; `node services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs` exited 0; `node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs` exited 0; `node services/comathd/tests/unit/phase69-v3-terminal-vocabulary.test.mjs` exited 0; `node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs` exited 0; `corepack pnpm --filter @comath/comathd typecheck` exited 0; full `corepack pnpm --filter @comath/comathd test` exited 0 through Phase 70. Static scans over `services/comathd/src` found no production theorem-family recognizer, Nat-linear synthesis/parser, theorem-specific target package, default `n : Nat`, synthetic V1 winner string, or agent-written pass-log proof path; remaining `candidate_kernel_checked` hits are schema/decision/failure-aggregation state handling, not a fixed V1 winner. `Test-Path -LiteralPath '.comath'` returned `False`, `git status --short --branch` was clean before this task-record edit, and `git diff --check` exited 0.
- Residual risk: Task 4 remains necessary before unknown or ambiguous user goals can enter a real FormalSpecLock/AssumptionLedger path; current unknown-goal behavior is intentionally fail-closed/no-reinvent rather than a complete GA formal-spec intake. Historical Nat/theorem-family assertions still exist in older tests and documentation as fixture/history material, and Task 19 must later clean public wording after the GA implementation catches up.
- Next step: Task 4 should implement first-class `FormalSpecLock`, `AssumptionLedger`, and the `needs_formal_spec_lock` unknown-goal path with no default assumption injection.
- Commit: 1ceef0d

## Task 4: FormalSpecLock, AssumptionLedger, And Unknown-Goal Fail-Closed Path

- [x] Add/update schemas for `FormalSpecLock` and `AssumptionLedger`.
- [x] Ensure every variable and assumption has source, approval state, and evidence anchor or fails closed.
- [x] Replace any `classifyLockedProblem`-style path with formalization/intake state that returns `needs_formal_spec_lock` for unknown/ambiguous goals.
- [x] Add tests for no default variable injection and no default assumption injection.
- [x] Add tests for unapproved assumptions blocking proof obligation creation.

Completion record:

- Work done: added first-class `formalSpecLockSchema`, `assumptionLedgerSchema`, JSON-schema registry entries, and exported types; added `createProofObligationFromFormalSpecLock()` with runtime schema parsing so raw unapproved assumptions cannot bypass TypeScript typing; changed campaign start so unknown/non-proof-form natural-language goals register the root claim as `needs_formal_spec_lock`, write a service-owned `formal_spec_lock_blocker.json`, create no proof obligation, and keep assumptions empty; removed the old default Nat notation sentence from the problem-lock notation artifact; updated no-reinvent/proof-memory tests to match the new fail-closed intake boundary without restoring Nat proof support.
- Verification evidence: TDD RED was observed before implementation: `node services/comathd/tests/unit/goal3-task4-formal-spec-lock.test.mjs` failed with `does not provide an export named 'assumptionLedgerSchema'`. After implementation, `corepack pnpm --filter @comath/comathd build` exited 0; `node services/comathd/tests/unit/goal3-task4-formal-spec-lock.test.mjs` exited 0; `node services/comathd/tests/unit/goal3-task2-no-toy-production-path.test.mjs` exited 0; `node services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs` exited 0; `node services/comathd/tests/unit/phase65-proof-memory-retrieval.test.mjs` exited 0; `node tests/unit/phase1-contracts.test.mjs` from `services/comathd` exited 0; `node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs` exited 0; `node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs` exited 0; `corepack pnpm --filter @comath/comathd typecheck` exited 0; full `corepack pnpm --filter @comath/comathd test` exited 0 through Phase 70. Static scans showed `needs_formal_spec_lock` only in the new schema/campaign/tests and `n : Nat` hits remain in historical/fixture/negative tests and release negative slices, not the Task 4 campaign intake path. `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- Residual risk: Task 4 intentionally does not implement full StatementDiffGate, user approval UI, persisted positive FormalSpecLock creation flow, or Lean-proved non-exact equivalence; proof-like goals still proceed into the existing fail-closed broad-planning path until later tasks replace that with the full formalization/intake pipeline. The heuristic for unknown intake is conservative and scoped to this task; Task 5 and Task 13 should replace it with the full native stage machine and statement gate.
- Next step: Task 5 should implement `StatementDiffGate` and Statement Drift Red Team, rejecting drift/hidden assumptions/weakening/wrong-domain cases and requiring Lean-proved equivalence for non-exact matches.
- Commit: 165ccf9

## Task 5: StatementDiffGate And Statement Drift Red Team

- [x] Implement or harden `StatementDiffGate` for exact theorem header/type hash matching by default.
- [x] Reject weakened, strengthened, different, ambiguous, wrong-domain, wrong-quantifier, or hidden-assumption candidate statements.
- [x] Require Lean-proved equivalence replay for any non-exact statement equivalence.
- [x] Add Statement Drift Red Team reports and hard veto integration.
- [x] Add negative tests for statement drift, hidden assumption, theorem weakening, quantifier mismatch, and wrong domain.

Completion record:

- Work done: added `StatementDiffGate` with exact theorem header/type/hash default matching, explicit hard vetoes for statement drift, weakening, strengthening, ambiguous equivalence, hidden assumptions, wrong domain, wrong quantifier, and non-exact equivalence without Lean replay evidence. Added a Statement Drift Red Team report helper that aggregates gate findings and unresolved counterexample hard vetoes. Hardened `decision-forest` so `statement_equivalence_claim: "equivalent"` is not proof-grade unless candidate evidence carries Lean equivalence replay material, and propagated hard vetoes into both the ensemble decision and gate decision. Added `goal3-task5-statement-diff-gate.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Verification evidence: TDD RED was observed before implementation: `node services/comathd/tests/unit/goal3-task5-statement-diff-gate.test.mjs` failed because `../../dist/index.js` did not export `createStatementDriftRedTeamReport`. After implementation, `corepack pnpm --filter @comath/comathd build` exited 0; `node services/comathd/tests/unit/goal3-task5-statement-diff-gate.test.mjs` exited 0; `node services/comathd/tests/unit/goal3-task4-formal-spec-lock.test.mjs` exited 0; `node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs` exited 0; `node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs` exited 0; `node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs` exited 0; `node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs` exited 0; `node services/comathd/tests/unit/phase79-lean-equivalence-search-plan.test.mjs` exited 0; `node services/comathd/tests/unit/phase80-bounded-equivalence-witness-materialization.test.mjs` exited 0; `node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs` exited 0; `node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs` exited 0; `node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs` exited 0; full `corepack pnpm --filter @comath/comathd test` exited 0; `corepack pnpm --filter @comath/comathd typecheck` exited 0; `git diff --check` exited 0 with Windows LF-to-CRLF warnings only; `Test-Path -LiteralPath ".comath"` returned `False`. Static scans found no `metadata registry` hits, found `logically_equivalent_with_registered_lemmas` only in the legacy statement-equivalence report module and its tests, and found the new hard-veto strings only in the new gate, decision integration, and Task 5 tests.
- Residual risk: Task 5 intentionally keeps older `checkStatementEquivalence()` alias/registered-witness reports compatible as non-final statement-binding metadata for Phase 56/78/80 tests; the new fail-closed rule is enforced at the StatementDiffGate and candidate arbitration boundary. Full Lean Authority v3 replay manifests, dependency closure v2, structured Lean audit, and final non-exact equivalence replay execution remain for later tasks.
- Next step: Task 6 should run the second comprehensive check-debug loop, re-scan metadata-only equivalence promotion paths, direct claim mutation, default assumptions, and schema round-trip behavior after Tasks 4-5.
- Commit: 2044571

## Task 6: Comprehensive Check-Debug Loop 2

- [x] Re-run build/typecheck/test gates appropriate after Tasks 4-5.
- [x] Re-scan for default assumptions, statement drift bypasses, metadata-only equivalence promotion, and direct claim status mutation.
- [x] Verify Task 4-5 schemas round-trip and fail closed.
- [x] Check documentation and prompts do not contradict statement-lock requirements.
- [x] Repair any high-risk regression found.

Completion record:

- Work done: re-read the Goal 3 input/plan/tasks files, the v2 no-reinvent audit, the v2 open formal workbench design, the v2 agent prompt protocol, root AGENTS/README/TODO/REVIEW/runbook/module-boundary docs, and the Goal 3 gap matrix. Re-ran the Task 4-5 gate matrix and classified static-scan hits for default assumptions, statement drift hard vetoes, metadata-only equivalence, direct promotion surfaces, and documentation/prompt wording. No high-risk regression requiring product-code repair was found in this check-debug loop.
- Verification evidence: `corepack pnpm --filter @comath/comathd build` exited 0; `node services/comathd/tests/unit/goal3-task4-formal-spec-lock.test.mjs` exited 0; `node services/comathd/tests/unit/goal3-task5-statement-diff-gate.test.mjs` exited 0; `node services/comathd/tests/unit/goal3-task2-no-toy-production-path.test.mjs` exited 0; `node services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs` exited 0; `node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs` exited 0; `node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs` exited 0; `node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs` exited 0; `node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs` exited 0; `node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs` exited 0; `node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs` exited 0; `node services/comathd/tests/unit/phase79-lean-equivalence-search-plan.test.mjs` exited 0; `node services/comathd/tests/unit/phase80-bounded-equivalence-witness-materialization.test.mjs` exited 0; `node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs` exited 0; `corepack pnpm --filter @comath/comathd typecheck` exited 0; full `corepack pnpm --filter @comath/comathd test` exited 0 through Phase 70. Static scans confirmed `needs_formal_spec_lock` is present in schemas/campaign fail-closed paths/tests; `n : Nat` hits remain in historical tests, fixture/smoke material, and `release/v3-negative-ga-slices.ts` adversarial negative cases rather than the Task 4 unknown-goal intake path; drift/hard-veto strings are implemented in `statement-diff-gate.ts` and `decision-forest.ts`; non-exact `equivalent` candidate arbitration requires Lean equivalence replay evidence; direct promotion surfaces remain `promoteClaim()` and `applyGatePromotedClaim()` gate/storage plumbing plus negative tests. Documentation/prompt scan found current-facing wording preserving proof-authority and statement-lock boundaries, with old Goal 2 readiness docs still explicitly scoped as vertical-slice evidence rather than Goal 3 GA completion. `Test-Path -LiteralPath '.comath'` returned `False`; `git diff --check` exited 0; pre-record `git status --short --branch` was clean on `main`.
- Residual risk: Task 6 was a verification loop only and intentionally did not implement LeanRunManifest v3, dependency closure v2, structured Lean audit, or final hermetic replay. Some historical Goal 2 documentation and tests still mention bounded Nat slices as vertical-slice evidence; this is not a Task 6 regression, but Task 19 must resync public release wording after the later GA implementation tasks replace the old slices.
- Next step: Task 7 should implement or harden service-owned LeanRunner execution and `LeanRunManifest v3`, including rejecting agent-written Lean logs and failing closed on unknown toolchain/version metadata.
- Commit: this Task 6 record commit

## Task 7: LeanRunner And LeanRunManifest v3 Service Ownership

- [ ] Implement or harden service-owned LeanRunner execution for check/build/audit/final replay.
- [ ] Record `LeanRunManifest v3` with command, cwd hash, input files, Lean/Lake/toolchain metadata, stdout/stderr paths and hashes, runner id, exit code, and proof_authority.
- [ ] Reject agent-written stdout/stderr or pass logs as evidence.
- [ ] Fail closed on unknown Lean version, missing Lake version, missing lean-toolchain, parse failures, and toolchain mismatch.
- [ ] Add tests for fake Lean stdout, agent-written pass log, unknown version, and path-bound output hashes.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 8: Lean Authority v3 Final Replay, Replay Registry, And Evidence Pack

- [ ] Implement append-only final replay registry.
- [ ] Ensure final replay uses a clean workspace and records clean workspace hash.
- [ ] Hash source files before and after replay.
- [ ] Run static/dependency/audit checks against the clean workspace, not the original root.
- [ ] Pin `lean-toolchain`, `lake-manifest.json`, mathlib/external package revisions, and dependency lock.
- [ ] Record network policy, sandbox policy, resource budget, binary hashes where available, and no symlink escape.
- [ ] Export third-party replay pack with README_REPLAY and expected hashes.
- [ ] Add tests for replay overwrite prevention, modified file after replay, unpinned dependency, network replay policy, and symlink escape.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 9: Comprehensive Check-Debug Loop 3

- [ ] Run root `corepack pnpm build`.
- [ ] Run root `corepack pnpm typecheck`.
- [ ] Run root `corepack pnpm test` or `corepack pnpm run ci` if appropriate.
- [ ] Verify no repository-root `.comath/` runtime state remains.
- [ ] Scan for fake replay artifacts, overwritten replay ids, host-path leaks in evidence packs, and untracked generated files.
- [ ] Repair any high-risk regression found.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 10: DependencyClosureV2, LeanIntegrityScannerV2, And AxiomProfileV2

- [ ] Implement or harden `DependencyClosureV2` with Lake package graph, mathlib/external revisions, licenses, import closure, allowed import prefixes, untracked imports, symlink escape, and build status.
- [ ] Implement or harden `LeanIntegrityScannerV2` beyond regex with comment/string handling, forbidden declaration kinds, local module shadowing, import pollution, namespace shadowing, target binding, and environment fingerprint.
- [ ] Implement or harden `AxiomProfileV2` bound to fully qualified theorem name, type hash, source hash, environment fingerprint, and LeanRunManifest id.
- [ ] Add tests for sorry/admit/axiom/constant/unsafe/opaque, target axiom in dependency, import shadowing, namespace shadowing, untracked import, raw stdout spoofing, and missing structured audit.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 11: External Wheel Registry And Adapter Contracts

- [ ] Add adapter registries for theorem search, retrieval, proof-search backends, computation, and external Lean repos.
- [ ] Ensure every adapter result has provider, query/ref hash, timestamp, capability metadata, terms/license notes where applicable, and `proof_authority: "none"`.
- [ ] Add health/capability discovery and credential/rate-limit handling.
- [ ] Add default local/stub adapters for Loogle, LeanSearch, Moogle, LeanExplore, arXiv, Semantic Scholar, OpenAlex, Crossref, Unpaywall, Jina, AnySearch, local PDF/TeX/Markdown, SymPy/Sage/Z3/cvc5 where feasible without requiring network for tests.
- [ ] Add tests showing external search/literature/CAS results cannot promote proof claims.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 12: Comprehensive Check-Debug Loop 4

- [ ] Re-run build/typecheck/test gates after Tasks 10-11.
- [ ] Scan adapter code for proof-authority escalation, secrets leakage, network-dependent tests, and license/terms omissions.
- [ ] Scan integrity/dependency/axiom gates for fail-open paths.
- [ ] Repair high-risk regressions found.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 13: MathProve-Native Stage Machine S0-S10

- [ ] Internalize MathProve workflow as native CoMath stages: input_intake, problem_lock, knowledge_pack, formal_spec_and_notation_gate, blueprint_and_skeleton_gate, line_map_gate, lemma_sprint, refutation_gate, integration_refactor_gate, final_lean_authority_replay, proof_memory_update.
- [ ] Ensure each stage has input/output schema, hard vetoes, blocker certificates, and resume state.
- [ ] Ensure MathProve-Skill or external MathProve runner output is evidence only and cannot promote claims.
- [ ] Add tests for stage transition legality, missing artifact blocker, resume state, and no MathProve proof authority.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 14: Real 1+8 Agent Workflow And Stage-Local Eight Variants

- [ ] Implement A0 Coordinator plus A1-A8 specialist prompt pack with global invariants.
- [ ] Enforce strict JSON schema, `proof_authority = none`, `may_mutate_trusted_state = false`, locked statement hash preservation, assumption/dependency/statement-change labeling.
- [ ] Implement real `AgentStageRunner` or equivalent task-card flow with workspace, logs, candidate packs, and backend adapters.
- [ ] Ensure stage-local V1-V8 variants are real independent candidates and no variant id can decide success.
- [ ] Implement aggregator precedence: hard veto > Lean evidence > statement/dependency integrity > score > vote.
- [ ] Add tests for synthetic V1 winner rejection, advisory-only votes, candidate hard veto, failure memory writeback, and strict JSON rejection.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 15: Comprehensive Check-Debug Loop 5

- [ ] Re-run build/typecheck/test gates after Tasks 13-14.
- [ ] Scan agent prompts and runtime for weakened invariants, trusted-state mutation, vote-as-proof, missing locked statement hash, and schema bypass.
- [ ] Run representative agent-stage tests with no external model dependency.
- [ ] Repair high-risk regressions found.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 16: Pi Goal-Mode End-To-End Workflow

- [ ] Implement `/cm:research --goal --paper --attach --workspace-ref --mode goal --strict --budget` parsing and service routing.
- [ ] Make default `/cm:research` mode `goal`; bounded tick is debug/CI only.
- [ ] Implement allowed terminal states: `formal_replay_passed`, `formal_counterexample_confirmed`, `needs_user_statement_disambiguation`, `blocked_with_replayable_certificate`, `budget_exhausted_with_resume_state`.
- [ ] Implement resume, cancel, export, blocker certificate, next actions, and dashboard fields required by the GA design.
- [ ] Ensure Pi remains thin client and cannot write trusted proof state.
- [ ] Add end-to-end smoke from natural goal to one terminal state, using deterministic local fixtures when Lean or network is unavailable.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 17: GA Acceptance Tests And Positive Proof Research Workflow

- [ ] Add trust-core negative tests for fake stdout, agent pass log, sorry/admit/axiom/unsafe/opaque, constant fake theorem, statement drift, hidden assumption, default assumption injection, unapproved import, toolchain mismatch, mathlib revision change, external repo unpinned, network replay, symlink escape, untracked import, modified file after replay, CAS-only proof, literature-only proof, vote-only proof, human-review-only proof.
- [ ] Add a positive end-to-end proof research workflow that does not rely on production theorem-family recognizers.
- [ ] Begin or implement the 100-task positive matrix across Nat/List, algebra, order, real analysis, topology, combinatorics, external Lean repo, paper-to-formal-spec, theorem-search-assisted, and tactic repair. If full 100-task scope is too large for this task, create the harness, representative seed set, and explicit blocker for remaining matrix.
- [ ] Ensure every promoted proof artifact binds FormalSpecLock, dependency lock, toolchain hash, artifact hash, and replay manifest.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 18: Comprehensive Check-Debug Loop 6

- [ ] Run root build/typecheck/test/ci gates appropriate after Tasks 16-17.
- [ ] Run GA negative test suite.
- [ ] Run positive proof workflow suite.
- [ ] Verify Pi dashboard/export evidence consistency.
- [ ] Verify no generated/runtime artifacts or host path leaks are committed.
- [ ] Repair high-risk regressions found.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 19: Documentation, Config Samples, Prompts, Threat Model, And Release Hardening

- [ ] Update README with required wording and forbidden-claim avoidance.
- [ ] Update architecture docs, module boundaries, GA release criteria, threat model, SECURITY, CONTRIBUTING, config samples, adapter examples, agent prompt docs, and example campaigns.
- [ ] Document no-reinvent doctrine as lint/test/runtime gates, not just philosophy.
- [ ] Document literature/RAG prompt injection, copyright/terms, citation anchors, and evidence-pack policy.
- [ ] Document external Lean repo supply-chain policy and trusted_replay_dependency state machine.
- [ ] Ensure all documentation matches actual implementation and tests.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 20: Final GA Review, Repair, And Completion

- [ ] Perform the largest final review from user experience, code, security, data consistency, permissions, error handling, tests, build, docs, replay reproducibility, rollback, and open-source release perspectives.
- [ ] Derive every completion requirement from `input.md`, both 2026-05-29 docs, agent prompt protocol, and current authoritative project docs.
- [ ] Attach evidence for every requirement: file references, tests, command output, runtime behavior, or explicit replayable blocker.
- [ ] Run final full validation: root build, typecheck, test, ci/release checks, GA negative tests, positive proof workflow, and evidence-pack replay where feasible.
- [ ] Verify no known high-risk issue remains.
- [ ] Mark any unavoidable external dependency blocker as replayable and non-promoted, not as GA success.
- [ ] Update this task record and mark the goal complete only if the implementation meets the completion gate in `plan.md`.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:
