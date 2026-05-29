# Goal 5 Plan: CoMath Pi Lab GA Formal Workbench Refactor

## 0. Goal Mode State

- Goal directory: `D:\MATH _Studio\comath-pi-lab\goal-5`
- Project root: `D:\MATH _Studio\comath-pi-lab`
- External design/audit docs directory: `D:\MATH _Studio\comath-lab开发文档区`
- Client goal registration: active in Codex goal tool.
- First-turn rule: this turn initializes control files only; no code implementation before `input.md`, `plan.md`, and `tasks.md` exist.

## 1. Source Documents and Default Assumptions

The user named:

1. `CoMath_Pi_Lab_No_Reinvent_Audit_2026-05-29.md`
2. `CoMath_Open_Formal_Workbench_GA_Design_2026-05-29.md`

The files actually present in `D:\MATH _Studio\comath-lab开发文档区` are:

1. `CoMath_No_Reinvent_GA_Audit_v2_2026-05-29.md`
2. `CoMath_Open_Formal_Workbench_GA_Design_v2_2026-05-29.md`

Default assumption: the present v2 files are the intended source-of-truth documents. This assumption is not user-blocking and must be revalidated by reading both files at the start of every resumed session.

Additional discovered prompt pack:

- `D:\MATH _Studio\comath-lab开发文档区\COMATH_AGENT_TEAM_AND_PROMPTS_V2_20260526.md`

Default assumption: this prompt pack is the "同个目录下还有给agent编排好的提示词" material and must be folded into the native agent-prompt implementation rather than copied blindly.

Memory-derived continuity note: prior project memory says `comath-pi-lab` already contains substantial v3/Phase 18-68 evidence and should not be treated as an empty project. Current state must still be verified from the live repo before any claim.

## 2. Non-Negotiable Product Boundary

CoMath is an open-source agentic formal mathematics workbench over Lean4/mathlib and external maintained tools.

It must not:

- implement its own mathematical kernel;
- implement its own general theorem library;
- replace Lean/mathlib;
- promote agent vote, CAS, SMT/SAT, paper retrieval, or search output as proof authority;
- inject default variables or assumptions such as `n : Nat`;
- keep Nat-only or synthetic theorem paths in production trust flow;
- allow agent-written logs or manifests to become trusted replay evidence.

It must:

- schedule agents;
- maintain research workspaces;
- connect literature, search, CAS/SMT/SAT, and Lean through adapters;
- plan formalization tasks;
- preserve evidence chains;
- call Lean truthfully;
- lock statement boundaries;
- detect hidden assumptions and drift;
- run clean Lean replay as the only proof authority;
- expose reproducible evidence packs suitable for third-party audit.

## 3. Implementation Strategy

The refactor will proceed as a sequence of small independently verifiable tasks. Every resumed session must:

1. read `goal-5/input.md`, `goal-5/plan.md`, and `goal-5/tasks.md` fully;
2. list a small todo for that session;
3. execute only the first incomplete task from `tasks.md`;
4. verify with tests, typecheck, build, Lean replay, or focused inspection as appropriate;
5. update `tasks.md` with work done, verification evidence, residual risk, and next step;
6. commit code when code was changed;
7. stop after one task.

Every three implementation tasks require a large comprehensive check/debug cycle recorded in `tasks.md`.

## 4. Phasing

### Phase A: Live-State Audit and P0 Path Removal

Purpose: prevent further trusted-path drift by finding and removing production dependencies on toy/Nat-only/synthetic paths.

Expected work:

- inspect repo structure, package scripts, existing tests, current worktrees, and docs;
- identify current production trust path;
- locate `theorem-family`, `campaign-tick`, `candidate-runner`, Nat synthesis, synthetic winner, default assumptions, and similar mechanisms if present;
- write failing tests for "unknown goals must not receive `n : Nat`" and "Nat synthesis is not production support";
- remove or quarantine production paths while preserving explicit LeanRunner smoke tests.

Verification:

- focused unit/integration tests for no default assumption injection;
- typecheck;
- project CI entrypoint when feasible.

Rollback:

- changes are confined to source/tests/docs touched by the task; git diff and commit boundary provide rollback.

### Phase B: FormalSpecLock, AssumptionLedger, StatementDiffGate

Purpose: make statement and assumption boundaries explicit, immutable where required, and machine-checkable.

Expected work:

- add or harden schema and persistence for `FormalSpecLock`;
- add `AssumptionLedger` with source, approval, evidence anchors, and status;
- implement `StatementDiffGate` as fail-closed exact/default gate;
- block proof search or promotion without the lock and ledger.

Verification:

- negative tests for hidden assumptions, statement drift, metadata-only equivalence, and missing lock;
- positive tests for explicit approved lock flow.

### Phase C: External Wheel Registry

Purpose: make tool reuse first-class and prevent internal reinvention.

Expected work:

- implement adapter interfaces and registry for theorem search, retrieval/ingestion, proof-search backends, computation tools, and external Lean repos;
- stub network-dependent adapters behind deterministic test doubles where credentials/network are absent;
- record tool provenance, terms/license notes, prompt-injection scan status, input/output hashes, and authority class.

Verification:

- adapter contract tests;
- fail-closed tests for missing provenance or untrusted authority.

### Phase D: Lean Authority v3 and Integrity Gates

Purpose: make Lean/mathlib clean replay the only route to `proven` status.

Expected work:

- add `LeanRunManifest` and trusted runner provenance;
- reject agent-written logs;
- add per-candidate replay;
- add final hermetic clean replay;
- add pinned dependency and dependency lock;
- add append-only replay registry;
- add `DependencyClosureV2`, `LeanIntegrityScannerV2`, `AxiomProfileV2`, No-Cheat Gate, and Statement Drift Red Team;
- bind promoted proof artifacts to FormalSpecLock, dependency lock, toolchain hash, artifact hash, replay manifest, and provenance audit event.

Verification:

- negative tests for `sorry`, `admit`, forbidden axiom pollution, fake stdout, mutable manifests, missing dependency lock, and vote-only proof;
- positive clean replay smoke test with Lean/mathlib examples.

### Phase E: MathProve-Native Stage Machine and Real Agent Swarm

Purpose: internalize MathProve-Skill principles as CoMath-native workflow and replace synthetic candidate generation with real task/candidate/evidence records.

Expected work:

- implement native stages S0-S10 from the GA design;
- implement coordinator plus eight specialist agent prompt pack;
- support stage-local eight-variant candidate generation, review, voting, elimination, failure memory, and hard veto rules;
- ensure votes are advisory and cannot override Lean failure.

Verification:

- workflow tests over deterministic fake agents;
- schema/output contract tests for specialist agents;
- tests that hard veto beats votes.

### Phase F: Pi Goal-Mode End-to-End Research Workflow

Purpose: deliver a runnable user-facing proof research workflow.

Expected work:

- add/upgrade Pi command UX for research goal and attachments/paper paths;
- create workspace, ingest materials, retrieve knowledge, plan lemmas, generate Lean skeleton, run Lean, attempt repair, red-team, and terminate only at allowed terminal states;
- support terminal proof, counterexample, replayable blocker, user-visible theorem repair, budget exhaustion with resume state.

Verification:

- end-to-end acceptance test using a small Lean theorem;
- blocked workflow test with replayable certificate;
- CLI/Pi interaction transcript or test fixture.

### Phase G: GA Docs, Threat Model, Acceptance Tests, Release Hardening

Purpose: align code, docs, tests, prompts, and public claims.

Expected work:

- update README with required no-reinvent/Lean-authority wording;
- update architecture docs and config samples;
- add GA release criteria and threat model;
- update agent prompts;
- add acceptance tests and evidence-pack replay docs;
- run final comprehensive review and repair.

Verification:

- full CI/typecheck/build/test entrypoints;
- clean replay evidence;
- docs contain required wording and forbidden wording is absent;
- final threat-model checklist complete.

## 5. Risk Register

- Scope risk: this is a GA-level refactor and likely exceeds one turn. Mitigation: one verifiable task per turn, small commits, explicit task log.
- Existing-state risk: repo may already contain partially implemented v3 slices. Mitigation: live audit first; do not rewrite already sound code.
- Lean environment risk: local Lean or mathlib replay may be unavailable. Mitigation: fail closed; record replayable blocker and never mark proof as proven without clean replay.
- Network/API risk: external adapters may require credentials or connectivity. Mitigation: adapter interfaces plus deterministic test doubles; real connectors fail closed with provenance.
- Trust-boundary risk: agent outputs may mutate trusted state. Mitigation: trusted services own manifests/locks; agents only propose candidate packs.
- Documentation drift risk: docs may overclaim GA. Mitigation: release docs gated by tests and replay evidence.

## 6. Verification Policy

No task may be marked complete without evidence in `tasks.md`.

Acceptable evidence includes:

- exact command and result for unit tests/typecheck/build/CI;
- focused git diff review;
- Lean clean replay output and manifest hash;
- deterministic fixture output;
- static scans for forbidden paths or claims;
- documented blocker with replayable artifact and fail-closed status.

No "proven" status is valid unless tied to Lean clean replay plus the required manifest, lock, dependency, and provenance records.

## 7. Rollback Policy

- Keep changes scoped by task.
- Commit after each completed task when code changed.
- Do not delete production data, secrets, credentials, or user workspaces.
- Do not modify high-risk runtime or production configuration unless a task explicitly requires it and tests cover it.
- If a task breaks unrelated existing behavior, stop and record blocker rather than papering over it.

## 8. Session Start Checklist

At each new goal-mode continuation:

1. Read all three files:
   - `D:\MATH _Studio\comath-pi-lab\goal-5\input.md`
   - `D:\MATH _Studio\comath-pi-lab\goal-5\plan.md`
   - `D:\MATH _Studio\comath-pi-lab\goal-5\tasks.md`
2. Read the two source documents and prompt pack, at least their relevant sections for the current task.
3. Inspect current git status and package scripts.
4. Register/update a small todo list.
5. Execute only the first incomplete task.
