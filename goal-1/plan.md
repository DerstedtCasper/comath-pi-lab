# Goal 1 Plan

## 1. Objective

Continue the existing `comath-pi-lab` repository and turn it into a complete, verified product according to the active Goal Mode instructions. The result must not be treated as a rough framework. Existing work, git history, sibling projects (`MathProve-Skill`, `TriviumDB`, Pi assets), and current uncommitted changes are authoritative inputs that must be inspected before trust.

## 2. Current Evidence Snapshot

- Project root: `D:\MATH _Studio\comath-pi-lab`.
- Goal workspace: `goal-1/`.
- Current branch observed during initialization: `ga-v3-implementation-20260527`.
- No prior `goal-*` directory existed in this repository before `goal-1` was created.
- `AGENTS.md` currently states Phases 0-58 complete and defines the active frontier as the full GA implementation sequence.
- `TODO.md` currently marks Phases 0-58 complete and lists known deferred items that still block global GA breadth.
- `REVIEW.md` contains phase review evidence through Phase 58.
- Git working tree already had uncommitted changes before goal initialization, mostly Phase 58 code/docs/tests. These must be preserved and incorporated, not reverted.

## 3. Required Reading At Every Continuation

Before executing any task in this goal, read in full:

1. `goal-1/input.md`
2. `goal-1/plan.md`
3. `goal-1/tasks.md`
4. `AGENTS.md`
5. `COMATH_PI_LAB_DEV_PLAN.md`
6. `CODEX_GOAL_RUNBOOK.md`
7. `TODO.md`
8. `REVIEW.md`
9. `docs/architecture/module-boundaries.md`

If context is compacted or a new continuation starts, repeat this reading before any code or documentation edit.

## 4. Operating Model

- Only one task from `tasks.md` may be executed per continuation.
- Start each continuation by listing a small todo for that single task and registering it with the task-plan tool when available.
- Do not ask the user questions in goal mode. Make conservative assumptions and record them here or in `tasks.md`.
- Use subagent-style roles internally: Planner, Retriever, Builder, Verifier, Formalizer, Critic. Actual edits remain serialized unless disjoint ownership is clear.
- Respect `rpm=4` and do not edit the same public schema, route, gate, path policy, root package file, or trusted mutation contract concurrently.
- Preserve `.comath/` as runtime-only and uncommitted.
- Preserve existing uncommitted user/agent changes unless they directly conflict with the current task. If they matter, integrate them intentionally.
- Commit after a task if the task changed tracked product files and verification supports the change.

## 5. Product Definition For This Goal

This goal is not complete merely because Phase 58 documentation says complete. Completion requires current evidence that the repository is a coherent product:

- All declared Phase 0-58 deliverables are present or explicitly bounded as non-goals/deferred items.
- Root build, typecheck, and test gates pass from the current worktree.
- Phase 58 uncommitted changes are audited, validated, and committed or intentionally repaired first.
- Pi extension, comathd service, MathProve bridge, TriviumDB optional adapter, proof-kernel vertical slices, AgentRun surfaces, snapshot/replay, security gates, paper checks, and evaluation fixtures align with the documented product boundaries.
- Known deferred items are clearly distinguished from missing functionality. They must not contradict the user's requirement for a complete product inside the accepted bounded scope.
- Documentation, TODO, REVIEW, security review, math-integrity review, acceptance matrix, and handoff materials describe the actual current state, not stale historical claims.
- Final repository state has no unexpected runtime artifacts, secrets, host-path leaks in committed reports, direct `.comath/` writes from Pi, gate weakening, or claim promotion bypass.

## 6. Risks

- The repository contains many phases and a large test surface; a green narrow test is insufficient evidence for product completion.
- `TODO.md` has global deferred items. Some may be accepted non-goals; others may reveal missing product functionality under the user's stricter objective.
- The current Phase 58 work is uncommitted and must be treated as provisional until audited and verified.
- External dependencies (`MathProve-Skill`, `TriviumDB`, installed Pi/Codex tooling, Lean) may vary by machine. Fail closed and document capability limits instead of faking success.
- Running full validation may be slow, but it is required before final completion.

## 7. Verification Strategy

Use layered verification:

1. Static contract audit: search for direct gate bypasses, direct `.comath` Pi writes, broad shell execution, secret leaks, host-path leaks, missing status capabilities, and stale docs.
2. Focused tests: run the test for the task's touched surface before and after any repair.
3. Package gates: run `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd test`, and the Pi extension equivalents when relevant.
4. Root gates: run `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test` before final completion.
5. Runtime artifact check: verify no repository-root `.comath/` or other forbidden runtime state is left for commit.
6. Git audit: inspect `git status -sb`, `git diff --stat`, and relevant diffs before committing.

## 8. Rollback Strategy

- Prefer small, reviewed commits after each completed task.
- Do not use destructive git commands.
- If a repair introduces a regression, revert only the specific task's own edits with an intentional patch, preserving pre-existing changes.
- For dependency or runtime capability failures, record the blocker as fail-closed behavior and keep tests deterministic through existing fallback paths.

## 9. Completion Gate

The goal can be marked complete only after the final task performs a requirement-by-requirement completion audit against the objective, docs, TODO, REVIEW, tests, and current git state; all high-risk gaps are repaired or recorded as explicit bounded non-goals; and full validation evidence supports the claim.

