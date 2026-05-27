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
- MathProve bridge mock and compute runners: `services/comathd/src/verification/`, `python/mathprove_bridge.py`, `python/exact_compute.py`, `python/counterexample_search.py`.
- Literature condition matching: `services/comathd/src/literature/`.
- Working paper checks: `services/comathd/src/artifacts/paper.ts`.
- Snapshot/replay stale-output checks: `services/comathd/src/artifacts/replay.ts`, `services/comathd/src/artifacts/snapshots.ts`.
- Braid statistics domain pack: `services/comathd/src/domain/braid-statistics/`, `python/braid/check_braid.py`.
- Phase 17 evaluation: `tests/evaluation/phase17-integrity-evaluation.test.mjs`.
- Phase 18 native proof-kernel slice: `services/comathd/src/proof-kernel/`, `services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs`, `services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs`, `services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs`, and `services/comathd/tests/integration/phase18-ga-snapshot-replay.test.mjs`.
- Phase 19 ensemble recovery and V8 stress coverage: `services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs`, `dialecticalStressSchema`, and the V8 `dialectical_stress.json` artifact writer.
- Phase 20 canonical ResearchCampaign state coverage: `services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs`, `campaignStageSchema`, `campaignTerminalStateSchema`, and bounded canonical campaign ticks.
- Phase 21 service read-model coverage: `services/comathd/tests/integration/phase21-read-model-routes.test.mjs` and `extensions/comath-pi/tests/phase15-dashboard.test.mjs`.

### Current Invariants

- Privileged claim statuses require a gate result; GraphPatch cannot set protected promotion fields.
- The promotion gate verifies requested evidence and artifacts actually exist, belong to the same project, bind to the same claim, and link to each other.
- `symbolically_checked` requires symbolic evidence, a successful bound runner output artifact with `ok=true`, `supports_status=symbolically_checked`, `exactness=exact_symbolic`, no runner vetoes, and trusted `runner.completed` / `runner.failed` audit provenance; numeric/search evidence, forged runner reports, and failed symbolic runs are rejected for symbolic promotion.
- `computationally_supported` requires computation or counterexample evidence, a successful bound computation runner output artifact, and trusted runner audit provenance; failed computation/counterexample runs remain evidence records but cannot promote claims.
- `literature_supported` requires literature evidence, exact literature artifacts, quoted statement grounding inside the source artifact, and a successful citation-condition match.
- `formally_checked` remains blocked unless Lean evidence, proof artifacts, kernel metadata, dependency closure, audit pass, and a passed proof-kernel final replay manifest for the same claim are present.
- Successful gate-mediated promotions raise evidence level conservatively: literature/computation to at least 2, symbolic/Lean skeleton to at least 3, formal to 5.
- Paper export is blocked when paper checks detect theorem-like overclaiming, manually written theorem syntax without claim metadata, hidden blockers, stale statements, missing provenance, invalid margin notes, missing block-bound margin-note provenance, rendered block hash mismatch, or missing literature condition support.
- Snapshot/replay detects stale runner output by recomputing canonical runner `result_sha256`, checks replay `runs_sha256`, and vetoes runner report host-path leaks; stale, tampered, or unreplayable computation cannot silently support a privileged state.

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

### Residual Risks

- Real Lean kernel checking is implemented for the Phase 18-20 `Nat.add_zero` vertical slice and its clean replay gate. General Lean proof planning, theorem synthesis, richer statement equivalence, and broader domain automation remain unimplemented.
- MathProve bridge output is still a fail-closed mock and should not be interpreted as proof search performance or proof authority.
- Citation condition matching is conservative string/condition matching, not semantic theorem equivalence.
- Snapshot replay now reruns the Phase 18 campaign Lean proof replay after restore, but generic computation runner re-execution remains deferred.
- Braid domain scripts provide exact/combinatorial evidence and risk flags; they do not prove physical interpretations or category-level equivalences.
- Phase 21 read models improve inspection fidelity but are not mathematical authorities; claim promotion remains gated by evidence, artifacts, and proof-kernel replay where applicable.
