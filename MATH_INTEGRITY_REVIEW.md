# MATH INTEGRITY REVIEW

## Current Mathematical-Integrity Verdict

Current status: **Production Formal Workbench Core, not GA**.

The local mathematical-state transition boundary is now stronger than the earlier Research Alpha verdict. `formally_checked` remains gated by Lean4 kernel-checked proof-run evidence, proof/log artifact binding, separate formalization/dependency/audit provenance, and ordinary promotion-gate approval. Semantic claim edits reset stale formal authority. Promotion and formal-proof metadata writes now compare against the evaluated claim version, so stale writers cannot promote or certify an older statement after the claim's mathematical content changes.

This is not yet an external proof product. GA still requires installed runtime evidence for the official Pi extension, a full MathProve workspace runner, native TriviumDB behavior, runner re-execution replay, package/release artifacts, DLP scanning, and multi-process locking stress.

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
- keep raw gate-decision application internal and make `promoteClaim()` the public service-level status escalation path;
- require linked proof artifacts and dependency closure evidence before any `formally_checked` transition;
- preserve rejected gates and failed proof attempts as durable blockers.

Integrity warning for all future phases: MathProve is an evidence producer and gate runner, not an authority that may promote claims by consensus. `symbolically_checked` cannot come from float-only computation, and `literature_supported` cannot come from LLM memory or summaries.

## Phase 4

Implemented the service-level promotion boundary.

Current invariant:

`formally_checked` can only be produced by a `GateResult` returned from the promotion gate and applied through the module-internal gate decision applier reached by `promoteClaim()`; create/update routes, public barrel calls, and direct registry calls reject privileged status escalation.

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

### Current Invariants

- Privileged claim statuses require a gate result; GraphPatch cannot set protected promotion fields.
- The promotion gate verifies requested evidence and artifacts actually exist, belong to the same project, bind to the same claim, and link to each other.
- `symbolically_checked` requires symbolic evidence, a successful bound runner output artifact with `ok=true`, `supports_status=symbolically_checked`, `exactness=exact_symbolic`, no runner vetoes, and trusted `runner.completed` / `runner.failed` audit provenance; numeric/search evidence, forged runner reports, and failed symbolic runs are rejected for symbolic promotion.
- `computationally_supported` requires computation or counterexample evidence, a successful bound computation runner output artifact, and trusted runner audit provenance; failed computation/counterexample runs remain evidence records but cannot promote claims.
- `literature_supported` requires literature evidence, exact literature artifacts, quoted statement grounding inside the source artifact, and a successful citation-condition match.
- `formally_checked` remains blocked unless Lean evidence, proof artifacts, kernel metadata, dependency closure, and audit pass are present.
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

### Residual Risks

- Real Lean kernel checking is not implemented; `formally_checked` remains a guarded future state rather than an achieved capability.
- MathProve bridge output is still a fail-closed mock and should not be interpreted as proof search performance.
- Citation condition matching is conservative string/condition matching, not semantic theorem equivalence.
- Snapshot replay records reproducibility metadata and stale-output checks, but does not yet rerun computations.
- Braid domain scripts provide exact/combinatorial evidence and risk flags; they do not prove physical interpretations or category-level equivalences.

## Production Formal Workbench Mathematical-Integrity Delta

### Formal Proof Authority

`formally_checked` is now authoritative only when a trusted Lean4 formal proof run exists for the same project, claim, and requested proof/log artifacts. The required proof-run conditions are:

- `system=lean4`;
- `status=kernel_checked`;
- `kernel_checked=true`;
- `contains_sorry=false`;
- `contains_admit=false`;
- `proof_artifact_id` and `log_artifact_id` are present;
- proof/log artifacts are requested in the promotion gate;
- the claim has `formalization_status=kernel_checked`, `dependency_closure_status=all_dependencies_present`, and `audit_state=audit_passed`.
- matching `formal_proof.formalization_certified`, `formal_proof.dependencies_certified`, and `formal_proof.audit_certified` provenance records exist.

The formal proof run is stored as evidence authority under `.comath/evidence/formal-proof-runs.jsonl` and mirrored into the append-only provenance ledger through `formal_proof.run_recorded`. The raw proof-run append function, raw gate-promoted claim writer, and raw gate-decision applier are not exported from the public barrel; public proof authority runs through `runLeanProofCheck()`, the separate certification functions, and `promoteClaim()`. Caller-supplied Lean executables are not accepted as proof authority; they are recorded as fail-closed runs with a veto.

### MathProve Boundary

MathProve is not a proof authority. In this slice it may produce:

- route/final-audit bridge reports;
- `mathprove_run_manifest` objects;
- artifact IDs;
- evidence IDs;
- warnings;
- vetoes.

Those objects can inform the ordinary promotion gate, but they cannot replace Lean kernel evidence or mutate claim status directly. The mock bridge remains fail-closed and explicitly carries missing-kernel, dependency, symbolic, and citation vetoes.

### Working Paper And Margin Provenance

Paper correctness now depends on stored paper spans as well as margin notes. A theorem-like or claim-like block must be traceable through:

- claim ID;
- statement hash;
- evidence IDs;
- exact margin-note ID;
- paper span record;
- displayed blockers and status.

Missing spans, spans that reference absent margin notes, or theorem-like wording without the corresponding evidence/margin binding are mathematical-integrity blockers, not presentation defects.

### Derived Index Boundary

`MathGraphIndex` and TriviumDB search results are retrieval aids. They do not define mathematical truth, claim status, evidence level, or proof acceptance. The index health contract states `truth_source=provenance-ledger` and `derived_index=true`; degraded or rebuilt index state must remain visible to users and reviewers.

### Current Validation Surface

The production formal workbench tests cover:

- formal proof schema rejection for kernel-checked runs with `sorry`, `admit`, or missing artifacts;
- public API rejection of raw formal proof run append, raw claim promotion writer, and raw gate decision applier exports;
- caller-supplied Lean executable rejection as formal proof authority;
- gate rejection of `formally_checked` without a trusted formal proof run;
- gate rejection when formalization, dependency closure, or audit certification provenance is missing;
- successful promotion only after proof-run evidence plus separate formalization, dependency, and audit certifications are present;
- Lean toolchain detection and runtime proof check when Lean is available;
- MathProve manifest persistence without proof-authority escalation;
- provenance ledger append/read/filter behavior;
- paper span integrity checks;
- derived index health and rebuild provenance;
- exclusive session lock acquisition, stale recovery mutex behavior, and mutation queue ID uniqueness.

### Residual Risks

- Lean kernel checking verifies formal artifacts, not informal paper prose equivalence by itself.
- Dependency closure is now separately certified but still conservative; a deeper graph-theoretic formal dependency auditor remains future work.
- MathProve full workspace execution remains future work beyond the current bridge manifest.
- Citation condition matching remains conservative.
- Derived retrieval can omit relevant context in degraded mode.
