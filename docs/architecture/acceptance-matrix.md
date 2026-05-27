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
| 6 Pi extension | typecheck passes; commands/tools/resources are runtime-tested; mutating descriptors require confirmation and call `comathd`. |
| 7 Workstreams | workstream lifecycle tests pass; GraphPatch does not auto-apply. |
| 8 Subagents | agent prompts constrain write scope; safe parallelism docs exist. |
| 9 MathProve bridge | bridge mock returns structured fail-closed JSON and gate consumes vetoes. |
| 10 Compute | runner timeout/sandbox/replay tests pass. |
| 11 Literature | citation artifact and condition matching stub tests pass. |
| 12 Paper | paper check fails on overclaim and missing provenance. |
| 13 TriviumDB | capability probe, fallback/default-safe factory behavior, optional native snapshot/restore tests, and StableIdMap boundary tests pass without requiring native TriviumDB in default CI. |
| 14 Braid domain | ontology, prompts, sample project, and computation protocols exist. |
| 15 Dashboard | read-only text/TUI renderer tests pass; dashboard does not read/write `.comath/` directly or repair state. |
| 16 Snapshot/replay | service routes, export/verify/restore smoke tests, replay manifest verification, tamper checks, and secret scan gates pass. |
| 17 Evaluation/audits | security review, math integrity review, and evaluation suite exist. |
| 18 GA proof-kernel vertical slices | ResearchCampaign routes, proof-kernel replay manifest gate, 8-candidate artifacts, statement-drift/cheat rejection, exact refutation, snapshot restore/replay, and Pi campaign tool tests pass. |
| 19 GA ensemble recovery | `phase19-ga-ensemble-recovery.test.mjs` verifies seven failed candidates plus one Lean-valid candidate selects the Lean-valid candidate, preserves all failed routes, and writes the V8 dialectical stress artifact. |
| 20 GA campaign state machine | `phase20-ga-campaign-state-machine.test.mjs` verifies v3 canonical campaign states, terminal-state names, bounded ticks, proof completion, refutation completion, terminal invariants, and unsupported-goal blocking. |
| 21 Service read models | `phase21-read-model-routes.test.mjs` verifies service-owned claim/evidence/gate list routes, and `phase15-dashboard.test.mjs` verifies the Pi dashboard reads those routes without mutation or direct `.comath/` access. |
| 22 Pi research campaign loop | `phase22-research-loop.test.mjs` verifies quote-aware `/cm:research` input, scoped campaign-loop capability checks, bounded start/tick execution through `comathd`, and dashboard return without direct `.comath/` access. |

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
| Formal proof requires kernel evidence | Lean artifact/gate tests. |
| Float-only output cannot be symbolic proof | compute/gate tests. |
| Literature support requires exact artifact-grounded citation | literature/gate tests require quoted statements present in source artifacts. |
| Failed routes preserved | workstream/evidence tests. |
| Paper wording cannot overclaim | paper check tests require block-bound margin provenance and reject theorem-like unsupported syntax. |
| GA proof promotion is replay-bound | Phase 18 proof-kernel gate tests require passed final replay manifest for the same claim and reject fake metadata, statement drift, `sorry`, and `axiom`. |
| Candidate voting is not proof | Phase 19 ensemble recovery test selects the only Lean-valid candidate despite seven failures and preserves those failures as proof memory. |
| Campaign completion is state-machine gated | Phase 20 state-machine tests reject old public stage names, verify canonical terminal-state invariants, and block unsupported goals instead of allowing report-writing or hardcoded replay to complete a campaign. |
| Dashboard read models are not proof authority | Phase 21 read-model routes expose claim/evidence/gate state for inspection only; the dashboard remains read-only and cannot promote, repair, or mutate mathematical state. |
| Pi research loop is not proof authority | Phase 22 loop orchestration can start and tick campaigns, but proof authority remains in service-owned gates, artifacts, and final replay. |

## GA V3 Vertical-Slice Coverage

| Slice | Current Evidence | Status |
| --- | --- | --- |
| Trivial formal proof | `phase18-ga-campaign-vertical-slice.test.mjs` runs `Nat.add_zero` through campaign, 8 candidates, clean replay, and promotion. | Covered for the implemented elementary slice. |
| Statement drift and cheat rejection | `phase18-ga-proof-kernel-gates.test.mjs` rejects drift, fake metadata, `sorry`, and `axiom`. | Covered for current static checks. |
| Refutation path | `phase18-ga-refutation-path.test.mjs` records exact `n=0` counterexample for `n + 1 = n`. | Covered for the implemented Nat false theorem slice. |
| Snapshot restore plus proof replay | `phase18-ga-snapshot-replay.test.mjs` restores a snapshot and reruns campaign replay. | Covered for campaign proof replay. |
| Ensemble recovery | `phase19-ga-ensemble-recovery.test.mjs` covers the v3 16.4 benchmark and verifies the V8 `dialectical_stress.json` schema. | Covered for the implemented elementary slice. |
| Canonical campaign states | `phase20-ga-campaign-state-machine.test.mjs` rejects old public stage names and verifies `problem_locked`, `candidate_*`, `final_global_replay`, `completed_formal_proof`, and `completed_refutation` API states. | Covered for the implemented proof and refutation slices. |
| Dashboard service read model | `phase21-read-model-routes.test.mjs` and `phase15-dashboard.test.mjs` cover `claim/evidence/gate` list routes and read-only dashboard aggregation. | Covered for product inspection; not mathematical authority. |
| One-command Pi campaign loop | `phase22-research-loop.test.mjs` covers command parsing, scoped capability enforcement, bounded campaign ticks, and dashboard return. | Covered in a mock Pi thin-client harness; installed runtime registration remains deferred. |
| Global GA readiness | Current test evidence does not cover arbitrary theorem planning, real MathProve execution, production Pi runtime registration, native TriviumDB validation, or generic runner re-execution replay. | Not achieved; blocked by deferred generalization work. |
| General theorem synthesis | No broad proof planner or Lean project generator beyond the Phase 18 slices. | Deferred. |
| Production Pi runtime registration | Extension descriptors and tool mappings exist; installed runtime API registration is not validated. | Deferred. |
