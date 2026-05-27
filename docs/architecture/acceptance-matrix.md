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
| 29 Agent profile service integration | `phase29-agent-profile-integration.test.mjs` verifies the nine GA agent profiles, `rpm<=4`, no proof authority, forbidden direct-promotion tools, service profile list/get routes, profile-backed AgentRun creation, launch-envelope preparation, secret-like env exclusion, unknown-profile rejection, and `agent_profile_service_api` status capability. |
| 30 Pi agent profile runtime UX | `phase30-agent-profile-tools.test.mjs` verifies executable Pi tools for profile list/get, profile-backed AgentRun creation, launch-envelope preparation, `/cm:agent` command dispatch, host confirmation for mutating profile tools, local required-argument validation, runtime registration inclusion, and no direct `.comath/` access from the extension. |
| 31 Lean trust profile hardening | `phase31-lean-trust-profile.test.mjs` verifies configurable axiom allowlists, constructive rejection of `Classical.choice`, required target-theorem axiom reports, and skeleton-only `sorry` allowlisting for static proof-integrity scans. |
| 32 Lean statement signature binding | `phase32-lean-statement-signature.test.mjs` verifies that statement equivalence accepts only a unique target theorem signature and fails closed on missing, ambiguous, substring-only, or mismatched theorem-type output. |
| 33 Proof obligation DAG planning | `phase33-proof-obligation-dag.test.mjs` verifies campaign-scoped `lemma_dag.json`, `line_map.json`, obligation YAML, `Skeleton.lean`, and skeleton report artifacts across all open obligations; validates duplicate-node, unknown-endpoint, unsupported-relation, and cycle rejection; records planning artifacts in campaign stage runs; and proves two campaigns do not overwrite one another's planning artifacts. |
| 34 Campaign-scoped ensemble artifacts | `phase34-campaign-ensemble-isolation.test.mjs` verifies two interleaved supported campaigns in one project root keep candidate workspaces, `candidates.json`, and `decision.json` under `.comath/campaign/<CAM>/ensembles/lemma_sprint/<PO>/`, and that campaign A never reads campaign B candidate runs after B advances. |
| 35 Claim-scoped final replay artifact paths | `phase35-final-replay-artifact-paths.test.mjs` verifies final replay stage-run artifact paths are generated from the active root claim id, including a second supported campaign whose claim is not `C-0001`. |
| 36 Runner replay sandbox and dependency provenance | `phase36-runner-replay-provenance.test.mjs` verifies sandbox-policy and dependency-lock material in compute runner reports and replay manifests, plus fail-closed vetoes when either provenance class is missing. |
| 37 Registered Lean statement alias equivalence | `phase37-lean-statement-alias-equivalence.test.mjs` verifies explicitly registered definitional aliases can accept a target theorem signature such as `Nat.add n 0 = n` for locked `n + 0 = n`, while missing, ambiguous, and non-registered mismatched target output still fails closed. |
| 38 Native TriviumDB target-platform evaluation | `phase38-trivium-native-evaluation.test.mjs` verifies fail-closed unavailable reports and the evaluation-report contract; `eval:trivium` validates real `triviumdb@0.7.1` capability, persistence reopen, search top-hit ratio, and upsert/context timing on the target platform. |

## Security Acceptance

| Invariant | Evidence |
| --- | --- |
| No outside-root writes | path-policy tests. |
| No unsafe shell by default | runner permission envelope and deny tests. |
| Secrets not imported or snapshotted | artifact import and snapshot export secret-scan tests. |
| Runtime state not committed | `.gitignore` and smoke test. |
| Native backends optional | TriviumDB probe/fallback tests. |
| Native TriviumDB evaluation is explicit | Phase 38 keeps `triviumdb` as a root optional dependency and requires explicit target-platform evaluation before native-backend claims. |

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
| Agent profiles are not proof authority | Phase 29 profile tests require every profile to carry `proof_authority=none`, `may_mutate_trusted_state=false`, scoped write templates, and forbidden direct-promotion tools before profile-backed runs or launch envelopes can be used. |
| Lean trust profiles are explicit gates | Phase 31 tests require target-bound `#print axioms` evidence and configurable allowed-axiom profiles; `Classical.choice` can be accepted for ordinary classical projects and rejected for constructive projects. |
| Skeleton placeholders cannot leak into final proof artifacts | Phase 31 static-audit tests allow `sorry` only in explicitly listed skeleton files and still fail final Lean files containing `sorry`. |
| Statement equivalence is target-bound | Phase 32 tests reject arbitrary stdout substrings and require a unique target-theorem signature before statement equivalence can pass. |
| Planning skeletons are not proof authority | Phase 33 writes campaign-scoped skeleton/DAG/line-map artifacts with named proof-obligation placeholders only; these artifacts remain planning evidence and cannot promote claims without the existing clean Lean replay and gate path. |
| Campaign ensemble state is campaign-scoped | Phase 34 prevents supported campaigns with reused `PO-0001`/`CAND-0001` local IDs from sharing candidate or arbitration artifacts; proof selection reads only the active campaign's ensemble state. |
| Final replay audit paths are claim-scoped | Phase 35 requires final replay stage-run artifact pointers to use the current claim id, avoiding misleading audit trails when multiple supported campaigns share one project root. |
| Registered statement aliases require witnesses | Phase 37 accepts non-identical Lean target signatures only through an explicit registered definitional-alias witness and keeps missing, ambiguous, or non-registered mismatches as hard vetoes. |
| Native memory backend evidence is non-promotional | Phase 38 target-platform evaluation can validate memory persistence/performance, but it does not promote mathematical claims or bypass `comathd` gates. |

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
| Agent profile service API | `phase29-agent-profile-integration.test.mjs` covers profile validation, service list/get routes, profile-bound AgentRun creation, launch-envelope preparation, audit events, unknown-profile rejection, and status capability reporting. | Covered for service-owned profile/run/launch contracts; live Pi/Codex adapter execution and richer profile UI remain deferred. |
| Pi agent profile UX | `phase30-agent-profile-tools.test.mjs` covers Pi runtime registration and command/tool dispatch for service-owned profile list/get, AgentRun creation, and launch-envelope preparation. | Covered in the fake Pi runtime harness; live Pi/Codex adapter execution and full install-session e2e remain deferred. |
| Lean trust profile hardening | `phase31-lean-trust-profile.test.mjs` covers project-level axiom allowlists and skeleton-aware static scanning. | Covered for configurable allowlists and target-bound axiom-report presence; richer theorem-signature extraction, Lean parser integration, and transitive dependency semantics remain deferred. |
| Lean statement signature binding | `phase32-lean-statement-signature.test.mjs` covers target signature extraction and fail-closed statement-equivalence vetoes for missing/ambiguous/mismatched output. | Covered for unique target-signature equality; definitional/logical equivalence and Lean parser integration remain deferred. |
| Proof obligation DAG planning | `phase33-proof-obligation-dag.test.mjs` covers native planning artifacts for lemma DAG, line map, obligation YAML, skeleton Lean placeholders, skeleton report, DAG validation, multi-obligation closure, and campaign-scoped artifact isolation. | Covered for the planning stage of registered theorem-family slices and open-obligation artifact closure; broad lemma decomposition, arbitrary theorem planning, and generic theorem synthesis remain deferred. |
| Campaign-scoped ensemble artifacts | `phase34-campaign-ensemble-isolation.test.mjs` covers interleaved supported campaigns and ensures candidate workspaces, candidate batch indexes, and arbitration decisions are scoped by campaign. | Covered for registered theorem-family proof campaigns; live external child-agent ensemble execution remains deferred. |
| Claim-scoped final replay artifact paths | `phase35-final-replay-artifact-paths.test.mjs` covers second-campaign final replay audit paths using the active root claim id. | Covered for registered theorem-family proof campaigns; richer release-bundle provenance remains deferred. |
| Runner replay sandbox/dependency provenance | `phase36-runner-replay-provenance.test.mjs` covers sandbox-policy and dependency-lock material in compute runner reports and replay manifests, plus fail-closed vetoes when either provenance class is missing. | Covered for provenance and integrity gates; OS-level isolation, enforced network denial, and cross-machine replay validation remain deferred. |
| Registered Lean statement alias equivalence | `phase37-lean-statement-alias-equivalence.test.mjs` covers explicit alias acceptance for Lean notation expansion and fail-closed behavior for missing, ambiguous, or unregistered mismatched target signatures. | Covered for registered definitional aliases only; Lean parser integration, proof-producing logical equivalence, and transitive semantic equivalence remain deferred. |
| Native TriviumDB target-platform evaluation | `phase38-trivium-native-evaluation.test.mjs`, `test:trivium` with `COMATH_ENABLE_TRIVIUM_TESTS=1`, and `eval:trivium` cover real `triviumdb@0.7.1` loading, adapter write/link/search paths, persistence reopen, target-platform performance metrics, and fail-closed unavailable reports. | Covered for this Windows x64 target and explicit optional backend evaluation; default backend remains memory and broader multi-platform benchmarking remains future work. |
| Global GA readiness | Current test evidence does not cover arbitrary theorem planning, broad MathProve proof search/final-audit semantics, OS-enforced network replay sandboxing, full interactive Pi/comathd install-session e2e, live Pi/Codex agent adapter execution, or broad theorem synthesis. | Not achieved; blocked by deferred generalization work. |
| General theorem synthesis | No broad proof planner or Lean project generator beyond the registered Phase 23 theorem families. | Deferred. |
