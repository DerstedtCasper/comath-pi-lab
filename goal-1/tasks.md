# Goal 1 Tasks

Status legend: `[ ]` pending, `[~]` in progress, `[x]` complete.

Each task must be independently verified. After every third task, perform a large comprehensive check-debug loop and write the result in this file. Each completed task entry must record: work done, verification evidence, residual risk, next step, and commit id if a commit was created.

## Task 1: Rehydrate Goal Context And Audit Phase 58 Working Tree

- [x] Read the required files listed in `plan.md`.
- [x] Inspect current git status and Phase 58 diffs.
- [x] Determine whether Phase 58 implementation is coherent, complete, and safe enough to validate.
- [x] Run focused Phase 58 validation and any build needed for it.
- [x] Repair Phase 58 only if evidence shows a concrete defect.
- [x] Update `TODO.md` / `REVIEW.md` if Phase 58 evidence is stale or incomplete.
- [x] Commit the verified Phase 58 work if it is not already committed.

Completion record:

- Work done: Rehydrated the Goal 1 context and required project files, audited the existing Phase 58 working tree, preserved the pre-existing Phase 58 documentation/code/test changes, added a stricter `isMathProveFinalAuditPassed()` guard so a `status: passed` MathProve final-audit result with an empty `report` array cannot be counted as passed runner evidence, and added focused coverage for that empty-report boundary. Confirmed the Phase 58 runner remains fixed-argv, non-authoritative, host-path-scrubbed, and gate-failing for `formally_checked` without CoMath proof-kernel evidence.
- Verification evidence: `corepack pnpm --filter @comath/comathd build` exited 0; `node services/comathd/tests/unit/phase58-mathprove-final-audit-runner.test.mjs` exited 0; `corepack pnpm --filter @comath/comathd test` exited 0 after running the package build, phase smoke, Phase 1-58 unit/integration chain, and Phase 57 integration tail. `Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'` returned `False`; `Test-Path -LiteralPath 'D:\MATH _Studio\MathProve-Skill\scripts\final_audit.py.phase58-test-backup'` returned `False`.
- Residual risk: Task 1 only proves the Phase 58 working-tree slice and comathd package regression chain. It does not yet prove full product completion, Pi product-surface completeness, root build/typecheck/test, or requirement-by-requirement readiness; those remain assigned to later tasks.
- Next step: Task 2 must derive the product-scope requirement matrix and classify deferred items as bounded non-goals, product limitations, or missing functionality.
- Commit: recorded in git history for Task 1 completion.

## Task 2: Product-Scope Requirement Matrix

- [ ] Derive a concrete requirement matrix from the objective, `COMATH_PI_LAB_DEV_PLAN.md`, `CODEX_GOAL_RUNBOOK.md`, `AGENTS.md`, `TODO.md`, and `REVIEW.md`.
- [ ] Classify every deferred item as accepted non-goal, bounded product limitation, or missing required product functionality.
- [ ] Add/update an auditable product-readiness document under `docs/progress/` or `docs/architecture/`.
- [ ] Verify the matrix does not claim broad theorem proving, MathProve authority, production Pi/Codex hardening, or native Trivium default behavior beyond evidence.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 3: Comprehensive Check-Debug Loop 1

- [ ] Check requirement drift against the objective and Goal Mode rules.
- [ ] Run `corepack pnpm build`.
- [ ] Run `corepack pnpm typecheck`.
- [ ] Run package or root tests as feasible for the current state.
- [ ] Scan for forbidden direct `.comath/` writes/imports from Pi extension surfaces.
- [ ] Scan for gate weakening and direct `formally_checked` assignment bypasses.
- [ ] Record findings and repair any concrete high-risk defect discovered in this task.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 4: Pi Extension Product Surface Audit And Repair

- [ ] Audit `/cm:*` commands, tool descriptors, host confirmation, dashboard/read-model surfaces, agent controls, campaign controls, paper, snapshot, and replay tools.
- [ ] Verify Pi remains a thin client over `comathd` and does not directly mutate trusted state.
- [ ] Run Pi extension tests and focused e2e where relevant.
- [ ] Repair missing or inconsistent product surfaces required by documented Phase 0-58 scope.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 5: comathd Service And Gate Integrity Audit And Repair

- [ ] Audit API routes, claim registry, promotion gate, GraphPatch apply, path policy, writer locks, AgentRun scheduler, snapshot/replay, runner provenance, and status capabilities.
- [ ] Verify no gate can promote privileged claim states without required evidence.
- [ ] Verify service status capabilities match implemented tests and smoke requirements.
- [ ] Run focused comathd tests and repair defects found.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 6: Comprehensive Check-Debug Loop 2

- [ ] Re-run build/typecheck/test gates appropriate after Tasks 4-5.
- [ ] Check code, safety, data consistency, path policy, permissions, and documentation synchronization.
- [ ] Re-scan for host absolute paths in committed docs/reports where they should be scrubbed, while allowing normal local path references in repository docs.
- [ ] Repair any high-risk product defect discovered.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 7: MathProve, Lean, Proof-Kernel, And Runner Product Audit

- [ ] Audit MathProve bridge/final-audit runner boundaries against sibling `D:\MATH _Studio\MathProve-Skill`.
- [ ] Audit Lean proof-kernel vertical slices, statement binding, theorem templates, replay manifests, static audit, and refutation path.
- [ ] Audit compute runner exactness, sandbox/dependency/environment provenance, and non-authority semantics.
- [ ] Run focused tests for proof-kernel, Phase 57/58, and runner replay gates.
- [ ] Repair concrete defects only within bounded product scope.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 8: Memory, TriviumDB, Artifacts, Literature, Paper, Snapshot Product Audit

- [ ] Audit in-memory DB, optional Trivium adapter, StableIdMap, GraphPatch lifecycle, artifact import, audit logs, literature condition checks, working paper, and snapshot/replay.
- [ ] Validate optional Trivium behavior is fail-closed/fallback-safe and not an unverified default production dependency.
- [ ] Run focused tests for memory/artifact/paper/snapshot/evaluation surfaces.
- [ ] Repair concrete defects and sync docs.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 9: Comprehensive Check-Debug Loop 3

- [ ] Run root `corepack pnpm build`.
- [ ] Run root `corepack pnpm typecheck`.
- [ ] Run root `corepack pnpm test`.
- [ ] Check no repository-root `.comath/` runtime state remains.
- [ ] Check git status and diff for accidental large/generated/runtime artifacts.
- [ ] Repair all high-risk regressions found.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 10: Documentation, README, Acceptance Matrix, And Handoff Synchronization

- [ ] Ensure README presents a usable product entrypoint and bounded capabilities.
- [ ] Ensure `TODO.md`, `REVIEW.md`, `SECURITY_REVIEW.md`, `MATH_INTEGRITY_REVIEW.md`, acceptance matrix, risk register, and design handoff agree with current implementation.
- [ ] Make deferred items explicit without undermining the completed bounded product claim.
- [ ] Verify docs do not overclaim mathematical discovery, proof authority, production hardening, or broad theorem synthesis.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:

## Task 11: Final Product Completion Audit And Release Commit

- [ ] Derive explicit completion requirements from the user objective and all authoritative project files.
- [ ] For every requirement, attach direct evidence: file, test, command output, runtime behavior, or documented bounded non-goal.
- [ ] Run final full validation: `corepack pnpm build`, `corepack pnpm typecheck`, `corepack pnpm test`.
- [ ] Verify clean or intentional git status, no forbidden runtime artifacts, no secrets, no gate bypasses, no Pi direct trusted-state writes.
- [ ] Create a final commit if changes remain.
- [ ] Mark this goal complete only if evidence proves all requirements satisfied.

Completion record:

- Work done:
- Verification evidence:
- Residual risk:
- Next step:
- Commit:
