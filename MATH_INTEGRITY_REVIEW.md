# MATH INTEGRITY REVIEW

## Phase 0

No mathematical claim system has been implemented.

Non-degradable future requirements:

- reviewer approval is not proof;
- agent consensus is not proof;
- `formally_checked` requires kernel-checked proof;
- `symbolically_checked` cannot rely on float-only computation;
- `literature_supported` requires exact citation artifacts and condition matching;
- failed proof attempts and computations must be preserved.

## Phase 1

Contracts and schemas now encode the first non-degradable integrity guardrails.

Implemented hardening:

- `GraphPatch.updated_nodes` rejects direct mutation of `status`, `evidence_level`, `gate_result_id`, `formalization_status`, and `audit_state`.
- new `Claim` nodes inside GraphPatch payloads cannot preload privileged statuses such as `literature_supported`, `symbolically_checked`, `formally_checked`, or `human_accepted`.
- privileged claim statuses require a `gate_result_id`.
- `formally_checked` additionally requires `formalization_status=kernel_checked`, `dependency_closure_status=all_dependencies_present`, and `audit_state=audit_passed`.

Deferred but mandatory for Phase 4:

- implement typed `ClaimPromotionRequest` and `ClaimPromotionDecision`;
- make `runClaimPromotionGate` fail closed by default;
- make `applyClaimPromotionDecision` the only service-level status escalation path;
- require linked proof artifacts and dependency closure evidence before any `formally_checked` transition;
- preserve rejected gates and failed proof attempts as durable blockers.

Integrity warning for all future phases: MathProve is an evidence producer and gate runner, not an authority that may promote claims by consensus. `symbolically_checked` cannot come from float-only computation, and `literature_supported` cannot come from LLM memory or summaries.

## Phase 4

Implemented the service-level promotion boundary.

Current invariant:

`formally_checked` can only be produced by a `GateResult` returned from the promotion gate and applied through `applyClaimPromotionDecision`; create/update routes and direct registry calls reject privileged status escalation.

Implemented guardrails:

- claim registration defaults to `draft`, `evidence_level=0`, `formalization_status=none`, `dependency_closure_status=unchecked`, and `audit_state=not_audited`;
- direct create/update to privileged statuses is rejected;
- promotion requests persist `GateResult` records whether they pass or fail;
- missing evidence/artifacts cause fail-closed vetoes;
- `formally_checked` requires `kernel_checked`, complete dependency closure, audit pass, evidence IDs, and artifact IDs;
- failed promotions preserve the claim status and append audit events.

Remaining mathematical work:

- real Lean kernel proof artifact checks are deferred to MathProve/Lean bridge phases;
- dependency closure is currently metadata-gated, not graph-proved;
- literature and computation promotions still require real condition-matching and exact/symbolic runner evidence in later phases.

## Final Research Alpha Mathematical-Integrity Audit

### Inspected Surfaces

- Claim schema and GraphPatch protected fields: `services/comathd/src/types/schemas.ts`.
- Claim registry and promotion application: `services/comathd/src/claim/claim-store.ts`, `services/comathd/src/verification/gate.ts`.
- MathProve bridge mock, external MathProve evidence runner, and compute runners: `services/comathd/src/verification/`, `python/mathprove_bridge.py`, `python/exact_compute.py`, `python/counterexample_search.py`.
- Literature condition matching: `services/comathd/src/literature/`.
- Working paper checks: `services/comathd/src/artifacts/paper.ts`.
- Snapshot/replay stale-output checks: `services/comathd/src/artifacts/replay.ts`, `services/comathd/src/artifacts/snapshots.ts`.
- Braid statistics domain pack: `services/comathd/src/domain/braid-statistics/`, `python/braid/check_braid.py`.
- Phase 17 evaluation: `tests/evaluation/phase17-integrity-evaluation.test.mjs`.
- Phase 18 native proof-kernel slice: `services/comathd/src/proof-kernel/`, `services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs`, `services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs`, `services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs`, and `services/comathd/tests/integration/phase18-ga-snapshot-replay.test.mjs`.
- Phase 19 ensemble recovery and V8 stress coverage: `services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs`, `dialecticalStressSchema`, and the V8 `dialectical_stress.json` artifact writer.
- Phase 20 canonical ResearchCampaign state coverage: `services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs`, `campaignStageSchema`, `campaignTerminalStateSchema`, and bounded canonical campaign ticks.
- Phase 21 service read-model coverage: `services/comathd/tests/integration/phase21-read-model-routes.test.mjs` and `extensions/comath-pi/tests/phase15-dashboard.test.mjs`.
- Phase 22 Pi research-loop coverage: `extensions/comath-pi/tests/phase22-research-loop.test.mjs`.
- Phase 23 theorem-family registry and integrity-boundary coverage: `services/comathd/src/proof-kernel/lean/theorem-family.ts`, `services/comathd/tests/integration/phase23-ga-theorem-family-generalization.test.mjs`, and `services/comathd/tests/integration/phase23-ga-integrity-boundaries.test.mjs`.
- Phase 24 runner re-execution replay coverage: `services/comathd/src/artifacts/replay.ts`, `services/comathd/src/artifacts/snapshots.ts`, `services/comathd/tests/unit/phase10-compute-runners.test.mjs`, and `services/comathd/tests/unit/phase16-snapshot-replay.test.mjs`.
- Phase 25 external MathProve evidence-runner coverage: `services/comathd/src/verification/mathprove.ts` and `services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs`.

### Current Invariants

- Privileged claim statuses require a gate result; GraphPatch cannot set protected promotion fields.
- The promotion gate verifies requested evidence and artifacts actually exist, belong to the same project, bind to the same claim, and link to each other.
- `symbolically_checked` requires symbolic evidence, a successful bound runner output artifact with `ok=true`, `supports_status=symbolically_checked`, `exactness=exact_symbolic`, no runner vetoes, and trusted `runner.completed` / `runner.failed` audit provenance; numeric/search evidence, forged runner reports, and failed symbolic runs are rejected for symbolic promotion.
- `computationally_supported` requires computation or counterexample evidence, a successful bound computation runner output artifact, and trusted runner audit provenance; failed computation/counterexample runs remain evidence records but cannot promote claims.
- `literature_supported` requires literature evidence, exact literature artifacts, quoted statement grounding inside the source artifact, and a successful citation-condition match.
- `formally_checked` remains blocked unless Lean evidence, proof artifacts, kernel metadata, dependency closure, audit pass, and a passed proof-kernel final replay manifest for the same claim are present.
- Phase 33 proof-obligation DAG, line-map, obligation YAML, `Skeleton.lean`, and skeleton-report artifacts are planning evidence only. Named `sorry` placeholders for all open obligations in skeleton artifacts cannot promote claims and must be discharged by the existing final clean Lean replay and gate path.
- Phase 34 campaign-scoped ensemble artifacts prevent candidate or arbitration state from one supported campaign being selected or reported by another supported campaign that reuses local `PO-0001`/`CAND-0001` identifiers.
- Phase 35 final replay stage-run artifact paths are claim-scoped, so audit trails for later campaigns point to the active claim's Lean evidence rather than a hardcoded first-claim path.
- Phase 36 runner replay provenance binds sandbox policy and dependency-lock material into runner reports and replay manifests; missing provenance is a replay-integrity veto, not a warning.
- Phase 37 registered statement-alias equivalence accepts non-identical Lean target signatures only with an explicit definitional-alias witness; missing, ambiguous, or unregistered mismatches remain hard vetoes.
- Phase 38 native TriviumDB target-platform evaluation validates memory persistence/performance explicitly and records fail-closed native-unavailable reports; it is not mathematical evidence and cannot promote claims.
- Phase 39 project writer session locks are mutation-coordination metadata only. A held lock does not certify artifacts, evidence, proof replay, theorem equivalence, or claim-promotion eligibility.
- Phase 40 scheduler-held writer locks coordinate AgentRun process mutation only. A scheduler-owned lock, process exit code, or child report remains non-authoritative for mathematical truth and cannot promote claims.
- Phase 41 live adapter execution remains an AgentRun evidence-production surface only. Adapter output is untrusted child stdout wrapped with `proof_authority: none`; it cannot promote claims, apply GraphPatch directly, or replace proof-kernel replay.
- Phase 42 AgentRun observability remains inspection-only. Capped stdout/stderr reads and adapter health results carry `proof_authority: none`; they cannot promote claims, certify candidate correctness, apply GraphPatch, or replace Lean replay/static audit.
- Phase 43 packaged adapter launch remains runtime orchestration only. The service-owned `codex-cli` launcher emits an AgentRun report with `proof_authority: none`; package selection and successful execution cannot certify claims, select proof candidates as authoritative, apply GraphPatch, or replace Lean replay/static audit.
- Phase 44 external Codex-compatible CLI invocation remains runtime orchestration only. External stdout/stderr is wrapped as `external_output_untrusted: true` with `proof_authority: none`; it cannot certify claims, select proof candidates as authoritative, apply GraphPatch, replace Lean replay/static audit, or act as MathProve/final-audit authority.
- Phase 45 Pi/comathd install-session e2e remains orchestration evidence only. The live HTTP session proves package/service wiring and host confirmation, not mathematical truth; campaign state changes still require the normal proof-kernel, evidence, and gate semantics.
- Phase 46 cursor-based AgentRun log streams remain inspection-only. Incremental stdout/stderr chunks and completion cursors carry `proof_authority: none`; they cannot certify candidate correctness, promote claims, apply GraphPatch, or replace Lean replay/static audit.
- Phase 47 SSE-style AgentRun log subscription snapshots remain inspection-only. Event-stream frames carry untrusted stdout/stderr chunks and `proof_authority: none`; they cannot certify candidate correctness, promote claims, apply GraphPatch, or replace Lean replay/static audit.
- Phase 48 AgentRun operator panels remain inspection-only. Run status, action availability, cursor chunks, and subscription metadata carry `proof_authority: none`; they cannot certify candidate correctness, promote claims, apply GraphPatch, cancel runs without a real scheduler registry, or replace Lean replay/static audit.
- Phase 49 AgentRun operator cancellation remains runtime control only. A cancellation decision and resulting `cancelled` AgentRun state carry `proof_authority: none`; stopping a process cannot certify candidate correctness, promote claims, apply GraphPatch, or replace Lean replay/static audit.
- Phase 50 bounded multi-event AgentRun log sessions remain inspection-only. Multi-frame SSE payloads carry untrusted stdout/stderr chunks and `proof_authority: none`; they cannot certify candidate correctness, promote claims, apply GraphPatch, or replace Lean replay/static audit.
- Successful gate-mediated promotions raise evidence level conservatively: literature/computation to at least 2, symbolic/Lean skeleton to at least 3, formal to 5.
- Paper export is blocked when paper checks detect theorem-like overclaiming, manually written theorem syntax without claim metadata, hidden blockers, stale statements, missing provenance, invalid margin notes, missing block-bound margin-note provenance, rendered block hash mismatch, or missing literature condition support.
- Snapshot/replay detects stale runner output by recomputing canonical runner `result_sha256`, checks replay `runs_sha256`, and vetoes runner report host-path leaks; stale, tampered, or unreplayable computation cannot silently support a privileged state.
- Strict replay now re-executes replayable `sympy-exact` and `counterexample-search` reports from service-owned canonical input, reconstructs commands from the fixed runner registry, and rejects script/input/argv/result drift. This is integrity evidence only; it does not add proof authority beyond the existing promotion gates.
- External MathProve output is archived as runner evidence and gate input only. A Phase 25 external `ok=true` result from `verify_sympy.py` still returns `gate_result=failed` and cannot promote `formally_checked` without CoMath proof-kernel replay evidence.

### Evaluation Coverage

`tests/evaluation/phase17-integrity-evaluation.test.mjs` covers:

- fake evidence ID rejection;
- missing artifact ID rejection;
- numeric/search evidence rejected as symbolic evidence;
- float-contaminated exact computation rejection;
- failed symbolic runner output rejection for `symbolically_checked`;
- failed computation/counterexample runner output rejection for `computationally_supported`;
- forged runner report rejection when trusted runner audit provenance is missing;
- formal promotion attempt blocked without Lean evidence;
- ungrounded citation quote rejection when the quoted statement is not present in the source artifact;
- paper export blocked on theorem-like overclaim, manually written theorem syntax, missing formal proof disclosure, missing/mismatched block-bound margin provenance, and rendered block hash tamper;
- placeholder runner replay integrity with explicit unreplayable status;
- stale runner output, replay `runs_sha256` tamper, and runner host-path leak detected in snapshot verification;
- dashboard read-only boundary;
- in-memory retrieval fixture top-hit and context-pack behavior.

Phase 18 adds coverage for:

- a native proof-kernel ResearchCampaign that promotes the locked `Nat.add_zero` claim only after final clean Lean replay;
- rejection of fake formal metadata when no proof-kernel replay manifest exists;
- static cheat rejection for `sorry` and `axiom`;
- statement-drift rejection before candidate score ranking;
- preservation of 8 candidate manifests and candidate audit artifacts;
- exact counterexample refutation of `n + 1 = n` at `n=0`;
- snapshot restore followed by fresh campaign proof replay.

Phase 19 adds coverage for:

- the v3 16.4 ensemble recovery benchmark in the implemented elementary slice: seven failed candidates plus one Lean-valid candidate selects the Lean-valid candidate;
- preservation of all seven failed routes in proof memory;
- a typed V8 dialectical stress artifact with `P`, `not_P`, `Q`, `not_Q`, `R`, `U`, `proof_authority: none`, and explicit downstream check authorities;
- a regression boundary that V8 remains objection/repair generation, not proof evidence.

Phase 20 adds coverage for:

- the v3 public `ResearchCampaign` state set and allowed terminal states from the goal instruction;
- rejection of old public stage names such as `problem_lock`, `lemma_sprint`, `final_global_lean_replay`, and `terminal`;
- separation between public campaign states and internal proof-kernel artifact stages;
- bounded ticks through context, planning, candidate generation, verification, arbitration, integration, adversarial review, final audit, final replay, and canonical proof/refutation completion states.

Phase 21 adds coverage for:

- service-owned read-only claim, evidence, and gate-result list routes;
- dashboard aggregation over `/claim/list`, `/evidence/list`, and `/gate/list` without dashboard mutation or direct `.comath/` access;
- gate vetoes appearing as dashboard blockers for inspection only;
- rejection of hidden paper-derived fallback rows in the claim/evidence board once service read models exist.

Phase 22 adds coverage for:

- Pi-side research loop command parsing and scoped campaign-loop capability checks;
- bounded campaign start/tick execution through `comathd` routes only;
- return of service-backed dashboard state after loop execution;
- no Pi-side claim promotion, GraphPatch apply, artifact write, or proof replay authority.

Phase 23 adds coverage for:

- a registered `Nat.mul_zero` proof campaign that locks `n * 0 = 0`, generates family-specific candidates, runs clean Lean replay, promotes only through the ordinary gate, and supports replay;
- final replay manifests carrying theorem family, canonical proposition, primary dependency, normalized statement, and locked statement hash;
- promotion gate rejection unless the proof-kernel replay manifest hash matches the claim statement hash;
- fail-closed behavior when theorem-family metadata does not match the locked proposition, Lean target, or locked natural-language statement;
- unsupported goals blocking before theorem-family candidates are fabricated;
- proof replay requests for completed refutations returning read-only blockers without mutating the `completed_refutation` terminal state.

Phase 24 adds coverage for:

- compute runner reports preserving canonical replay input JSON and matching input hashes;
- strict replay route re-executing the implemented Python compute runners instead of trusting replay manifest descriptors;
- placeholder runners remaining explicitly skipped rather than silently treated as replayable;
- fail-closed detection for replay/report drift, static snapshot vetoes before Python execution, script hash drift, canonical input hash drift, oversized replay timeout, report-local stdio hash drift, untrusted replay argv, and result-hash mismatch paths.

Phase 25 adds coverage for:

- controlled invocation of the external `MathProve-Skill` `verify_sympy.py` runner from a CoMath-owned workspace;
- fail-closed archival when the external runner is unavailable;
- statement-hash mismatch detection before invoking external MathProve;
- stdout/stderr/result/replay-input hashes and fixed argv template metadata for external runner reports;
- promotion-gate rejection of `formally_checked` even when the external runner returns `ok=true`.

Phase 33 adds coverage for:

- campaign-scoped native planning artifacts under `.comath/campaign/<CAM>/proof/`;
- proof-obligation DAG duplicate-node, unknown-endpoint, unsupported-relation, and cycle rejection before artifact write;
- line-map and obligation YAML binding across the current open-obligation closure;
- `Skeleton.lean` `sorry` placeholders tagged with all open proof-obligation IDs;
- planning stage-run artifact provenance and two-campaign no-overwrite behavior.

Phase 34 adds coverage for:

- campaign-scoped candidate workspaces under `.comath/campaign/<CAM>/ensembles/lemma_sprint/<PO>/`;
- campaign-scoped `candidates.json` and `decision.json` reads/writes;
- interleaved supported-campaign isolation for `Nat.add_zero` and `Nat.mul_zero` in one project root;
- rejection of legacy global ensemble batch writes for new proof-kernel campaign execution.

Phase 35 adds coverage for:

- final replay stage-run artifact paths generated from the active claim id;
- a second supported theorem-family campaign whose claim is not `C-0001`;
- final replay path records aligned with the actual `FinalLeanReplay.claim_id`.

Phase 36 adds coverage for:

- compute runner report metadata carrying sandbox-policy and dependency-lock provenance;
- replay manifests preserving the same provenance for each replayable run;
- fail-closed replay-integrity vetoes for missing sandbox policy or dependency lock material.

Phase 37 adds coverage for:

- registered definitional alias acceptance for Lean notation expansion from `n + 0 = n` to `Nat.add n 0 = n`;
- persisted equivalence witnesses for accepted aliases;
- fail-closed rejection for missing target output, ambiguous target output, and non-registered mismatched theorem signatures.

Phase 38 adds coverage for:

- fail-closed native-unavailable TriviumDB evaluation reports;
- real `triviumdb@0.7.1` target-platform loading on Windows x64;
- adapter write/link/search/context behavior while preserving stable business IDs;
- native persistence reopen and restore/update behavior;
- target workload metrics for upsert latency, search timing, context timing, and search top-hit ratio.

Phase 39 adds coverage for:

- project writer session lock acquisition and active-lock rejection;
- token-gated release and stale-lock takeover with previous-session provenance;
- malformed lock fail-closed behavior that preserves the unreadable lock file instead of overwriting it;
- an explicit boundary that writer locks coordinate mutations but are not proof, evidence, or promotion authority.

Phase 40 adds coverage for:

- service-side AgentRun scheduler rejection when another active project writer session exists;
- no child-process/log side effects and queued-run preservation on blocked scheduler launch;
- scheduler-owned writer-lock acquire/release around a successful child-process run;
- audit visibility for blocked, acquired, and released writer-lock events without adding proof authority.

Phase 41 adds coverage for:

- profile-bound AgentRun creation followed by real allowlisted adapter process execution;
- service route execution through `/agent/run/profile/execute`;
- Pi `comath.agent.executeProfile` and `/cm:agent execute` host-confirmed execution paths;
- preservation of `proof_authority: none`, untrusted child stdout wrapping, writer-lock use, and scoped run logs/reports.

### Residual Risks

- Real Lean kernel checking is implemented for the registered `Nat.add_zero` and `Nat.mul_zero` vertical slices and their clean replay gate. Phase 33 adds native planning artifacts for those slices, but general lemma decomposition, theorem synthesis, richer line-map provenance, and broader domain automation remain unimplemented.
- Statement equivalence now supports exact target-signature equality and explicit registered aliases only. Lean parser integration, proof-producing definitional/logical equivalence, transitive semantic equivalence, and broader mathematical-domain trust profiles remain unimplemented.
- MathProve now has both the Phase 9 fail-closed mock and the Phase 25 external `verify_sympy.py` evidence-runner bridge. Neither path should be interpreted as broad MathProve proof search, final-audit proof authority, or direct claim-status authority.
- Citation condition matching is conservative string/condition matching, not semantic theorem equivalence.
- Snapshot replay now reruns the Phase 18 campaign Lean proof replay after restore, Phase 24 reruns the implemented deterministic Python compute runners, and Phase 36 records runner sandbox/dependency provenance. OS-level sandbox enforcement, cross-machine replay, and broader runner families remain unimplemented.
- Braid domain scripts provide exact/combinatorial evidence and risk flags; they do not prove physical interpretations or category-level equivalences.
- Phase 21 read models improve inspection fidelity but are not mathematical authorities; claim promotion remains gated by evidence, artifacts, and proof-kernel replay where applicable.
- Phase 22 improves Pi-side orchestration, Phase 26 validates Pi 0.75.5-compatible runtime registration, Phase 27 adds an AgentRun report/failure-memory boundary, and Phase 28 adds allowlisted process scheduling. None of these surfaces are proof authority, AgentRun reports cannot self-review their own GraphPatch proposals, child-process completion cannot promote claims, and production Pi/Codex agent profile integration plus full interactive Pi/comathd install-session e2e remain unimplemented.
- Phase 38 validates native memory persistence and performance only for the current target platform; it does not make native memory content proof authority or enable default native backend selection without explicit configuration.
- Phase 40 reduces writer-race risk in the service-side AgentRun scheduler path, but mathematical consistency still depends on ordinary evidence, replay, and promotion gates; OS-level sandboxing and external-process enforcement remain deferred.
- Phase 41 makes agent execution product-real for an allowlisted adapter slice, but broad autonomous mathematical discovery remains blocked by proof planning, proof replay, MathProve semantics, and independent review gates.
- Phase 42 makes runtime inspection product-real for capped logs and bounded adapter health probes, but these artifacts remain non-evidential for formal proof authority.
- Phase 43 makes packaged adapter selection product-real for a service-owned Codex launcher, but the launcher remains non-evidential for formal proof authority.
- Phase 44 makes service-configured external Codex-compatible CLI invocation product-real for draft AgentRun material, but it remains non-evidential for formal proof authority and is not validation against a production Codex API backend.
- Phase 45 makes local Pi/comathd install-session wiring product-real for an automated HTTP session, Phase 48 makes a read-only AgentRun operator panel product-real for status/action inspection, Phase 49 makes same-process live cancellation product-real, and Phase 50 makes bounded multi-event log-session readback product-real, but real Pi operator UX, indefinite operator sessions, cross-process cancellation/recovery, and service lifecycle management remain outside mathematical authority.

Phase 42 mathematical-integrity validation:

- `node services/comathd/tests/unit/phase42-agent-run-observability.test.mjs`
- `node extensions/comath-pi/tests/phase42-agent-observability-tools.test.mjs`

Result: both exited 0; logs and health probes are exposed through service/Pi surfaces while preserving `proof_authority: none` and host-confirmed mutation for health execution.

Phase 43 mathematical-integrity validation:

- `node services/comathd/tests/unit/phase43-agent-adapter-package.test.mjs`
- `node extensions/comath-pi/tests/phase43-agent-adapter-package-tools.test.mjs`

Result: both exited 0; packaged adapter launches preserve `proof_authority: none`, host-confirmed Pi mutation, and scheduler report boundaries.

Phase 44 mathematical-integrity validation:

- `node services/comathd/tests/unit/phase44-codex-cli-external-invocation.test.mjs`
- `node extensions/comath-pi/tests/phase44-agent-adapter-external-tools.test.mjs`

Result: both exited 0; external CLI output is wrapped as untrusted non-authoritative AgentRun report material, missing service configuration fails closed, and Pi backend selection does not expose proof authority or executable paths.

Phase 45 mathematical-integrity validation:

- `node tests/e2e/phase45-pi-comathd-install-session.test.mjs`

Result: exit 0; live Pi/comathd session wiring, host confirmation, campaign start/tick, and agent package inspection passed while keeping Pi/session output non-authoritative for proof status.

Phase 47 mathematical-integrity validation:

- `node services/comathd/tests/unit/phase47-agent-log-subscription.test.mjs`
- `node extensions/comath-pi/tests/phase47-agent-log-subscription-tools.test.mjs`

Result: both exited 0; SSE-compatible log snapshots and Pi subscription tools preserve `proof_authority: none` and remain observability-only surfaces.

Phase 48 mathematical-integrity validation:

- `node services/comathd/tests/unit/phase48-agent-operator-panel.test.mjs`
- `node extensions/comath-pi/tests/phase48-agent-operator-panel-tools.test.mjs`

Result: both exited 0; operator panels preserve `proof_authority: none`, expose only read-only action metadata, and keep cancellation unavailable without a real scheduler registry.

Phase 49 mathematical-integrity validation:

- `node services/comathd/tests/unit/phase49-agent-operator-cancel.test.mjs`
- `node extensions/comath-pi/tests/phase49-agent-operator-cancel-tools.test.mjs`

Result: both exited 0; scheduler-backed cancellation preserves `proof_authority: none`, requires active same-process scheduler ownership, and remains runtime control rather than proof evidence.

Phase 50 mathematical-integrity validation:

- `node services/comathd/tests/unit/phase50-agent-log-session.test.mjs`
- `node extensions/comath-pi/tests/phase50-agent-log-session-tools.test.mjs`

Result: both exited 0; bounded multi-event log sessions preserve `proof_authority: none`, expose only untrusted stdout/stderr observability frames, and remain non-evidential for formal proof status.
