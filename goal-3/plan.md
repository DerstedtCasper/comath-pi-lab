# Goal 3 Plan

## 1. Objective

Transform `comath-pi-lab` from the current alpha / production-core vertical-slice state into an open-source GA-grade automated formal mathematics research workbench, governed by the 2026-05-29 no-reinvent audit and open formal workbench design.

This goal supersedes earlier bounded-product completion framing. Previous phases and Goal 1/2 evidence are useful state evidence, not proof of GA completion. The new authority for this goal is:

1. `D:\MATH _Studio\comath-lab开发文档区\CoMath_No_Reinvent_GA_Audit_v2_2026-05-29.md`
2. `D:\MATH _Studio\comath-lab开发文档区\CoMath_Open_Formal_Workbench_GA_Design_v2_2026-05-29.md`
3. `D:\MATH _Studio\comath-lab开发文档区\COMATH_AGENT_TEAM_AND_PROMPTS_V2_20260526.md`
4. Current repository/worktree state.

The user mentioned non-v2 filenames, but the present files in the document directory are the v2 files above. Treat these v2 files as the concrete local source of truth unless a later task discovers newer matching files.

## 2. Current Evidence Snapshot

- Project root: `D:\MATH _Studio\comath-pi-lab`.
- Effective implementation worktree: `D:\MATH _Studio\comath-pi-lab\.worktrees\production-formal-workbench`.
- Goal workspace: `D:\MATH _Studio\comath-pi-lab\goal-3`.
- Existing project goal folders: `goal-1` and `goal-2`; `goal-2` appears empty from initialization-time listing.
- Prior memory says the production worktree contains Phase 18-80 vertical-slice evidence and is not globally GA-complete.
- Read-only explorer reported that package scripts include `build`, `typecheck`, `test`, `ci`, `release:check`, `release:package-artifacts`, and `external:check`.
- Read-only explorer reported current credible implementation exists mainly in `services/comathd` and `extensions/comath-pi`, with tests through proof-kernel, Pi runtime, release, and evaluation surfaces.
- Read-only explorer also reported current gaps: not external GA, Pi installed runtime evidence incomplete, MathProve workspace runner incomplete, Trivium native validation incomplete, non-Lean runner replay lacks OS/network sandbox/provenance breadth, DLP not full release grade, locking stress incomplete, and theorem generality still narrow.

## 3. Required Reading At Every Continuation

Before executing any task in this goal, read in full:

1. `goal-3/input.md`
2. `goal-3/plan.md`
3. `goal-3/tasks.md`
4. `D:\MATH _Studio\comath-lab开发文档区\CoMath_No_Reinvent_GA_Audit_v2_2026-05-29.md`
5. `D:\MATH _Studio\comath-lab开发文档区\CoMath_Open_Formal_Workbench_GA_Design_v2_2026-05-29.md`
6. `D:\MATH _Studio\comath-lab开发文档区\COMATH_AGENT_TEAM_AND_PROMPTS_V2_20260526.md`
7. `AGENTS.md`
8. `README.md`
9. `TODO.md`
10. `REVIEW.md`
11. `COMATH_PI_LAB_DEV_PLAN.md`
12. `CODEX_GOAL_RUNBOOK.md`
13. `docs/architecture/module-boundaries.md`, if present.

If context is compacted or a new continuation starts, repeat this reading before any code, config, or documentation edit.

## 4. Non-Negotiable Product Doctrine

CoMath is an open-source agentic formal mathematics research workbench built around Lean4/mathlib and maintained external tools. It is not a theorem prover, mathematical kernel, theorem library, general theorem search engine, general literature database, general CAS, or replacement for Lean/mathlib.

The only final mathematical proof authority is clean Lean4/mathlib kernel replay. LLM output, agent vote, human review, paper proof, theorem search result, CAS/SAT/SMT result, SymPy/Sage/MATLAB/Mathematica output, Jina/AnySearch extraction, and logic-toy output are never proof authority.

CoMath is responsible for:

- research workspace orchestration;
- agent scheduling;
- adapter-based literature/tool/theorem-search integration;
- formalization planning;
- evidence and provenance;
- Lean invocation authenticity;
- statement and assumption boundary preservation;
- dependency closure;
- no-cheat audit;
- final hermetic replay;
- third-party reproducible evidence packs.

## 5. Target Architecture

### Trusted Boundary

- `Pi Extension`: user commands, attachments, workspace refs, dashboard, progress display. No trusted proof state and no direct `.comath/` trusted mutation.
- `comathd`: the trusted mutation boundary. Owns workspace manager, campaign state machine, adapter registry, LeanRunner, evidence registry, agent orchestrator, promotion gate, final replay packager.
- `Agents`: untrusted specialists. They generate plans/candidates/reviews only. `proof_authority = none`, `may_mutate_trusted_state = false`.
- `External Tools`: Lean/mathlib, theorem search, proof search, retrieval, CAS/SAT/SMT, local ingestion. Outputs enter evidence store through adapters and are not proof authority.

### Required Native Gates

- `FormalSpecLock`: locks theorem header, variables, assumptions, conclusion, notation, allowed imports/dependencies, trust profile, and statement hash.
- `AssumptionLedger`: records every assumption source, approval state, and evidence anchor.
- `StatementDiffGate`: rejects drift, hidden assumptions, weakened conclusions, changed domain, changed quantifier, and unapproved statement repair. Default is exact header/type match; non-exact equivalence requires Lean-proved equivalence replay.
- `LeanRunner` and `LeanRunManifest v3`: service-owned execution only; stdout/stderr hashed and path-bound; agent-written logs rejected.
- `DependencyLock` / `DependencyClosureV2`: pins Lean/Lake/toolchain, mathlib/external repo revisions, licenses, manifest hashes, transitive imports, import prefixes, symlink policy, network policy.
- `LeanIntegrityScannerV2`: Lean-aware no-cheat scanning beyond regex, with target binding, import/namespace/shadowing checks, forbidden constructs, and structured audit linkage.
- `AxiomProfileV2`: target-bound axiom profile from controlled Lean commands or structured Lean audit, not raw stdout alone.
- `No-Cheat Gate`: fail closed on fake stdout, agent pass logs, sorry/admit/axiom/constant/unsafe/opaque, dependency pollution, untracked imports, network replay, CAS/literature/vote-only proof.
- `Statement Drift Red Team`: red-team reports for boundary weakening, hidden assumptions, wrong domain, quantifier mismatch, unresolved counterexample.

### Agent Architecture

Implement one coordinator plus eight specialists:

- A0 Coordinator / PI Agent
- A1 FormalSpec & Boundary Agent
- A2 Librarian / Retrieval Agent
- A3 Blueprint & Lemma DAG Agent
- A4 Proof Route Strategist
- A5 Lean Tactic Sprinter
- A6 Computation & Counterexample Agent
- A7 Integrator & Refactor Agent
- A8 Integrity Red-Team Auditor

Each nontrivial stage may run eight stage-local variants:

- V1 Direct Formalist
- V2 Library/Premise Hunter
- V3 Lemma Decomposer
- V4 Tactic Sprinter
- V5 Computational Verifier
- V6 Boundary Refuter
- V7 Statement-Equivalence Auditor
- V8 Dialectical Stress / Revision Agent

Voting is advisory only. Selection precedence is:

```text
hard soundness veto
  > Lean kernel evidence
  > statement/assumption/dependency integrity
  > evidence score
  > reviewer vote
```

## 6. Implementation Strategy

This is a long-running GA refactor. Work must be serial by task in Goal Mode. Use subagents for read-only audit or disjoint work only when they do not break the "one task per continuation" rule. Every task must have tests. Documentation-only tasks are allowed only when the task is explicitly documentation synchronization or threat model work; core GA functionality must be backed by code and tests.

The task sequence is intentionally front-loaded with current-state audit and anti-overclaim removal because the current worktree may already contain slices through Phase 80. Do not assume a module is absent or complete from memory. Inspect before editing.

## 7. Verification Strategy

Use layered verification:

1. Static audit: search for theorem-family/Nat-linear production paths, default `n : Nat`, synthetic V1 winners, claim promotion bypasses, agent-written proof evidence, direct Pi `.comath/` mutation, shell execution, host-path leaks, secret leaks.
2. Contract tests: add failing tests before implementing each gate or adapter behavior when feasible.
3. Focused package gates: `corepack pnpm --filter @comath/comathd build/test`, `corepack pnpm --filter @comath/pi-extension build/test`.
4. Root gates: `corepack pnpm run ci` is the repo-level verification entrypoint remembered from prior work; use root `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test` when the specific task calls for them.
5. Lean checks: any promoted proof artifact must have service-owned LeanRunManifest and final clean replay. If Lean/toolchain is unavailable, record a replayable blocker; do not fake success.
6. Evidence packs: successful claims must export FormalSpecLock, AssumptionLedger, Lean sources, lakefile, lean-toolchain, lake-manifest, DependencyLock, LeanRunManifest[], StructuredLeanAudit, FinalReplayManifest, replay command, expected hashes, and README_REPLAY.md.
7. Comprehensive check-debug loop after every third task and final largest review at the end.

## 8. Rollback Strategy

- Do not use destructive git commands.
- Preserve user/agent changes not made in the current task.
- Keep changes small and task-scoped.
- If a task repair regresses behavior, revert only that task's own patch with a new intentional patch.
- If an external tool is unavailable, fail closed with a blocker certificate and deterministic tests around the fail-closed path.

## 9. Completion Gate

This goal can be marked complete only when all tasks in `tasks.md` are complete and the final review confirms:

- no production toy theorem recognizer or Nat-only synthesis path;
- no default assumption injection;
- FormalSpecLock, AssumptionLedger, StatementDiffGate, DependencyClosureV2, LeanIntegrityScannerV2, AxiomProfileV2, No-Cheat Gate, and Statement Drift Red Team are implemented and tested;
- real 1+8 agent workflow and stage-local variants are implemented without synthetic fixed winners;
- external wheel registry exists with adapter contracts and proof-authority-none semantics;
- Lean Authority v3 performs per-candidate replay and final hermetic replay with append-only manifests and dependency locks;
- Pi goal-mode reaches only allowed terminal states: terminal proof, counterexample, user-visible statement disambiguation/repair, replayable blocker, or resumable budget exhaustion;
- MathProve-Skill principles are native workflow, not external proof authority;
- README, architecture docs, config samples, prompts, GA acceptance tests, and threat model match the implementation;
- final root verification passes or a documented replayable blocker remains for unavoidable external dependencies without overclaiming GA.
