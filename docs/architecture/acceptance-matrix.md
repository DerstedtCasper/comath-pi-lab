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
| 23 Proof-kernel theorem-family registry | `phase23-ga-theorem-family-generalization.test.mjs` and `phase23-ga-integrity-boundaries.test.mjs` verify registered `Nat.mul_zero` replay, family-specific candidate manifests, replay-manifest hash binding, unsupported-goal fail-closed behavior, and refutation replay immutability. |
| 24 Runner re-execution replay | `phase10-compute-runners.test.mjs` verifies canonical replay input capture, and `phase16-snapshot-replay.test.mjs` verifies strict `/replay/verify-manifest` re-executes `sympy-exact` and `counterexample-search`, skips placeholders explicitly, and fails closed on replay/report drift, static snapshot vetoes, script hash drift, input hash drift, oversized replay timeout, report-local stdio hash drift, and untrusted replay argv. |
| 25 Real MathProve external bridge | `phase25-real-mathprove-bridge.test.mjs` verifies controlled `MathProve-Skill` `verify_sympy.py` invocation, missing-runner fail-closed archival, statement-hash mismatch vetoes, runner metadata hashes, and no claim promotion from external MathProve output alone. |
| 26 Pi runtime registration | `phase26-pi-runtime-registration.test.mjs` verifies the Pi 0.75.5-compatible package manifest, CoMath `runtime_registration` contract, global `rpm=4` preservation, Pi host-side mutating-tool confirmation gates, manifest-driven dynamic import, fake Pi API registration, command dispatch, and no Pi proof authority. Installed Pi loader smoke verifies `dist/index.js` loads through `@earendil-works/pi-coding-agent@0.75.5`. |
| 27 AgentRun runtime boundary | `phase27-agent-run-runtime.test.mjs` verifies `ARUN-XXXX` persistence, queued/running/submitted lifecycle, workstream and `.tmp` write-scope confinement, report-heading validation, GraphPatch producer self-review rejection, independent review/apply, failed-run `FailureRoute` memory, and AgentRun audit events. |
| 28 AgentRun process scheduler | `phase28-agent-run-scheduler.test.mjs` verifies real allowlisted child-process launch, `shell:false` execution, absolute-realpath allowlist rejection, serial scheduling under `max_concurrent=1`, enqueue-time rpm rejection, minimal env inheritance with sensitive-env rejection, stdout/stderr logs under `.tmp/comath/<ARUN>/logs`, byte-capped output truncation, report persistence, invalid-report fail-closed handling, timeout failure, queued/running cancellation, process-tree termination attempts, non-authoritative scheduler envelopes, and scheduler audit events. |

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
| Theorem-family metadata cannot override locked statements | Phase 23 integrity tests block mismatched family/proposition/Lean-target obligations before candidate generation and bind final replay manifests to the claim statement hash. |
| Replay manifests cannot substitute for re-execution | Phase 24 strict replay reconstructs known runner commands from the service registry, uses stored canonical input, and rejects replay/report, script/input/argv/result, timeout, and report-local stdio drift instead of trusting manifest descriptors. |
| MathProve external runner output is not proof authority | Phase 25 external bridge tests allow `verify_sympy.py` to return `ok=true` as archived runner evidence while the promotion gate still rejects `formally_checked` without CoMath proof-kernel replay artifacts. |
| Pi runtime registration is not proof authority | Phase 26 registration exposes executable research/campaign tools through Pi but records `pi_session_is_math_authority=false`, keeps trusted state access `comathd_only`, and requires Pi host-side confirmation before mutating `comathd` calls. |
| AgentRun reports are not proof authority | Phase 27 AgentRun tests require reports to stay scoped artifacts, reject producer self-review of GraphPatch proposals, and preserve failed routes as memory without promoting claims. |
| AgentRun process completion is not proof authority | Phase 28 scheduler tests prove child processes can run and report through AgentRun while scheduler envelopes persist `proof_authority: none`, `supports_claim_status: none`, and `child_stdout_untrusted: true`; claim promotion remains gated by proof-kernel replay/evidence gates and independent GraphPatch review. |

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
| One-command Pi campaign loop | `phase22-research-loop.test.mjs` covers command parsing, scoped capability enforcement, bounded campaign ticks, and dashboard return. | Covered in a mock Pi thin-client harness; Phase 26 adds package/runtime registration and installed-loader smoke. |
| Registered theorem-family proof replay | `phase23-ga-theorem-family-generalization.test.mjs` runs `Nat.mul_zero` through the same campaign, 8-candidate, clean replay, promotion, and replay route path while preserving `Nat.add_zero` compatibility. | Covered for two elementary Nat theorem families. |
| Compute runner re-execution replay | `phase16-snapshot-replay.test.mjs` verifies strict replay route re-execution for the implemented Python compute runners and per-runner audit summaries. | Covered for service-owned deterministic runner replay; stronger OS/network sandbox and dependency lock replay remain deferred. |
| External MathProve evidence runner bridge | `phase25-real-mathprove-bridge.test.mjs` invokes `MathProve-Skill` `verify_sympy.py` through a fixed command shape and records hashes, stdout/stderr/result metadata, and fail-closed vetoes. | Covered as non-authoritative evidence runner only; broad MathProve proof search and final-audit semantics remain deferred. |
| Pi runtime registration | `phase26-pi-runtime-registration.test.mjs` plus installed Pi 0.75.5 loader smoke validate package manifest loading, default export registration, command/tool policy metadata, command dispatch, and Pi host-side mutation confirmation. | Covered for runtime registration contract and loader compatibility; full interactive Pi/comathd install-session e2e remains deferred. |
| AgentRun runtime boundary | `phase27-agent-run-runtime.test.mjs` covers persisted AgentRuns, scoped write confinement, report validation, producer/reviewer separation, and failure-route memory. | Covered for the auditable contract boundary. |
| AgentRun process scheduler | `phase28-agent-run-scheduler.test.mjs` covers service-side process launch, absolute allowlists, minimal env, scheduler concurrency/rpm, timeout/cancel handling, scoped capped logs, invalid-report fail-closed handling, report persistence, and non-authoritative envelopes. | Covered for allowlisted fixture commands; production Pi/Codex agent profiles, OS/network sandboxing, live log streaming APIs, and multi-process locks remain deferred. |
| Global GA readiness | Current test evidence does not cover arbitrary theorem planning, broad MathProve proof search/final-audit semantics, native TriviumDB validation, stronger OS/network replay sandboxing, full interactive Pi/comathd install-session e2e, production Pi/Codex child-agent profile integration, or broad theorem synthesis. | Not achieved; blocked by deferred generalization work. |
| General theorem synthesis | No broad proof planner or Lean project generator beyond the registered Phase 23 theorem families. | Deferred. |
