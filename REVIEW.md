# Goal 3 Task 273 / Pi Goal-Mode Live Retrieval Repair Hint Execution

Scope: add the first opt-in live retrieval provider execution path to Pi goal-mode repair hints. This extends Task269 from stub-only result capture to a configured Jina Search-compatible `retrieval:jina_search` call while keeping adapter output non-authoritative and default runs offline/stubbed.

Implementation notes:
- Added `goal3-task273-pi-goal-mode-live-retrieval-repair-hint-execution.test.mjs`.
- Added `jina_search` to the selected repair-hint adapter set while preserving default stub execution for offline runs.
- Added opt-in live execution gates: `COMATH_ENABLE_GOAL_MODE_LIVE_REPAIR_HINT_EXECUTION=1`, `COMATH_LIVE_REPAIR_HINT_PROVIDERS` including `retrieval:jina_search`, and `COMATH_JINA_SEARCH_BASE_URL`.
- `COMATH_JINA_API_KEY` is sent only as an in-memory bearer header; persisted artifacts store sanitized request/response hashes, provider status, content hash, prompt-injection scan, and no-authority vetoes, but no bearer token or host root.
- Repair execution now accepts `live_provider_result_recorded` hint results only when proof authority, promotion, proof-use flags, and no-authority vetoes remain fail-closed.
- Added `pi_goal_mode_live_retrieval_repair_hint_execution` to service status capabilities and synchronized README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this review.

Verification:
- TDD RED was observed after adding the focused Task273 service test: `node services/comathd/tests/unit/goal3-task273-pi-goal-mode-live-retrieval-repair-hint-execution.test.mjs` failed because the local live retrieval fixture received 0 requests.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0 and focused Task273 exited 0.
- Current verification in this continuation: focused Task273 exited 0; adjacent Task269, Task270, Task271, and Task272 exited 0; `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants; `corepack pnpm --filter @comath/comathd typecheck` exited 0; `corepack pnpm --filter @comath/comathd test` exited 0 with Task273 discovered by the default runner; `corepack pnpm typecheck` exited 0; `corepack pnpm test` exited 0; `git diff --check` exited 0 with Windows LF-to-CRLF warnings only; `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task273 records live retrieval output as repair context only. It does not make Jina, retrieval text, prompt-injection scans, or adapter summaries proof authority; it emits no LeanRunManifest/FinalReplayManifest, cannot promote claims, and cannot certify GA.

Residual risk: Goal 3 remains incomplete. Task273 does not implement live theorem-search/CAS execution, mathematically meaningful repair synthesis from retrieved text, real Pi/operator closure, production OS-isolation helper binaries, release-candidate proof breadth, or GA certification.

# Goal 3 Task 272 / Pi Goal-Mode Rfl Final Replay Terminal

Scope: broaden the bounded Pi goal-mode terminal chain from `True` to exact reflexive equality repair. This lets locked theorem/lemma goals such as `goal3_task272 : 1 = 1` materialize a placeholder-free `by rfl` candidate, then still require LeanRunner, final clean replay, FinalReplayManifest v3 packaging, ordinary promotion, and export readiness.

Implementation notes:
- Added `goal3-task272-pi-goal-mode-rfl-final-replay-terminal.test.mjs`.
- Added a conservative repair strategy `locked_reflexive_equality_rfl` in `lean-candidate-attempt-repair-execution.ts`.
- The detector strips Lean line comments, extracts locked theorem/lemma statements with actual `sorry`, accepts only one top-level equality, and requires both equality sides to be syntactically identical after whitespace normalization.
- Non-reflexive, ambiguous, missing-theorem, placeholder, or hole-bearing drafts remain on the existing repair/blocker path.
- Added `pi_goal_mode_rfl_final_replay_terminal` to service status capabilities and synchronized README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this review.

Verification:
- TDD RED was observed after adding the focused Task272 service test: `node services/comathd/tests/unit/goal3-task272-pi-goal-mode-rfl-final-replay-terminal.test.mjs` failed because the campaign stayed in `repair` for `1 = 1`.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0 and focused Task272 exited 0.
- Adjacent Task270 initially exposed that its historical fallback used `1 = 1` only as a non-`True` sentinel; Task272 intentionally makes that a valid `rfl` target, so the fallback fixture now uses non-reflexive `1 = 2` to preserve repair-routing coverage.
- Current verification in this continuation: focused Task272 exited 0; adjacent Task271 and updated Task270 exited 0; adjacent Task269 and Task266 exited 0; `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants; `corepack pnpm --filter @comath/comathd typecheck` exited 0; `corepack pnpm --filter @comath/comathd test` exited 0 with Task272 discovered by the default runner; `corepack pnpm typecheck` exited 0; `corepack pnpm test` exited 0; `git diff --check` exited 0 with Windows LF-to-CRLF warnings only; `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task272 is a conservative definitional-equality candidate synthesis slice. It is not general equality solving, expression normalization, theorem search, live provider proof authority, broad mathlib proof breadth, real-Pi completion, or GA certification. Final proof authority still requires service-owned Lean clean replay plus ordinary promotion gates.

Residual risk: Goal 3 remains incomplete. Task272 does not execute live theorem-search/literature/CAS providers, synthesize repairs for non-reflexive goals, close real Pi/operator execution, provide production OS-isolation helper binaries, run release-candidate proof breadth, or certify GA.

# Goal 3 Task 271 / Pi Goal-Mode Final Replay Terminal

Scope: carry the bounded Pi goal-mode placeholder-free `True` candidate through the existing product authority chain: arbitration, red-team, integration, final static audit, final global clean replay, FinalReplayManifest v3 packaging, ordinary promotion, and `completed_formal_proof`. This is not broad theorem synthesis, live provider proof authority, mathlib breadth, real-Pi completion, or GA certification.

Implementation notes:
- Added `goal3-task271-pi-goal-mode-final-replay-terminal.test.mjs`.
- Accepted Pi goal-mode candidates now preserve the original LeanRunner-checked `LeanCandidate` project and materialize a separate `final_replay_project` under the selected candidate workspace.
- The final replay project contains comment-stripped `MathResearch/Target.lean`, `Audit/LeanCandidateAudit.lean`, campaign-bound FormalSpecLock/AssumptionLedger records, `lakefile.lean`, `lean-toolchain`, `lake-manifest.json`, and `candidate_replay_project_descriptor.json`.
- The replay descriptor now points downstream integration/final replay to `MathResearch/Target.lean`, `lake build MathResearch`, and the canonical theorem signature such as `MathResearch.goal3_task271 : True`.
- Added `pi_goal_mode_final_replay_terminal` to service status capabilities and synchronized README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this review.

Verification:
- TDD RED was observed after adding the focused Task271 service test: it reached `final_global_replay` and terminal-blocked because clean replay tried to copy a missing `MathResearch` directory from the candidate draft workspace.
- After the replay-project materialization fix, focused Task271 initially reached clean replay but failed static audit because candidate draft comments still contained `sorry`; final replay target materialization now strips Lean comments before packaging.
- Focused Task271 then reached final authority packaging and exposed missing campaign FormalSpecLock/AssumptionLedger bindings; the replay project now writes campaign-scoped lock/ledger metadata.
- Current verification in this continuation: `corepack pnpm --filter @comath/comathd build` exited 0; focused Task271 exited 0; adjacent Task270, Task269, Task266, and Task106 regressions exited 0; `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants; `corepack pnpm --filter @comath/comathd test` exited 0 with Task271 discovered by the default runner after one timeout-only rerun; `corepack pnpm typecheck` exited 0; `corepack pnpm test` exited 0; `git diff --check` exited 0 with Windows LF-to-CRLF warnings only; `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task271 closes a bounded product-terminal chain for tiny `True` smoke targets only. The final proof authority still comes from service-owned clean replay, FinalReplayManifest v3 verification, derived bindings, and ordinary promotion gates; candidate drafts, repair hints, adapter stubs, and LeanRunner checks alone remain non-final.

Residual risk: Goal 3 remains incomplete. Task271 does not synthesize mathematically meaningful repairs for general targets, execute live theorem-search/literature/CAS providers, close real Pi/operator execution, provide production OS-isolation helper binaries, run broad final release-candidate proof breadth, or certify GA.

# Goal 3 Task 269 / Pi Goal-Mode Repair Hint Execution

Scope: execute the Task268 repair hint bundle through maintained external wheel registry stub adapters and bind the resulting non-authoritative repair context into the Task267 all-rejected LeanRunner feedback loop. This is not live network/provider execution, Lean authority, final clean replay, proof promotion, or GA certification.

Implementation notes:
- Added `goal3-task269-pi-goal-mode-repair-hint-execution.test.mjs`.
- Extended `writeLeanCandidateAttemptRepairFeedbackBatch()` to await service-owned registry stub adapter methods and write `lean_candidate_attempt_repair_hint_execution.json`.
- The hint execution artifact binds the repair feedback batch and Task268 hint bundle by path/hash, records adapter request/result hashes, provider terms, capability metadata, and `external_adapter_result_has_no_proof_authority` vetoes.
- The replacement repair batch and per-candidate repair tasks now carry `source_repair_hint_execution`, `repair_hint_execution_paths`, and `source_repair_hint_results`.
- Repair execution re-hashes the repair task, source Lean draft, feedback batch, hint bundle, and hint execution artifact before overwriting candidate drafts; stale hint execution hashes fail closed.
- Repaired drafts may add `comath_repair_hint_execution` markers, but repair still emits no LeanRunManifest, no FinalReplayManifest, no proof claim, no promotion, and no GA authority.
- Added `pi_goal_mode_repair_hint_execution` to service status capabilities and synchronized README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task269 service test: `node services/comathd/tests/unit/goal3-task269-pi-goal-mode-repair-hint-execution.test.mjs` failed because the repair hint execution artifact did not yet exist.
- Focused Task269 exited 0 after implementation, including adapter-return-shape checks and a tamper check proving stale hint execution hashes fail closed without overwriting existing repair execution or candidate Lean drafts.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Adjacent Task268, Task267, Task266, Task265, Task264, and Task263 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task269 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests, comathd package tests with Task269, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task269 records service-owned stub adapter outputs as repair context only. The results are not theorem-search proof evidence, not citation condition matches, not CAS proof reports, not LeanRunManifest evidence, and not final replay material. Lean/mathlib clean replay remains the only final proof authority.

Residual risk: Goal 3 remains incomplete. Task269 does not execute live network/provider theorem-search/literature/CAS adapters, synthesize mathematically meaningful Lean repairs, carry a LeanRunner-passing candidate through arbitration/red-team/integration, run final hermetic clean replay for a promoted artifact, provide terminal proof success, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 268 / Pi Goal-Mode Repair Hint Bundle

Scope: bind non-authoritative theorem-search/literature/CAS/proof-search/external-Lean-repo repair context into the Task267 all-rejected LeanRunner feedback loop. This is not live adapter execution, Lean authority, final clean replay, proof promotion, or GA certification.

Implementation notes:
- Added `goal3-task268-pi-goal-mode-repair-hint-bundle.test.mjs`.
- Extended `writeLeanCandidateAttemptRepairFeedbackBatch()` to write `lean_candidate_attempt_repair_hint_bundle.json`.
- The hint bundle binds the repair feedback batch, goal-mode research plan, adapter execution manifest, and local ingestion evidence by path/hash.
- Hint rows are descriptor-derived from the maintained external wheel registry and cover theorem search, retrieval, computation, proof-search backend, and external Lean repo contexts with `proof_authority="none"` and `network_execution_performed=false`.
- The replacement repair batch and per-candidate repair tasks now carry `source_repair_hint_bundle`, `repair_hint_bundle_paths`, and `source_repair_hints`.
- Repair execution re-hashes the repair task, source Lean draft, feedback batch binding, and hint bundle before overwriting candidate drafts; stale hint bundle hashes fail closed.
- Repaired drafts may add `comath_repair_hints` markers, but repair still emits no LeanRunManifest, no FinalReplayManifest, no proof claim, no promotion, and no GA authority.
- Added `pi_goal_mode_repair_hint_bundle` to service status capabilities and synchronized README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task268 service test: `node services/comathd/tests/unit/goal3-task268-pi-goal-mode-repair-hint-bundle.test.mjs` failed because the repair hint bundle did not yet exist.
- Focused Task268 exited 0 after implementation, including a tamper check proving a stale hint bundle hash fails closed without overwriting the existing repair execution or candidate Lean draft.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Adjacent Task267, Task266, Task265, Task264, and Task263 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task268 discovered by the default runner. The first 120s run timed out, then the same command exited 0 with a longer timeout.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests, comathd package tests with Task268, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task268 uses registry descriptors and existing goal-mode artifacts as repair context only. The hints are not theorem-search results, not citation condition matches, not CAS proof reports, not LeanRunManifest evidence, and not final replay material. Lean/mathlib clean replay remains the only final proof authority.

Residual risk: Goal 3 remains incomplete. Task268 does not execute live theorem-search/literature/CAS adapters, synthesize mathematically meaningful Lean repairs, carry a LeanRunner-passing candidate through arbitration/red-team/integration, run final hermetic clean replay for a promoted artifact, provide terminal proof success, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 267 / Pi Goal-Mode LeanRunner Feedback Repair Loop

Scope: turn an explicit Pi goal-mode all-rejected LeanRunner terminal blocker into a service-owned feedback repair loop. This is not final clean replay, proof promotion, or GA certification.

Implementation notes:
- Added `goal3-task267-pi-goal-mode-leanrunner-feedback-repair-loop.test.mjs`.
- Added `writeLeanCandidateAttemptRepairFeedbackBatch()` in `proof-kernel/ensemble/lean-candidate-attempt-repair-feedback.ts`.
- `tickCampaign()` now special-cases terminal explicit goal-mode campaigns whose canonical `lean_candidate_attempt_leanrunner_execution.json` records `all_attempts_rejected`, writes `lean_candidate_attempt_repair_feedback_batch.json`, materializes a replacement `lean_candidate_attempt_repair_batch.json`, and resumes `current_stage="repair"` / `status="repairing"`.
- Failed LeanRunManifest stdout/stderr paths and hashes are bound into per-candidate repair tasks as non-authoritative diagnostics only.
- Terminal resume is additionally gated by the current blocker binding the canonical LeanRunner execution or blocker artifact, so unrelated terminal blockers cannot be rewound by stale all-rejected execution files.
- Repair execution now carries optional feedback bindings, appends `comath_repair_feedback` markers to revised candidate drafts, records `repair_iteration`, and still keeps LeanRunner invocations and repair-stage LeanRunManifest paths empty.
- Added `pi_goal_mode_leanrunner_feedback_repair_loop` to service status capabilities and synchronized README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task267 service test: `node services/comathd/tests/unit/goal3-task267-pi-goal-mode-leanrunner-feedback-repair-loop.test.mjs` failed because a second tick on the all-rejected terminal campaign returned `status="terminal"` instead of `status="repairing"`.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task267 exited 0, including a negative check that an unrelated terminal blocker with a stale all-rejected execution file stays terminal and writes no feedback batch.
- Adjacent Task266, Task265, Task264, and Task263 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task267 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task267, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task267 consumes failed LeanRunner evidence only as repair input. The feedback batch, second repair batch, repair tasks, and repair execution all keep `proof_authority="none"` and cannot promote claims or certify GA. Failed Lean stdout/stderr do not prove anything; they only guide the next candidate revision before a later service-owned Lean pass and final clean replay gates.

Residual risk: Goal 3 remains incomplete. Task267 does not synthesize mathematically meaningful repairs from theorem-search/literature/CAS hints, carry a LeanRunner-passing candidate through arbitration/red-team/integration, run final hermetic clean replay for a promoted artifact, provide terminal proof success, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 266 / Pi Goal-Mode Ready Attempt LeanRunner Blocker

Scope: connect Task265 re-ingested ready attempts to the service-owned LeanRunner, while routing all rejected attempts to replayable blocker evidence. This is not final clean replay, proof promotion, or GA certification.

Implementation notes:
- Added `goal3-task266-pi-goal-mode-ready-attempt-leanrunner-blocker.test.mjs`.
- Added `executeLeanCandidateAttemptLeanRunner()` in `proof-kernel/ensemble/lean-candidate-attempt-leanrunner-execution.ts`.
- `candidate_verification` now records ready-for-LeanRunner preflight first, then a later tick runs `comathd.LeanRunner` over each ready `LeanCandidate.lean`.
- LeanRunner execution writes append-only LeanRunManifest evidence, updates candidate manifests and the stored candidate index, and emits `.comath/campaign/<campaign_id>/lean_candidate_attempt_leanrunner_execution.json`.
- If every ready attempt is rejected, CoMath writes `lean_candidate_attempt_leanrunner_blocker.json` and terminates with a replayable blocker instead of entering proof arbitration.
- Placeholder-bearing drafts remain non-authoritative even if a runner shim reports exit 0.
- Task266 Lean/Lake version probes and the default `runServiceOwnedLeanCommandV3()` command path now reuse the existing Windows-safe `lean-host-tools` resolver instead of direct `spawnSync("lean"|"lake")`, so `.cmd` shims and fixed argv handling stay on the maintained path.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task266 service test: `node services/comathd/tests/unit/goal3-task266-pi-goal-mode-ready-attempt-leanrunner-blocker.test.mjs` failed because ready repaired attempts still advanced directly from `candidate_verification` to `candidate_arbitration`.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task266 exited 0, including the product command path with fake PATH-provided Lean/Lake `.cmd` tools and no injected `run` callback.
- Adjacent Task265, Task264, Task263, and Phase63 regressions exited 0; Task265 was updated to assert the new ready-for-LeanRunner preflight boundary instead of direct arbitration.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task266 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task266, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task266 writes service-owned LeanRunner attempt evidence and blocker artifacts only. Failed LeanRunManifests remain repair input with `proof_authority="none"` and cannot promote claims. Successful placeholder-free candidates may proceed only to ordinary candidate arbitration; final authority still requires clean replay and downstream gates. The Lean host-tool resolver improves real command execution hygiene, but it is still tool invocation provenance, not proof authority.

Residual risk: Goal 3 remains incomplete. Task266 does not synthesize real repairs from Lean stderr/stdout, integrate live theorem-search/literature hints into repair, run final hermetic clean replay for a promoted artifact, provide terminal proof success, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 265 / Pi Goal-Mode Repair Stage Re-Ingestion

Scope: make the Task264 `repair` state executable and resumable by consuming service-owned repair work orders, materializing repaired candidate drafts, and returning to `candidate_verification`. This is not Lean replay, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task265-pi-goal-mode-repair-stage-reingestion.test.mjs`.
- Added `executeLeanCandidateAttemptRepairBatch()` in `proof-kernel/ensemble/lean-candidate-attempt-repair-execution.ts`.
- `tickCampaign()` now handles `current_stage="repair"` by consuming `lean_candidate_attempt_repair_batch.json`, snapshotting original `LeanCandidate.lean` drafts, writing no-sorry repaired drafts with `comath_repair_placeholder`, and persisting `.comath/campaign/<campaign_id>/lean_candidate_attempt_repair_execution.json` plus per-candidate execution manifests.
- The repair tick returns the campaign to `candidate_verification` with `status="running"` so the existing preflight can reclassify repaired drafts as `ready_for_lean_runner`.
- Repair execution manifests keep LeanRunner invocations and LeanRunManifest paths empty, preserve proof/GA/promotion flags as false, and do not claim repaired placeholders prove anything.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task265 service test: `node services/comathd/tests/unit/goal3-task265-pi-goal-mode-repair-stage-reingestion.test.mjs` failed with `400 !== 200` when ticking `current_stage="repair"` because that stage had no handler.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task265 exited 0.
- Adjacent Task264, Task263, Task262, Task110, and Phase63 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task265 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task265, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task265 writes service-owned repair execution artifacts only. It does not run LeanRunner, does not emit LeanRunManifest evidence, does not mark candidates proof-grade, does not hide the placeholder marker, and cannot promote claims or certify GA. The next product step is service-owned LeanRunner execution over no-sorry ready candidates, with failed Lean runs routed back into richer repair.

Residual risk: Goal 3 remains incomplete. Task265 does not run LeanRunner on repaired candidates, interpret Lean failures, loop failed Lean runs back into repair, integrate live theorem-search/literature hints into proof scripts, implement maintained PDF parsing or external Lean repo inspection, complete per-candidate clean replay promotion, provide terminal proof/refutation/blocker completion, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 264 / Pi Goal-Mode Lean Attempt Repair Routing

Scope: connect Task263's service-owned candidate-attempt preflight to the Pi goal-mode repair loop. This materializes repair work orders and keeps the campaign resumable; it is not Lean replay, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task264-pi-goal-mode-lean-attempt-repair-routing.test.mjs`.
- Added `writeLeanCandidateAttemptRepairBatch()` in `proof-kernel/ensemble/lean-candidate-attempt-repair.ts`.
- `candidate_arbitration` now routes explicit Pi goal-mode campaigns with external refs and `repair_required` `sorry` attempts to `current_stage="repair"` / `status="repairing"` instead of terminal-blocking.
- The route writes `.comath/campaign/<campaign_id>/lean_candidate_attempt_repair_batch.json` and one `lean_candidate_repair_task.json` per candidate workspace.
- Repair batches/tasks bind the Task263 check report by path/hash, preserve locked-statement boundaries, assign A0/A5/A8 roles, forbid proof-claim/replay-manifest outputs, and keep LeanRunner disabled until repaired no-sorry attempts exist.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task264 service test: `node services/comathd/tests/unit/goal3-task264-pi-goal-mode-lean-attempt-repair-routing.test.mjs` failed because `candidate_arbitration` still returned terminal status instead of `repairing`.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task264 exited 0.
- Adjacent Task263, Task262, Task110, Task109, and Phase63 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task264 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task264, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task264 writes service-owned repair work orders only. It does not execute repair agents, does not invoke LeanRunner, does not write LeanRunManifest evidence, does not mark candidates as proof-grade, and cannot promote claims or certify GA. The next product step is executing and re-verifying repaired no-sorry attempts before any LeanRunner authority can start.

Residual risk: Goal 3 remains incomplete. Task264 does not perform automatic proof repair, materialize repaired no-sorry attempts, run LeanRunner on repaired candidates, integrate live theorem-search/literature hints into proof scripts, implement maintained PDF parsing or external Lean repo inspection, complete per-candidate clean replay promotion, provide terminal proof/refutation/blocker completion, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 263 / Pi Goal-Mode Lean Attempt Check Report

Scope: turn Task262's draft Lean candidate workspaces into service-owned preflight and repair-routing evidence during `candidate_verification`. This is not Lean replay, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task263-pi-goal-mode-lean-attempt-check-report.test.mjs`.
- Added `createLeanCandidateAttemptCheckReport()` in `proof-kernel/ensemble/lean-candidate-attempt-check.ts`.
- `candidate_verification` now writes `.comath/campaign/<campaign_id>/lean_candidate_attempt_check_report.json`.
- The report binds each candidate manifest, `lean_candidate_attempt_plan.json`, `LeanCandidate.lean`, source `proof/Skeleton.lean` hash, skeleton blueprint hash, and locked statement boundary.
- `sorry`-bearing drafts are routed to `repair_required` with `lean_runner_invocations=0`, empty LeanRunManifest paths, and `proof_authority=none`.
- Tampered/missing attempt bindings fail closed before ordinary candidate arbitration.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task263 service test: `node services/comathd/tests/unit/goal3-task263-pi-goal-mode-lean-attempt-check-report.test.mjs` failed because `candidate_verification.json` did not include `lean_candidate_attempt_checks_performed=true`.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task263 exited 0.
- Adjacent Task262, Task261, Task109, and Task110 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task263 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task263, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task263 performs service-owned static preflight only. It does not invoke LeanRunner on `sorry` drafts, does not write LeanRunManifest evidence, does not mark candidates as proof-grade, and cannot promote claims or certify GA. The report can drive repair planning and later no-sorry LeanRunner checks.

Residual risk: Goal 3 remains incomplete. Task263 does not perform automatic proof repair, run LeanRunner on repaired no-sorry attempts, integrate live theorem-search/literature hints into proof scripts, implement maintained PDF parsing or external Lean repo inspection, complete per-candidate clean replay promotion, provide terminal proof/refutation/blocker completion, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 262 / Pi Goal-Mode Blueprint Lean Candidate Attempts

Scope: materialize Task261's blueprint-bound candidate orchestration into per-candidate Lean attempt workspaces. These are service-owned draft attempt artifacts only; they are not LeanRunManifest evidence, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task262-pi-goal-mode-blueprint-lean-candidate-attempts.test.mjs`.
- Added per-candidate `lean_candidate_attempt_plan.json` generation.
- Added per-candidate `LeanCandidate.lean` draft generation from `proof/Skeleton.lean`.
- Bound source skeleton path/hash, skeleton blueprint path/hash, blueprint step ids, and statement-boundary guards into each attempt plan.
- Exposed attempt plan and draft Lean files through candidate manifests, agent outputs, and `candidate_generation.json`.
- Kept generated Lean drafts as `sorry`-bearing candidate material with `proof_authority=none`.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task262 service test: `node services/comathd/tests/unit/goal3-task262-pi-goal-mode-blueprint-lean-candidate-attempts.test.mjs` failed because `candidate_generation.json` did not include `lean_candidate_attempts_materialized=true`.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task262 exited 0.
- Adjacent Task261, Task260, Task109, Task113, and Task114 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task262 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task262, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task262 writes only candidate-workspace draft artifacts through `comathd`. The generated `LeanCandidate.lean` files may contain `sorry` and are never marked as proof evidence. They can feed later service-owned LeanRunner and repair-loop stages, but cannot promote claims or certify GA without Lean Authority replay gates.

Residual risk: Goal 3 remains incomplete. Task262 does not run Lean over these attempts, perform automatic repair, ingest live theorem-search/literature hints into proof scripts, implement maintained PDF parsing or external Lean repo inspection, complete per-candidate clean replay promotion, provide terminal proof/refutation/blocker completion, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 261 / Pi Goal-Mode Blueprint-Bound Candidate Generation

Scope: carry Task260's service-owned skeleton blueprint into `line_map_gate` and `candidate_generation` so eight-variant candidate orchestration is bound to current blueprint material. This is non-authoritative planning context only; it is not Lean replay evidence, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task261-pi-goal-mode-blueprint-bound-candidate-generation.test.mjs`.
- Added blueprint/formalization-hints path-hash binding to `candidate_generation_request.json`.
- Re-check current blueprint and hint bindings before candidate generation writes artifacts.
- Propagated blueprint path/hash, step ids, statement-boundary guards, and `proof_authority=none` into `candidate_generation.json`.
- Propagated the same planning context into all eight `lemma_sprint` task cards.
- Added fail-closed behavior for tampered/stale blueprint material before candidate artifacts are trusted.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task261 service test: `node services/comathd/tests/unit/goal3-task261-pi-goal-mode-blueprint-bound-candidate-generation.test.mjs` failed because `candidate_generation_request.json` did not include `blueprint_bound_candidate_generation=true`.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task261 exited 0.
- Adjacent Task260, Task259, Task110, Task109, and Phase63 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task261 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task261, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task261 writes and consumes only service-owned `.comath/campaign/<campaign_id>/candidate_generation_request.json`, `candidate_generation.json`, and agent task-card artifacts through `comathd`. The blueprint is planning context for candidate orchestration; every exposed binding remains `proof_authority="none"`, `can_promote_claim=false`, and `can_certify_ga=false`. Tampered blueprint material blocks `candidate_generation`, but successful generation still creates candidates only, not proven claims.

Residual risk: Goal 3 remains incomplete. Task261 does not implement real Lean skeleton repair from blueprint steps, live theorem-search result injection, maintained PDF parsing, external Lean repo inspection, per-candidate Lean proof attempts, Lean Authority v3 promotion, terminal proof/refutation/blocker completion, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 260 / Pi Goal-Mode Skeleton Blueprint From Hints

Scope: connect Task259 formalization hints to the `skeleton_gate` blueprint output required by the GA design. This is service-owned skeleton planning metadata only; it is not literature evidence, theorem-search evidence, Lean replay evidence, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task260-pi-goal-mode-skeleton-blueprint-from-hints.test.mjs`.
- Added `proof/blueprint.json` creation during `skeleton_gate`.
- Bound `proof/formalization_hints.json` by path/hash into the blueprint.
- Bound the blueprint into `plan.json`, `lemma_dag.json`, `line_map.json`, and `skeleton_report.md`.
- Added blueprint step ids as planning metadata while keeping `Skeleton.lean` free of extracted paper theorem text.
- Made `proof/blueprint.json` a required skeleton-gate artifact whose deletion rewinds later stages to `skeleton_gate`.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task260 service test: after `corepack pnpm --filter @comath/comathd build`, `node services/comathd/tests/unit/goal3-task260-pi-goal-mode-skeleton-blueprint-from-hints.test.mjs` failed because `skeleton_gate` did not attach a skeleton blueprint derived from formalization hints.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task260 exited 0.
- Adjacent Task259, Task258, Task257, and Phase33 proof-obligation DAG regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task260 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task260, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task260 writes only service-owned `.comath/campaign/<campaign_id>/proof/blueprint.json` artifacts through `comathd`. Blueprint steps can seed lemma-DAG and line-map metadata, but each step remains `proof_authority="none"`, `can_promote_claim=false`, `can_certify_ga=false`, `result_can_be_used_as_proof=false`, `can_change_locked_statement=false`, and `can_create_proof_obligation_without_formal_spec_lock=false`. Missing blueprint artifacts fail closed before candidate generation.

Residual risk: Goal 3 remains incomplete. Task260 does not implement actual Lean skeleton repair, live candidate orchestration from blueprint steps, maintained PDF parsing, external Lean repo inspection, live literature retrieval, live theorem-search providers, terminal proof/refutation/blocker completion, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 259 / Pi Goal-Mode Skeleton Formalization Hints

Scope: connect Task258 local ingestion evidence to the `skeleton_gate` as service-owned formalization hints. This is skeleton-planning metadata only; it is not literature evidence, theorem-search evidence, Lean replay evidence, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task259-pi-goal-mode-skeleton-formalization-hints.test.mjs`.
- Added `proof/formalization_hints.json` creation during `skeleton_gate`.
- Bound `knowledge_pack.json` and `goal_mode_local_ingestion_evidence.json` by path/hash into the hint artifact.
- Converted only prompt-injection-scanned formalization-candidate extracted claim kinds into hints.
- Recorded `can_change_locked_statement=false`, FormalSpecLock approval requirements, and StatementDiffGate requirements for statement changes.
- Bound the hint artifact into `plan.json` and made it a required skeleton-gate artifact whose deletion rewinds later stages to `skeleton_gate`.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task259 service test: after `corepack pnpm --filter @comath/comathd build`, `node services/comathd/tests/unit/goal3-task259-pi-goal-mode-skeleton-formalization-hints.test.mjs` failed because `skeleton_gate` did not attach formalization hints derived from local ingestion evidence.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task259 exited 0.
- Adjacent Task258, Task257, Task256, and Phase33 proof-obligation DAG regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task259 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task259, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task259 writes only service-owned `.comath/campaign/<campaign_id>/proof/formalization_hints.json` artifacts through `comathd`. Hints may inform blueprint/skeleton planning, but every hint remains `proof_authority="none"`, `can_promote_claim=false`, `can_certify_ga=false`, `result_can_be_used_as_proof=false`, and `can_change_locked_statement=false`. Prompt-injected local text is excluded, and missing hint artifacts fail closed before candidate generation.

Residual risk: Goal 3 remains incomplete. Task259 does not implement richer lemma DAG generation from hints, Lean skeleton repair, maintained PDF parsing, external Lean repo inspection, live literature retrieval, live theorem-search providers, terminal proof/refutation/blocker completion, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 258 / Pi Goal-Mode Service-Owned Local Ingestion Evidence

Scope: connect Task257 goal-mode adapter execution manifests to service-owned local ingestion evidence. This is prompt-injection-scanned local draft evidence and blocker provenance only; it is not PDF parsing authority, external Lean repo inspection, live retrieval, theorem-search evidence, Lean replay, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task258-pi-goal-mode-local-ingestion-evidence.test.mjs`.
- Added `goal_mode_local_ingestion_evidence.json` creation during `knowledge_pack`.
- Bound the Task256 research-plan path/hash and Task257 adapter-execution manifest path/hash into the local evidence manifest and `knowledge_pack.json`, while preserving the Task255 intake-manifest binding.
- Extracted line-anchored Markdown and TeX theorem/lemma drafts only after prompt-injection scan.
- Blocked prompt-injected local text as `goal_mode_prompt_injection_detected` without copying injected theorem text into extracted claims.
- Blocked PDF refs as `goal_mode_pdf_ingestion_adapter_required` and external Lean repository refs as `goal_mode_external_lean_repo_inspection_required`.
- Made the local ingestion evidence manifest a required knowledge-pack artifact whose deletion rewinds later stages to `knowledge_pack`.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task258 service test: after `corepack pnpm --filter @comath/comathd build`, `node services/comathd/tests/unit/goal3-task258-pi-goal-mode-local-ingestion-evidence.test.mjs` failed because `knowledge_pack` did not attach service-owned local ingestion evidence.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task258 exited 0.
- Adjacent Task257, Task256, Task255, Task16 service route, Task100 terminal read-model authority gate, Phase63 stage-artifact coverage, Phase65 proof-memory retrieval, and Phase71 repair/resume regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task258 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task258, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task258 writes only service-owned `.comath/campaign/<campaign_id>/goal_mode_local_ingestion_evidence.json` artifacts through `comathd`. Local Markdown/TeX extracted claims remain formalization candidates with `proof_authority="none"`, `can_promote_claim=false`, `can_certify_ga=false`, and `result_can_be_used_as_proof=false`. PDF and external Lean repo material remains blocked until maintained adapters exist. The manifest cannot satisfy literature evidence, theorem-search evidence, LeanRunManifest evidence, proof authority, claim promotion input, or GA certification.

Residual risk: Goal 3 remains incomplete. Task258 does not implement maintained PDF parsing, external Lean repo inspection, live literature retrieval, live theorem-search providers, richer citation-condition matching, Lean skeleton repair, terminal proof/refutation/blocker completion, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 257 / Pi Goal-Mode Service-Owned Adapter Execution Manifest

Scope: connect Task256 goal-mode research plans to service-owned adapter execution manifests. This is run-envelope provenance and input-integrity gating only; it is not live retrieval, document extraction evidence, theorem-search evidence, Lean replay, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task257-pi-goal-mode-adapter-execution-manifest.test.mjs`.
- Added `goal_mode_adapter_execution_manifest.json` creation during `knowledge_pack`.
- Bound the Task256 research-plan path/hash into the execution manifest and `knowledge_pack.json`, and preserved the Task255 intake-manifest path/hash binding.
- Emitted one service-owned adapter run envelope per planned ingestion, retrieval, and theorem-search task.
- Re-checked local file input hashes, recorded local directory refs without recursive proof claims, and blocked tampered local inputs with `goal_mode_input_hash_mismatch`.
- Kept network/theorem-search providers blocked as `goal_mode_live_adapter_execution_required` with `network_execution_performed=false`.
- Made the execution manifest a required knowledge-pack artifact whose deletion rewinds later stages to `knowledge_pack`.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task257 service test: after `corepack pnpm --filter @comath/comathd build`, `node services/comathd/tests/unit/goal3-task257-pi-goal-mode-adapter-execution-manifest.test.mjs` failed because `knowledge_pack` did not attach a service-owned adapter execution manifest.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task257 exited 0.
- Adjacent Task256, Task255, Task16 service route, Task16 Pi extension, Task100 terminal read-model authority, Phase63 stage-artifact coverage, Phase65 proof-memory retrieval, and Phase71 repair/resume regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task257 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task257, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task257 writes only service-owned `.comath/campaign/<campaign_id>/goal_mode_adapter_execution_manifest.json` artifacts through `comathd`. Run envelopes remain non-authoritative scheduling/input-integrity records with `proof_authority="none"`, `can_promote_claim=false`, and `can_certify_ga=false`. They do not execute retrieval, extract trusted paper or attachment claims, return theorem-search hits, run Lean, create promotion-grade evidence, promote claims, or certify GA.

Residual risk: Goal 3 remains incomplete. Task257 does not execute PDF/TeX/Markdown ingestion adapters, retrieve literature, call theorem-search providers, extract citation anchors, generate richer automatic lemma decompositions, repair Lean skeletons, complete durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 256 / Pi Goal-Mode Service-Owned Research Plan

Scope: connect Task255 goal-mode intake provenance to the `knowledge_pack` product loop by writing a service-owned research plan artifact. This is adapter planning and lemma-planning bridge metadata only; it is not adapter execution, document extraction evidence, theorem-search evidence, Lean replay, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task256-pi-goal-mode-research-plan.test.mjs`.
- Added `goal_mode_research_plan.json` creation during `knowledge_pack`.
- Bound the Task255 intake manifest path/hash into the research plan and `knowledge_pack.json`.
- Planned local PDF/TeX/Markdown/workspace ingestion tasks through the existing external wheel registry.
- Planned literature retrieval and Lean theorem-search adapter tasks without executing network calls.
- Added lemma DAG / `Skeleton.lean` planning seeds and made the plan a required knowledge-pack artifact.
- Hardened intake consumption so the plan rejects stale/tampered intake manifests whose schema, campaign id, project id, claim id, statement hash, or normalized paths do not match the live campaign.
- Added focused coverage that deleting the required research-plan artifact rewinds candidate generation to `knowledge_pack` through the existing stage-gate repair path.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task256 service test: after `corepack pnpm --filter @comath/comathd build`, `node services/comathd/tests/unit/goal3-task256-pi-goal-mode-research-plan.test.mjs` failed because `knowledge_pack` did not attach a service-owned goal-mode research plan.
- A read-only subagent boundary review found no proof-authority violations and flagged two P3 hardening gaps: validate the consumed intake manifest binding and directly cover missing research-plan repair/rewind behavior. Follow-up RED was observed when the focused Task256 test failed because a tampered intake manifest was still consumed by the plan.
- After implementation and hardening, focused Task256 exited 0.
- Adjacent Task255, Task16 service route, Task100 export authority, Phase63 stage-artifact coverage, Phase65 proof-memory retrieval, and Phase71 repair/resume regressions exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task256 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task256, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task256 writes only service-owned `.comath/campaign/<campaign_id>/goal_mode_research_plan.json` artifacts through `comathd`. It records adapter tasks as `execution_state="planned"`, `service_owned_execution_required=true`, `network_execution_performed=false`, `proof_authority="none"`, and `can_promote_claim=false`. It does not execute retrieval, parse papers or attachments as trusted proof material, run Lean, create promotion-grade evidence, promote claims, or certify GA.

Residual risk: Goal 3 remains incomplete. Task256 does not execute PDF/TeX/Markdown ingestion adapters, retrieve literature, call theorem-search providers, extract citation anchors, generate richer automatic lemma decompositions, repair Lean skeletons, complete durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 255 / Pi Goal-Mode Service-Owned Intake Manifest

Scope: add a service-owned intake manifest for Pi goal-mode research inputs at campaign start. This is provenance and UX plumbing only; papers, TeX/PDF/Markdown attachments, workspace refs, directory presence, Pi payloads, and intake manifests are not proof authority, Lean replay evidence, promotion gates, or GA certification.

Implementation notes:
- Added `goal3-task255-pi-goal-mode-intake-manifest.test.mjs`.
- Added `goal_mode_intake_manifest.json` creation in `startCampaign()`.
- Attached the manifest to the `initialized` campaign stage and audit payload.
- Added Pi goal export path/hash surfacing with `proof_authority="none"`.
- Normalized project-confined refs, hashed existing file inputs, recorded directory refs without recursive proof claims, and avoided raw host-root leakage.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, acceptance matrix, phase0 smoke discovery, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task255 service test: after `corepack pnpm --filter @comath/comathd build`, `node services/comathd/tests/unit/goal3-task255-pi-goal-mode-intake-manifest.test.mjs` failed because `startCampaign` did not attach a service-owned goal-mode intake manifest to the `initialized` stage.
- After implementation, focused Task255 exited 0.
- Adjacent Task16 service route, Task100 export authority, and Pi extension Task16 goal-mode regressions exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task255 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task254, comathd package tests with Task255, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task255 writes only service-owned `.comath/campaign/<campaign_id>/goal_mode_intake_manifest.json` artifacts through `comathd`. It records project-relative refs, file hashes, directory presence, path-policy boundaries, and non-authority flags. It does not ingest document content as trusted proof material, run Lean, call theorem search, call literature adapters, create proof obligations beyond the existing campaign path, promote claims, or certify GA.

Residual risk: Goal 3 remains incomplete. Task255 does not implement full PDF/TeX/Markdown ingestion adapters, retrieval planning, lemma decomposition, automatic Lean skeleton repair, durable long-lived operator transport, production real-Pi completion, production OS-isolation helper binaries, broad final release-candidate proof breadth, or GA certification.

# Goal 3 Task 254 / Pi Unattended Real-Host Completion Certification Prerequisite Consumer

Scope: expose the Task253 service-owned completion-certification prerequisite gate through the Pi extension as a host-confirmed thin client and read-only planner checkpoint. This is Pi consumer wiring only; it is not a completion certificate, public executor/result/certificate authority, terminal unattended completion, durable/live transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task254-pi-unattended-real-host-completion-certification-prerequisite-consumer.test.mjs`.
- Added `comath.release.piCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite`.
- Added `/cm:release lifecycle-unattended-real-host-completion-certification-prerequisite`.
- Added the interactive real-Pi planner checkpoint after attempt review and before Codex API probe/review.
- Registered the runtime subcommand, Phase6/Phase26 exposure checks, package-test discovery, and phase0 release-hardening discovery.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task254 Pi test: after `corepack pnpm --filter @comath/pi-extension build`, `node extensions/comath-pi/tests/goal3-task254-pi-unattended-real-host-completion-certification-prerequisite-consumer.test.mjs` failed because `comath.release.piCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite` was not registered.
- After implementation, focused Task254 exited 0.
- Adjacent Task252, Task250, Task223, Phase6, and Phase26 Pi regressions exited 0. Phase6/Phase26 must be run from `extensions/comath-pi` because those tests intentionally use the package root as `process.cwd()`.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task254 discovered by the default Pi runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests with Task254, comathd package tests through Task253, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task254 calls only the Task253 `POST /release/pi-codex-lifecycle/unattended-real-host-completion-certification-prerequisite` service route through Pi host confirmation. It strips caller/model `confirmation_id`, requires attempt-review id/path/hash, translates only `service-owned-pi-lifecycle/<attempt_review_id>/unattended-real-host-execution-attempt-review.json` aliases to service-canonical paths inside the comathd request, keeps the interactive planner read-only, and does not expose or forward public `executor_command`, caller-supplied attempt results, or completion certificates. Public Pi output forces proof, GA, durable/live transport, direct-Pi-write, direct-trusted-state, terminal unattended completion, completion-certificate, and unattended-execution authority flags false.

Residual risk: Goal 3 remains incomplete. Task254 does not provide durable long-lived operator transport, public executor configuration, production unattended real-host completion certification, Pi trusted-state mutation, Lean/mathlib proof replay authority, claim promotion, real installed-toolchain Mathlib smoke completion, broad final release-candidate proof breadth, production OS-isolation helper binaries, or GA certification.

# Goal 3 Task 253 / Service-Owned Unattended Real-Host Completion Certification Prerequisite

Scope: add a service-owned prerequisite gate after Task251 attempt-review evidence. This is append-only operational blocker evidence only; it is not a Pi consumer, public executor configuration, terminal unattended completion, durable/live transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task253-service-owned-unattended-real-host-completion-certification-prerequisite.test.mjs`.
- Added `recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite()` and `POST /release/pi-codex-lifecycle/unattended-real-host-completion-certification-prerequisite`.
- Added append-only `comath.pi_codex_unattended_real_host_completion_certification_prerequisite.v1` manifests and `release.pi_codex_unattended_real_host_completion_certification_prerequisite_recorded` audit events.
- Added the `pi_codex_unattended_real_host_completion_certification_prerequisite_gate` status capability.
- Registered phase0 release-hardening discovery and updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task253 service test: after `corepack pnpm --filter @comath/comathd build`, `node services/comathd/tests/unit/goal3-task253-service-owned-unattended-real-host-completion-certification-prerequisite.test.mjs` failed because `recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite` was not exported.
- Follow-up RED was observed when focused Task253 failed because completion overclaim text `terminal unattended completion certified` was not yet covered by the shared sanitizer.
- Read-only sidecar review then found two Task253 gaps: success-shaped review artifacts without result evidence could pass, and the prerequisite result copied executor command/result/stdout material into the new artifact/route response. A regression was added and observed RED when focused Task253 failed on leaked `execution_attempt_command`, `execution_attempt_result`, and `SHOULD_NOT_LEAK_EXECUTOR_STDOUT` output.
- The follow-up fix keeps Task251 review result evidence internal to validation only: Task253 now rejects success/failed reviews without command/result/result-artifact fields and AgentRun log-session route binding, and it no longer persists or returns executor command/result/result artifact fields in prerequisite output.
- After implementation, focused Task253 exited 0.
- Adjacent Task251 and Task249 service regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task253 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task252, comathd package tests through Task253, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task253 derives the canonical Task251 review path from `attempt_review_id`, treats caller path/hash only as expected values, re-reads the review artifact bytes, rejects stale hashes, duplicate prerequisite ids, non-canonical paths, malformed JSON, promotional review artifacts, success/failed review states without result evidence, and review states without AgentRun log-session route binding even when hash-current. The prerequisite manifest and audit event do not expose executor command/result/stdout material and keep `completion_certificate_available=false`, `terminal_unattended_completion_certified=false`, `unattended_real_host_execution_completed=false`, `durable_transport_provided=false`, `live_transport_open=false`, `pi_direct_write_allowed=false`, `direct_trusted_state_mutation=false`, `proof_authority="none"`, and `can_certify_ga=false`.

Residual risk: Goal 3 remains incomplete. Task253 does not add a Pi-facing prerequisite consumer/planner step, durable long-lived operator transport, public executor configuration, production unattended real-host completion certification, Pi trusted-state mutation, Lean/mathlib proof replay authority, claim promotion, real installed-toolchain Mathlib smoke completion, broad final release-candidate proof breadth, production OS-isolation helper binaries, or GA certification.

# Goal 3 Task 252 / Pi Unattended Real-Host Execution Attempt Review Consumer

Scope: expose the Task251 service-owned attempt-review gate through the Pi extension as a host-confirmed thin client and read-only planner checkpoint. This is Pi consumer wiring only; it is not public executor configuration, caller attempt-result authority, terminal unattended completion, durable/live transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task252-pi-unattended-real-host-execution-attempt-review-consumer.test.mjs`.
- Added `comath.release.piCodexLifecycleUnattendedRealHostExecutionAttemptReview` and `/cm:release lifecycle-unattended-real-host-execution-attempt-review`.
- Added the interactive real-Pi planner checkpoint after execution attempt and before Codex API probe/review.
- Registered the runtime subcommand, Phase6/Phase26 exposure checks, package-test discovery, and phase0 release-hardening discovery.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task252 Pi test: after `corepack pnpm --filter @comath/pi-extension build`, `node tests/goal3-task252-pi-unattended-real-host-execution-attempt-review-consumer.test.mjs` failed because `comath.release.piCodexLifecycleUnattendedRealHostExecutionAttemptReview` was not registered.
- After implementation, focused Task252 exited 0. Follow-up RED was observed when focused Task252 failed because non-attempt lifecycle aliases were still translated by the generic public-alias helper; Task252 now accepts only `service-owned-pi-lifecycle/<attempt_id>/unattended-real-host-execution-attempt.json` public aliases before converting them inside the service request.
- Adjacent Task250, Task248, Task223, Phase6, and Phase26 Pi regressions exited 0.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task252 discovered by the default Pi runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests with Task252, comathd package tests through Task251, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task252 calls only the Task251 `POST /release/pi-codex-lifecycle/unattended-real-host-execution-attempt-review` service route through Pi host confirmation. It strips caller/model `confirmation_id`, requires attempt id/path/hash, translates only `service-owned-pi-lifecycle/<attempt_id>/unattended-real-host-execution-attempt.json` aliases to service-canonical paths inside the comathd request, keeps the interactive planner read-only, and does not expose or forward public `executor_command` or caller-supplied attempt results. Public Pi output forces proof, GA, durable/live transport, direct-Pi-write, direct-trusted-state, terminal unattended completion, and unattended-execution authority flags false.

Residual risk: Goal 3 remains incomplete. Task252 does not provide durable long-lived operator transport, public executor configuration, production unattended real-host completion certification, Pi trusted-state mutation, Lean/mathlib proof replay authority, claim promotion, real installed-toolchain Mathlib smoke completion, broad final release-candidate proof breadth, production OS-isolation helper binaries, or GA certification.

# Goal 3 Task 251 / Service-Owned Unattended Real-Host Execution Attempt Review

Scope: add a service-owned terminal review over Task249 attempt/blocker evidence. This is append-only operational blocker evidence only; it is not a Pi consumer, public executor configuration, terminal unattended completion, durable/live transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task251-service-owned-unattended-real-host-execution-attempt-review.test.mjs`.
- Added `reviewPiCodexLifecycleUnattendedRealHostExecutionAttempt()` and `POST /release/pi-codex-lifecycle/unattended-real-host-execution-attempt-review`.
- Added append-only `comath.pi_codex_unattended_real_host_execution_attempt_review.v1` manifests and `release.pi_codex_unattended_real_host_execution_attempt_reviewed` audit events.
- Registered the service capability and phase0 release-hardening discovery.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task251 service test: after `corepack pnpm --filter @comath/comathd build`, `node services/comathd/tests/unit/goal3-task251-service-owned-unattended-real-host-execution-attempt-review.test.mjs` failed because `reviewPiCodexLifecycleUnattendedRealHostExecutionAttempt` was not exported.
- After implementation, focused Task251 exited 0.
- Adjacent Task249, Task247, Task245, and Task241 service regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task251 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task250, comathd package tests through Task251, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task251 derives the canonical attempt path from `attempt_id`, treats caller path/hash only as expected values, re-reads the Task249 attempt, replays the readiness/handoff/approval/executor/durable chain, and verifies any attempt result artifact before writing review evidence. Executor-unavailable and failed attempts remain blockers; an exit-code-0 bounded attempt is classified `blocked_terminal_unattended_completion_review_required` with `terminal_unattended_completion_certified=false`. Public/audit output keeps proof, GA, durable/live transport, direct-Pi-write, direct-trusted-state, terminal-completion, and unattended-execution authority flags false.

Residual risk: Goal 3 remains incomplete. Task251 does not add a Pi-facing attempt-review consumer/planner step, provide durable long-lived operator transport, expose public executor configuration, complete production unattended real-host execution, mutate Pi trusted state, run Lean, change Lean/mathlib proof replay authority, promote claims, complete real installed-toolchain Mathlib smoke coverage, complete broad final release-candidate proof breadth, ship production OS-isolation helper binaries, or certify GA.

# Goal 3 Task 250 / Pi Unattended Real-Host Execution Attempt Consumer

Scope: expose the Task249 service-owned execution attempt/blocker gate through the Pi extension as a host-confirmed thin client and read-only planner checkpoint. This is Pi consumer wiring only; it is not public executor configuration, terminal unattended completion, durable/live transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task250-pi-unattended-real-host-execution-attempt-consumer.test.mjs`.
- Added `comath.release.piCodexLifecycleUnattendedRealHostExecutionAttempt` and `/cm:release lifecycle-unattended-real-host-execution-attempt`.
- Added the interactive real-Pi planner checkpoint after readiness and before Codex API probe/review.
- Registered the runtime subcommand, Phase6/Phase26 exposure checks, package-test discovery, and phase0 release-hardening discovery.
- Updated README, TODO, AGENTS, GA release criteria, threat model, adapter contracts, and this tracker wording.

Verification:
- TDD RED was observed after adding the focused Task250 Pi test: after `corepack pnpm --filter @comath/pi-extension build`, `node tests/goal3-task250-pi-unattended-real-host-execution-attempt-consumer.test.mjs` failed because `comath.release.piCodexLifecycleUnattendedRealHostExecutionAttempt` was not registered.
- Follow-up RED was observed after initial implementation: focused Task250 failed because public summary text still exposed `execution_attempted=true` / `execution_attempt_succeeded=true`; the Pi public sanitizer now treats those as unattended-execution overclaims.
- After implementation, focused Task250 exited 0.
- Adjacent Task248, Task223, Phase6, and Phase26 Pi regressions exited 0.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task250 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests with Task250, comathd package tests through Task249, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task250 calls only the existing Task249 service route through Pi host confirmation. It strips caller/model `confirmation_id`, requires readiness id/path/hash, translates public `service-owned-pi-lifecycle/.../unattended-real-host-execution-readiness.json` aliases to service-canonical request paths only inside the comathd request, keeps the interactive planner read-only, does not expose or forward public `executor_command`, and sanitizes public request/result/confirmation/notification surfaces. Public Pi output forces proof, GA, durable/live transport, direct-Pi-write, direct-trusted-state, executor-invoked, execution-attempt-success, and unattended-completion flags false.

Residual risk: Goal 3 remains incomplete. Task250 does not provide terminal unattended real-host completion review, durable long-lived operator transport, public executor configuration, Pi trusted-state mutation, Lean/mathlib proof replay authority, claim promotion, real installed-toolchain Mathlib smoke completion, broad final release-candidate proof breadth, production OS-isolation helper binaries, or GA certification.

# Goal 3 Task 249 / Service-Owned Unattended Real-Host Execution Attempt Gate

Scope: add the first service-owned attempt/blocker gate after prerequisite-recorded unattended real-host readiness. This is operational provenance only; it is not a Pi consumer, terminal unattended completion, durable/live transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task249-pi-unattended-real-host-execution-attempt.test.mjs`.
- Added `recordPiCodexLifecycleUnattendedRealHostExecutionAttempt()` and `POST /release/pi-codex-lifecycle/unattended-real-host-execution-attempt`.
- Added append-only `comath.pi_codex_unattended_real_host_execution_attempt.v1` manifests, optional `comath.pi_codex_unattended_real_host_execution_attempt_result.v1` result artifacts, and attempt/blocker audit events.
- The attempt gate consumes only current `unattended_real_host_execution_prerequisites_recorded` readiness and re-reads the handoff review, operator approval, executor contract, durable-transport prerequisite, and continuity chain before writing evidence.
- Executor commands are explicit service inputs only: allowlisted absolute program, fixed argv/env, `shell:false`, bounded timeout, sanitized stdout/stderr, and no proof/GA authority.

Verification:
- TDD RED was observed after adding the focused Task249 service test: after `corepack pnpm --filter @comath/comathd build`, `node services/comathd/tests/unit/goal3-task249-pi-unattended-real-host-execution-attempt.test.mjs` failed because `recordPiCodexLifecycleUnattendedRealHostExecutionAttempt` was not exported.
- Follow-up RED was observed for failed executor attempts: focused Task249 failed because failed executor attempts were incorrectly audited as recorded attempts rather than blocked attempts.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task249 exited 0.
- Adjacent service regressions Task247, Task245, Task243, and Task241 exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task249 discovered by the default runner.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests through Task248, comathd package tests through Task249, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task249 writes a replayable `blocked_unattended_real_host_executor_unavailable` manifest when no executor command is supplied. When a command is supplied, process output and exit status are attempt evidence only. Public/result/audit surfaces force completion, unattended authorization, proof, GA, durable/live transport, direct-Pi-write, and direct-trusted-state flags false.

# Goal 3 Task 248 / Pi Unattended Real-Host Durable Transport Contract Consumer

Scope: expose the Task247 service-owned durable-transport prerequisite contract through the Pi extension as a host-confirmed thin client and read-only planner step. This is prerequisite-consumer wiring only; it is not a CoMath transport stack, durable/live channel, executor invocation, unattended execution authorization, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task248-pi-unattended-real-host-durable-transport-contract-consumer.test.mjs`.
- Added `comath.release.piCodexLifecycleUnattendedRealHostDurableTransportContract` plus `/cm:release lifecycle-unattended-real-host-durable-transport-contract`.
- Added the durable prerequisite planner step between executor contract and readiness.
- Extended the readiness Pi consumer so optional durable-contract id/path/hash bindings are all-or-nothing and translated to service-canonical request paths only inside the comathd request.
- Synchronized runtime-registration subcommands, Phase6/Phase26 exposure guards, Task223/242/244/246 planner expectations, Pi package test discovery, phase0 smoke discovery, README, AGENTS, TODO, adapter contracts, GA release criteria, threat model, REVIEW, and the Goal 3 tracker.

Verification:
- TDD RED was observed after adding the focused Task248 test: `node tests/goal3-task248-pi-unattended-real-host-durable-transport-contract-consumer.test.mjs` failed because `comath.release.piCodexLifecycleUnattendedRealHostDurableTransportContract` was not registered.
- After implementation, `corepack pnpm --filter @comath/pi-extension build` exited 0.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task248, Task246, Task244, Task242, Task223, Phase6, and Phase26 covered by the package runner.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Adjacent service Task247 exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests with Task248, comathd package tests through Task247, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task248 calls only the existing Task247 `POST /release/pi-codex-lifecycle/unattended-real-host-durable-transport-contract` service route through Pi host confirmation. It strips caller/model `confirmation_id`, translates public `service-owned-pi-lifecycle/...` aliases to service-canonical request paths only inside the comathd request, keeps the interactive planner read-only, and sanitizes public request/result/confirmation/notification surfaces. Readiness may forward a complete durable-contract id/path/hash binding, but incomplete bindings fail before any POST. Public Pi output forces proof, GA, durable/live transport, direct-Pi-write, direct-trusted-state, executor-invoked, and unattended-execution flags false.

# Goal 3 Task 247 / Service-Owned Unattended Real-Host Durable Transport Contract

Scope: add a service-owned durable-transport prerequisite contract after the Task239 handoff review, Task243 operator approval, Task245 executor contract, and Task229 maintained transport continuity. This is prerequisite evidence only; it is not a CoMath transport stack, durable/live channel, unattended execution authorization, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task247-pi-unattended-real-host-durable-transport-contract.test.mjs`.
- Added `recordPiCodexLifecycleUnattendedRealHostDurableTransportContract()` and `POST /release/pi-codex-lifecycle/unattended-real-host-durable-transport-contract`.
- Added append-only `comath.pi_codex_unattended_real_host_durable_transport_contract.v1` manifests and `release.pi_codex_unattended_real_host_durable_transport_contract_recorded` audit events.
- Extended `recordPiCodexLifecycleUnattendedRealHostExecutionReadiness()` so a current durable-transport prerequisite contract removes only `durable_transport_not_provided` and records `unattended_real_host_execution_prerequisites_recorded` while all approval/execution/durable-live/proof/GA flags remain false.
- Synchronized phase0 smoke discovery, README, AGENTS, TODO, adapter contracts, GA release criteria, threat model, REVIEW, and the Goal 3 tracker without adding a Pi consumer, opening transport, invoking an executor, or claiming GA readiness.

Verification:
- TDD RED was observed before implementation when focused Task247 failed because `recordPiCodexLifecycleUnattendedRealHostDurableTransportContract` was not exported.
- Review-driven RED coverage then reproduced malformed durable-contract handling and boundary drift before hardening: missing `transport_continuity_artifact` produced a raw `TypeError`, nested artifact metadata drift was not fully rejected, non-canonical continuity paths could be supplied, a continuity artifact from a different handoff chain could cross the boundary, and durable-contract audit events lacked explicit false authority/transport flags.
- After implementation and hardening, `corepack pnpm --filter @comath/comathd build`, focused Task247, adjacent Task229/233/239/241/243/245 regressions, `corepack pnpm --filter @comath/comathd typecheck`, `node scripts/phase0-smoke.mjs`, `corepack pnpm --filter @comath/comathd test`, `corepack pnpm typecheck`, and `corepack pnpm test` all exited 0; phase0 reported 33 required entries and 33 invariants, Task247 was discovered by package/root runners, `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task247 binds current service-owned checkpoint artifacts by id/path/hash and rejects CoMath-owned transport-stack kinds, incomplete readiness bindings, stale durable-contract hashes, duplicate ids, and poisoned live/promotional durable contracts. It records that the durable-transport prerequisite is represented, not that a durable/live transport exists. Readiness may clear the final missing-prerequisite blocker only when the contract is current; it still does not approve or execute a handoff, authorize unattended execution, mutate Pi trusted state, open transport, run Lean, promote claims, or certify GA.

# Goal 3 Task 246 / Pi Unattended Real-Host Executor Contract Consumer

Scope: expose the Task245 service-owned unattended real-host executor contract checkpoint through the Pi extension as a host-confirmed thin client and read-only planner step. This is executor-prerequisite consumer wiring only; it is not an executor invocation, unattended execution authorization, durable transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task246-pi-unattended-real-host-executor-contract-consumer.test.mjs`.
- Added `comath.release.piCodexLifecycleUnattendedRealHostExecutorContract` plus `/cm:release lifecycle-unattended-real-host-executor-contract`.
- Wired the tool to call only `POST /release/pi-codex-lifecycle/unattended-real-host-executor-contract` through host confirmation, strip caller/model `confirmation_id`, translate public handoff-review aliases to service-canonical request paths, and sanitize public request/result/confirmation/notification surfaces.
- Extended the Task242 readiness Pi consumer so optional executor-contract bindings are all-or-nothing and are translated to service-canonical request paths only inside the comathd request.
- Hardened the public text sanitizer for `executor_invoked=true` / `executorInvoked=true` string overclaims after read-only review identified that object keys were forced false but arbitrary text tokens were still possible.
- Updated the read-only interactive planner order to handoff review -> operator approval -> executor contract -> readiness, then synchronized Task223/242/244 planner regressions, Phase6/Phase26 exposure guards, Pi package test discovery, phase0 smoke discovery, README, AGENTS, TODO, adapter contracts, GA release criteria, threat model, REVIEW, and the Goal 3 tracker.

Verification:
- TDD RED was observed after updating the focused Task246 expectation to the Task245 service vocabulary: focused Task246 failed because Pi still sent `contract_record_only` instead of `production_unattended_real_host`.
- A read-only code-review pass found that free-text `executor_invoked=true` / `executorInvoked=true` overclaims were not sanitized; TDD RED was observed when focused Task246 failed on those string tokens before the sanitizer fix.
- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- Focused Task246 exited 0.
- Adjacent Task244, Task242, Task223, Phase6, and Phase26 Pi regressions exited 0.
- Adjacent Task245 service regression exited 0.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task246 discovered by the default Pi runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests with Task246, comathd package tests through Task245, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task246 does not change the Task245 service verifier, does not make public aliases source-of-truth paths, does not invoke an executor, does not approve or execute a handoff, does not authorize unattended host actions, does not mutate Pi trusted state directly, does not open durable/live transport, does not run Lean, does not promote claims, and does not certify GA. Public Pi output forces proof, GA, durable/live transport, direct-Pi-write, direct-trusted-state, executor-invoked, and unattended-execution flags false.

# Goal 3 Task 245 / Service-Owned Unattended Real-Host Executor Contract

Scope: add a service-owned unattended real-host executor contract checkpoint after the Task239 handoff review chain and before Task241 readiness consumption. This is executor-prerequisite evidence only; it is not real unattended host execution, durable transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task245-pi-unattended-real-host-executor-contract.test.mjs`.
- Added `recordPiCodexLifecycleUnattendedRealHostExecutorContract()` plus `POST /release/pi-codex-lifecycle/unattended-real-host-executor-contract`.
- Added append-only `comath.pi_codex_unattended_real_host_executor_contract.v1` manifests and `release.pi_codex_unattended_real_host_executor_contract_recorded` audit events.
- Extended `recordPiCodexLifecycleUnattendedRealHostExecutionReadiness()` so a current executor contract removes only `service_owned_unattended_executor_not_configured`; durable transport remains blocked.
- Registered the capability, phase0 smoke release-hardening discovery, GA release criteria, README, AGENTS, adapter contracts, threat model, REVIEW, and the Goal 3 tracker.

Verification:
- TDD RED was observed before implementation when the focused Task245 suite failed because `recordPiCodexLifecycleUnattendedRealHostExecutorContract` was not exported.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task245 exited 0, including invalid mode/kind/state, incomplete readiness binding, stale executor hash, non-canonical executor path, wrong handoff binding, hash-current poisoned executor contract, service route, and audit regressions.
- Adjacent Task239, Task241, Task243, Task233, and Pi Task244 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task245 discovered by the default runner.
- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests with Task244, comathd package tests through Task245, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task245 re-reads the canonical Task239 handoff review artifact and caller-supplied hash, rejects duplicate executor contract ids, stale handoff-review hashes, invalid executor modes/kinds/states, poisoned executor contracts consumed by readiness, non-canonical executor paths, and authority-shaped caller fields. The executor contract keeps executor-invoked/execution/proof/GA/durable/live/direct-Pi-write/trusted-state flags false and does not authorize production unattended execution.

# Goal 3 Task 244 / Pi Unattended Real-Host Operator Approval Consumer

Scope: expose the Task243 service-owned operator approval checkpoint through a host-confirmed Pi tool and `/cm:release` command, and thread complete approval bindings into the existing readiness consumer/planner. This is a thin client and planner checkpoint only; it is not unattended execution, durable transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task244-pi-unattended-real-host-operator-approval-consumer.test.mjs`.
- Added `comath.release.piCodexLifecycleUnattendedRealHostOperatorApproval` plus `/cm:release lifecycle-unattended-real-host-operator-approval`.
- Wired the tool to call only `POST /release/pi-codex-lifecycle/unattended-real-host-operator-approval` through host confirmation, strip caller/model `confirmation_id`, translate public handoff-review aliases to service-canonical request paths, and sanitize public request/result/confirmation/notification surfaces.
- Extended the readiness Pi consumer to accept and require complete optional operator-approval id/path/hash bindings when any approval binding field is present.
- Added `lifecycle-unattended-real-host-operator-approval` to the read-only interactive real-Pi planner before readiness, and made readiness commands include approval binding material when available.
- Registered the focused suite in Pi package test discovery, phase0 smoke release-hardening discovery, GA release criteria, README, AGENTS, TODO, adapter contracts, threat model, REVIEW, and the Goal 3 tracker.

Verification:
- The Task244 focused regression was already present in the resumed worktree; current verification confirmed it exercises the missing consumer boundary, sanitizer, planner order, runtime registration, and readiness binding behavior.
- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- Focused Task244 exited 0.
- Adjacent Task242 and Task223 regressions exited 0.
- Phase6 and Phase26 Pi registration regressions exited 0 from the package cwd after root-cause analysis showed repo-root invocations use the wrong `process.cwd()` for those package-local tests.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task244 discovered by the default Pi runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests with Task244, comathd package tests through Task243, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task244 does not change the Task243 service verifier, does not make public aliases source-of-truth paths, does not approve or execute a handoff, does not authorize unattended host actions, does not mutate Pi trusted state directly, does not open durable/live transport, does not run Lean, does not promote claims, and does not certify GA. Public Pi output forces proof, GA, durable/live transport, direct-Pi-write, direct-trusted-state, operator-approved, and unattended-execution flags false.

# Goal 3 Task 243 / Service-Owned Operator Approval Contract

Scope: add a service-owned manual operator-approval artifact after the Task239 handoff review chain and before Task241 readiness consumption. This is approval checkpoint evidence only; it is not unattended execution, durable transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task243-pi-unattended-real-host-operator-approval-contract.test.mjs`.
- Added `recordPiCodexLifecycleUnattendedRealHostOperatorApproval()` plus `POST /release/pi-codex-lifecycle/unattended-real-host-operator-approval`.
- Added append-only `comath.pi_codex_unattended_real_host_operator_approval.v1` manifests and `release.pi_codex_unattended_real_host_operator_approval_recorded` audit events.
- Extended `recordPiCodexLifecycleUnattendedRealHostExecutionReadiness()` so a current approval artifact removes only `operator_approval_artifact_missing`; executor and durable-transport blockers remain.
- Registered the capability, phase0 smoke release-hardening discovery, GA release criteria, README, AGENTS, adapter contracts, threat model, REVIEW, and the Goal 3 tracker.

Verification:
- TDD RED was observed before implementation when the focused Task243 suite failed because `recordPiCodexLifecycleUnattendedRealHostOperatorApproval` was not exported.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task243 exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task243 discovered by the default runner.
- `corepack pnpm typecheck`, `corepack pnpm build`, and `corepack pnpm test` exited 0.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task243 re-reads the canonical Task239 handoff review artifact and caller-supplied hash, rejects duplicate approval ids, stale handoff-review hashes, poisoned approval artifacts consumed by readiness, and authority-shaped caller fields. The approval artifact keeps operator-approved/execution/proof/GA/durable/live/direct-Pi-write/trusted-state flags false and does not authorize production unattended execution.

# Goal 3 Task 242 / Pi Unattended Real-Host Execution Readiness Consumer

Scope: expose the Task241 service-owned readiness blocker through a host-confirmed Pi tool and `/cm:release` command. This is a thin client and planner checkpoint only; it is not operator approval, unattended execution, durable transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task242-pi-unattended-real-host-execution-readiness-consumer.test.mjs`.
- Added `comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness` plus `/cm:release lifecycle-unattended-real-host-execution-readiness`.
- Wired the tool to call only `POST /release/pi-codex-lifecycle/unattended-real-host-execution-readiness` through host confirmation, strip caller/model `confirmation_id`, translate public lifecycle artifact aliases to service-canonical paths only inside the request, and sanitize public request/result surfaces.
- Added `lifecycle-unattended-real-host-execution-readiness` to the read-only interactive real-Pi planner after the Task240 handoff-review checkpoint.
- Registered the focused suite in Pi package test discovery, phase0 smoke release-hardening discovery, GA release criteria, README, AGENTS, TODO, adapter contracts, threat model, REVIEW, and the Goal 3 tracker.

Verification:
- TDD RED was observed before implementation when the focused Task242 suite failed because `comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness` was not registered.
- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- Focused Task242 exited 0.
- Adjacent Task223 and Task240 regressions exited 0.
- Phase6 and Phase26 Pi registration regressions exited 0 from the package cwd.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task242 discovered by the default Pi runner.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Adjacent Task224, Task225, Task227, Task229, Task233, Task239, and Task241 service regressions exited 0 after correcting one stale manual Task224 filename in the command.
- `corepack pnpm --filter @comath/comathd test` exited 0.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm build` exited 0 across workspaces.
- Initial `corepack pnpm test` exposed a Phase17 integrity guard failure because the Pi entrypoint carried a literal `.comath` canonical-path prefix; the fix now constructs that trusted runtime prefix at runtime while preserving the service request value.
- After the Phase17 fix, focused Task242, Pi build, direct Phase17 integrity evaluation, and final `corepack pnpm test` all exited 0.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task242 does not change the Task241 service verifier, does not make public aliases source-of-truth paths, does not approve or execute a handoff, does not authorize unattended host actions, does not create operator approval evidence, does not mutate Pi trusted state directly, does not open durable/live transport, does not run Lean, does not promote claims, and does not certify GA. Public Pi output forces proof, GA, durable/live transport, direct-Pi-write, direct-trusted-state, operator approval, and unattended-execution flags false. The Pi entrypoint does not carry literal trusted runtime paths in source; canonical `.comath/...` material is produced only as request data for the Task241 service route.

# Goal 3 Task 241 / Unattended Real-Host Execution Readiness Blocker

Scope: add a service-owned pre-execution readiness blocker after the Task239/240 handoff review path. This records why production unattended real-host execution is still blocked; it is not operator approval, unattended execution, durable transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task241-pi-unattended-real-host-execution-readiness-blocker.test.mjs`.
- Added `recordPiCodexLifecycleUnattendedRealHostExecutionReadiness()` to consume a current Task239 handoff review artifact from its canonical path/hash and write append-only blocked readiness evidence.
- Added `POST /release/pi-codex-lifecycle/unattended-real-host-execution-readiness`.
- Added `comath.pi_codex_unattended_real_host_execution_readiness.v1` manifests and `release.pi_codex_unattended_real_host_execution_readiness_blocked` audit events.
- Added the `pi_codex_unattended_real_host_execution_readiness_blocker` capability.
- Registered the focused suite in phase0 smoke release-hardening discovery, GA release criteria, README, AGENTS, TODO, adapter contracts, threat model, REVIEW, and the Goal 3 tracker.
- Read-only review found that poisoned prepared-checkpoint entries, poisoned service-route/transport primitive fields, `readiness_id=".."`, unsafe child lifecycle ids, and hash-only prepared checkpoint drift inside a hash-current Task239 review could still cross the Task241 handoff-review boundary. Follow-up RED coverage reproduced those gaps before the guard was hardened.

Verification:
- TDD RED was observed after `corepack pnpm --filter @comath/comathd build` when focused Task241 failed because `../../dist/index.js` did not export `recordPiCodexLifecycleUnattendedRealHostExecutionReadiness`.
- Reviewer-driven RED coverage then failed on poisoned prepared checkpoint entries.
- Final reviewer-driven RED coverage then failed on unsafe child lifecycle ids and hash-only prepared checkpoint drift embedded in the Task239 review.
- `corepack pnpm --filter @comath/comathd build` exited 0 after implementation and hardening.
- Focused Task241 exited 0.
- Adjacent Task239, Task233, Task224, Task225, Task227, and Task229 lifecycle regressions exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task241 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 including phase0 smoke, Pi workspace tests through Task240, comathd package tests through Task241, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.
- Worktree-only full package/root verification used an ignored local `.worktrees/MathProve-Skill` copy of the existing sibling MathProve scripts/skill material to satisfy Phase25/58 external-runner tests; no tracked runtime/build artifacts were added.

Boundary notes: Task241 does not execute a production unattended real-host workflow, does not approve a handoff, does not create operator approval evidence, does not mutate Pi trusted state, does not open durable/live transport, does not run Lean, does not promote claims, and does not certify GA. It records blocker reasons for missing operator approval artifact, missing service-owned unattended executor, and missing durable transport while forcing approval, execution, proof, GA, durable/live transport, direct-Pi-write, and trusted-state authority flags false. Task241 now also validates every prepared checkpoint entry against the expected id/order/public alias/canonical path/hash/current/non-authority flags by re-reading canonical child artifacts, rejects poisoned service-route/transport primitive fields, and rejects unsafe readiness/review/child lifecycle ids before marking the Task239 review current.

# Goal 3 Task 240 / Pi Unattended Real-Host Handoff Review Consumer

Scope: expose the Task239 service-owned unattended handoff review through a host-confirmed Pi tool and `/cm:release` command. This is a thin client and planner checkpoint only; it is not operator approval, unattended execution, durable transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task240-pi-unattended-real-host-handoff-review-consumer.test.mjs`.
- Added `comath.release.piCodexLifecycleUnattendedRealHostHandoffReview` plus `/cm:release lifecycle-unattended-real-host-handoff-review`.
- Wired the tool to call only `POST /release/pi-codex-lifecycle/unattended-real-host-handoff-review` through host confirmation, strip caller/model `confirmation_id`, pass prepared automatic-orchestration and transport-continuity public path/hash expected values, and sanitize public request/result surfaces.
- Added `lifecycle-unattended-real-host-handoff-review` to the read-only interactive real-Pi planner after the Task230 continuity checkpoint.
- Registered the focused suite in Pi package test discovery, phase0 smoke release-hardening discovery, GA release criteria, README, AGENTS, TODO, adapter contracts, threat model, REVIEW, and the Goal 3 tracker.
- Read-only review found that public sanitizer coverage did not yet neutralize natural-language operator-approval/GA/live-transport overclaims or camelCase approval/authority flags. Follow-up RED coverage reproduced the leak before `sanitizePublicProofAuthorityValue()` was hardened.

Verification:
- TDD RED was observed before implementation when focused Task240 failed because `comath.release.piCodexLifecycleUnattendedRealHostHandoffReview` was not registered.
- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- Focused Task240 exited 0.
- Adjacent Task223, Task231, and Task237 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task240 discovered by the default Pi runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 including phase0 smoke, Pi workspace tests with Task240, comathd package tests through Task239, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task240 does not change the Task239 service verifier, does not make public aliases source-of-truth paths, does not approve or execute a handoff, does not run unattended host actions, does not create operator approval evidence, does not mutate Pi trusted state directly, does not open durable/live transport, does not run Lean, does not promote claims, and does not certify GA. Public Pi output forces proof, GA, durable/live transport, direct-Pi-write, direct-trusted-state, operator approval, and unattended-execution flags false.

# Goal 3 Task 239 / Service-Owned Unattended Real-Host Handoff Review

Scope: add a service-owned append-only review over the prepared Pi/Codex lifecycle handoff chain. The review verifies freshness and chain binding for existing service-owned checkpoint artifacts; it is not operator approval, unattended execution, durable transport, direct Pi mutation, Lean execution, proof authority, promotion, or GA certification.

Implementation notes:
- Added `goal3-task239-service-owned-unattended-real-host-handoff-review.test.mjs`.
- Added `reviewPiCodexLifecycleUnattendedRealHostHandoff()` to derive canonical `.comath/release/pi-codex-lifecycle/...` artifact paths from ids, re-read runtime registration, operator session, recovery, lease, heartbeat, guided execution, terminal review, maintained transport contract, automatic orchestration, and continuity artifacts, and compare public prepared-checkpoint aliases/hashes only as expected values.
- Added append-only `.comath/release/pi-codex-lifecycle/<handoff_review_id>/unattended-real-host-handoff-review.json` persistence plus `release.pi_codex_unattended_real_host_handoff_reviewed` audit events.
- Added `POST /release/pi-codex-lifecycle/unattended-real-host-handoff-review`, the `pi_codex_unattended_real_host_handoff_review` capability, phase0 smoke release-hardening discovery, GA release criteria, README, AGENTS, TODO, adapter contracts, threat model, REVIEW, and the Goal 3 tracker.
- Read-only review found two chain-review hardening gaps: continuity resume checkpoints needed to be re-bound to the Task225 transport contract cursor/body hash, and audit events needed to hash-bind the exact review artifact and checkpoint order/hash summary. Focused RED coverage reproduced both before the verifier/audit payload was hardened.

Verification:
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task239 exited 0.
- Adjacent Task224, Task225, Task227, and Task229 lifecycle regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task239 discovered by the default runner.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.
- After reviewer hardening, focused Task239, adjacent Task224/225/227/229, `corepack pnpm --filter @comath/comathd build`, `node scripts/phase0-smoke.mjs`, `corepack pnpm --filter @comath/comathd typecheck`, `corepack pnpm --filter @comath/comathd test`, and `corepack pnpm test` all exited 0 again.

Boundary notes: Task239 records freshness and chain-review evidence only. Public `service-owned-pi-lifecycle/...` aliases are never source-of-truth paths; the service derives canonical paths from ids and recomputes hashes from artifacts. Duplicate review ids, stale hashes, invalid aliases, chain tampering, stale continuity resume hashes, secrets, proof-success wording, long-lived transport wording, and unattended-execution or approval-shaped overclaims fail closed or are sanitized. Audit events bind the exact review artifact hash/size plus prepared checkpoint order/hash summaries. All approval, execution, unattended authorization/completion, durable/live transport, direct trusted mutation, proof authority, promotion, and GA certification flags remain false.

# Goal 3 Task 238 / Campaign Live Mathlib No-Download Fixture Preflight

Scope: add a bounded preflight before Task218/219 host/import diagnostics for campaign-native live Mathlib replay requests. It validates only that Task214 dependency-material checks and Task216 local Mathlib provisioning diagnostics are ready without downloads. It is not a downloader, Lean/Lake execution path, Lake import resolver, theorem search adapter, proof authority, final replay allocation, claim promotion, or GA certification.

Implementation notes:
- Added `goal3-task238-campaign-live-mathlib-no-download-fixture-preflight.test.mjs`.
- Added `evaluateCampaignLiveMathlibNoDownloadFixturePreflight()` to compose the existing dependency-material and provisioning checks.
- Wired final replay request parsing to persist `.comath/campaign/<CAM>/mathlib_no_download_fixture_preflight.json` before provisioning, host replay, import-graph diagnostics, or final replay allocation.
- Bound the preflight path/hash into later provisioning and host diagnostic artifacts.
- Added `campaign_live_mathlib_no_download_fixture_preflight` to service capabilities, phase0 smoke release-hardening discovery, GA release criteria, README, AGENTS, TODO, adapter contracts, threat model, REVIEW, and the Goal 3 tracker.

Verification:
- Focused Task238 exited 0 after resuming the partial implementation already present in the live worktree.
- Adjacent Task216, Task218, and Task219 regressions exited 0.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `node --check services/comathd/tests/unit/goal3-task238-campaign-live-mathlib-no-download-fixture-preflight.test.mjs` exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Initial `corepack pnpm --filter @comath/comathd test` hit a 300s command timeout without assertion output; process inspection found no leftover test Node processes, and the longer rerun exited 0 with Task238 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 including phase0 smoke, Pi workspace tests, comathd package tests with Task238, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.
- Read-only review found that the first Task216/Task238 symlink assertions could silently skip on Windows `EPERM`, and that adapter docs could read as if Mathlib fixture preflight bridges to OS-isolation evidence. Task216/Task238 tests now create a directory symlink or junction and fail the test if no fixture can be created; Task238 also covers root Mathlib package symlinks. Focused Task216 and Task238 reruns exited 0, and adapter docs now refer explicitly to the sandbox-launch preflight.
- After those reviewer fixes, `corepack pnpm --filter @comath/comathd test` exited 0 and `corepack pnpm test` exited 0 again.

Boundary notes: Task238 records only non-authoritative local hash provenance for already materialized Mathlib package files. It rejects missing material, local `Mathlib` shadowing, floating revisions, and package symlinks; it executes no Lean/Lake command, attempts no dependency download, allocates no `.comath/lean/final_replay`, keeps `proof_authority="none"`, keeps `can_promote_claim=false`, and does not certify GA.

# Goal 3 Task 237 / Prepared Handoff Operator Review Checklist

Scope: add a Pi-only read-only operator review checklist for Task231 prepared checkpoint handoff refs, without adding a `comathd` route, persisting a review manifest, verifying artifact freshness, approving or executing a handoff, creating service evidence, opening durable transport, changing Lean proof authority, or certifying GA.

Implementation notes:
- Added `goal3-task237-pi-prepared-handoff-operator-review-checklist.test.mjs`.
- Extended `comath.release.piCodexLifecycleInteractiveRealPi` with `action="operator-review-checklist"` and the `/cm:release lifecycle-interactive-real-pi operator-review-checklist` runtime path.
- Added `operator_review_checklist` output that reuses the Task231 prepared checkpoint refs, renders ordered manual-review items, blocks on missing/poisoned refs, and forces proof/GA/durable/live/direct-Pi-write/trusted-state/service-evidence/execution flags false.
- Registered the focused suite in the Pi package test script, phase0 smoke release-hardening list, GA release criteria, README, AGENTS, TODO, adapter contracts, threat model, REVIEW, and this tracker.

Verification:
- TDD RED was observed before implementation when the focused Task237 suite failed because the interactive planner action enum did not expose `operator-review-checklist`.
- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- Focused Task237 exited 0.
- Adjacent Task231 and Task223 exited 0 after synchronizing the Task223 action enum expectation.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task237 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task237 validates only public path/hash shape and missing fields for prepared refs. It does not prove the referenced artifacts are fresh or service-chain-valid, does not approve execution, does not call `comathd`, does not mutate trusted state, does not create service-owned evidence, does not open durable/live transport, does not run Lean, does not promote claims, and does not certify GA.

# Goal 3 Task 236 / macOS Out-of-Scope Documentation Guard

Scope: remove macOS from current GA environment-adaptation documentation, sample configuration, and release-hardening smoke scope. Historical Task235 runtime regression coverage remains as internal/historical evidence, but public current-scope docs must not advertise macOS helper handles, `sandbox-exec` host-facility names, profile-contract kinds, or a focused release-hardening suite as active GA adaptation targets.

Implementation notes:
- Added `goal3-task236-macos-out-of-scope-docs.test.mjs` to enforce the out-of-scope sentence across README, AGENTS, TODO, config docs, adapter contracts, GA release criteria, and threat model.
- Removed the macOS provider-helper entry and env handles from `config/comath.sample.json`, `config/README.md`, and `scripts/phase0-smoke.mjs`.
- Replaced current public Task235 wording in README, AGENTS, TODO, adapter contracts, GA criteria, and threat model with Task236 removed-platform wording.
- Updated Task184 sample-config expectations so legacy cross-provider tests no longer require macOS as a current sample-config provider while preserving runtime-level historical provider coverage.

Verification:
- TDD RED was observed before implementation when the new Task236 suite failed on README/current docs still advertising macOS scope.
- Focused Task236 exited 0.
- Focused Task235 exited 0, confirming the internal historical regression remains intact.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Initial `corepack pnpm --filter @comath/comathd test` exposed the stale Task184 sample-config assertion requiring `macos_sandbox_exec`; after synchronizing Task184 with Task236, focused Task184 exited 0.
- Read-only reviewer found that the first Task184 sync would treat Firejail as compatible on Darwin even though that platform is now out of current scope. Task184 now skips the compatible-provider positive path on Darwin and keeps Linux/Windows positive coverage.
- Final `node --check services/comathd/tests/unit/goal3-task184-agent-adapter-os-isolation-cross-provider-helper-assets.test.mjs`, focused Task184, and focused Task236 exited 0 after the reviewer fix.
- Final `corepack pnpm --filter @comath/comathd test` exited 0 with Task236 discovered by the default runner.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.
- `corepack pnpm test` exited 0 across phase0 smoke, Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task236 is documentation/config/smoke scope correction only. It does not delete the internal Task235 runtime code path, does not claim production OS isolation, does not affect Lean/mathlib proof authority, does not provide real-Pi evidence, and does not certify GA.

# Goal 3 Task 235 / macOS Sandbox-Exec Production-Helper Profile Contract

Scope: add a macOS `sandbox-exec` production-helper profile contract to the existing provider-helper lineage path, without adding a macOS runner, running `sandbox-exec`, inspecting sandbox profile/policy state, treating helper metadata as OS-enforcement proof, changing Lean proof authority, creating real-Pi evidence, or certifying GA.

Implementation notes:
- Added `goal3-task235-agent-adapter-os-isolation-macos-sandbox-exec-production-helper-profile-contract.test.mjs`.
- Extended the service-derived `production_helper_profile_contract` generator from OCI/Nix/Firejail to macOS `sandbox-exec`.
- Added `agent_adapter_os_isolation_macos_sandbox_exec_production_helper_profile_contract` to the service capability ledger.
- Registered macOS profile-contract metadata in sample config, phase0 smoke, GA release criteria, adapter contracts, threat model, README, AGENTS, TODO, REVIEW, and the Goal 3 tracker.

Verification:
- TDD RED was observed before implementation: focused Task235 failed because `getComathdStatus().capabilities` did not advertise `agent_adapter_os_isolation_macos_sandbox_exec_production_helper_profile_contract`.
- Read-only code review found one Important boundary gap: Darwin deployments could misconfigure the macOS helper env var to the `sandbox-exec` facility tool itself. A follow-up RED regression first reproduced this as an accepted bad runner; the implementation now rejects `sandbox-exec` / `sandbox-exec.exe` as a macOS provider-helper protocol executable at runner, config resolver, host-validation, and execution gates before any spawn.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `node --check services/comathd/tests/unit/goal3-task235-agent-adapter-os-isolation-macos-sandbox-exec-production-helper-profile-contract.test.mjs` exited 0.
- Focused Task235 exited 0.
- Adjacent Task234, Task232, Task222, Task212, Task184, Task196, and Task211 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task235 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 including phase0 smoke, Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task235 is lineage and anti-confusion metadata only. It binds macOS helper profile source, helper binary hash, macOS `sandbox-exec` facility family, disabled network policy, no-new-privileges, path-free `macos_sandbox_exec_cli`, and non-authority flags through existing provider-runner, host-validation, helper-execution, and collection manifests. It rejects the `sandbox-exec` facility tool itself as a provider-helper protocol executable. It does not run `sandbox-exec`, inspect sandbox profile/policy state, ship a production helper, prove OS enforcement, affect Lean/mathlib proof authority, produce real-Pi evidence, or certify GA.

# Goal 3 Task 234 / Firejail Production-Helper Profile Contract

Scope: add a Firejail production-helper profile contract to the existing provider-helper lineage path, without adding a Firejail runner, running Firejail, inspecting Firejail profile/policy state, treating helper metadata as OS-enforcement proof, changing Lean proof authority, creating real-Pi evidence, or certifying GA.

Implementation notes:
- Added `goal3-task234-agent-adapter-os-isolation-firejail-production-helper-profile-contract.test.mjs`.
- Extended the service-derived `production_helper_profile_contract` generator from OCI/Nix to Firejail.
- Added `agent_adapter_os_isolation_firejail_production_helper_profile_contract` to the service capability ledger.
- Registered Firejail profile-contract metadata in sample config, phase0 smoke, GA release criteria, adapter contracts, threat model, README, AGENTS, TODO, REVIEW, and the Goal 3 tracker.

Verification:
- TDD RED was observed before implementation: focused Task234 failed because `getComathdStatus().capabilities` did not advertise `agent_adapter_os_isolation_firejail_production_helper_profile_contract`.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task234 exited 0.
- Adjacent Task232, Task222, Task212, Task184, Task196, and Task211 regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task234 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 including phase0 smoke, Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task234 is lineage and anti-confusion metadata only. It binds Firejail helper profile source, helper binary hash, Firejail facility family, disabled network policy, no-new-privileges, path-free `firejail_cli`, and non-authority flags through existing provider-runner, host-validation, helper-execution, and collection manifests. It does not run Firejail, inspect Firejail profile/policy state, ship a production helper, prove OS enforcement, affect Lean/mathlib proof authority, produce real-Pi evidence, or certify GA.

# Goal 3 Task 233 / Operator-Service Transport Check-Debug

Scope: revalidate the Task220-231 operator/service transport and prepared handoff chain through focused release-hardening coverage, without adding a new transport route, Pi mutating tool, background stream owner, direct trusted-state mutation, Lean execution, proof authority, claim promotion, or GA certification.

Implementation notes:
- Added `goal3-task233-pi-operator-service-transport-check-debug.test.mjs`.
- Added `pi_codex_operator_service_transport_check_debug` to the service capability ledger.
- Registered Task233 in phase0 smoke, GA release criteria, threat model, README, AGENTS, TODO, REVIEW, and the Goal 3 tracker.
- The focused suite exercises existing automatic real-Pi orchestration, maintained transport contract, continuity checkpoint, duplicate-id rejection, stale/tampered Task225 contract rejection, missing contract-hash rejection, service route sanitization, public authority flags, and audit non-authority boundaries.

Verification:
- TDD RED was observed before implementation: focused Task233 failed because `getComathdStatus().capabilities` did not advertise `pi_codex_operator_service_transport_check_debug`.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task233 exited 0.
- Adjacent Task220, Task221, Task225, and Task229 service regressions exited 0.
- Adjacent Task226, Task230, and Task231 Pi regressions exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` initially exposed a stale TODO compatibility anchor because the Task232 regression still requires the literal `Task213-232 summary`; after restoring that anchor while retaining Task233 text, focused Task232 and Task233 exited 0 and the final `@comath/comathd test` exited 0 with Task233 discovered by the default runner.
- `corepack pnpm --filter @comath/pi-extension test` exited 0.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 including phase0 smoke, Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task233 is check-debug coverage only. It keeps the existing Node HTTP AgentRun log-session route plus Pi `fetch`/`getText` primitive visible and non-authoritative; it does not create a new service route, new Pi tool, WebSocket/SSE owner, direct Pi write path, unattended executor, Lean replay, proof authority, claim promotion, real-host execution completion, or GA certification.

# Goal 3 Task 232 / Nix Production-Helper Profile Contract

Scope: add a Nix sandbox production-helper profile contract so release audits can distinguish operator-configured Nix helpers from bundled provider-helper protocol assets without treating either path as a Nix runner, Nix store/profile probe, proof authority, OS-enforcement proof, readiness evidence by itself, real-Pi evidence, broad provider support, or GA certification.

Implementation notes:
- Added `goal3-task232-agent-adapter-os-isolation-nix-production-helper-profile-contract.test.mjs` and generalized the service-derived `production_helper_profile_contract` material/hash path from OCI-only to OCI plus Nix.
- Task232 records Nix helper profile source, helper binary hash, path-free `nix_cli` / `nix_store_cli` host-facility tool names, disabled network policy, no-new-privileges, no command/env override, no store/profile inspection, no Nix command execution requirement for the profile contract, and non-authority flags.
- Local diff review found and fixed a generic-gate gap: host-validation executable checks and helper-execution collectability checks now require a valid profile contract for any provider with a profile spec, not only `oci_container`.
- On Windows, the focused suite asserts the Nix host-capability path fails closed with a compatible-host replayable blocker while still binding the runner-level Nix profile contract. On Linux/macOS, the same suite exercises the full host-validation, helper-execution, drift rejection, and collection profile-contract path.
- Read-only subagent review confirmed the real Mathlib smoke fixture is not prepared; a second reviewer recommended a transport check-debug loop, which remains a valid next frontier, but Task232 chose the explicit provider-family helper contract frontier from the live tracker.

Verification:
- TDD RED was observed before implementation: focused Task232 failed because `getComathdStatus().capabilities` did not advertise `agent_adapter_os_isolation_nix_sandbox_production_helper_profile_contract`.
- After implementation, a test root-cause fix for Windows Nix platform compatibility, and the generic-gate fix above, focused Task232 exited 0.
- Adjacent Task212, Task222, Task184, Task196, Task211, Task202, Task203, and Task206 regressions exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task232 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task232 does not ship a production Nix helper implementation, run Nix, inspect Nix store/profile state, expose helper or Nix paths, prove OS enforcement from profile lineage metadata, expose direct Pi collection/witness-chain payloads, affect Lean/mathlib proof authority, provide real-Pi evidence, provide broad provider support, or certify GA.

# Goal 3 Task 231 / Prepared Unattended Real-Pi Handoff UX

Scope: extend the existing read-only interactive real-Pi planner with an `unattended-handoff` mode over already prepared service-owned checkpoint path/hash references, without adding a service route, mutating Pi tool, durable transport stack, direct trusted-state mutation, proof authority, or GA certification.

Changes:

- Added `goal3-task231-pi-prepared-unattended-real-pi-handoff-ux.test.mjs`.
- Added `unattended-handoff` to `comath.release.piCodexLifecycleInteractiveRealPi` and `/cm:release lifecycle-interactive-real-pi`.
- Added prepared checkpoint path/hash readiness checks for runtime probe, operator session, transport recovery, lease, heartbeat, guided execution, terminal review, transport contract, automatic orchestration, and transport continuity refs.
- Hardened public sanitization for operator-free/unattended-executor overclaim phrases and new unattended authority booleans.
- Added Pi package default test discovery, phase0 smoke discovery, GA release criteria, threat model, README, TODO, REVIEW, and tracker coverage.

Verification:

- TDD RED was observed before implementation: focused Task231 failed because the interactive planner action enum did not include `unattended-handoff`.
- Focused Task231 exited 0 after implementation.
- Adjacent Task223, Task230, Phase6, and Phase26 Pi regressions exited 0.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task231 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0 including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`, and `rg -n "\.comath" extensions/comath-pi/src/index.ts` returned no matches.

Boundary notes: Task231 is a read-only handoff view. It does not call `comathd`, ask for mutation confirmation, accept `confirmation_id`, write `.comath`, execute lifecycle actions, create service-owned evidence, open durable transport, run Lean, promote claims, or certify GA. A handoff is ready only when every prepared service-owned checkpoint ref has a sanitized `service-owned-pi-lifecycle/.../*.json` path and 64-hex hash; missing or poisoned refs block the handoff view.

# Goal 3 Task 230 / Pi Operator-Service Transport Continuity Consumer

Scope: expose the Task229 service-owned operator/service transport continuity checkpoint through Pi as a host-confirmed thin consumer and interactive planner checkpoint, without creating durable long-lived transport, proof authority, direct Pi mutation, trusted state writes, or GA certification.

Changes:

- Added `goal3-task230-pi-operator-service-transport-continuity-consumer.test.mjs`.
- Added `comath.release.piCodexLifecycleOperatorServiceTransportContinuity` and `/cm:release lifecycle-operator-service-transport-continuity`.
- Added runtime-registration subcommand coverage, Phase6/Phase26 exposure guards, Pi package default test discovery, and phase0 smoke discovery.
- Extended the read-only interactive real-Pi planner with a continuity checkpoint after automatic orchestration and before Codex API probe/review.
- Hardened public display sanitization so `proof_authority` is forced to `none`, false-authority booleans are recursively forced false, and trusted `.comath` path echoes are redacted from confirmation/notification/result surfaces while service requests can still carry canonical artifact paths to `comathd`.

Verification:

- TDD RED was observed before implementation: focused Task230 failed because `comath.release.piCodexLifecycleOperatorServiceTransportContinuity` was not registered.
- Follow-up focused failures exposed trusted `.comath` path echo in Pi confirmation text and `proof_authority` not being key-forced to `none`; both were covered by RED assertions and fixed.
- Focused Task230 exited 0 after implementation.
- Adjacent Task226, Task228, Task223, Phase6, and Phase26 Pi regressions exited 0 after updating the Task223 expected planner sequence for the new checkpoint.
- `corepack pnpm --filter @comath/pi-extension typecheck`, `corepack pnpm --filter @comath/pi-extension test`, service Task229, and `node scripts/phase0-smoke.mjs` exited 0.
- Initial root `corepack pnpm test` exposed a Phase17 integrity static-scan failure because the Pi entrypoint contained a literal trusted runtime path regex. The regex is now constructed without the forbidden literal; focused Task230, Phase17 integrity evaluation, final `corepack pnpm typecheck`, and final `corepack pnpm test` all exited 0.

Boundary notes: Task230 routes only through `POST /release/pi-codex-lifecycle/operator-service-transport-continuity` with host confirmation, requires `transport_contract_sha256`, never forwards caller/model `confirmation_id`, sanitizes actor/path/request/result surfaces, and centrally forces proof/GA/durable/live/direct-Pi-write/direct-trusted-state authority flags false in public output. The interactive real-Pi planner renders the continuity command template and checkpoint ids only; it does not call `comathd`, execute lifecycle actions, write `.comath`, or create service evidence by itself.

# Goal 3 Task 229 / Operator-Service Transport Continuity Checkpoint

Scope: add service-owned continuity provenance over the Task225 maintained operator/service transport contract without creating a CoMath transport stack, durable long-lived stream, proof authority, direct Pi mutation, or GA certification.

Changes:

- Added `goal3-task229-pi-operator-service-transport-continuity.test.mjs`.
- Added `recordPiCodexLifecycleOperatorServiceTransportContinuity()` and `POST /release/pi-codex-lifecycle/operator-service-transport-continuity`.
- Added `comath.pi_codex_operator_service_transport_continuity.v1` artifacts under `.comath/release/pi-codex-lifecycle/<continuity-id>/operator-service-transport-continuity.json`.
- Added `pi_codex_operator_service_transport_continuity` to the service capability ledger.
- Synchronized README, TODO, threat model, GA release criteria, phase0 smoke, REVIEW, and the Goal 3 tracker without claiming durable long-lived transport.

Verification:

- TDD RED was observed before implementation: focused Task229 failed because `../../dist/index.js` did not export `recordPiCodexLifecycleOperatorServiceTransportContinuity`.
- Focused Task229 exited 0 after implementation.
- Read-only review found a P1 gap where continuity could consume a caller-selected non-canonical forged contract artifact when no hash was supplied. Follow-up RED coverage now forges a project-local contract path without a hash, and the service rejects it with `PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_NON_CANONICAL` before reading the artifact. A second regression requires a caller-supplied contract hash even for canonical contract paths and rejects missing hashes with `PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_HASH_REQUIRED`.
- Final verification reran focused Task229, adjacent Task220/221/225/227/Phase50 regressions, phase0 smoke, comathd build/typecheck/test, root typecheck/test, runtime-state absence, and diff whitespace checks.

Boundary notes: Task229 consumes only the canonical persisted Task225 transport contract path for the requested contract id, requires and verifies its caller-supplied hash, resumes from `log_session_next_cursor`, and re-runs bounded `formatAgentRunLogSseSession()` over the existing Node HTTP AgentRun log-session route plus Pi `fetch`/`getText` primitive. It records `durable_resume_checkpoint_recorded=true`, but keeps `durable_transport_provided=false`, `live_transport_open=false`, `proof_authority=none`, `can_promote_claim=false`, and `can_certify_ga=false`. It does not provide long-lived SSE/WebSocket transport, run Lean, prove mathematics, promote claims, certify GA, or replace an operator-controlled real-Pi execution.

# Goal 3 Task 228 / Pi Automatic Real-Pi Execution Consumer

Scope: expose the Task227 automatic real-Pi checkpoint-chain orchestrator through Pi as a host-confirmed thin consumer and interactive planner checkpoint without creating durable transport, direct Pi writes, proof authority, trusted state mutation, or GA certification.

Changes:

- Added `goal3-task228-pi-automatic-real-pi-execution-consumer.test.mjs`.
- Added `comath.release.piCodexLifecycleAutomaticRealPiExecution` and `/cm:release lifecycle-automatic-real-pi-execution`.
- Added runtime-registration subcommand coverage, Phase26 executable-tool exposure guard coverage, Pi package test discovery, and phase0 smoke discovery.
- Extended the read-only interactive real-Pi planner so the automatic orchestration checkpoint appears after the operator/service transport contract and before Codex API probe/review.
- Sanitized nested automatic-orchestration checkpoint request/result surfaces while preserving the Task227 service-owned route as the only checkpoint-chain producer.
- Synchronized README, TODO, threat model, GA release criteria, REVIEW, and the Goal 3 tracker without claiming durable long-lived transport, direct Pi mutation, proof authority, automatic theorem proving, or GA certification.

Verification:

- TDD RED was observed before implementation: focused Task228 failed because `comath.release.piCodexLifecycleAutomaticRealPiExecution` was not registered.
- Focused Task228 exited 0 after implementation.
- Read-only review found a P1 gap where `runtime_probe.commands` was still forwarded raw from the Task228 JSON handoff. Follow-up RED coverage now poisons command `program` / `args`, and the consumer reconstructs only `install`, `runtime_registration`, and `host_confirmation` command specs with sanitized `program` / `args` plus numeric exit/timeout fields before POST.
- Adjacent Task223, Task226, Task221, and Task165 Pi lifecycle regressions exited 0.
- A systematic-debugging pass resolved two test-environment issues: Phase6/Phase26 were first run from the wrong cwd, and the mechanical package test-script rewrite introduced a UTF-8 BOM plus a trailing blank line; both were fixed before final validation.
- Phase6 and Phase26 Pi extension/runtime-registration regressions exited 0 from the Pi package cwd.
- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task228 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task227 service orchestration regression exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task228 is a host-confirmed Pi consumer and read-only planner integration only. It calls the service-owned Task227 route, strips model-supplied `confirmation_id`, sanitizes nested checkpoint surfaces including runtime-probe command specs, and false-forces public proof/GA/durable/live/direct-Pi-write/trusted-state overclaims. It does not write `.comath` from Pi, open or maintain live transport, run Lean, prove mathematics, promote claims, certify GA, or replace operator-controlled real-Pi execution.

# Goal 3 Task 227 / Automatic Real-Pi Lifecycle Orchestration

Scope: add a service-owned automatic real-Pi checkpoint-chain orchestrator over existing lifecycle producers without creating durable transport, direct Pi writes, proof authority, trusted state mutation, or GA certification.

Changes:

- Added `goal3-task227-pi-automatic-real-pi-execution-orchestration.test.mjs`.
- Added `orchestratePiCodexLifecycleAutomaticRealPiExecution()` and `POST /release/pi-codex-lifecycle/automatic-real-pi-execution`.
- Added `comath.pi_codex_lifecycle_automatic_real_pi_execution.v1` artifacts under `.comath/release/pi-codex-lifecycle/<orchestration-id>/automatic-real-pi-execution.json`.
- Added `pi_codex_lifecycle_automatic_real_pi_execution_orchestration` to the service capability ledger.
- The orchestrator composes existing runtime probe, operator-session manifest, transport recovery, bounded lease, heartbeat/rebind, guided execution, terminal review, and operator/service transport contract producers, then binds every checkpoint id/path/hash into one append-only manifest.
- The heartbeat cursor is advanced from the bounded service-owned AgentRun log-session lease; non-service-owned operator routes fail closed before the Task227 orchestration artifact is written.
- Synchronized README, AGENTS, TODO, threat model, GA release criteria, phase0 smoke, REVIEW, and the Goal 3 tracker without claiming durable long-lived transport, direct Pi mutation, proof authority, or GA certification.

Verification:

- TDD RED was observed before implementation: focused Task227 failed because `../../dist/index.js` did not export `orchestratePiCodexLifecycleAutomaticRealPiExecution`.
- Focused Task227 exited 0 after implementation.
- A systematic-debugging pass aligned the negative route test with the existing service-level fail-closed error code and fixed a test fixture `campaign_id` schema issue.
- Adjacent Task225, Task224, Task221, Task220, Task164, and Task166 service regressions exited 0.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task227 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task227 is checkpoint-chain provenance only. It does not open or maintain durable transport, provide long-lived SSE/WebSocket sessions, mutate Pi trusted state directly, write `.comath` from Pi, run Lean, prove mathematics, promote claims, or certify GA.

# Goal 3 Task 226 / Pi Operator-Service Transport Contract Consumer

Scope: expose the Task225 operator/service maintained transport contract through Pi as a host-confirmed thin consumer and interactive real-Pi checkpoint without creating durable transport, direct Pi writes, proof authority, trusted state mutation, or GA certification.

Changes:

- Added `goal3-task226-pi-operator-service-transport-contract-consumer.test.mjs`.
- Added `comath.release.piCodexLifecycleOperatorServiceTransportContract` and `/cm:release lifecycle-operator-service-transport-contract`.
- Added the new runtime-registration subcommand, Phase6/Phase26 exposure guards, and Pi package test discovery.
- Extended the read-only interactive real-Pi planner so the Task225 contract checkpoint appears after guided execution and before Codex API probe/review.
- Hardened public sanitization so `live_transport_open`, `pi_direct_write_allowed`, and `direct_trusted_state_mutation` are forced false alongside proof/GA/durable/long-lived transport fields.
- Synchronized README, AGENTS, TODO, threat model, GA release criteria, phase0 smoke, REVIEW, and the Goal 3 tracker without claiming durable long-lived transport or automatic real-Pi execution.

Verification:

- TDD RED was observed before implementation: focused Task226 failed because `comath.release.piCodexLifecycleOperatorServiceTransportContract` was not registered.
- Follow-up RED coverage exposed that public Pi output could still surface `live_transport_open`, `pi_direct_write_allowed`, and `direct_trusted_state_mutation` overclaims; the centralized sanitizer now forces those fields false.
- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- Focused Task226 exited 0.
- Adjacent Task223, Task221, Task165, Phase6, and Phase26 Pi lifecycle/registration regressions exited 0 from the package cwd.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task226 discovered by the default runner.
- Adjacent service regressions for Task225, Task224, Task221, Task220, Task164, Task166, and Phase50 exited 0.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 on a longer rerun after an initial 185s command budget timeout produced no assertion failure.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task226 is a host-confirmed Pi consumer only. It calls the service-owned Task225 route, strips model-supplied `confirmation_id`, sanitizes actor/path/result surfaces, and exposes only fixed maintained primitive enums. It does not write `.comath` from Pi, open live transport, maintain a durable transport stack, mutate trusted state directly, run Lean, prove mathematics, promote claims, or certify GA.

# Goal 3 Task 225 / Operator-Service Maintained Transport Contract

Scope: add service-owned append-only provenance for the maintained operator/service transport boundary, binding a Task224 terminal review to the current Task221 heartbeat hash, existing Node HTTP AgentRun log-session route, and Pi `fetch`/`getText` client primitive without creating durable transport, proof authority, Pi mutation authority, or GA certification.

Changes:

- Added `goal3-task225-pi-operator-service-transport-contract.test.mjs`.
- Added `recordPiCodexLifecycleOperatorServiceTransportContract()` and `POST /release/pi-codex-lifecycle/operator-service-transport-contract`.
- Added `comath.pi_codex_operator_service_transport_contract.v1` artifacts under `.comath/release/pi-codex-lifecycle/<transport-contract-id>/operator-service-transport-contract.json`.
- Added `pi_codex_operator_service_transport_contract` to the service capability ledger.
- The contract reads a Task224 terminal review, re-reads the current Task221 heartbeat artifact, rejects stale heartbeat hashes, re-runs bounded `formatAgentRunLogSseSession()`, and binds `node_http_agent_run_log_session_route` plus `pi_fetch_get_text`.
- Missing terminal reviews, stale heartbeat material, secrets, proof-success wording, and long-lived transport overclaims fail closed or are sanitized before persistence.
- Synchronized README, AGENTS, TODO, threat model, GA release criteria, phase0 smoke, REVIEW, and the Goal 3 tracker without claiming durable long-lived transport or automatic real-Pi execution.

Verification:

- TDD RED was observed before implementation: focused Task225 failed because `../../dist/index.js` did not export `recordPiCodexLifecycleOperatorServiceTransportContract`.
- After implementation, focused Task225 exited 0.
- Adjacent Task220, Task221, Task224, Task164, Task166, and Phase50 regressions exited 0.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task225 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task225 is maintained-primitive provenance only. It does not run Lean, promote proof claims, certify GA, open durable long-lived SSE/WebSocket transport, mutate Pi state, or replace a real operator-controlled Pi execution. Durable operator transport, fully automatic real-Pi execution, real installed-toolchain Mathlib smoke breadth, and GA certification remain open.

# Goal 3 Task 224 / Guided Execution Terminal Chain Review

Scope: add a service-owned terminal review gate for the guided real-Pi lifecycle chain, binding runtime probe, operator session, recovery, bounded lease, heartbeat/rebind, and guided execution artifacts without creating proof authority, durable transport, direct Pi writes, or GA certification.

Changes:

- Added `goal3-task224-pi-guided-execution-terminal-chain-review.test.mjs`.
- Added `reviewPiCodexLifecycleTerminalExecution()` and `POST /release/pi-codex-lifecycle/terminal-execution-review`.
- Added `comath.pi_codex_guided_execution_terminal_chain_review.v1` artifacts under `.comath/release/pi-codex-lifecycle/<review-id>/terminal-execution-review.json`.
- Added `pi_codex_guided_execution_terminal_chain_review` to the service capability ledger.
- The review reads and hash-binds Task152 runtime probe evidence, Task157 operator-session manifest, Task159 recovery checkpoint, Task220 bounded lease, Task221 heartbeat/rebind checkpoint, and Task164 guided execution before writing.
- Missing heartbeat, poisoned heartbeat boundary fields, stale artifact hashes, path/id mismatch, and caller proof-success or durable-transport wording fail closed or are sanitized before persistence.
- Synchronized README, AGENTS, TODO, threat model, GA release criteria, phase0 smoke, REVIEW, and the Goal 3 tracker without claiming fully automatic Pi execution or durable long-lived transport.

Verification:

- TDD RED was observed before implementation: focused Task224 failed because `../../dist/index.js` did not export `reviewPiCodexLifecycleTerminalExecution`.
- After implementation, focused Task224 exited 0.
- Adjacent Task164, Task166, Task220, and Task221 regressions exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task224 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task224 is service-owned release evidence only. It does not run Lean, promote proof claims, certify GA, open durable long-lived SSE/WebSocket transport, mutate Pi state, or replace a real operator-controlled Pi execution. It closes the terminal chain review gap for existing bounded lifecycle artifacts; durable operator/service transport, fully automatic real-Pi execution, real installed-toolchain Mathlib smoke breadth, and GA certification remain open.

# Goal 3 Task 223 / Interactive Real-Pi Checkpoint UX

Scope: add a read-only Pi-side interactive real-Pi checkpoint planner over the existing host-confirmed lifecycle command chain without creating service-owned evidence, durable transport, proof authority, or GA certification.

Changes:

- Added `goal3-task223-pi-interactive-real-pi-checkpoint-ux.test.mjs`.
- Added `comath.release.piCodexLifecycleInteractiveRealPi` as a non-mutating Pi tool that renders ordered checkpoint plans for runtime probe, operator session, transport recovery, bounded lease, heartbeat/rebind, guided execution, Codex API probe, and review.
- Added `/cm:release lifecycle-interactive-real-pi` command handling without Pi host confirmation because the planner is read-only and does not call `comathd`.
- Registered the tool in Pi runtime executable metadata, runtime-registration subcommands, Phase6/Phase26 exposure guards, and the Pi package test script.
- Hardened planner IDs and checkpoint paths so path-shaped IDs, encoded trusted runtime roots, caller-supplied trusted runtime paths, Pi/Linux host paths, and broader proof-success vocabulary do not echo into public plans.
- Synchronized README, AGENTS, TODO, threat model, GA release criteria, phase0 smoke, REVIEW, and the Goal 3 tracker without claiming full real-Pi execution or durable transport.

Verification:

- TDD RED was observed before implementation: focused Task223 failed because `comath.release.piCodexLifecycleInteractiveRealPi` was not registered.
- Read-only subagent review found two follow-up issues: path-shaped IDs could reintroduce trusted runtime roots into fallback planner paths, and POSIX Pi paths plus `proof_success` / `kernel_checked` were not covered by the public sanitizer. Follow-up adversarial coverage now exercises poisoned IDs, encoded trusted runtime roots, Pi host paths, and broader proof-success vocabulary.
- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- Focused Task223 exited 0 after the review hardening.
- Adjacent Task165 and Task221 Pi lifecycle consumer regressions exited 0.
- Phase6 and Phase26 Pi exposure/registration regressions exited 0 from the package cwd after two manual wrong-cwd reruns exposed no product regression.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task223 discovered by the default runner.
- `corepack pnpm typecheck` exited 0 across workspaces.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Task222 focused regression exited 0 after preserving the historical `Task213-222 summary` anchor in `TODO.md`.
- Phase17 integrity evaluation exited 0 after removing `.comath` literals from Pi source defaults.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Commit: `1d44983` (`Add goal3 task223 interactive real-Pi UX`)

Boundary notes: Task223 is a read-only UX/checkpoint planner only. It does not call `comathd`, write `.comath`, echo caller-supplied trusted runtime paths or path-shaped IDs, auto-execute lifecycle actions, accept model-supplied confirmation ids, produce service-owned evidence, provide durable long-lived SSE/WebSocket transport, provide proof authority, or certify GA. Existing mutating lifecycle checkpoints remain host-confirmed service commands.

# Goal 3 Task 221 / Pi Operator Transport Lease Heartbeat Rebind

Scope: add bounded, append-only operator transport heartbeat/rebind checkpoints for Task220-bound leases, plus Pi consumer wiring and lease-kind vocabulary parity.

Changes:

- Added `goal3-task221-pi-operator-transport-lease-heartbeat-rebind.test.mjs`.
- Added `heartbeatPiCodexLifecycleOperatorTransportLease()` and `POST /release/pi-codex-lifecycle/operator-transport-heartbeat`.
- Added `comath.pi_codex_lifecycle_operator_transport_heartbeat.v1` artifacts under `.comath/release/pi-codex-lifecycle/<heartbeat-id>/operator-transport-heartbeat.json`.
- Added `pi_codex_operator_transport_lease_heartbeat_rebind` to service capabilities.
- Heartbeat recording now reads a live Task220-bound lease, verifies the session/recovery/lease artifact chain, rejects stale client epochs, re-runs service-owned `AgentRun` log-session formatting for the requested cursor, and writes only a new heartbeat artifact without mutating session, recovery, or lease files.
- Static tampering, expired, wrong-project, wrong-chain, stale-client, non-monotonic live-log, or unreadable lease material fails closed before heartbeat persistence; same-route/same-run live log growth is accepted only as bounded rebind provenance.
- Added Pi tool/command wiring through `comath.release.piCodexLifecycleOperatorTransportHeartbeat` and `/cm:release lifecycle-operator-transport-heartbeat` with host confirmation and public-output sanitization.
- Fixed Pi lease-kind vocabulary to match comathd: `bounded_live_sse_lease` and `manual_terminal_polling_lease`.
- Registered Task221 in phase0 smoke / GA release criteria discovery and synchronized README, AGENTS, TODO, threat model, GA release criteria, REVIEW, and the Goal 3 tracker.

Verification:

- TDD RED was observed before implementation: focused Task221 failed because `../../dist/index.js` did not export `heartbeatPiCodexLifecycleOperatorTransportLease`.
- Pi consumer RED was observed before implementation: `comath.release.piCodexLifecycleOperatorTransportHeartbeat` was not registered.
- Read-only review found that the first implementation re-used strict lease snapshot equality and would reject valid heartbeats after a live AgentRun log-session advanced. Follow-up RED coverage reproduced that failure; the service now keeps strict equality for ordinary lease consumers while heartbeat accepts only same-route/same-run monotonic cursor or completion advance.
- After implementation and review fix, focused Task221 service and Pi consumer tests exited 0.
- Adjacent Task220, Task164, Task166, Task163, phase26, and phase6 regressions exited 0 during implementation; Task220, Task164, and Task166 were re-run after the live-growth fix and exited 0.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task221 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task221 is bounded checkpointing and lease rebind provenance only. It does not mutate leases, extend into durable long-lived SSE/WebSocket transport, provide proof authority, replace an operator-controlled real-Pi run, implement a CoMath transport stack, or certify GA.

# Goal 3 Task 220 / Pi Operator Transport Lease AgentRun Log-Session Binding

Scope: bind bounded Pi/operator transport leases to service-owned `AgentRun` log-session evidence before lease persistence and before guided real-Pi execution consumes a lease artifact.

Changes:

- Added `goal3-task220-pi-operator-transport-lease-agentrun-log-session-binding.test.mjs`.
- Added `pi_codex_operator_transport_lease_agentrun_log_session_binding` to service capabilities.
- Added `PiCodexLifecycleOperatorTransportLogSessionBinding` and bound leases to canonical `/agent/run/<run-id>/log-session` routes through the existing `formatAgentRunLogSseSession()` service path.
- Rejected arbitrary, stale, missing, or wrong-project log-session routes before writing a lease artifact.
- Persisted non-authoritative route/run/cursor/event-count/body-hash provenance on bounded lease artifacts and lease-open audit events.
- Hardened guided real-Pi execution lease consumption so pre-Task220 or tampered lease artifacts without service-owned log-session binding fail closed.
- Re-bound persisted log-session provenance during guided execution consumption and rejected tampered body hashes, cursor/event-count/complete drift, expired leases, and valid same-project AgentRun routes that do not match the recovery checkpoint route.
- Updated Task162/164/166 fixtures to create real service-owned AgentRuns instead of synthetic `RUN-*` route text.
- Registered Task220 in phase0 smoke / GA release criteria discovery and synchronized README, AGENTS, TODO, threat model, GA release criteria, REVIEW, and the Goal 3 tracker.

Verification:

- TDD RED was observed before implementation: focused Task220 failed because unbound route text was accepted and a lease artifact was written.
- Follow-up RED was observed after the initial GREEN path: Task164 failed because guided execution still accepted an old lease artifact with no `agent_run_log_session_binding`.
- Read-only review found that expired leases, tampered binding body hashes, and same-project unrelated AgentRun routes were still accepted. Follow-up RED coverage failed for tampered body hashes, expired leases, and recovery-route mismatch; the service now rebinds persisted lease provenance to current service-owned AgentRun logs, enforces lease expiry/status/TTL, and requires the lease route to match the recovery checkpoint route.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task220 exited 0.
- Adjacent Task162, Task164, Task166, and Phase50 regressions exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task220 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task220 is bounded lease provenance and route-integrity hardening only. It does not provide durable long-lived transport, indefinite WebSocket/SSE operator sessions, fully interactive end-to-end real-Pi execution, OS-enforced adapter isolation, mathematical proof authority, or GA certification.

# Goal 3 Task 219 / Campaign Live Mathlib Import Graph Diagnostic

Scope: add a non-authoritative Lean/Lake-produced import-graph diagnostic for opt-in campaign-native Mathlib final replay requests before final replay workspace allocation.

Changes:

- Added `goal3-task219-campaign-live-mathlib-import-graph-diagnostic.test.mjs`.
- Added `campaign_live_mathlib_import_graph_diagnostic` to service capabilities.
- Added `evaluateCampaignLiveMathlibImportGraphDiagnostic()` and wired it into `replay_breadth_profile: "campaign_live_mathlib_non_toy"` final replay request parsing after Task218 host diagnostics and before `.comath/lean/final_replay` allocation.
- Persisted `mathlib_import_graph_diagnostic.json` on both pass and fail with service-owned `lake env lean --deps` theorem/audit probes, command argv, exit codes, stdout/stderr/output hashes, host-diagnostic hash, and `proof_authority: "none"`.
- Required import-graph dependency presence and non-empty graph material to come from `--deps` stdout, while stderr remains separately hashed provenance; rejected option-shaped theorem/audit file arguments before they can reach Lean/Lake.
- Bound the successful import-graph diagnostic path into the final clean replay artifact as `import_graph_diagnostic_path`, and into promotion-grade FinalReplayManifest v3 / third-party replay pack material via `report_paths.import_graph_diagnostic` and `artifact_hashes.import_graph_diagnostic`.
- Synchronized final-authority replay-pack verifiers so `expected_hashes.json` strictly binds FinalReplayManifest v3 `report_paths` alongside source, artifact, dependency-lock, and LeanRun manifest hashes.
- Registered Task219 in phase0 smoke / GA release criteria discovery.

Verification:

- TDD RED was observed before implementation: focused Task219 failed because `../../dist/index.js` did not export `evaluateCampaignLiveMathlibImportGraphDiagnostic`.
- A systematic-debugging pass investigated a follow-up append-only test failure and traced it to the test directly re-running clean replay for the same claim after a successful campaign tick had already written `LRUN-0001`; the test now reads the final replay artifact generated by the product path.
- Post-diff read-only review found the import-graph diagnostic was not bound into FinalReplayManifest v3 / replay-pack material; focused Task219 coverage now asserts both v3 and replay-pack bindings.
- A later package-test regression exposed that legacy replay-pack verifiers still expected pre-Task219 `expected_hashes.json` without `report_paths`; Task42 failed with missing `third_party_replay_pack` until the verifier expected-hash contracts were synchronized.
- Read-only code review found two additional Task219 hardening gaps: stderr-only `Mathlib` mentions could satisfy dependency presence, and option-shaped theorem/audit file paths were not rejected before CLI invocation. Focused Task219 now covers both.
- Focused Task219 exited 0; Task218, Task42, Task44, Task45, Task82, and Task124 replay-pack/final-authority regressions exited 0; `corepack pnpm --filter @comath/comathd test` exited 0.

Boundary notes: Task219 is import-graph observability only. It does not implement a CoMath Lean parser, Lake import resolver, theorem generator, theorem library, proof-search system, or benchmark engine. `lake env lean --deps` stdout remains non-authoritative provenance and cannot promote a claim without later network-disabled Lean clean replay and ordinary promotion gates.

# Goal 3 Task 218 / Campaign Live Mathlib Host Replay Diagnostic

Scope: add a non-authoritative host replay availability diagnostic for opt-in campaign-native Mathlib final replay requests before final replay workspace allocation.

Changes:

- Added `goal3-task218-campaign-live-mathlib-host-replay-diagnostic.test.mjs`.
- Added `campaign_live_mathlib_host_replay_diagnostic` to service capabilities.
- Added `evaluateCampaignLiveMathlibHostReplayDiagnostic()` and wired it into `replay_breadth_profile: "campaign_live_mathlib_non_toy"` final replay request parsing after Task216 provisioning diagnostics and before `.comath/lean/final_replay` allocation.
- Persisted `mathlib_host_replay_diagnostic.json` on both pass and fail with service-owned Lean/Lake version probe hashes, expected Lean toolchain match, binary hashes, replay plan, provisioning-diagnostic hash, and `proof_authority: "none"`.
- Extracted shared Lean/Lake host tool resolution and command execution helpers so the diagnostic and final clean replay use the same direct-elan-or-PATH resolution semantics.
- Hardened Windows `.cmd`/`.bat` host tool execution through `cmd.exe /d /s /c call`, with the resolved command script path quoted, replay arguments checked for command metacharacters, and unsafe arguments returning structured probe failure instead of being interpreted by `cmd.exe`.
- Required Task218 host diagnostics to reject unsafe theorem/audit/build-target replay arguments and nonempty build targets that are not declared by the request's `lakefile.lean` before `.comath/lean/final_replay` allocation.
- Bound the successful host diagnostic path into the final clean replay artifact as `host_replay_diagnostic_path`.
- Registered Task218 in phase0 smoke / GA release criteria discovery.
- Updated README, AGENTS, TODO, threat model, external Lean supply-chain docs, GA release criteria, REVIEW, and the Goal 3 tracker.

Verification:

- TDD RED was observed before implementation: focused Task218 failed because `../../dist/index.js` did not export `evaluateCampaignLiveMathlibHostReplayDiagnostic`.
- A systematic-debugging pass investigated a focused Task218 timeout and found `runLeanToolCommand("lean", ...)` could resolve fake `.cmd` binaries for hashing while execution fell through to the old PATH elan shim. The shared helper now executes the resolved service tool binary and handles Windows command scripts explicitly.
- Read-only review found a Windows `.cmd` argument-injection risk and a pre-allocation build-target validation gap. Follow-up RED coverage failed when `MathResearch & echo injected` passed host diagnostics; the diagnostic now rejects unsafe replay arguments and undeclared build targets before final replay allocation.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task218 exited 0.
- Adjacent regressions exited 0: Task213, Task214, Task215, Task216, and Task217.

Boundary notes: Task218 is a host availability/version/binary diagnostic only. It does not fetch or vendor Mathlib, prove the theorem, create a FinalReplayManifest v3 by itself, validate a full Lake elaborated import graph, make host diagnostics proof authority, complete broad release-candidate proof breadth, ship production OS-isolation helpers, provide durable Pi/operator transport, or certify GA.

# Goal 3 Task 217 / Final Replay Dependency Lock Consistency

Scope: harden FinalReplayManifest v3 verification so dependency-lock material cannot be semantically tampered while preserving the existing Lean/kernel proof-authority boundary.

Changes:

- Added `goal3-task217-final-replay-dependency-lock-consistency.test.mjs`.
- Added `final_replay_dependency_lock_consistency_gate` to service capabilities.
- Extracted `dependencyClosureV2PackagesToExternalRevisions()` so clean replay creation and manifest verification use the same canonical V2 package-to-lock projection.
- Hardened `verifyFinalReplayManifestV3()` to keep `lean-toolchain`, `lake-manifest.json`, and `lakefile.lean` dependency-lock file paths fixed to the clean workspace, recompute their hashes, and bind `lean_toolchain` text to the clean `lean-toolchain` file.
- Hardened `verifyFinalReplayManifestV3()` to recompute `external_revisions_sha256` and compare V2 dependency-lock external revisions against `dependency_closure.json` package material when the report is `comath.dependency_closure.v2`.
- Registered Task217 in phase0 smoke / GA release criteria discovery.
- Updated README, AGENTS, TODO, threat model, external Lean supply-chain docs, GA release criteria, REVIEW, and the Goal 3 tracker.

Verification:

- TDD RED was observed before implementation: focused Task217 failed because a FinalReplayManifest with a tampered `dependency_lock.lakefile_sha256` still verified as ok.
- A follow-up focused regression covers same-hash project-local dependency-lock path substitution; the verifier now emits `final_replay_dependency_lock_path_mismatch:*`.
- Read-only review found a missing `dependency_lock.lean_toolchain` text consistency check; focused coverage now rejects toolchain-text tampering with `final_replay_dependency_lock_toolchain_mismatch`.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task217 exited 0.
- Adjacent regressions exited 0: Task8, Task10, Task214, Task215, Task216, and the corrected Task102/103 campaign final-authority tests.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task217 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task217 is verifier consistency hardening only. It does not fetch or vendor mathlib, run a host-backed non-toy Mathlib replay, validate a full Lake elaborated import graph, make dependency metadata proof authority, complete broad release-candidate proof breadth, ship production OS-isolation helpers, provide durable Pi/operator transport, or certify GA.

# Goal 3 Task 216 / Campaign Live Mathlib Provisioning Diagnostic

Scope: add a non-authoritative provisioning diagnostic for opt-in campaign-native Mathlib final replay requests, and ensure final clean replay can carry locally materialized Mathlib package sources into the clean workspace.

Changes:

- Added `evaluateCampaignLiveMathlibProvisioningDiagnostic()` and wired it into `replay_breadth_profile: "campaign_live_mathlib_non_toy"` final replay request parsing after Task213/214 gates and before final replay workspace allocation.
- Required locally materialized `.lake/packages/mathlib` source material, including `Mathlib.lean` and no package-internal symlinks, before opt-in campaign-native Mathlib replay can allocate `.comath/lean/final_replay`.
- Recorded materialized Mathlib package file hashes and package hash as `proof_authority: "none"` provenance with `network_policy: "disabled"`.
- Copied materialized `.lake/packages/mathlib` package sources into the final clean replay workspace when present and skipped symlink-bearing packages so closure fails closed instead of copying unsafe material.
- Extended `DependencyClosureV2` package records and FinalReplayManifest v3 dependency-lock external revision entries with materialized package roots/hashes/file hashes/symlink lists and fail-closed `dependency_material_missing:mathlib` / `dependency_material_symlink:mathlib:*` vetoes.
- Included copied `.lake/packages/mathlib` files in FinalReplayManifest v3 `source_hashes_after`, `clean_workspace_sha256`, and the third-party replay pack, while continuing to exclude unrelated `.lake` cache material.
- Added `campaign_live_mathlib_provisioning_diagnostic` to service capabilities.
- Added `goal3-task216-campaign-live-mathlib-provisioning-diagnostic.test.mjs` and registered it in phase0 smoke / GA release criteria discovery.
- Updated README, AGENTS, TODO, threat model, external Lean supply-chain docs, GA release criteria, REVIEW, and the Goal 3 tracker.

Verification:

- TDD RED was observed before implementation: focused Task216 failed because `../../dist/index.js` did not export `evaluateCampaignLiveMathlibProvisioningDiagnostic`.
- A follow-up focused RED caught a symlink-bearing `.lake/packages/mathlib` passing provisioning diagnostics; package-internal symlinks now fail before clean replay copy and are also recorded/vetoed by `DependencyClosureV2`.
- Post-diff read-only review found three issues: copied Mathlib material was not included in FinalReplayManifest/replay-pack hashes, root `.lake/packages/mathlib` symlinks could bypass package-internal symlink checks, and passing provisioning diagnostics were computed but not durably recorded. All three were closed with focused regression coverage.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- Focused Task216 exited 0.
- Adjacent regressions exited 0: Task213, Task214, Task215, Task102, Task103, Task10, and Task124.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task216 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task216 is a provisioning/materialization diagnostic and replay-workspace packaging hardening slice. It does not fetch mathlib, install/vendor dependencies, make provisioning metadata proof authority, execute a host-backed non-toy Mathlib theorem replay by itself, complete broad release-candidate proof breadth, ship production OS-isolation helpers, provide durable Pi/operator transport, or certify GA.

# Goal 3 Task 215 / Final Replay DependencyClosureV2 Binding

Scope: upgrade the service-owned final clean replay dependency artifact from the legacy nonempty-file closure to `DependencyClosureV2`, while keeping the stable `dependency_closure.json` artifact slot and FinalReplayManifest v3 report binding.

Changes:

- Replaced `runCleanLeanReplay()`'s final replay dependency check with `checkDependencyClosureV2()`.
- Kept final replay report paths stable while writing `schema_version: "comath.dependency_closure.v2"` content into `dependency_closure.json`.
- Bound V2 Lake manifest package revision material into FinalReplayManifest v3 `dependency_lock.external_revisions`.
- Added `final_replay_dependency_closure_v2_binding` to service capabilities.
- Treated `Lake`, `Init`, and `Std` as Lean/Lake toolchain modules in `DependencyClosureV2` so `lakefile.lean`'s `import Lake` does not become an untracked theorem dependency.
- Tightened V2 project-local import handling so a missing `MathResearch.*` module is still reported as `untracked_import:*` instead of passing by prefix alone.
- Added `goal3-task215-final-replay-dependency-closure-v2-binding.test.mjs` and registered it in phase0 smoke / GA release criteria discovery.
- Updated README, AGENTS, TODO, threat model, external Lean supply-chain docs, GA release criteria, REVIEW, and the Goal 3 tracker.

Verification:

- TDD RED was observed before implementation: focused Task215 failed because the final replay dependency closure had no V2 schema (`undefined !== "comath.dependency_closure.v2"`).
- After the first global V2 wiring, adjacent Task102 and Task103 failed closed. Systematic debugging traced the root cause to `DependencyClosureV2` parsing `lakefile.lean` and flagging `import Lake` as `untracked_import:Lake`; `Lake` is now classified as a Lean/Lake toolchain module.
- A later self-review RED caught a missing local-project import bypass: `import MathResearch.Missing` was not reported as untracked because the old V2 logic allowed the `MathResearch` prefix by itself. V2 now requires local project imports to resolve to clean-workspace modules unless a trusted package or Lean/Lake toolchain module provides them.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task215 exited 0.
- Adjacent regressions exited 0: Task10, Task102, Task103, and Task214.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task215 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- Post-diff read-only review found no issues. It confirmed failed V2 dependency closure cannot promote through final replay, campaign completion, or ordinary promotion gates, and noted only the expected residual gaps below.

Boundary notes: Task215 upgrades final replay dependency evidence and dependency-lock revision binding. It does not install or vendor mathlib, fetch Lake dependencies, execute a real non-toy Mathlib theorem replay on this host, complete broad release-candidate proof breadth, ship production OS-isolation helpers, provide durable Pi/operator transport, or certify GA.

# Goal 3 Task 214 / Campaign Live Mathlib Dependency Material Gate

Scope: add an opt-in campaign-native Mathlib dependency-material gate so Task213-valid non-toy Mathlib-looking final replay requests cannot allocate a clean replay workspace unless theorem-specific Lake material is pinned and auditable.

Changes:

- Added `evaluateCampaignLiveMathlibDependencyMaterialGate()` and wired it into `replay_breadth_profile: "campaign_live_mathlib_non_toy"` final replay request parsing before final replay workspace allocation.
- Required a Mathlib `require` in `lakefile.lean`, a `lake-manifest.json` mathlib package pinned to a 40-hex commit SHA, a trusted `leanprover-community/mathlib4` source URL, a non-unknown license, and no local `Mathlib` module shadowing.
- Added `campaign_live_mathlib_dependency_material_gate` to service capabilities.
- Added `goal3-task214-campaign-live-mathlib-dependency-material-gate.test.mjs` and registered it in phase0 smoke / GA release criteria discovery.
- Marked final replay blocker artifacts with `schema_version`, `proof_authority: "none"`, and `can_promote_claim: false`.
- Updated README, AGENTS, TODO, threat model, external Lean supply-chain docs, GA release criteria, REVIEW, and the Goal 3 tracker.

Verification:

- TDD RED was observed before implementation: focused Task214 failed because `../../dist/index.js` did not export `evaluateCampaignLiveMathlibDependencyMaterialGate`.
- A follow-up focused RED caught the local `Mathlib` shadowing case after the test was strengthened; after rebuilding `dist`, focused Task214 exited 0.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task213 and Task214 exited 0.
- Adjacent campaign final replay regressions Task102 and Task103 exited 0 after correcting an initial manual filename mistake that produced `MODULE_NOT_FOUND`.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task214 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.
- Post-diff read-only reviewer requests were attempted twice but timed out and were closed without findings; no reviewer pass is claimed.

Boundary notes: Task214 is a dependency-material preflight gate. It does not install mathlib, fetch dependencies, run Lean, prove a theorem, close the broad release-candidate proof breadth item, ship production OS-isolation helpers, provide durable Pi/operator transport, or certify GA. Promotion still requires service-owned Lean clean replay plus Lean Authority v3 packaging and ordinary promotion gates.

# Goal 3 Task 213 / Campaign Live Mathlib Replay Breadth Gate

Scope: add an opt-in campaign-native live Mathlib replay breadth gate so Task213 evidence cannot be satisfied by historical toy smoke replay, positive-matrix paths, or default Nat/True proof fixtures.

Changes:

- Added `evaluateCampaignLiveMathlibReplayBreadthGate()` and wired `replay_breadth_profile: "campaign_live_mathlib_non_toy"` into final replay request parsing before final replay workspace allocation.
- Added `campaign_live_mathlib_replay_breadth_gate` to service capabilities.
- Added `goal3-task213-campaign-live-mathlib-replay-breadth-gate.test.mjs` and registered it in phase0 smoke / GA release criteria discovery.
- Updated README, AGENTS, TODO, threat model, GA release criteria, REVIEW, and the Goal 3 tracker.

Verification:

- TDD RED was observed before implementation: focused Task213 failed because `../../dist/index.js` did not export `evaluateCampaignLiveMathlibReplayBreadthGate`.
- Read-only review found that parenthesized `True` could bypass the non-toy gate and that the focused suite did not assert every advertised veto. A follow-up RED reproduced the bypass with `: (True) := by exact True.intro`; `containsToyTrue()` now rejects parenthesized `True`, and the focused suite covers missing Mathlib dependency/import, default `n : Nat`, `by omega`, positive-matrix paths, and non-campaign scope.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task213 exited 0.
- Adjacent campaign final replay regressions Task102 and Task103 exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task213 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- A local bare Lean probe for `import Mathlib` exited 1 with `unknown module prefix 'Mathlib'`, so Task213 does not claim an environment-backed live Mathlib proof replay on this host.

Boundary notes: Task213 is a breadth anti-confusion and fail-closed request gate. It does not install mathlib, provision a theorem-specific Lake package, clean-replay a real non-toy Mathlib theorem on this host, complete broad release-candidate proof breadth, make gate output proof authority, or certify GA. Promotion still requires service-owned Lean clean replay plus Lean Authority v3 packaging and ordinary promotion gates.

# Goal 3 Task 222 / OCI Production-Helper Profile Contract

Scope: add an OCI/Docker/Podman production-helper profile contract so release audits can distinguish operator-configured OCI helpers from bundled provider-helper protocol assets without treating either path as a Docker/Podman runner, daemon/socket/container probe, proof authority, OS-enforcement proof, readiness evidence by itself, real-Pi evidence, broad provider support, or GA certification.

Changes:

- Added a service-derived `production_helper_profile_contract` for OCI provider-runner, helper-host-validation, helper-execution, and provider-helper collection manifests.
- Added `agent_adapter_os_isolation_oci_container_production_helper_profile_contract` and registered `goal3-task222-agent-adapter-os-isolation-oci-production-helper-profile-contract.test.mjs` in release-hardening discovery.
- Updated README, AGENTS, TODO, adapter contracts, threat model, config sample/docs, GA release criteria, REVIEW, and tracker wording to keep the profile contract non-authoritative.

Verification:

- TDD RED was observed before implementation: focused Task222 first failed because the service capability ledger did not advertise `agent_adapter_os_isolation_oci_container_production_helper_profile_contract`; after code/build changes it progressed through smoke/docs/sample-config expectations before GREEN.
- Read-only subagent review found a real profile-source drift gap: operator-configured OCI runner manifests could later drift to bundled helper validation/execution when the helper binary hash stayed the same. A follow-up RED reproduced operator-to-bundled drift at host-validation time; the fix now validates the OCI profile contract material/hash and requires profile-contract equality across runner, helper-host-validation, helper-execution, and provider-helper collection collectability.
- After the drift fix, `corepack pnpm --filter @comath/comathd build` exited 0; focused Task222 exited 0; adjacent provider-helper regressions exited 0 for Task175, Task176, Task177, Task178, Task179, Task195, Task202, Task203, Task211, and Task212; `corepack pnpm --filter @comath/comathd typecheck` exited 0; `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants; `corepack pnpm --filter @comath/comathd test` exited 0 with Task222 discovered by the default runner; and `corepack pnpm test` exited 0 including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- Read-only frontier subagents converged on the OCI/Docker/Podman profile-lineage slice for Task222; real-Pi interactive UX and optional real installed-toolchain Mathlib smoke remain valid later frontiers.

Boundary notes: Task222 does not ship a production OCI helper implementation, launch Docker/Podman containers, inspect Docker/Podman daemon/socket/container state, expose helper or socket paths, prove OS enforcement from profile lineage metadata, expose direct Pi collection/witness-chain payloads, affect Lean/mathlib proof authority, provide real-Pi evidence, provide broad provider support, or certify GA.

# Goal 3 Task 212 / Windows AppContainer Production-Helper Profile Contract

Scope: add a concrete Windows AppContainer production-helper profile contract so release audits can distinguish host operator configured helpers from bundled provider-helper protocol assets without treating either path as proof authority, OS-enforcement proof, real-Pi evidence, readiness evidence by itself, broad provider support, or GA certification.

Changes:

- Added manifest lineage fields across provider-runner, helper-host-validation, helper-execution, and provider-helper collection records: `helper_profile_source`, `production_helper_configured`, and `bundled_protocol_asset`.
- Added `agent_adapter_os_isolation_windows_appcontainer_production_helper_profile_contract` and registered `goal3-task212-agent-adapter-os-isolation-windows-appcontainer-production-helper-profile-contract.test.mjs` in release-hardening discovery.
- Extended the focused Task212 test so both env-configured Windows AppContainer helpers and bundled provider-helper protocol assets carry profile lineage through host-validation, helper-execution, and collection surfaces.
- Updated README, AGENTS, TODO, adapter contracts, threat model, config sample/docs, GA release criteria, REVIEW, and tracker wording to keep the profile contract non-authoritative.

Verification:

- TDD RED was observed before implementation: focused Task212 first failed because the service capability ledger did not advertise the new profile-contract capability, and then failed on missing README documentation after code/build changes.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0; focused Task212 exited 0; adjacent provider-helper regressions exited 0 for Task170, Task181, Task188, Task202, Task203, Task204, Task205, Task206, Task207, Task208, Task209, Task210, and Task211; `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants; `corepack pnpm --filter @comath/comathd typecheck` exited 0; `corepack pnpm --filter @comath/comathd test` exited 0 with Task212 discovered by the default runner; `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation; `git diff --check` exited 0 with Windows LF-to-CRLF warnings only; and `Test-Path -LiteralPath ".comath"` returned `False`.
- Read-only subagent review found no issues. It noted that the first Task212 test version asserted the bundled profile only at provider-runner level; the focused test was then strengthened to cover bundled host-validation, helper-execution, and collection lineage as well.

Boundary notes: Task212 does not ship a production Windows AppContainer helper implementation, does not execute adapters under AppContainer, does not inspect AppContainer policy state, does not prove OS enforcement from profile lineage metadata, does not expose direct Pi collection/witness-chain payloads, does not affect Lean/mathlib proof authority, does not provide real-Pi evidence, does not provide broad provider support, and does not certify GA.

# Goal 3 Task 211 / Provider-Helper Witness Chain Check-Debug

Scope: revalidate the Task202-210 bundled/configured provider-helper collection and provider-tool/family/live-probe/control-plane witness chain, including release-hardening suite discovery, route sanitization, config flags, public wording, blocker/veto wiring, no direct Pi collection/witness-chain consumer, runtime cleanliness, and missing collection-manifest fail-closed behavior.

Changes:

- Added `goal3-task211-agent-adapter-os-isolation-provider-helper-witness-chain-check-debug.test.mjs`.
- Added `agent_adapter_os_isolation_provider_helper_witness_chain_check_debug`.
- Registered Task211 in phase0 smoke and GA release criteria.
- Synchronized README, AGENTS, TODO, adapter contracts, threat model, config README, REVIEW, and the Goal 3 tracker.
- Added a runtime regression for Task210-shaped evidence whose `provider-helper-collection.json` disappears before readiness review.

Verification:

- TDD RED was observed before implementation: focused Task211 first failed because the service capability ledger did not advertise `agent_adapter_os_isolation_provider_helper_witness_chain_check_debug`.
- A later focused RED caught the runtime gap directly: after a valid Task210-shaped provider-helper witness chain was produced, deleting `.comath/release/agent-adapter-os-isolation/<probe_id>/provider-helper-collection.json` still allowed readiness to return `ok=true`. The collected-probe binding and provider-helper readiness checks now fail closed when provider-helper witness-chain evidence lacks its collection manifest.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0; focused Task211 exited 0; adjacent Task202-211 regressions exited 0 after correcting an initial manual Task210 filename typo in the command; `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants; `corepack pnpm --filter @comath/comathd typecheck` exited 0; `corepack pnpm --filter @comath/comathd test` exited 0 with Task211 discovered by the default runner; `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation; `git diff --check` exited 0 with Windows LF-to-CRLF warnings only; and `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task211 is check-debug and release-hardening coverage only. It does not ship production helper binaries, inspect daemon/socket/container/store/profile/sandbox-policy state, prove OS enforcement from witness metadata, add a direct Pi collection/witness-chain consumer, affect Lean proof authority, provide real-Pi evidence, provide broad provider support, or certify GA.

# Goal 3 Task 210 / Provider Control-Plane Execution Witness Gate

Scope: tighten complete provider-helper collection evidence so Task209-valid live-probe-execution-bound material must also bind a provider control-plane execution witness before nested canonical OS-isolation evidence can satisfy readiness.

Changes:

- Added `goal3-task210-agent-adapter-os-isolation-provider-control-plane-execution-witness-gate.test.mjs`.
- Added `agent_adapter_os_isolation_provider_control_plane_execution_witness_gate`.
- Added `provider_control_plane_execution_witness` material to provider-helper collection manifests, nested probe/evidence details, audit payloads, and readiness review checks.
- Required the witness to bind the current provider-family execution profile, provider tool hashes, helper transcript hash, and service-executed provider-specific live probe id/hash/tool/argv/stdout/stderr/transcript material.

Verification:

- TDD RED was observed before implementation: focused Task210 failed because Task209-valid collection evidence without a provider control-plane execution witness incorrectly passed (`true !== false`).
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task210 exited 0.
- Adjacent provider-helper regressions exited 0 for Task197, Task198, Task199, Task200, Task201, Task202, Task203, Task204, Task205, Task206, Task207, Task208, and Task209, plus Task170 and Task177/179/182/184/185/187/188/189 coverage for direct-host and legacy callback/configured helper behavior.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task210 discovered by the default runner.
- `corepack pnpm test` exited 0, including phase0 smoke, Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- Final `node scripts/phase0-smoke.mjs` after REVIEW/tracker updates exited 0.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task210 adds provenance and stale-evidence hardening only. The provider control-plane execution witness remains non-authoritative, non-release-grade, and non-shipping metadata; all existing production-helper, host-inspection, Lean-authority, Pi-execution, provider-coverage, and release-certification residual risks remain open.

# Goal 3 Task 209 / Provider-Specific Live Probe Collection Binding Gate

Scope: tighten complete provider-helper collection evidence so Task208-valid service-owned live probe execution material must also be bound by the configured provider-helper collection probe stdout before nested canonical OS-isolation evidence can satisfy readiness.

Changes:

- Added `goal3-task209-agent-adapter-os-isolation-provider-specific-live-probe-collection-binding-gate.test.mjs`.
- Added `agent_adapter_os_isolation_provider_specific_live_probe_collection_binding_gate`.
- Required configured collection probes to bind the service-executed `provider_specific_live_probe_execution` id/hash/tool/argv/stdout/stderr/transcript material before complete OS facts can satisfy nested canonical evidence.
- Registered Task209 in phase0 smoke and GA release criteria.

Verification:

- TDD RED was observed before implementation: focused Task209 initially failed because missing collection-side live-probe binding still let complete configured collection facts pass (`true !== false`).
- After the core implementation, focused Task209 reached the expected docs/capability registration failure before the public registration surfaces were synchronized.
- After synchronization, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task209 exited 0.
- Adjacent provider-helper regressions exited 0 for Task199, Task200, Task201, Task202, Task203, Task204, Task205, Task206, Task207, and Task208.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task209 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.
- Read-only code review found no code-path issues; it flagged only missing diff-check/runtime-state evidence in this REVIEW/tracker record, which was repaired.

Boundary notes: Task209 adds collection-side provenance and anti-drift hardening only. It does not alter Lean authority, live Pi execution status, provider coverage, real daemon/policy inspection, or release readiness by itself.

Residual risks: Goal 3 remains incomplete. This task does not ship provider-specific production sandbox helpers, execute container/Nix/Firejail/sandbox-exec tools by default, inspect daemon/socket/container/store/profile/sandbox-policy state, provide durable long-lived operator transport, broaden Lean/mathlib replay, or complete fully interactive real-Pi execution.

# Goal 3 Task 208 / Provider-Specific Live Probe Execution Gate

Scope: tighten complete provider-helper collection evidence so Task207-valid live-probe-attempt material must also bind to a separately executed service-owned provider-specific live OS probe subprocess before nested canonical OS-isolation evidence can satisfy readiness.

Changes:

- Added `goal3-task208-agent-adapter-os-isolation-provider-specific-live-probe-execution-gate.test.mjs`.
- Added `agent_adapter_os_isolation_provider_specific_live_probe_execution_gate`.
- Added provider-specific live probe execution fields to provider-helper collection manifests, nested probe/evidence details, audit payloads, and readiness review checks.
- Required configured collection probes to bind `provider_specific_live_probe_execution` material with live probe tool/argv/stdout/stderr/transcript hashes before complete OS facts can satisfy nested canonical evidence.
- Added missing provider-specific live probe execution blockers and readiness vetoes for missing or mismatched live-probe execution material.
- Registered Task208 in phase0 smoke and GA release criteria.

Verification:

- TDD RED was observed before implementation: focused Task208 initially failed because the service capability ledger did not advertise `agent_adapter_os_isolation_provider_specific_live_probe_execution_gate`.
- A later RED caught stale pre-Task208 canonical evidence without `provider_specific_live_probe_execution_*` fields incorrectly passing readiness (`true !== false`); readiness and collected-probe binding were hardened before GREEN.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task208 exited 0.
- Adjacent provider-helper regressions exited 0 for Task177, Task179, Task182, Task184, Task185, Task187, Task188, Task189, Task203, Task204, Task205, Task206, and Task207.
- Package-gate verification exposed two Task208 integration issues before final GREEN: direct Task170 host collection was over-gated by the live-probe-execution predicate, and Task199/Task200 configured provider-helper positive fixtures had not yet been migrated to service-owned live-probe execution env setup. The gate predicate was narrowed to explicit `provider_specific_live_probe_execution_required`, and Task199/Task200 fixtures were migrated without weakening provider-helper Task208 readiness.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task170, Task199, Task200, Task201, Task202, Task203, Task204, Task205, Task206, Task207, and Task208 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.
- Read-only subagent reviews found the stale pre-Task208 readiness bypass and tracker/smoke/docs drift; those issues were repaired.

Boundary notes: Task208 adds provenance and stale-evidence hardening only. The live probe execution binding does not alter Lean authority, live Pi execution status, provider coverage, real daemon/policy inspection, or release readiness by itself.

Residual risks: Goal 3 remains incomplete. This task does not ship provider-specific production sandbox helpers, execute container/Nix/Firejail/sandbox-exec tools by default, inspect daemon/socket/container/store/profile/sandbox-policy state, provide durable long-lived operator transport, broaden Lean/mathlib replay, or complete fully interactive real-Pi execution.

# Goal 3 Task 207 / Provider-Specific Live Probe Attempt Gate

Scope: tighten complete provider-helper collection evidence so Task206-valid provider-family execution-profile material must also bind to a provider-specific live probe attempt before nested canonical OS-isolation evidence can satisfy readiness.

Changes:

- Added `goal3-task207-agent-adapter-os-isolation-provider-specific-live-probe-attempt-gate.test.mjs`.
- Added `agent_adapter_os_isolation_provider_specific_live_probe_attempt_gate`.
- Added provider-specific live probe attempt fields to provider-helper collection manifests, nested probe/evidence details, audit payloads, and readiness review checks.
- Required configured collection probes to emit matching `provider_specific_live_probe_attempt` material before complete OS facts can satisfy nested canonical evidence.
- Added missing provider-specific live probe attempt blockers and readiness vetoes for missing or mismatched live-probe material.
- Registered Task207 in phase0 smoke and GA release criteria.

Verification:

- TDD RED was observed before implementation: focused Task207 initially failed because the service capability ledger did not advertise `agent_adapter_os_isolation_provider_specific_live_probe_attempt_gate`.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task207 exited 0.
- Adjacent provider-helper regressions exited 0: Task177, Task179, Task182, Task184, Task185, Task187, Task188, Task189, Task197, Task198, Task199, Task200, Task201, Task202, Task203, Task204, Task205, and Task206.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task207 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, comathd package tests, Phase45 e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task207 adds provenance and stale-evidence hardening only. The live probe attempt does not alter Lean authority, live Pi execution status, provider coverage, or release readiness by itself.

Residual risks: Goal 3 remains incomplete. This task does not ship provider-specific production sandbox helpers, execute container/Nix/Firejail/sandbox-exec tools by default, inspect daemon/socket/container/store/profile/sandbox-policy state, provide durable long-lived operator transport, broaden Lean/mathlib replay, or complete fully interactive real-Pi execution.

# Goal 3 Task 206 / Provider-Family Execution Profile Gate

Scope: tighten complete provider-helper collection evidence so Task205-valid provider-family OS-enforcement witness material must also bind to a service-derived provider-family execution kind, profile hash, and argv hash before nested canonical OS-isolation evidence can satisfy readiness.

Changes:

- Added `goal3-task206-agent-adapter-os-isolation-provider-family-execution-profile-gate.test.mjs`.
- Added `agent_adapter_os_isolation_provider_family_execution_profile_gate`.
- Added provider-family execution profile fields to provider-helper collection manifests, nested probe/evidence details, audit payloads, and readiness review checks.
- Required configured collection probes to emit matching `provider_family_execution_profile` material before complete OS facts can satisfy nested canonical evidence.
- Added missing provider-family execution profile blockers and readiness vetoes for missing, mismatched, or stale pre-Task206 collection evidence.
- Registered Task206 in phase0 smoke and GA release criteria.

Verification:

- TDD RED was observed before implementation: focused Task206 initially failed because the service capability ledger did not advertise `agent_adapter_os_isolation_provider_family_execution_profile_gate`, then progressed to missing smoke/docs registration after the first implementation slice.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task206 exited 0.
- Adjacent provider-helper regressions exited 0: Task177, Task179, Task182, Task184, Task185, Task187, Task188, Task189, Task197, Task198, Task199, Task200, Task201, Task202, Task203, Task204, and Task205.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task206 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, Phase45 e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task206 adds provenance and stale-evidence hardening only. The provider-family execution profile remains non-authoritative, non-release-grade, and non-shipping metadata.

Residual risks: Goal 3 remains incomplete. This task does not ship provider-specific production sandbox helpers, execute container/Nix/Firejail/sandbox-exec tools by default, inspect daemon/socket/container/store/profile/sandbox-policy state, provide durable long-lived operator transport, broaden Lean/mathlib replay, or complete fully interactive real-Pi execution.

# Goal 3 Task 205 / Provider-Family OS-Enforcement Witness Gate

Scope: tighten complete provider-helper collection evidence so Task204-valid provider-tool and host-capability tool bindings must also carry `provider_family_os_enforcement_witness` material bound to the current provider family, helper transcript, host-capability artifact/tool binding, complete OS-enforcement facts, disabled network policy, and `proof_authority="none"`.

Changes:

- Added `goal3-task205-agent-adapter-os-isolation-provider-family-enforcement-witness-gate.test.mjs`.
- Added `agent_adapter_os_isolation_provider_family_os_enforcement_witness_gate`.
- Added provider-family OS-enforcement witness fields to provider-helper collection manifests, nested probe/evidence details, audit payloads, and readiness review checks.
- Required configured collection probes to emit matching `provider_family_os_enforcement_witness` material before complete OS facts can satisfy nested canonical evidence.
- Added missing provider-family witness blockers and readiness vetoes for missing, mismatched, or stale pre-Task205 collection evidence.
- Registered Task205 in phase0 smoke and GA release criteria.

Verification:

- TDD RED was observed before implementation: focused Task205 initially failed because the service capability ledger did not advertise `agent_adapter_os_isolation_provider_family_os_enforcement_witness_gate`.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- Focused Task205 exited 0.
- Adjacent provider-helper regressions exited 0: Task177, Task179, Task182, Task184, Task185, Task187, Task188, Task189, Task197, Task198, Task199, Task200, Task201, Task202, Task203, and Task204.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task205 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, Phase45 e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.
- Read-only diff review found no issues; residual suggested future hardening is a dedicated hash-corruption negative test for `provider_family_os_enforcement_witness_sha256` across evidence/probe/collection.

Boundary notes: Task205 adds provenance and stale-evidence hardening only. The provider-family OS-enforcement witness does not alter Lean authority, live Pi execution status, provider coverage, or certify/complete release readiness.

Residual risks: Goal 3 remains incomplete. This task does not ship provider-specific production sandbox helpers, execute container/Nix/Firejail/sandbox-exec tools by default, inspect daemon/socket/container/store/profile/sandbox-policy state, provide durable long-lived operator transport, broaden Lean/mathlib replay, or complete fully interactive real-Pi execution.

# Goal 3 Task 204 / Provider-Specific Tool Binding Gate

Scope: tighten complete provider-helper collection evidence so a Task203-valid provider-tool witness must also bind to a host-capability provider tool name/hash observed by the current service-owned capability probe.

Changes:

- Added `goal3-task204-agent-adapter-os-isolation-provider-specific-tool-binding.test.mjs`.
- Added `agent_adapter_os_isolation_provider_specific_tool_binding_gate`.
- Added provider-specific tool binding fields to provider-helper collection manifests, nested probe/evidence details, audit payloads, and readiness review checks.
- Required configured collection probes to receive service-derived `--provider-host-tool-*` expectations and to emit matching `provider_tool_execution_witness.host_capability_tool_*` fields.
- Added missing provider-specific tool binding blockers and readiness vetoes for stale or incomplete collection evidence, including current host-capability artifact drift.
- Registered Task204 in phase0 smoke and GA release criteria.

Verification:

- TDD RED was observed before implementation: focused Task204 initially failed because the capability ledger did not expose `agent_adapter_os_isolation_provider_specific_tool_binding_gate`; after partial implementation it also caught docs/smoke registration drift and a nested canonical probe `ok=true` escape when provider-specific tool binding was missing. A later focused RED caught readiness accepting evidence after the current host-capability artifact's provider tool hash drifted; the readiness re-read gate was added before GREEN.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- Focused Task204 exited 0.
- Adjacent provider-helper regressions exited 0: Task177, Task179, Task182, Task184, Task185, Task187, Task188, Task189, Task197, Task198, Task199, Task200, Task201, Task202, and Task203.
- `node scripts/phase0-smoke.mjs` exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task204 discovered by the default runner.
- `corepack pnpm test` exited 0, including Pi workspace tests, Phase45 e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task 204 adds provenance and stale-evidence hardening only. The provider-specific tool binding does not alter Lean authority, live Pi execution status, provider coverage, or certify/complete release readiness.

Residual risks: Goal 3 remains incomplete. This task does not ship provider-specific production sandbox helpers, execute container/Nix/Firejail/sandbox-exec tools by default, inspect daemon/socket/container/store/profile/sandbox-policy state, provide durable long-lived operator transport, broaden Lean/mathlib replay, or complete fully interactive real-Pi execution.

# Goal 3 Task 203 / Provider Tool Execution Witness Gate

Scope: tighten complete provider-helper collection evidence so complete OS-enforcement facts require a provider-specific executed-tool witness bound to service-derived collection-probe executable/profile/fixed-argv-template hashes and the current helper transcript before OS-isolation readiness can accept nested canonical evidence.

Changes:

- Added `goal3-task203-agent-adapter-os-isolation-provider-tool-witness-gate.test.mjs`.
- Added `agent_adapter_os_isolation_provider_tool_execution_witness_gate`.
- Added provider-tool witness binding to provider-helper collection manifests, nested probe/evidence details, audit payloads, and readiness review checks.
- Required configured collection probes to receive service-derived `--provider-tool-*` expected hashes and to emit matching `provider_tool_execution_witness` fields.
- Added stale pre-Task203/pre-Task204 evidence rejection so old complete OS-fact artifacts without witness or provider-specific tool binding cannot satisfy readiness.
- Registered Task203 in phase0 smoke and GA release criteria.
- Updated README, AGENTS, TODO, adapter contracts, threat model, config sample, config README, REVIEW, and the Goal 3 tracker wording.

Verification:

- TDD RED was observed before implementation: a focused Task203 regression using an internal service-owned callback with complete facts but a mismatched helper transcript witness exited 1 because the collection incorrectly became `ok=true`.
- `corepack pnpm --filter @comath/comathd build` exited 0 after the witness binding implementation.
- Focused Task203 initially failed on missing public Task203 registration; docs/config/tracker registration was repaired before final verification.
- Focused legacy provider-helper collection regressions exited 0 after updating service-owned callback fixtures to bind service-derived provider-tool witness expectations: Task177, Task179, Task182, Task184, Task185, Task187, Task188, and Task189.
- Adjacent Task197-203 regressions exited 0 after a fresh build. An earlier focused rerun used stale file names for Task197, Task198, and Task201 and produced module-not-found errors only; the correct files were rerun and passed.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task203 discovered by the default runner.
- `corepack pnpm test` exited 0, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- Final `node scripts/phase0-smoke.mjs` exited 0 after tracker/review edits.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.
- Read-only code-path subagent review found stale pre-Task203/pre-Task204 provider-helper collection/evidence acceptance without witness or current host-capability provider tool binding; readiness now vetoes stale nested canonical evidence when provider-helper collection context exists.
- Read-only witness-semantics subagent review found the initial witness hashes were shape-only/self-attested; configured and bundled collection probe paths now bind witness hashes to service-derived executable/profile/fixed-argv-template expectations.

Boundary notes: Task203 adds provenance and stale-evidence hardening only. A provider-tool witness is not proof authority, real-Pi evidence, broad provider support, or GA certification; it is a required binding gate before complete provider-helper collection evidence can satisfy adapter OS-isolation readiness.

Residual risks: Goal 3 remains incomplete. Task203 does not ship provider-specific production sandbox helpers, does not execute container/Nix/Firejail/sandbox-exec tools by default, does not inspect daemon/socket/container/store/profile/sandbox-policy state, does not provide broad cross-platform OS-enforced execution, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 202 / Bundled Provider Helper Collection Probe

Scope: add a bundled provider-helper collection probe asset for the default no-env provider-helper collection path, so the production route executes service-owned collection binding logic while still preserving incomplete OS-enforcement blocker semantics.

Changes:

- Added `goal3-task202-agent-adapter-os-isolation-bundled-provider-helper-collection-probe.test.mjs`.
- Added `provider-helper-collection-probe.mjs` as a copied helper asset.
- Added `agent_adapter_os_isolation_bundled_provider_helper_collection_probe_asset`.
- Made the default provider-helper collection probe execute the bundled asset when no configured collection probe is supplied.
- Registered Task202 in phase0 smoke and GA release criteria.
- Updated README, AGENTS, TODO, adapter contracts, threat model, REVIEW, and the Goal 3 tracker wording.

Verification:

- TDD RED was observed before implementation: focused Task202 initially exited 1 because the service capability ledger did not advertise `agent_adapter_os_isolation_bundled_provider_helper_collection_probe_asset`.
- `corepack pnpm --filter @comath/comathd build` exited 0 after implementation.
- Focused Task202 exited 0 after implementation.
- Adjacent provider-helper regressions exited 0 after the fresh build: Task187, Task188, Task189, Task191, Task197, Task198, Task199, Task200, Task201, and Task202.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task202 discovered by the default runner.
- `corepack pnpm test` exited 0, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.
- Read-only documentation/smoke review found no issues after checking Task202 release-hardening registration, GA criteria listing, TODO rollover, public wording, and the focused Task202 test.
- Read-only code-path review found no issues in configured-probe precedence, bundled default execution, fixed argv/stdout binding, incomplete OS facts, and readiness rejection. It reported Task197/Task198 failures from its read-only check before build/copy state was refreshed; the main thread reran Task197 and Task198 after a fresh build and both exited 0.

Boundary notes: Task202 changes the no-env default provider-helper collection path from an in-process incomplete blocker into a spawned bundled collection probe asset. The bundled probe binds current helper execution, host-validation, host-capability, and hash facts, records false OS-enforcement facts, and leaves readiness rejection intact until a provider-specific collector supplies all required OS facts.

Residual risks: Goal 3 remains incomplete. Task202 does not ship provider-specific OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute container/Nix/Firejail/sandbox-exec tools by default, does not inspect daemon/socket/container/store/profile/sandbox-policy state, does not provide broad cross-platform OS-enforced execution, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 201 / Provider Helper Release Chain Check-Debug

Scope: revalidate the Task190-200 provider host-capability, helper host-validation, helper execution, runtime-attestation, default/configured collection, wrapper-readiness, public wording, route/Pi payload, runtime cleanliness, and release-hardening suite discovery chain, with a new stale host-capability artifact drift regression.

Changes:

- Added `goal3-task201-agent-adapter-os-isolation-provider-helper-release-chain-check-debug.test.mjs`.
- Added `agent_adapter_os_isolation_provider_helper_release_chain_check_debug`.
- Added `blocked_provider_helper_collection_host_capability_binding_mismatch`.
- Required provider-helper collection to re-read the current provider host-capability artifact and compare it to the host-validation binding before configured collection probe output can be accepted.
- Registered Task201 in phase0 smoke and GA release criteria.
- Updated README, AGENTS, TODO, adapter contracts, threat model, REVIEW, and the Goal 3 tracker wording.

Verification:

- TDD RED was observed before implementation: focused Task201 initially exited 1 because the service capability ledger did not advertise `agent_adapter_os_isolation_provider_helper_release_chain_check_debug`.
- `corepack pnpm --filter @comath/comathd build` exited 0 after implementation.
- Focused Task201 exited 0 after implementation.
- Adjacent Task190-200 regressions exited 0 after using the correct Pi extension path for Task192.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task201 discovered by the default runner.
- `corepack pnpm test` exited 0, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- Read-only code review found a stale provider host-capability artifact drift gap; the focused Task201 regression was strengthened to cover that drift, and collection now re-reads the current host-capability artifact before accepting configured probe output.
- Final read-only review found no issues after checking the current diff, focused Task201, and phase0 smoke. The reviewer did not rerun the full build/typecheck/test or adjacent Task190-200 suite; those gates were run by the main thread above.

Boundary notes: Task201 is release-hardening and check-debug coverage only. It makes stale provider host-capability artifacts or stale host-validation bindings fail closed before configured collection can write nested canonical evidence. It preserves the existing non-authority wrapper semantics and Lean-only proof-authority boundary.

Residual risks: Goal 3 remains incomplete. Task201 does not ship built-in production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute container/Nix/Firejail/sandbox-exec tools by default, does not inspect daemon/socket/container/store/profile/sandbox-policy state, does not provide broad cross-platform OS-enforced execution, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 200 / Configured Collection Host Capability Binding

Scope: require configured provider-helper collection probes to bind the current provider-helper host-validation artifact and observed provider host-capability probe artifact before canonical OS-isolation evidence can be nested, while preserving non-authority wrapper semantics and Lean-only proof authority.

Changes:

- Added `goal3-task200-agent-adapter-os-isolation-configured-collection-host-capability-binding.test.mjs`.
- Added host-validation id/path/hash and provider host-capability probe id/path/hash/status fields to configured collection probe fixed argv and stdout binding.
- Required provider-helper collection to fail closed unless helper execution, host validation, and provider host capability remain mutually bound.
- Persisted host capability binding metadata in provider-helper collection manifests and audit events.
- Added `agent_adapter_os_isolation_configured_provider_helper_collection_host_capability_binding`.
- Registered Task200 in phase0 smoke and GA release criteria.
- Updated README, AGENTS, TODO, adapter contracts, threat model, config sample, config README, REVIEW, and the Goal 3 tracker wording.

Verification:

- TDD RED was observed before implementation: focused Task200 initially exited 1 because `agent_adapter_os_isolation_configured_provider_helper_collection_host_capability_binding` was not present in the service capability ledger; after adding an explicit manifest-field assertion, focused Task200 exited 1 because `provider_helper_collection.host_validation_path` was not persisted.
- `corepack pnpm --filter @comath/comathd build` exited 0 after implementation.
- Focused Task200 exited 0 after implementation.
- Focused Task199 exited 0 after Task200 fixture/contract hardening.
- Adjacent focused regressions exited 0: Task198, Task197, Task187, and Task191.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task200 discovered by the default runner.
- Read-only code review found no code-path issues. Read-only documentation review found wording/tracker gaps, and those were repaired before final verification.

Boundary notes: Task200 changes only the configured provider-helper collection probe binding path. A configured collection probe cannot be accepted unless helper execution is collectable, runtime-attested, and still bound to the current service-owned host-validation artifact, and that host-validation artifact is still bound to an observed service-owned provider host-capability probe. Configured probe stdout must bind host-validation id/path/hash, host-capability probe id/path/hash/status, and `provider_host_capability_bound=true`. These bindings are audit and provenance prerequisites only. They do not make host capability metadata readiness evidence by itself, do not make helper collection wrappers readiness evidence, do not provide real-Pi evidence, do not affect mathematical proof authority, and do not certify GA.

Residual risks: Goal 3 remains incomplete. Task200 does not ship built-in production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute container/Nix/Firejail/sandbox-exec tools by default, does not inspect daemon/socket/container/store/profile/sandbox-policy state, does not provide broad cross-platform OS-enforced execution, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA. The focused Task200 negative path covers a configured probe missing the host-capability artifact hash; stale persisted host-validation/hash mismatch tampering remains a future focused hardening target.

# Goal 3 Task 199 / Configured Provider Helper Collection Probe

Scope: make the production provider-helper collection route execute a host-configured service-owned provider collection probe after the runtime-attestation gate, while preserving route payload rejection, non-authority wrappers, and Lean-only proof authority.

Changes:

- Added `goal3-task199-agent-adapter-os-isolation-configured-provider-helper-collection-probe.test.mjs`, covering the complete configured probe path and an invalid-stdout binding fail-closed path.
- Added provider-specific `*_COLLECTION_PROBE` and `*_COLLECTION_PROBE_ARGS_JSON` handles plus fallback provider-helper collection probe handles.
- Added default-route execution for configured collection probes with `shell=false`, fixed argv/env, disabled-network `proof_authority=none`, stdout JSON binding, and fail-closed incomplete blocker fallback.
- Added `agent_adapter_os_isolation_configured_provider_helper_collection_probe`.
- Registered Task199 in phase0 smoke and GA release criteria.
- Updated README, AGENTS, TODO, adapter contracts, GA release criteria, config sample, and config README wording.

Verification:

- TDD RED was observed before implementation: focused Task199 exited 1 because the service capability ledger did not advertise `agent_adapter_os_isolation_configured_provider_helper_collection_probe`.
- `corepack pnpm --filter @comath/comathd build` exited 0 after implementation.
- Focused Task199 exited 0, including the complete configured probe path and invalid stdout hash-binding fail-closed regression.
- Adjacent focused regressions exited 0: Task182, Task187, Task197, and Task198.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task199 discovered by the default runner.
- `corepack pnpm test` exited 0, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- Read-only subagent review found no code-path issues in the core implementation/test. It noted missing explicit negative coverage for invalid configured probe outcomes; an invalid stdout hash-binding fail-closed regression was added and focused Task199 was rerun successfully.

Boundary notes: Task199 changes only the production route/no-injected-callback provider-helper collection path after the Task187 runtime-attestation gate. Configured collection probes must be service-owned executables with bounded JSON args prefixes, fixed argv/env, `shell=false`, and stdout JSON binding to project, collection, helper execution, runner, launch, adapter, backend, provider, helper exit code, and helper stdout/stderr/transcript hashes. Caller collection booleans/hashes remain ignored. Invalid, missing, or incomplete configured probes remain replayable blockers. A complete configured probe can make the nested canonical probe/evidence artifact satisfy OS-isolation readiness, but the collection wrapper itself stays `adapter_execution_isolation.os_enforced=false`, `proof_authority="none"`, `can_promote_claim=false`, and `can_certify_ga=false`.

Residual risks: Goal 3 remains incomplete. Task199 does not ship built-in production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute container/Nix/Firejail/sandbox-exec tools by default, does not provide broad cross-platform OS-enforced execution, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 198 / Default Provider Helper Collection Probe

Scope: make the production provider-helper collection route/no-injected-callback path write service-owned, hash-bound blocker evidence after a collectable runtime-attested helper execution, while preserving non-authority and readiness rejection.

Changes:

- Added `goal3-task198-agent-adapter-os-isolation-provider-helper-default-collection-probe.test.mjs`.
- Added internal default provider-helper collection probe behavior for `collectAgentAdapterOsIsolationProviderHelperExecutionEvidence()` when no injected probe is supplied.
- Added `agent_adapter_os_isolation_provider_helper_default_collection_probe`.
- Migrated public route/no-callback expectations in Task177, Task182, Task188, and Task189 from generic no-collection to incomplete OS-enforcement blocker semantics.
- Registered Task198 in phase0 smoke and GA release criteria.
- Updated README, AGENTS, TODO, adapter contracts, GA release criteria, and threat model wording.

Verification:

- TDD RED was observed before implementation: focused Task198 exited 1 because the service capability ledger did not advertise `agent_adapter_os_isolation_provider_helper_default_collection_probe`.
- `corepack pnpm --filter @comath/comathd build` exited 0 after implementation.
- Focused Task198 exited 0.
- Adjacent focused regressions exited 0: Task177, Task182, Task187, Task188, Task189, and Task197.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task198 discovered by the default runner.
- `corepack pnpm test` exited 0, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task198 changes the production route/no-injected-callback result only after helper execution is already collectable and runtime-attested. The default probe binds persisted helper exit/stdout/stderr/transcript hashes and records false OS-enforcement facts, so it emits `blocked_provider_helper_collection_incomplete_os_enforcement` blocker evidence rather than collected OS-enforcement evidence. Caller collection booleans/hashes remain ignored, the Task187 runtime-attestation gate still blocks before probe writing, wrapper manifests keep `adapter_execution_isolation.os_enforced=false`, and readiness still requires a later provider-specific complete service-owned OS probe.

Residual risks: Goal 3 remains incomplete. Task198 does not ship production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute adapters under OS enforcement, does not make default blocker evidence readiness evidence, does not broaden Lean/mathlib replay, does not provide durable long-lived operator transport, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 197 / Provider Helper Collection Complete Enforcement Gate

Scope: make provider-helper collection fail closed when an internal service-owned callback is hash-bound to the helper execution but reports incomplete OS-enforcement facts, while preserving canonical blocker evidence and non-authority semantics.

Changes:

- Added `goal3-task197-agent-adapter-os-isolation-provider-helper-collection-complete-enforcement-gate.test.mjs`.
- Added `blocked_provider_helper_collection_incomplete_os_enforcement` for the hash-bound but incomplete callback case.
- Added provider-helper collection manifest fields `os_enforcement_complete` and `incomplete_os_enforcement_facts`.
- Added `agent_adapter_os_isolation_provider_helper_collection_complete_enforcement_gate`.
- Registered Task197 in phase0 smoke and GA release criteria.
- Updated README, AGENTS, TODO, adapter contracts, GA release criteria, and threat model wording.

Verification:

- TDD RED was observed before implementation: focused Task197 exited 1 because the service capability ledger did not advertise `agent_adapter_os_isolation_provider_helper_collection_complete_enforcement_gate`.
- `corepack pnpm --filter @comath/comathd build` exited 0 after implementation.
- Focused Task197 exited 0.
- Adjacent regressions exited 0: Task167, Task172, Task177, and Task187.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` initially exceeded a 180-second command timeout and left six `node` test child processes; those residual PIDs were cleaned up with approved elevated `Stop-Process`, and the same command rerun with a sufficient timeout exited 0 with Task197 discovered by the default runner.
- `corepack pnpm test` exited 0, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task197 only distinguished service-owned hash-bound collection callbacks with incomplete OS-enforcement facts from generic no-collection cases before Task198 introduced a default route collector. It preserves the Task187 runtime-attestation gate, leaves incomplete canonical probe/evidence as readiness blockers, and keeps helper collection wrappers non-authoritative with `adapter_execution_isolation.os_enforced=false`, `proof_authority="none"`, `can_promote_claim=false`, and `can_certify_ga=false`.

Residual risks: Goal 3 remains incomplete. Task197 does not ship production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute adapters under OS enforcement, does not broaden Lean/mathlib replay, does not provide durable long-lived operator transport, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 196 / Remaining Provider Host Facility Probes

Scope: complete the default service-owned provider host facility diagnostic matrix for Nix sandbox, Firejail, and macOS `sandbox-exec`, while keeping `nix`, `nix-store`, `firejail`, and `sandbox-exec` observation diagnostic-only and unable to become provider-helper readiness, executed OS-isolation evidence, proof authority, real-Pi evidence, broad provider support, or GA certification.

Changes:

- Added `goal3-task196-agent-adapter-os-isolation-remaining-provider-host-facility-probes.test.mjs`.
- Added a shared remaining-provider facility diagnostic producer to the default host capability probe.
- The probe records `nix_sandbox_host_facility_probe`, `firejail_host_facility_probe`, `macos_sandbox_exec_host_facility_probe`, matching service-observed host facility family features, and executable-candidate presence/hash metadata for `nix`, `nix-store`, `firejail`, and `sandbox-exec`.
- The probe never executes those tools, never reads store/profile/sandbox-policy state, and does not record tool versions.
- PATH probing reuses the executable-candidate detector: POSIX files must have an execute bit, and Windows files must match a PATHEXT executable suffix.
- Sanitization keeps caller tool paths, PATH entries, executable paths, and caller secrets out of route responses, persisted manifests, and audit events.
- Added `agent_adapter_os_isolation_remaining_provider_host_facility_probes`, phase0 smoke coverage, GA release criteria coverage, and public boundary wording.

Verification:

- TDD RED was observed before implementation: focused Task196 exited 1 because the service capability ledger did not advertise `agent_adapter_os_isolation_remaining_provider_host_facility_probes`.
- `corepack pnpm --filter @comath/comathd build` exited 0 after implementation.
- After implementation, focused Task196 exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0, with Task196 discovered by the default runner.
- Adjacent provider-host regressions exited 0: Task190, Task191, Task193, Task194, and Task195.
- `corepack pnpm test` exited 0, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task196 observes Nix/Firejail/macOS host facility metadata and hashes CLI binaries when available, but it does not execute those CLIs, inspect stores/profiles/sandbox policies, launch a sandbox, execute an adapter under OS enforcement, validate a provider helper, satisfy readiness review, write proof authority, provide real-Pi execution evidence, broaden cross-platform helper support, or certify GA. Caller-supplied platform, tool path, capability facts, kernel facts, proof-authority fields, and GA flags remain ignored.

Residual risks: Goal 3 remains incomplete. Task196 does not ship production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute helpers under OS-enforced isolation, does not make host facility metadata readiness evidence, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 195 / OCI Container Host Facility Probe

Scope: extend the default service-owned provider host capability probe with an OCI container host facility diagnostic while keeping Docker/Podman observation diagnostic-only and unable to become provider-helper readiness, executed OS-isolation evidence, proof authority, real-Pi evidence, broad provider support, or GA certification.

Changes:

- Added `goal3-task195-agent-adapter-os-isolation-oci-container-host-facility-probe.test.mjs`.
- Added an OCI container facility diagnostic producer to the default host capability probe.
- The probe records `oci_container_host_facility_probe`, `oci_container_service_observed_host_facility_family`, and Docker/Podman CLI presence/hash metadata from service-owned host state.
- The probe never executes Docker or Podman, never inspects daemons, sockets, or container runtime state, and does not record tool versions.
- Docker/Podman PATH probing now requires executable candidates: POSIX files must have an execute bit, and Windows files must match a PATHEXT executable suffix.
- Sanitization keeps caller tool paths, executable paths, and caller secrets out of route responses, persisted manifests, and audit events.
- Added `agent_adapter_os_isolation_oci_container_host_facility_probe`, phase0 smoke coverage, GA release criteria coverage, and public boundary wording.

Verification:

- TDD RED was observed before implementation: focused Task195 exited 1 because the service capability ledger did not advertise `agent_adapter_os_isolation_oci_container_host_facility_probe`.
- `corepack pnpm --filter @comath/comathd build` exited 0 after implementation.
- After implementation, focused Task195 exited 0.
- Read-only code review found a false-positive risk where non-executable PATH files named `docker` or `podman` could be hashed as CLI presence. The Task195 test was strengthened with controlled non-executable lookalikes, reproduced the failure, and then passed after executable-candidate detection was added.
- Adjacent provider-host regressions exited 0: Task190, Task191, Task193, and Task194.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0, with Task195 discovered by the default runner.
- `corepack pnpm test` exited 0, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task195 observes OCI host facility metadata and hashes Docker/Podman CLI binaries when available, but it does not execute those CLIs, inspect container daemons or sockets, launch an OCI container, execute an adapter under OS enforcement, validate a provider helper, satisfy readiness review, write proof authority, provide real-Pi execution evidence, broaden cross-platform helper support, or certify GA. Caller-supplied platform, tool path, capability facts, kernel facts, proof-authority fields, and GA flags remain ignored.

Residual risks: Goal 3 remains incomplete. Task195 does not ship production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute helpers under OS-enforced isolation, does not make host facility metadata readiness evidence, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 194 / Windows AppContainer Host Facility Probe

Scope: extend the default service-owned provider host capability probe with one concrete OS-family host facility diagnostic for Windows AppContainer, while keeping the output diagnostic-only and unable to become provider-helper readiness, executed OS-isolation evidence, proof authority, real-Pi evidence, broad provider support, or GA certification.

Changes:

- Added `goal3-task194-agent-adapter-os-isolation-windows-appcontainer-host-facility-probe.test.mjs`.
- Added a Windows AppContainer facility diagnostic producer to the default host capability probe.
- The probe records `windows_appcontainer_host_facility_probe`, `windows_appcontainer_service_observed_host_facility_family`, and `windows_checknetisolation` tool presence/hash metadata from service-owned Win32 host state.
- Sanitization keeps Windows system paths and caller secrets out of route responses, persisted manifests, and audit events.
- Added `agent_adapter_os_isolation_windows_appcontainer_host_facility_probe`, phase0 smoke coverage, GA release criteria coverage, and public boundary wording.

Verification:

- TDD RED was observed before implementation: focused Task194 exited 1 because the service capability ledger did not advertise `agent_adapter_os_isolation_windows_appcontainer_host_facility_probe`.
- `corepack pnpm --filter @comath/comathd build` initially caught a TypeScript array inference issue in the new diagnostic merge; the root cause was `.concat()` narrowing the literal array type before merging interface-typed nullable fields, and the implementation now uses spread merging under the declared return type.
- After implementation, focused Task194 exited 0.
- Adjacent provider-host regressions exited 0: Task190, Task191, and Task193.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test` exited 0, with Task194 discovered by the default runner.
- `corepack pnpm test` exited 0, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.

Boundary notes: Task194 observes Windows host facility metadata and hashes the `CheckNetIsolation` host tool when available, but it does not launch an AppContainer, execute an adapter under OS enforcement, validate a provider helper, satisfy readiness review, write proof authority, provide real-Pi execution evidence, broaden cross-platform helper support, or certify GA. Caller-supplied platform, tool path, capability facts, kernel facts, proof-authority fields, and GA flags remain ignored.

Residual risks: Goal 3 remains incomplete. Task194 does not ship production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute helpers under OS-enforced isolation, does not make host facility metadata readiness evidence, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 193 / Default Provider Host Capability Probe

Scope: add a default service-owned provider host capability probe for the route/no-injected-callback path while keeping host capability manifests diagnostic-only and unable to become provider-helper readiness, executed OS-isolation evidence, proof authority, real-Pi evidence, broad provider support, or GA certification.

Work performed:

- Treated Task192's next step as authoritative and selected the production host-probe residual blocker.
- Used read-only subagent review for the default collector insertion point and non-authority boundaries while keeping this thread as the only writer.
- Added `goal3-task193-agent-adapter-os-isolation-default-provider-host-capability-probe.test.mjs`.
- Added the internal default service-owned provider host capability probe, using service-observed provider/platform compatibility, bundled provider-helper protocol asset presence/hash, and Node runtime hash metadata rather than caller-submitted success fields.
- Updated the route/no-injected-callback behavior so compatible provider families can produce observed host-capability diagnostics without a test callback, while incompatible provider/platform pairs still fail closed as unavailable.
- Updated the service capability ledger with `agent_adapter_os_isolation_default_provider_host_capability_probe`, registered the focused suite in phase0 smoke and GA release criteria, and synchronized README, AGENTS, TODO, adapter contracts, GA release criteria, and threat model wording.
- Updated Task190 route-spoof assertions so caller success-shaped fields remain ignored while service-owned default probe facts can be observed.

Verification evidence:

- TDD RED was observed before implementation: after `corepack pnpm --filter @comath/comathd build` exited 0, focused Task193 exited 1 because the service capability ledger did not advertise `agent_adapter_os_isolation_default_provider_host_capability_probe`.
- After implementation, focused Task193 exited 0.
- Adjacent provider-helper and Pi regressions exited 0: Task176, Task177, Task178, Task179, Task181, Task182, Task184, Task185, Task186, Task187, Task188, Task189, Task190, Task191, and Task192.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task193 discovered by the default runner.
- Root gate exited 0: `corepack pnpm test`, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task193 changes the production route path from "no callback means not collected" to "service-owned default probe may collect host-capability diagnostics." It does not allow caller platform/tool/kernel/success metadata to self-attest capability, and the resulting manifests still keep `adapter_execution_isolation.os_enforced=false`, `proof_authority="none"`, `can_promote_claim=false`, and `can_certify_ga=false`. Readiness review still rejects host-capability manifests and accepts only canonical service-owned OS-isolation probe/evidence artifacts.

Residual risks: Goal 3 remains incomplete. Task193 does not ship production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute helpers under OS-enforced isolation, does not make default probe metadata readiness evidence, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 192 / Pi Provider Helper Host Capability Consumer

Scope: expose the Task190 provider host capability probe and Task191 provider-helper host-validation boundary through Pi release tools while keeping Pi a host-confirmed thin client with no direct trusted-state writes, readiness authority, OS-enforcement authority, proof authority, real-Pi evidence, broad provider support, or GA certification.

Work performed:

- Treated Task191's next step as authoritative and selected Pi exposure for provider-helper host capability/helper validation boundaries.
- Used two read-only explorer subagents for Pi consumer patterns and comathd Task190/191 route contracts while keeping this thread as the only writer.
- Added `goal3-task192-pi-provider-helper-host-capability-consumer.test.mjs`.
- Added Pi executable tools `comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe` and `comath.release.agentAdapterOsIsolationProviderHelperHostValidation`.
- Added `/cm:release agent-adapter-os-isolation-provider-host-capability-probe` and `/cm:release agent-adapter-os-isolation-provider-helper-host-validation`.
- Kept both tools mutating and host-confirmed, stripped model-supplied confirmation ids before service calls, and whitelisted caller environment forwarding to sanitized `platform` / `notes` diagnostics only.
- Registered the Task192 Pi suite in the extension package test chain, root smoke focused-suite list, GA release criteria, README, AGENTS, TODO, adapter contracts, and threat model.

Verification evidence:

- TDD RED was observed before implementation: focused Task192 exited 1 because `comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe` was not registered.
- After implementation, focused Task192 exited 0.
- Adjacent Pi consumer regressions exited 0: Task169 and Task173.
- Phase6 and Phase26 Pi extension regressions exited 0 when run from the extension package cwd.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/pi-extension typecheck` exited 0.
- `corepack pnpm --filter @comath/pi-extension test` exited 0 with Task192 discovered by the default Pi package runner.
- `corepack pnpm test` exited 0, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath ".comath"` returned `False`.

Boundary notes: Task192 does not make provider host capability or provider-helper host-validation payloads readiness-review evidence. The Pi layer forwards through `comathd`, requires host confirmation, sanitizes prompt/notification/direct-result surfaces, and strips success-shaped caller fields such as capability booleans, helper readiness, helper hashes, command/argv/env overrides, proof-authority fields, and GA-certification flags.

Residual risks: Goal 3 remains incomplete. Task192 does not ship production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute helpers under OS-enforced isolation, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 191 / Host Capability To Helper Validation Binding

Scope: bind provider-helper host validation to a matching service-owned provider host capability probe, while keeping both the host capability artifact and host-validation manifest non-authoritative and unable to satisfy adapter OS-isolation readiness, OS-enforcement evidence, proof authority, real-Pi evidence, broad provider support, or GA certification.

Work performed:

- Treated Task190's next step as authoritative and selected the host-capability-to-helper-validation binding blocker.
- Used read-only subagent review for service extension points and public wording while keeping this thread as the only writer.
- Added `goal3-task191-agent-adapter-os-isolation-provider-host-capability-helper-validation-binding.test.mjs`.
- Extended `validateAgentAdapterOsIsolationProviderHelperHost()` so it accepts `host_capability_probe_id`, reads the append-only Task190 probe artifact, requires observed service-owned capability status, and blocks before invoking the host validator when the probe is missing, unobserved, or mismatched.
- Added host capability binding metadata to host-validation manifests, helper-execution binding manifests, and audit events without granting readiness or proof authority.
- Updated Task176-179 and Task181-189 provider-helper fixtures so deeper helper execution, collection, self-test, runtime-attestation, bundled-helper, and check-debug gates now run only after a host capability prerequisite.
- Added `agent_adapter_os_isolation_provider_host_capability_helper_validation_binding`, registered Task191 in phase0 smoke and GA release criteria, and synchronized README, AGENTS, TODO, adapter contracts, GA release criteria, and threat model wording.

Verification evidence:

- TDD RED was observed before implementation: focused Task191 exited 1 because the service capability ledger did not advertise `agent_adapter_os_isolation_provider_host_capability_helper_validation_binding`.
- After implementation, focused Task191 exited 0.
- Adjacent provider-helper regressions exited 0 after fixture migration: Task176, Task177, Task178, Task179, Task181, Task182, Task184, Task185, Task186, Task187, Task188, Task189, and Task190.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task191 discovered by the default runner.
- Root gate exited 0: `corepack pnpm test`, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only before the tracker/review append.

Boundary notes: Task191 makes host capability a fail-closed prerequisite for provider-helper host validation. The binding must match project id, adapter id, backend, provider, service-observed platform, artifact path/hash, and non-authority flags. Missing, unobserved, or mismatched host capability probes now block before the host validator can run. This does not make host capability metadata readiness evidence, OS-enforcement evidence, proof authority, real-Pi evidence, broad provider support, or GA certification.

Residual risks: Goal 3 remains incomplete. Task191 does not ship production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute helpers under OS-enforced isolation, does not expose provider-helper routes through Pi tools, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 190 / Provider Host Capability Probe Contract

Scope: add a service-owned provider host capability probe contract for OS sandbox families, while keeping host capability metadata strictly diagnostic and unable to become adapter OS-isolation readiness evidence, OS-enforcement evidence, proof authority, real-Pi evidence, broad provider support, or GA certification.

Work performed:

- Treated Task189's next step as authoritative and selected the provider-helper host-probe residual blocker rather than durable transport or Lean replay breadth.
- Used read-only subagent review for service extension points and public docs/release-hardening wording while keeping this thread as the only writer.
- Added `goal3-task190-agent-adapter-os-isolation-provider-host-capability-probe-contract.test.mjs`.
- Added `probeAgentAdapterOsIsolationProviderHostCapability()` plus the `POST /agent/adapter/package/os-isolation-provider-host-capability-probe` service route.
- Added `agent_adapter_os_isolation_provider_host_capability_probe_contract` to the service capability ledger and registered the focused suite in phase0 smoke and GA release criteria.
- Added append-only provider host capability probe manifests under `.comath/release/agent-adapter-os-isolation/<id>/provider-host-capability-probe.json`, with audit event `agent_adapter.os_isolation_provider_host_capability_probed`.
- Updated README, AGENTS, TODO, adapter contracts, GA release criteria, and threat model so provider host capability facts remain pre-helper diagnostics only.

Verification evidence:

- TDD RED was observed before implementation: after `corepack pnpm --filter @comath/comathd build` exited 0, focused Task190 exited 1 because `../../dist/index.js` did not export `probeAgentAdapterOsIsolationProviderHostCapability`.
- After implementation, focused Task190 exited 0.
- Adjacent provider-helper regressions exited 0: Task175, Task176, Task177, Task178, Task179, Task181, Task182, Task184, Task185, Task186, Task187, Task188, and Task189.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` initially exceeded the 120 second command window; root-cause check showed it is the long default runner, and the same command exited 0 in a 300 second window with Task190 discovered by the default runner.
- `corepack pnpm test` exited 0, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- `Test-Path -LiteralPath ".comath"` returned `False` after test runs.

Boundary notes: Task190 records service-observed provider host capability facts, required tool metadata, kernel feature metadata, platform compatibility, and provider availability only when supplied by a service-owned callback. Caller-supplied platform, tool path, kernel facts, success booleans, proof authority, and GA claims remain ignored. The resulting manifest keeps `adapter_execution_isolation.current_boundary="process_boundary_only"`, `os_enforced=false`, `proof_authority="none"`, `can_promote_claim=false`, and `can_certify_ga=false`, and readiness review rejects the host capability manifest.

Residual risks: Goal 3 remains incomplete. Task190 does not ship production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, does not execute helpers under OS-enforced isolation, does not bind host capability probes into helper readiness, does not expose provider-helper routes through Pi tools, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete fully interactive real-Pi execution, and does not certify GA.

# Goal 3 Task 189 / Provider Helper Chain Check-Debug

Scope: revalidate the Task184-188 provider-helper and bundled-helper chain as a comprehensive check-debug loop, with special attention to wrapper manifests being mistaken for adapter OS-isolation readiness evidence, OS-enforcement evidence, proof authority, real-Pi evidence, broad provider support, or GA certification.

Work performed:

- Treated Task189 as the cadence-mandated check-debug loop after Task188 instead of opening a new goal file or expanding proof authority.
- Added `goal3-task189-agent-adapter-os-isolation-provider-helper-chain-check-debug.test.mjs`.
- Added `agent_adapter_os_isolation_provider_helper_chain_check_debug` to the service capability ledger and registered the focused suite in phase0 smoke and GA release criteria.
- Revalidated the bundled no-env-helper path through provider-runner, host validation, helper execution, public collection-route rejection, internal service-owned collection, direct readiness review, and route readiness review.
- Hardened successful provider-helper collection manifests so the wrapper top-level `adapter_execution_isolation` remains `process_boundary_only` / `os_enforced=false`; only the nested canonical probe/evidence artifact can carry OS-enforcement evidence.
- Updated adjacent provider-helper tests and public docs so configured helpers, self-tests, runtime attestations, bundled protocol execution, host-validation wrappers, helper-execution wrappers, public collection route outputs, and successful collection wrappers remain non-authoritative.

Verification evidence:

- Initial focused RED was observed: after `corepack pnpm --filter @comath/comathd build` exited 0, `node services/comathd/tests/unit/goal3-task189-agent-adapter-os-isolation-provider-helper-chain-check-debug.test.mjs` exited 1 because the capability ledger did not advertise `agent_adapter_os_isolation_provider_helper_chain_check_debug`.
- After the initial implementation, focused Task189 exited 0.
- Read-only code review then found that successful collection wrappers still exposed top-level `adapter_execution_isolation.os_enforced=true`. The strengthened Task189 test exited 1 with actual `current_boundary="os_enforced"` where `process_boundary_only` was expected. The implementation now leaves wrapper-level OS enforcement false and records OS-enforcement only on the nested canonical probe/evidence artifact.
- Adjacent focused regressions exited 0 after the wrapper-boundary repair: Task175, Task176, Task177, Task178, Task179, Task181, Task182, Task184, Task185, Task186, Task187, Task188, and focused Task189.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0, with Task189 discovered by the default runner.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath ".comath"` returned `False`.
- Static scans confirmed no provider-helper wrapper tests still expect collection-wrapper top-level `os_enforced=true`; remaining top-level true assertions are the canonical Task170/Task172 producer paths, while provider-helper suites now assert nested probe evidence instead.

Boundary notes: Task189 is a check-debug and boundary-tightening task. It does not ship production OCI/Nix/Firejail/Windows AppContainer/macOS sandbox helper binaries, prove OS enforcement from helper configuration or bundled protocol execution, expose provider-helper routes through Pi tools, make host-validation/helper-execution/collection wrappers readiness evidence, broaden Lean/mathlib replay, complete real-Pi execution, or certify GA.

Residual risks: Goal 3 remains incomplete. Remaining high-risk frontiers include production provider helper binaries/host probes for one OS sandbox family, durable long-lived operator transport, broader live Lean/mathlib replay, fully interactive real-Pi execution, and final GA audit closure.

# Goal 3 Task 188 / Bundled Provider Helper Protocol Asset

Scope: make the default provider-helper protocol chain executable without a host-configured helper by bundling a service-owned protocol asset, while preserving that bundled helper output is protocol binding only and cannot become OS-enforcement evidence, proof authority, readiness evidence by itself, broad provider support, real-Pi execution, or GA certification.

Work performed:

- Treated the existing uncommitted Task188 residue as the live frontier after Task187 instead of reopening old Goal 3 work.
- Added `goal3-task188-agent-adapter-os-isolation-bundled-helper-asset.test.mjs` covering the no-env-helper path through provider-runner preparation, provider-helper host validation, helper execution, public-route collection rejection, internal service-owned collection, and readiness review.
- Added `provider-helper-protocol.mjs`, copied it into `dist/agents/helpers/` during the comathd build, and wired default resolver/host-validation/helper-execution paths to use it through the current Node executable when no env helper is configured.
- Added `agent_adapter_os_isolation_bundled_provider_helper_asset` to the service capability ledger.
- Synchronized README, AGENTS, TODO, adapter contracts, GA release criteria, threat model, phase0 smoke, and tracker wording around the bundled protocol boundary.

Verification evidence:

- Task188 residue was present at continuation start: the new Task188 test existed untracked and `services/comathd/src/agents/agent-adapter-os-isolation.ts` was already dirty.
- Initial RED/build failure was observed: `corepack pnpm --filter @comath/comathd build` exited 1 because `runDefaultProviderHelperHostValidator()` passed the wrapper object to `providerHelperSelfTestStdoutAccepted()` and transcript hashing instead of the original validator input.
- After the minimal type fix, focused Task188 RED was observed: `node services/comathd/tests/unit/goal3-task188-agent-adapter-os-isolation-bundled-helper-asset.test.mjs` exited 1 because the capability ledger did not advertise `agent_adapter_os_isolation_bundled_provider_helper_asset`.
- After implementation, `corepack pnpm --filter @comath/comathd build` exited 0 and focused Task188 exited 0.
- Adjacent Task178 initially failed because its old route-caller assertion expected no-env host validation to remain blocked; Task188 intentionally allows only the bundled service-owned protocol asset to validate the host. The regression was updated to keep the caller hash/version/command rejected while asserting `adapter_execution_isolation.os_enforced=false` and `can_certify_ga=false`.
- Final Task188 gate matrix exited 0: focused Task188; adjacent Task175, Task176, Task177, Task178, Task179, Task181, Task182, Task184, Task185, Task186, and Task187 suites; `node scripts/phase0-smoke.mjs`; `corepack pnpm --filter @comath/comathd build`; `corepack pnpm --filter @comath/comathd typecheck`; and full `corepack pnpm --filter @comath/comathd test`.
- Runtime/static hygiene checks: `Test-Path -LiteralPath ".comath"` returned `False`; `git diff --check` exited 0 with Windows LF-to-CRLF warnings only; release-hardening scans found Task188 registered in smoke/release criteria/status/copy script and found only deliberate negative boundary wording for bundled helper proof-authority/GA/OS-evidence claims.

Boundary notes: Task188 does not ship real production helper binaries, does not prove Firejail/AppContainer/sandbox-exec/OCI/Nix OS enforcement, does not expose provider-helper routes through Pi tools, does not make bundled helper execution or collection wrapper metadata readiness evidence, does not broaden Lean/mathlib replay, does not complete real-Pi execution, and does not certify GA. The bundled protocol asset is useful executable protocol coverage; canonical OS-isolation readiness still requires service-owned probe/evidence artifacts and readiness review.

Residual risks: Goal 3 remains incomplete. Remaining high-risk frontiers include production provider helper binaries/host probes for one OS sandbox family, comprehensive revalidation loops, durable long-lived operator transport, broader live Lean/mathlib replay, and fully interactive real-Pi execution.

# Goal 3 Task 187 / Provider Helper Runtime Attestation Binding

Scope: harden the provider-helper execution-to-collection bridge so generic helper runtime success output cannot be upgraded into canonical OS-isolation evidence; the helper must emit a runtime attestation bound to the current project, helper execution, provider-runner, sandbox-launch, adapter, backend, provider, disabled network policy, and `proof_authority=none` before collection can invoke the canonical probe writer.

Work performed:

- Treated the existing uncommitted Task187 residue as the live frontier after Task186 instead of creating a new goal file or reopening older Goal 3 work.
- Added `goal3-task187-agent-adapter-os-isolation-helper-runtime-attestation.test.mjs` covering a generic runtime attestation that must block collection, then a fully bound runtime attestation that permits the internal provider-helper collection callback to write canonical probe/evidence artifacts.
- Added runtime-attestation parsing/binding metadata to provider-helper execution manifests and propagated bound status/hash into collection manifests and audit events.
- Hardened `collectAgentAdapterOsIsolationProviderHelperExecutionEvidence()` so helper executions without current runtime-attestation binding return `blocked_provider_helper_runtime_attestation_missing` and do not invoke the canonical probe writer.
- Updated adjacent configured-helper fixture scripts so existing helper execution/collection regressions satisfy the stronger runtime contract.
- Added the `agent_adapter_os_isolation_provider_helper_runtime_attestation_binding` capability and synchronized README, AGENTS, TODO, adapter contracts, GA release criteria, threat model, phase0 smoke, and tracker wording.

Verification evidence:

- Task187 code/test residue was present at continuation start: the new Task187 test existed untracked and related implementation/adjacent fixture changes were already in the dirty worktree. Fresh GREEN verification after `corepack pnpm --filter @comath/comathd build` exited 0: `node services/comathd/tests/unit/goal3-task187-agent-adapter-os-isolation-helper-runtime-attestation.test.mjs` exited 0.
- Documentation/smoke RED was observed after adding the smoke guard: `node scripts/phase0-smoke.mjs` exited 1 because GA release criteria did not list `goal3-task187-agent-adapter-os-isolation-helper-runtime-attestation.test.mjs`.
- After updating release criteria and public boundary docs, `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Adjacent focused regressions exited 0: Task177 provider-helper collection, Task179 host-validation-bound helper execution, Task182 configured helper execution collection, Task184 cross-provider configured helper assets, and Task185 provider helper self-test contract.
- Package/static gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, `corepack pnpm --filter @comath/comathd test`, `git diff --check` with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath '.comath'` returned `False`.

Boundary notes: Task187 does not ship real production helper binaries, does not prove Firejail/AppContainer/sandbox-exec/OCI/Nix OS enforcement, does not expose provider-helper routes through Pi tools, does not make helper execution manifests, runtime attestation, or collection wrapper manifests readiness evidence, does not broaden Lean/mathlib replay, does not complete real-Pi execution, and does not certify GA. Runtime attestation is a current-execution binding gate before collection only; the readiness gate still consumes only canonical service-owned probe/evidence artifacts, and all related artifacts keep `proof_authority="none"` and `can_certify_ga=false`.

Residual risks: Goal 3 remains incomplete. Remaining high-risk frontiers include real provider helper binaries/host probes for one provider family, comprehensive revalidation loops, durable long-lived operator transport, broader live Lean/mathlib replay, and fully interactive real-Pi execution.

# Goal 3 Task 186 / Provider Helper Self-Test Binding

Scope: harden the default configured provider-helper self-test contract so a generic reusable success response cannot unlock host validation; the helper must bind the current project, host-validation, provider-runner, and sandbox-launch identifiers while preserving that self-test, host validation, helper execution, and wrapper manifests are not OS-enforcement evidence, proof authority, readiness evidence, broad provider support, real-Pi execution, or GA certification.

Work performed:

- Treated Task185's next step and the existing uncommitted Task186 residue as the live frontier instead of creating a new goal file or reopening old Goal 3 tasks.
- Added `goal3-task186-agent-adapter-os-isolation-self-test-binding.test.mjs` covering a generic self-test helper that returns provider/backend/network/proof-authority but no current run binding, then a bound helper that returns project id, host-validation id, provider-runner id, and sandbox-launch id.
- Hardened `providerHelperSelfTestStdoutAccepted()` so the default host validator requires those current identifiers before helper host validation can pass.
- Updated adjacent configured-helper fixture scripts so Task181/182/184/185 helper self-test responses satisfy the stronger binding contract.
- Added the Task186 focused suite to phase0 smoke and GA release criteria so public release-hardening docs cannot lag the test matrix.

Verification evidence:

- TDD residue was present at handoff: the new Task186 test existed untracked and the implementation change was already in the dirty worktree. Fresh GREEN verification after `corepack pnpm --filter @comath/comathd build` exited 0: `node services/comathd/tests/unit/goal3-task186-agent-adapter-os-isolation-self-test-binding.test.mjs` exited 0.
- Adjacent focused regressions exited 0: Task181 configured provider-helper asset, Task182 configured helper execution collection, Task184 cross-provider configured helper assets, and Task185 provider helper self-test contract.
- Documentation/smoke RED was observed after the code test passed: `node scripts/phase0-smoke.mjs` exited 1 because GA release criteria did not list `goal3-task186-agent-adapter-os-isolation-self-test-binding.test.mjs`. After updating the release criteria, `node scripts/phase0-smoke.mjs` exited 0, `corepack pnpm --filter @comath/comathd typecheck` exited 0, `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, `Test-Path -LiteralPath '.comath'` returned `False`, and `corepack pnpm --filter @comath/comathd test` exited 0 with Task186 discovered by the default test runner.

Boundary notes: Task186 does not ship real production helper binaries, does not prove Firejail/AppContainer/sandbox-exec/OCI/Nix OS enforcement, does not make host validation or helper execution readiness evidence, does not expose provider-helper routes through Pi tools, does not broaden Lean/mathlib replay, does not complete real-Pi execution, and does not certify GA. It only prevents generic reusable self-test success output from being accepted as a current host-validation binding.

Residual risks: Goal 3 remains incomplete. Remaining high-risk frontiers include real provider helper binaries/host probes for one provider family, canonical collected OS-enforcement evidence, durable long-lived operator transport, broader live Lean/mathlib replay, and fully interactive real-Pi execution.

# Goal 3 Task 185 / Provider Helper Self-Test Contract

Scope: harden the default configured provider-helper host-validation path so an absolute helper executable and platform-compatible host are not enough: the helper must pass a fixed CoMath provider-helper self-test before host validation can unlock helper execution, while preserving that host validation, self-test status, helper execution, and wrapper manifests are not OS-enforcement evidence, proof authority, readiness evidence, broad provider support, real-Pi execution, or GA certification.

Work performed:

- Treated Task184's next step as authoritative and selected the concrete production-helper/host-probe residual blocker rather than durable transport or Lean replay breadth.
- Added `goal3-task185-agent-adapter-os-isolation-helper-self-test-contract.test.mjs` covering a configured helper executable that exists but fails the CoMath self-test, then a service-owned helper script that passes self-test, executes under fixed argv/env, feeds internal collection, and reaches readiness only through canonical collected evidence.
- Added `agent_adapter_os_isolation_provider_helper_self_test_contract` capability and `blocked_provider_helper_host_self_test_failed` status.
- Extended default env-configured helper host validation to run a bounded fixed-argv self-test with the same service-owned helper executable and optional args-prefix, using fixed `COMATH_*` env and `shell=false`.
- Persisted only self-test exit/status, stdout/stderr/transcript hashes, fixed-args hash, args-prefix hash/count, helper binary hash, and sanitized diagnostics; raw helper paths, prefix args, stdout/stderr text, host paths, and secrets remain out of public manifests.
- Kept injected/custom service-owned host validators compatible with existing Task178/179 semantics; the self-test contract applies to the default env-configured helper path.
- Updated config samples, config README, README, AGENTS, adapter contracts, GA release criteria, threat model, smoke invariants, and older configured-helper tests for the new contract.

Verification evidence:

- TDD RED was observed before implementation: after `corepack pnpm --filter @comath/comathd build` exited 0, `node services/comathd/tests/unit/goal3-task185-agent-adapter-os-isolation-helper-self-test-contract.test.mjs` exited 1 because the capability ledger did not advertise `agent_adapter_os_isolation_provider_helper_self_test_contract`.
- After implementation, focused Task185 exited 0.
- Adjacent focused regressions exited 0: Task178 provider-helper host validation, Task179 host-validation-bound helper execution, Task181 configured provider-helper asset, Task182 configured helper execution/collection, Task184 cross-provider helper assets, and `node scripts/phase0-smoke.mjs`.

Boundary notes: Task185 does not ship real production helper binaries, does not prove Firejail/AppContainer/sandbox-exec/OCI/Nix OS enforcement from helper configuration or self-test, does not expose provider-helper routes through Pi tools, does not make host validation or helper execution readiness evidence, does not broaden Lean/mathlib replay, does not complete real-Pi execution, and does not certify GA.

Residual risks: Goal 3 remains incomplete. The next frontier should continue toward the highest-risk remaining blocker, such as real provider helper binaries/host probes for one provider family, durable long-lived operator transport, broader live Lean/mathlib replay, fully interactive real-Pi execution, or a check-debug loop if tracker cadence calls for it.
# Goal 3 Task 184 / Cross-Provider Configured Helper Assets And Platform Contract

Scope: advance the Task183 residual production-helper frontier by expanding configured helper asset coverage beyond Windows-only wording and adding a default provider/helper host-platform contract that blocks platform-specific provider helpers on incompatible service-observed hosts.

Work performed:

- Treated Task183's next step as authoritative and selected the non-Windows provider helper host-validation gap rather than opening a new goal file.
- Used two read-only explorer subagents. One recommended cross-provider helper config/smoke/doc coverage; the other identified the behavior gap that the default host validator accepted any configured helper executable for any provider/platform combination.
- Added `goal3-task184-agent-adapter-os-isolation-cross-provider-helper-assets.test.mjs`.
- Added `agent_adapter_os_isolation_cross_provider_configured_helper_assets` and `agent_adapter_os_isolation_provider_helper_platform_contract` capabilities.
- Expanded `config/comath.sample.json`, `config/README.md`, and `scripts/phase0-smoke.mjs` so OCI, Nix, Firejail, Windows AppContainer, macOS `sandbox-exec`, and fallback helper/args-prefix env handles are all documented and smoke-guarded.
- Hardened the default provider-helper host validator with service-observed platform compatibility: Windows AppContainer requires `win32`, Firejail requires `linux`, macOS `sandbox-exec` requires `darwin`, Nix is limited to Linux/macOS, and OCI remains host-configured for Linux/macOS/Windows.
- Kept injected custom validators testable, while default host validation no longer treats caller-supplied `host_environment.platform` as an authorization source.
- Updated README, AGENTS, adapter contracts, GA release criteria, and threat model to state that configured helper assets and platform contracts are host configuration only and cannot satisfy readiness, proof authority, broad provider support, or GA.

Verification evidence:

- TDD RED was observed before implementation: after `corepack pnpm --filter @comath/comathd build` exited 0, `node services/comathd/tests/unit/goal3-task184-agent-adapter-os-isolation-cross-provider-helper-assets.test.mjs` exited 1 because the service capability ledger did not advertise `agent_adapter_os_isolation_cross_provider_configured_helper_assets`.
- Focused Task184 exited 0 after implementation, covering an incompatible provider path that fails with `blocked_provider_helper_host_platform_mismatch` before helper execution, and a compatible provider path that still performs host validation, helper execution, internal collection, and readiness review through canonical evidence only.
- Adjacent focused regressions exited 0: Task178 provider-helper host validation, Task179 host-validation-bound helper execution, Task181 configured provider-helper asset, Task182 configured helper execution/collection, and `node scripts/phase0-smoke.mjs`.
- Package gate exited 0: `corepack pnpm --filter @comath/comathd test`, with Task184 discovered by the default test runner.
- Root gate exited 0: `corepack pnpm test`, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.

Boundary notes: Task184 does not ship real production helper binaries, does not prove Firejail/AppContainer/sandbox-exec/OCI/Nix OS enforcement from helper configuration, does not expose provider-helper routes through Pi tools, does not make helper host validation or helper execution readiness evidence, does not broaden Lean/mathlib replay, does not complete real-Pi interaction, and does not certify GA. Only canonical service-owned probe/evidence artifacts and readiness reviews remain eligible for release gates, still with `proof_authority="none"` and `can_certify_ga=false`.

Residual risks: Goal 3 remains incomplete. Remaining high-risk frontiers include concrete production helper implementations, durable long-lived operator transport, broader live Lean/mathlib replay, fully interactive real-Pi execution, and continued comprehensive check-debug loops as the tracker cadence requires.

# Goal 3 Task 183 / Comprehensive Configured Helper Chain Check-Debug

Scope: run the comprehensive check-debug loop over Task181-182 configured helper asset/execution semantics, Task175-179 provider-runner/helper/host-validation/collection boundaries, Task167 readiness review, public wording, Pi/route payload boundaries, config sample semantics, and runtime cleanliness before selecting the next production-helper, durable-transport, Lean replay, or real-Pi frontier.

Work performed:

- Treated Task182's next step as authoritative and scoped Task183 as a check-debug loop, not a GA-completion claim.
- Used two read-only explorer subagents: one reviewed service source/tests and one reviewed README/AGENTS/TODO/REVIEW/config/release docs.
- Confirmed no live code path was found where helper paths, helper args, helper exit status, route payloads, caller metadata, wrapper manifests, or host-validation alone can satisfy OS-isolation readiness, certify GA, promote proof, or replace service-owned canonical collection evidence.
- Added public wording/config smoke regressions to `scripts/phase0-smoke.mjs` for stale Task20 GA wording, Pi consumer output-as-readiness wording, undocumented fallback helper env vars, and missing release-hardening focused suites.
- Repaired README, AGENTS, adapter contracts, GA release criteria, and config README so only canonical service-owned probe/evidence artifacts and readiness reviews can feed release gates; Pi-facing output can only initiate, route, display, or guide service-owned flows.
- Documented `COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER` and `COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON` as generic host-only fallback handles with provider-specific precedence and hash/count-only persistence.
- Added Task167/168/170/171/172/173/175/176/177/178/179/181/182 and Phase43/44 to the GA release-hardening focused suite list.

Verification evidence:

- TDD RED was observed before the documentation repair: `node scripts/phase0-smoke.mjs` exited 1 with failures for stale `final Task 20 audit` wording, missing release-hardening focused suites, Pi consumer output/readiness wording, and missing fallback helper env documentation.
- After repair, `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Focused service tests exited 0 before the doc repair: Task167 readiness, Task175 provider-runner, Task176 provider-helper execution, Task177 provider-helper collection, Task178 provider-helper host validation, Task179 host-validation-bound helper execution, Task181 configured helper asset, Task182 configured helper execution/collection, Phase43 adapter package, and Phase44 Codex external invocation.
- Package gates exited 0 after the smoke repair: `corepack pnpm --filter @comath/comathd test` and `corepack pnpm --filter @comath/pi-extension test`.
- Root verification exited 0 after tracker/doc updates: `corepack pnpm test`, including phase0 smoke, workspace package tests, Phase45 install-session e2e, Goal 3 Task125 public UX authority e2e, and Phase17 integrity evaluation.
- Static scans confirmed no direct Pi provider-helper route exposure under `extensions/comath-pi`, no tracked runtime `.comath`, no untracked files before tracker updates, and no earlier unfinished or pending-commit Goal 3 tracker item.

Boundary notes: Task183 repairs audit/readiness wording and smoke coverage only. It does not implement a production AppContainer runner, does not prove OS enforcement from helper execution, does not expose provider-helper routes through Pi, does not produce broad provider support, does not broaden Lean/mathlib replay, does not complete real-Pi interaction, and does not certify GA.

Residual risks: Goal 3 remains incomplete. The next frontier should continue toward the highest-risk remaining blocker, such as concrete production helper implementation/host validation for another OS sandbox family, durable long-lived operator transport, broader live Lean/mathlib replay, fully interactive real-Pi execution, or another comprehensive loop if the tracker cadence calls for it.

# Goal 3 Task 182 / Configured Helper Execution And Collection Chain

Scope: extend the Task181 configured Windows AppContainer helper asset into the default host-validated helper execution path by allowing a service-owned fixed helper args-prefix asset, while preserving the boundary that helper execution, helper exit status, public route payloads, and collection wrapper manifests are not readiness evidence, proof authority, real-Pi execution, broad provider support, or GA certification.

Work performed:

- Treated Task181's next step as authoritative and selected the actual configured helper execution/collection residual blocker.
- Added a Task182 regression covering default route-based provider-runner, host-validation, helper execution, public collection spoof blocking, internal service-owned collection, readiness review, audit events, host-path scrubbing, and malformed helper args-prefix failure.
- Added provider-specific `*_HELPER_ARGS_JSON` support with fallback `COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON`.
- Fed parsed service-owned helper args into the default helper config resolver only when the JSON value is a bounded string array.
- Persisted only `helper_args_prefix_sha256` and `helper_args_prefix_count`; raw helper paths, prefix args, stdout/stderr text, and secrets remain out of public manifests and audit payloads.
- Added the `agent_adapter_os_isolation_configured_provider_helper_execution_asset` capability and synchronized config/docs/tracker wording.

Verification evidence:

- TDD RED was observed before implementation: after `corepack pnpm --filter @comath/comathd build` exited 0, `node services/comathd/tests/unit/goal3-task182-agent-adapter-os-isolation-configured-helper-execution-collection.test.mjs` failed because the default route attempted `node --provider ...` directly and returned `blocked_provider_helper_execution_failed` instead of `provider_helper_execution_attempted`.
- GREEN focused Task182 exited 0, including the malformed `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON` fail-closed case.
- Adjacent focused regressions exited 0: Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Task170 configured-host collection, Task171 sandbox launch, Task172 sandbox execution, Task175 provider-runner contract, Task176 provider-helper execution, Task177 provider-helper collection, Task178 provider-helper host validation, Task179 host-validation-bound helper execution, Task181 configured helper asset, Phase43 adapter package, and Phase44 Codex external invocation.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task182 discovered by the default comathd runner.

Boundary notes: Task182 does not implement a full AppContainer runner, does not prove the configured helper actually enforced AppContainer isolation, does not expose provider-helper routes through Pi tools, and does not make helper execution manifests or public collection route payloads readiness evidence. Only an internal service-owned collection probe can write canonical probe/evidence artifacts for Task167 readiness review, and even those artifacts remain release-readiness evidence with `proof_authority="none"` and `can_certify_ga=false`.

# Goal 3 Task 181 / Configured Windows AppContainer Provider Helper Asset

Scope: add the next smallest production-helper implementation slice after Task180 by letting a host-configured, service-owned Windows AppContainer helper executable flow through the default provider-runner and helper-host validation path, without turning helper configuration, helper host validation, or route payloads into OS-enforcement evidence, readiness evidence, proof authority, real-Pi execution, broad provider support, or GA certification.

Work performed:

- Treated Task180's next step as authoritative and selected the production-helper residual blocker rather than durable transport, Lean replay breadth, or real-Pi UX.
- Added a Task181 regression covering the default route/resolver path with `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER`.
- Hardened the default provider-runner resolver so an absolute service-owned helper executable can prepare a hash-bound provider-runner contract after a ready sandbox-launch preflight.
- Kept caller command, argv, env, hash, helper-ready booleans, and success-shaped route payloads untrusted.
- Preserved the Task178 default host validator and Task179 execution binding semantics: the configured helper asset can be host-validated and later executed only through service-owned hash-bound manifests.
- Updated config samples and release-hardening docs to describe the environment variable as host configuration, not evidence.

Verification evidence:

- TDD RED was observed before implementation: after `corepack pnpm --filter @comath/comathd build` exited 0, `node services/comathd/tests/unit/goal3-task181-agent-adapter-os-isolation-configured-provider-helper-asset.test.mjs` failed because the capability ledger did not advertise `agent_adapter_os_isolation_configured_provider_helper_asset`.
- GREEN focused test exited 0: Task181 configured provider-helper asset.
- Adjacent focused regressions exited 0: Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Task170 configured-host collection, Task171 sandbox launch, Task172 sandbox execution, Task175 provider-runner contract, Task176 provider-helper execution, Task177 provider-helper collection, Task178 provider-helper host validation, Task179 host-validation-bound helper execution, Phase43 adapter package, and Phase44 Codex external invocation.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task181 discovered by the default comathd runner.
- Post-doc checks exited 0: `node scripts/phase0-smoke.mjs`, config sample JSON parsing, and `git diff --check` with only Windows LF-to-CRLF working-copy warnings. `Test-Path -LiteralPath .comath` returned `False`; the only untracked file before staging was the new Task181 test.

Boundary notes: Task181 does not implement a full AppContainer runner, does not execute the adapter under AppContainer, does not collect canonical OS-enforcement evidence, does not expose helper/provider routes through Pi tools, and does not broaden provider support beyond the configured Windows AppContainer helper asset path. Provider-runner and host-validation manifests remain `proof_authority="none"`, `can_promote_claim=false`, and `can_certify_ga=false`; readiness still requires canonical service-owned collected probe/evidence artifacts.

# Goal 3 Task 180 / Comprehensive Provider Helper Chain Check-Debug

Scope: run the every-third-task comprehensive check-debug loop over the Task175-179 adapter OS-isolation provider-runner/helper/host-validation/collection chain, including readiness gate semantics, service routes, Pi/public payload boundaries, public wording, and runtime cleanliness.

Work performed:

- Re-read the Goal 3 required context set, including the v2 no-reinvent audit, v2 open formal workbench design, and v2 agent prompt protocol.
- Treated Task179's next step as authoritative and did not open a new feature frontier before the check-debug loop.
- Used three read-only explorer subagents to review service source/tests, route/Pi payload boundaries, public wording/default test discovery, and runtime cleanliness.
- Audited `services/comathd/src/agents/agent-adapter-os-isolation.ts`, `services/comathd/src/api/server.ts`, `extensions/comath-pi/src/index.ts`, Task167/168/170/171/172/175/176/177/178/179 tests, Phase43/Phase44 tests, README/TODO/AGENTS, adapter contracts, GA release criteria, and threat model.
- Found no concrete high-risk product-code defect requiring repair in this loop.
- Recorded the remaining future-risk boundary: if provider-runner/helper/host-validation/helper-execution/helper-collection service routes later become Pi tools, they must be mutating, host-confirmed, public-result-sanitized, and unable to accept caller success-shaped evidence.

Verification evidence:

- Fresh build exited 0: `corepack pnpm --filter @comath/comathd build`.
- Fresh package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`; the full comathd test matrix completed in about 123 seconds after the shorter 124-second tool budget timed out.
- Focused Task175, Task176, Task177, Task178, Task179 tests exited 0.
- Adjacent service regressions exited 0: Task167 readiness, Task168 probe, Task170 configured-host collection, Task171 sandbox launch, Task172 sandbox execution, Phase43 adapter package, and Phase44 Codex external invocation.
- Pi/package checks exited 0: `corepack pnpm --filter @comath/pi-extension build`, `corepack pnpm --filter @comath/pi-extension typecheck`, `corepack pnpm --filter @comath/pi-extension test`, Task169 Pi adapter OS-isolation probe consumer, and Task173 Pi sandbox-execution consumer.
- Static scans confirmed provider-runner/helper routes are public-sanitized, helper execution gates config resolution/spawn behind a matching service-owned host-validation artifact, helper collection requires service-owned collection callbacks plus exit/stdout/stderr/transcript hash matches, readiness review accepts only canonical collected probe/evidence artifacts, and current Pi exposes only the already host-confirmed probe/sandbox-execution consumer routes.
- Runtime cleanliness checks during the read-only audit reported clean `main`, `git diff --check` with no output, `node scripts/phase0-smoke.mjs` with 33 required entries and 33 invariants, and `Test-Path -LiteralPath .comath` as `False`. Post-edit checks also kept `phase0-smoke` and `.comath` clean; `git diff --check` exited 0 with only Windows LF-to-CRLF working-copy warnings.

Boundary notes: Task180 is a check-debug task, not a new authority expansion. Provider-runner manifests, host-validation manifests, host-validation-bound helper executions, provider-helper collection wrappers, route payloads, helper exit status, and Pi consumer output remain non-authoritative release-readiness/operator material with `proof_authority="none"` and `can_certify_ga=false`. Only canonical service-owned OS-isolation probe/evidence artifacts can feed the readiness review, and even those do not become mathematical proof authority.

Residual risks: Goal 3 remains incomplete. Task180 does not implement production helper binaries for OCI/Nix/Firejail/Windows AppContainer/macOS hosts, does not provide broad cross-platform OS-enforced adapter execution, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete nontrivial theorem synthesis, does not provide fully interactive end-to-end real-Pi execution, and does not certify GA.

# Goal 3 Task 179 / Agent Adapter OS-Isolation Provider Helper Execution Host-Validation Binding

Scope: harden Task176 provider-helper execution so a helper process cannot be configured or spawned unless the request binds to a prior append-only Task178 host-validation manifest that was service-owned, validated, and exactly bound to the same runner/launch/provider artifact chain.

Work performed:

- Re-read the Goal 3 required context set and treated Task178's next step as authoritative.
- Used one read-only explorer subagent to check the Task179 frontier and OS-isolation residual blocker.
- Added `goal3-task179-agent-adapter-os-isolation-provider-helper-execution-host-validation-binding.test.mjs`.
- Added `host_validation_id` to provider-helper execution inputs and persisted helper execution manifests.
- Added service-owned host-validation artifact reading and binding checks before the helper config resolver or helper process can run.
- Added fail-closed execution statuses for missing host-validation artifacts, unvalidated host-validation artifacts, and host-validation binding mismatches.
- Hardened helper collection so only host-validation-bound successful helper executions are collectable into canonical Task170 probe/evidence artifacts.
- Updated Task176 and Task177 regressions so their positive helper execution fixtures first create validated Task178 host-validation manifests.
- Updated README, TODO, AGENTS, adapter contracts, GA release criteria, threat model, and Goal 3 tracker wording to keep host-bound helper execution non-authoritative.

Verification evidence:

- TDD RED: after adding Task179 test and before implementation, `node services/comathd/tests/unit/goal3-task179-agent-adapter-os-isolation-provider-helper-execution-host-validation-binding.test.mjs` failed because old helper execution still returned `provider_helper_execution_attempted` without a `host_validation_id`.
- GREEN focused tests exited 0: Task179 host-validation-bound helper execution, Task176 provider-helper execution, Task177 provider-helper collection, and Task178 provider-helper host validation.
- GREEN adjacent focused regressions exited 0: Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Task170 configured-host collection, Task172 sandbox execution probe, Task175 provider-runner contract, Phase43 agent adapter package, and Phase44 Codex external invocation.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task179 discovered by the default comathd runner.
- Post-code `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants; `git diff --check` exited 0 with Windows LF-to-CRLF warnings only; `Test-Path -LiteralPath .comath` returned `False`; `git ls-files -o --exclude-standard` showed only the new Task179 test before tracker update.

Boundary notes: Task179 prevents caller/route payloads or helper config resolvers from making provider-helper execution proceed without a matching service-owned host-validation artifact. Host-bound helper execution is still not collected OS-enforcement evidence, not readiness evidence, not mathematical proof authority, not GA certification, and not a production cross-platform sandbox runner.

Residual risks: Goal 3 remains incomplete. Task179 still does not implement production helper binaries for every OCI/Nix/Firejail/Windows AppContainer/macOS host, does not guarantee kernel/firewall isolation on this workstation, does not provide broad cross-platform OS-enforced adapter execution, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete nontrivial theorem synthesis, does not provide fully interactive end-to-end real-Pi execution, and does not certify GA.

# Goal 3 Task 178 / Agent Adapter OS-Isolation Provider Helper Host Validation

Scope: add a service-owned provider-helper host-validation manifest after Task175 provider-runner contracts, without allowing route payloads, helper-host-ready booleans, caller-supplied hashes, or supported-platform claims to become readiness evidence, OS-enforcement evidence, proof authority, or GA certification.

Work performed:

- Re-read the Goal 3 required context set and treated Task177's next step as authoritative.
- Used one read-only explorer subagent to check the Task178 frontier and OS-isolation residual blocker.
- Added `goal3-task178-agent-adapter-os-isolation-provider-helper-host-validation.test.mjs`.
- Added `validateAgentAdapterOsIsolationProviderHelperHost()` and `POST /agent/adapter/package/os-isolation-provider-helper-host-validation`.
- Added `agent_adapter_os_isolation_provider_helper_host_validation` to the service capability ledger.
- Provider-helper host-validation manifests write `.comath/release/agent-adapter-os-isolation/<host_validation_id>/provider-helper-host-validation.json`, require a ready Task175 provider-runner manifest and Task171 sandbox-launch artifact binding, and record service-owned helper binary hash, runner binary hash, supported platforms, fixed argv template hash, environment-policy hash, diagnostics, and non-authority metadata.
- The route/default path cannot receive a validator and therefore records blocker evidence even when caller payloads submit success-shaped host-ready booleans, binary hashes, version strings, command overrides, argv, or env.
- Only a service-owned `provider_helper_host_validator` callback can mark the helper host validated. Binary hash mismatches and platform mismatches fail closed, and validated host manifests still remain rejected by the readiness gate.
- Updated README, TODO, AGENTS, adapter contracts, GA release criteria, threat model, and Goal 3 tracker wording to keep provider-helper host validation non-authoritative.

Verification evidence:

- TDD RED: after adding Task178 test and before implementation, `corepack pnpm --filter @comath/comathd build` exited 0, then `node services/comathd/tests/unit/goal3-task178-agent-adapter-os-isolation-provider-helper-host-validation.test.mjs` failed because `../../dist/index.js` did not export `validateAgentAdapterOsIsolationProviderHelperHost`.
- GREEN focused test exited 0: Task178 provider-helper host validation.
- GREEN adjacent focused regressions exited 0: Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Task170 configured-host collection, Task172 sandbox execution probe, Task175 provider-runner contract, Task176 provider-helper execution, Task177 provider-helper collection, Phase43 adapter package, and Phase44 Codex external invocation. An initial mistyped Phase44 filename produced `MODULE_NOT_FOUND`; rerunning the actual `phase44-codex-cli-external-invocation.test.mjs` exited 0.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task178 discovered by the default runner.
- Post-code `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants; `git diff --check` exited 0 with Windows LF-to-CRLF warnings only; `Test-Path -LiteralPath .comath` returned `False`; `git ls-files -o --exclude-standard` showed only the new Task178 test before commit.

Boundary notes: Task178 validates service-owned provider-helper host configuration and hash/platform binding before helper execution can be reasoned about, but it does not execute the adapter, does not collect canonical OS-enforcement evidence, does not satisfy Task167 readiness by itself, does not promote mathematical claims, does not certify GA, and does not provide durable long-lived operator transport.

Residual risks: Goal 3 remains incomplete. Task178 still does not implement production helper binaries for every OCI/Nix/Firejail/Windows AppContainer/macOS host, does not bind Task176 helper execution to a prior host-validation artifact, does not guarantee kernel/firewall isolation on this workstation, does not provide broad cross-platform OS-enforced adapter execution, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete nontrivial theorem synthesis, does not provide fully interactive end-to-end real-Pi execution, and does not certify GA.

# Goal 3 Task 177 / Agent Adapter OS-Isolation Provider Helper Collection

Scope: add a service-owned provider-helper collection bridge after Task176 helper execution attempts, without allowing helper exit status, route payloads, wrapper manifests, or caller-supplied hashes to become readiness evidence unless canonical Task170 probe/evidence artifacts are written by an internal service-owned collector.

Work performed:

- Re-read the Goal 3 required context set and treated Task176's next step as authoritative.
- Used one read-only explorer subagent to check the Task177 boundary and implementation risks.
- Added `goal3-task177-agent-adapter-os-isolation-provider-helper-collection.test.mjs`.
- Added `collectAgentAdapterOsIsolationProviderHelperExecutionEvidence()` and `POST /agent/adapter/package/os-isolation-provider-helper-collection`.
- Added `agent_adapter_os_isolation_provider_helper_collection` to the service capability ledger.
- Provider-helper collection manifests write `.comath/release/agent-adapter-os-isolation/<collection_id>/provider-helper-collection.json`, bind the Task176 helper execution artifact, Task175 provider-runner artifact, Task171 sandbox-launch artifact, project/adapter/backend/provider ids, and helper exit/stdout/stderr/transcript hashes.
- The route/default path cannot receive a collector and therefore records blocker evidence even when caller payloads submit success-shaped OS-enforcement booleans and hashes.
- Only an internal `service_owned_provider_helper_collection_probe` callback can feed canonical Task170 probe/evidence writing, and its exit/stdout/stderr/transcript hashes must exactly match the helper execution manifest.
- Updated README, TODO, AGENTS, adapter contracts, GA release criteria, threat model, and Goal 3 tracker wording to keep provider-helper collection bridge manifests non-authoritative wrappers around canonical evidence.

Verification evidence:

- TDD RED: after adding Task177 test and before implementation, `node services/comathd/tests/unit/goal3-task177-agent-adapter-os-isolation-provider-helper-collection.test.mjs` failed because `../../dist/index.js` did not export `collectAgentAdapterOsIsolationProviderHelperExecutionEvidence`.
- GREEN focused test exited 0: Task177 provider helper collection.
- GREEN adjacent focused regressions exited 0: Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Task170 configured-host collection, Task172 sandbox execution probe bridge, Task175 provider-runner contract, Task176 provider-helper execution, Phase43 adapter package, and Phase44 external invocation.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task177 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task177 lets a service-owned helper collection callback create canonical OS-isolation probe/evidence only after a successful helper execution and exact hash binding. The provider-helper collection wrapper manifest is still rejected by the readiness gate, route payloads cannot self-certify collection, and `can_certify_ga=false` remains on all Task177 outputs.

Residual risks: Goal 3 remains incomplete. Task177 still does not guarantee kernel/firewall isolation on this workstation, does not implement production helper binaries for every OCI/Nix/Firejail/Windows AppContainer/macOS host, does not provide broad cross-platform OS-enforced adapter execution, does not provide durable long-lived operator transport, does not broaden Lean/mathlib replay, does not complete nontrivial theorem synthesis, does not provide fully interactive end-to-end real-Pi execution, and does not certify GA.

# Goal 3 Task 176 / Agent Adapter OS-Isolation Provider Helper Execution

Scope: add a service-owned provider-helper execution attempt layer after Task175 provider-runner contracts, without treating helper exit status or stdout/stderr hashes as collected OS-enforcement evidence, readiness evidence, mathematical proof authority, or GA certification.

Work performed:

- Re-read the Goal 3 required context set and treated Task175's next step as authoritative.
- Added `goal3-task176-agent-adapter-os-isolation-provider-helper-execution.test.mjs`.
- Added `runAgentAdapterOsIsolationProviderHelperExecution()` and `POST /agent/adapter/package/os-isolation-provider-helper-execution`.
- Added `agent_adapter_os_isolation_provider_helper_execution` to the service capability ledger.
- Provider-helper execution manifests write `.comath/release/agent-adapter-os-isolation/<helper_execution_id>/provider-helper-execution.json`, require a ready Task175 provider-runner manifest, require matching project/adapter/backend/provider/launch/runner binding, require a service-owned helper configuration, and verify the helper executable hash against the ready runner manifest.
- The helper is launched through `spawnSync()` with `shell=false`, fixed argv, a non-inherited fixed `COMATH_*` environment, bounded timeout, and hash-only stdout/stderr/transcript recording.
- Default route/service behavior records `blocked_provider_helper_not_configured` when no service-owned helper executable is configured.
- Caller command, argv, env, helper exit code, stdout/stderr hashes, and success-shaped metadata are ignored for readiness, sanitized from public output, and cannot configure or satisfy provider-helper execution.
- Updated README, TODO, AGENTS, adapter contracts, GA release criteria, threat model, and Goal 3 tracker wording to keep provider-helper execution attempts non-authoritative.

Verification evidence:

- TDD RED: after adding Task176 test and before implementation, `node services/comathd/tests/unit/goal3-task176-agent-adapter-os-isolation-provider-helper-execution.test.mjs` failed because `../../dist/index.js` did not export `runAgentAdapterOsIsolationProviderHelperExecution`.
- GREEN focused test exited 0: Task176 provider helper execution.
- GREEN adjacent focused regressions exited 0: Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Task170 configured-host collection, Task171 sandbox launch preflight, Task172 sandbox execution probe bridge, Task175 provider-runner contract, Phase43 adapter package, and Phase44 external invocation.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task176 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task176 executes a configured service-owned provider helper process and records its exit/hash envelope. It still does not collect canonical OS-enforcement evidence, does not satisfy adapter OS-isolation readiness by itself, does not guarantee kernel/firewall isolation on this workstation, does not promote mathematical claims, does not certify GA, and does not provide durable long-lived operator transport.

Residual risks: Goal 3 remains incomplete. Canonical OS-enforcement collection after provider-helper execution, broad cross-platform OS-enforced adapter execution, durable long-lived operator transport, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 175 / Agent Adapter OS-Isolation Provider Runner Contract

Scope: add a service-owned provider-runner contract/unavailable-blocker layer between Task171 sandbox-launch preflight and Task172 sandbox execution probe, without claiming executed OS isolation or allowing caller-supplied runner metadata to become evidence.

Work performed:

- Re-read the Goal 3 required context set and treated Task174's next step as authoritative.
- Used one read-only explorer subagent for Task175 scoping; it recommended a provider-runner contract plus fail-closed Windows AppContainer unavailable path rather than an overclaiming sandbox success surface.
- Added `goal3-task175-agent-adapter-os-isolation-provider-runner.test.mjs`.
- Added `prepareAgentAdapterOsIsolationProviderRunner()` and `POST /agent/adapter/package/os-isolation-provider-runner`.
- Added `agent_adapter_os_isolation_provider_runner_contract` to the service capability ledger.
- Provider-runner manifests write `.comath/release/agent-adapter-os-isolation/<runner_id>/provider-runner.json`, bind the ready Task171 launch artifact, adapter id, backend, provider, launcher hash, fixed provider argv template, and service-owned environment policy.
- Default route/service behavior records `blocked_provider_runner_unavailable` when no service-owned provider helper is configured.
- Caller command, argv, env, runner hashes, and success-shaped metadata are ignored for readiness, sanitized from public output, and cannot resolve a provider runner.
- Updated README, TODO, AGENTS, adapter contracts, GA release criteria, threat model, and Goal 3 tracker wording to keep provider-runner contracts non-authoritative.

Verification evidence:

- TDD RED: after adding Task175 test and before implementation, `node services/comathd/tests/unit/goal3-task175-agent-adapter-os-isolation-provider-runner.test.mjs` failed because `../../dist/index.js` did not export `prepareAgentAdapterOsIsolationProviderRunner`.
- GREEN focused test exited 0: Task175 provider runner contract.
- GREEN adjacent focused regressions exited 0: Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Task170 configured-host collection, Task171 sandbox launch preflight, Task172 sandbox execution probe bridge, Phase43 adapter package, and Phase44 external invocation.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task175 discovered by the default runner. The first comathd test command hit a 120s tool timeout; rerunning with a 300s timeout exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task175 prepares a provider runner contract and unavailable blocker. It still does not execute adapters through OCI/Nix/Firejail/Windows AppContainer/macOS helpers, does not collect OS-enforcement evidence, does not satisfy readiness by itself, does not promote mathematical claims, does not certify GA, and does not provide durable long-lived operator transport.

Residual risks: Goal 3 remains incomplete. Actual provider helper execution, broad cross-platform OS-enforced adapter execution, durable long-lived operator transport, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 174 / Comprehensive Check-Debug Loop After OS-Isolation Sandbox/Pi Boundary

Scope: perform the every-third-task comprehensive check-debug loop over Tasks171-173, focusing on adapter OS-isolation sandbox-launch preflight, sandbox execution probe bridge, Pi release consumer wiring, readiness-gate evidence boundaries, public wording, Pi thin-client constraints, and runtime cleanliness.

Work performed:

- Re-read the full Goal 3 required context set and confirmed `main` was clean before opening Task174.
- Treated the tracker rule "Every third task is a large comprehensive check-debug loop" as authoritative, so Task174 stayed an audit/verification slice rather than a production provider sandbox-runner implementation.
- Used two read-only explorer subagents for Task174 scoping and trust-boundary review; both reported no target-scope defects, and the main session independently verified the same surfaces.
- Audited Task171 preflight, Task172 execution probe, Task173 Pi consumer, Task167 readiness review, Task170 collector evidence path, README/TODO/AGENTS/docs wording, Pi runtime registration, and Pi write/import boundaries.
- No product-code repair was required.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- Focused service regressions exited 0: Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Task170 adapter OS-isolation host collection, Task171 adapter OS-isolation sandbox launch, and Task172 adapter OS-isolation sandbox execution.
- Focused Pi regressions exited 0: Task169 Pi adapter OS-isolation probe consumer, Task173 Pi adapter OS-isolation sandbox execution consumer, and Task165 Pi guided real-Pi execution consumer.
- Pi package-cwd guards exited 0: `node tests/phase6-extension.test.mjs` and `node tests/phase26-pi-runtime-registration.test.mjs` from `extensions/comath-pi`.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck`, `corepack pnpm --filter @comath/pi-extension typecheck`, `corepack pnpm --filter @comath/comathd test`, and `corepack pnpm --filter @comath/pi-extension test`.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Static scans found no Pi source use of `writeFile`, `appendFile`, `mkdir`, `rmSync`, or `.comath` runtime-write patterns. The only Pi source hits for `services/comathd/src` were subagent write-scope template strings, not imports.

Boundary notes:

- Task171 still records only service-owned provider preflight and cannot satisfy OS-isolation readiness by itself.
- Task172 still rejects route/Pi/caller-supplied execution booleans, stdout/stderr hashes, and success-shaped metadata as collected OS-enforcement evidence. Only an internal service-owned execution probe callback can feed canonical Task170 collector evidence.
- Task173 remains host-confirmed Pi consumer wiring through `comathd`; it strips `confirmation_id`, sanitizes proof/GA/OS-enforcement/transport overclaims, and does not write trusted runtime state directly.
- Readiness and release docs still state these surfaces are non-authoritative release evidence or operator UX, not proof authority, GA certification, durable long-lived transport, or a production cross-platform OS sandbox runner.

Residual risks: Goal 3 remains incomplete. Production provider-specific sandbox runners beyond injected probe collection, broad cross-platform OS-enforced adapter execution, durable long-lived operator transport, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 173 / Pi Agent Adapter OS-Isolation Sandbox Execution Probe Consumer

Scope: expose the Task172 service-owned sandbox execution probe route through Pi release tooling and `/cm:release agent-adapter-os-isolation-sandbox-execution`, while preserving host confirmation, Pi thin-client boundaries, public sanitizer behavior, and non-authority semantics.

Work performed:

- Re-read the Goal 3 required context set and treated Task172's next step as authoritative.
- Added `goal3-task173-pi-agent-adapter-os-isolation-sandbox-execution-consumer.test.mjs`.
- Added `comath.release.agentAdapterOsIsolationSandboxExecutionProbe` to Pi tool descriptors, runtime executable tool registration, runtime-registration metadata, and `/cm:release agent-adapter-os-isolation-sandbox-execution` command dispatch.
- The Pi consumer strips `confirmation_id`, forwards only through `comathd` route `/agent/adapter/package/os-isolation-sandbox-execution`, sanitizes actor/execution-environment/result text for host paths, secrets, proof-success vocabulary, OS-enforcement overclaims, and long-lived transport overclaims, and keeps `.comath/` writes service-owned.
- Wired Task173 into the default `@comath/pi-extension` test chain and updated Phase6/Phase26 registration guards.

Verification evidence:

- TDD RED: after adding Task173 test and before implementation, `corepack pnpm --filter @comath/pi-extension build; node extensions/comath-pi/tests/goal3-task173-pi-agent-adapter-os-isolation-sandbox-execution-consumer.test.mjs` failed because `comath.release.agentAdapterOsIsolationSandboxExecutionProbe` was not registered.
- GREEN focused test exited 0: Task173 Pi adapter OS-isolation sandbox execution consumer.
- GREEN adjacent focused regressions exited 0: Task169 Pi adapter OS-isolation probe consumer, Task165 Pi guided real-Pi execution consumer, Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Task171 adapter OS-isolation sandbox launch, and Task172 adapter OS-isolation sandbox execution.
- Phase6 and Phase26 Pi runtime-registration guards exited 0 after rerunning them from `extensions/comath-pi`; the first direct commands used package-cwd tests with duplicated repo-relative paths and failed with `MODULE_NOT_FOUND`, then the corrected package-cwd commands passed.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension build`, `corepack pnpm --filter @comath/pi-extension typecheck`, and `corepack pnpm --filter @comath/pi-extension test`, with Task173 discovered by the default Pi extension runner.

Boundary notes: Task173 is Pi-facing consumer wiring for the service-owned Task172 sandbox execution probe bridge. It does not run adapters inside OCI/Nix/Firejail/AppContainer/macOS sandbox, does not collect OS-enforcement evidence from Pi payloads, does not promote mathematical claims, does not certify GA, and does not provide durable long-lived operator transport.

Residual risks: Goal 3 remains incomplete. Production provider-specific sandbox runner implementation beyond injected probe collection, broad cross-platform OS-enforced adapter execution, durable long-lived operator transport, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 172 / Agent Adapter OS-Isolation Sandbox Execution Probe Bridge

Scope: add a service-owned bridge from a ready Task171 sandbox-launch preflight to canonical Task170 OS-isolation probe/evidence collection, while preserving the boundary that route/Pi/caller metadata cannot self-certify executed OS isolation, mathematical proof authority, or GA readiness.

Work performed:

- Re-read the Goal 3 required context set and treated Task171's next step as authoritative.
- Continued the existing uncommitted Task172 worktree state instead of overwriting it.
- Added `goal3-task172-agent-adapter-os-isolation-sandbox-execution.test.mjs`.
- Added `runAgentAdapterOsIsolationSandboxExecutionProbe()` and `POST /agent/adapter/package/os-isolation-sandbox-execution`.
- Added `agent_adapter_os_isolation_sandbox_execution_probe` to the service capability ledger.
- The execution manifest writes `.comath/release/agent-adapter-os-isolation/<execution_id>/sandbox-execution.json`, binds project id, adapter id, backend, provider, execution id, and launch id, records the bound sandbox-launch artifact hash, links the canonical Task170 probe/evidence artifact when collected, and remains `proof_authority: none` with `can_promote_claim=false` and `can_certify_ga=false`.
- Updated README, TODO, AGENTS, adapter contracts, GA release criteria, threat model, and Goal 3 tracker wording to distinguish this probe bridge from a production provider-specific sandbox runner.

Boundary hardening:

- Caller-supplied `execution_environment` booleans, process exit code, stdout/stderr/transcript hashes, route payloads, and success-shaped metadata cannot produce collected OS-enforcement evidence.
- The sandbox execution bridge requires an existing ready service-owned sandbox-launch preflight whose project, adapter, backend, provider, and launch id exactly match the execution request.
- A route caller without the internal `execution_probe` callback receives blocker evidence even when a ready preflight exists.
- Only an internal callback with `probe_source: service_owned_sandbox_execution_probe` can feed the existing Task170 collector path, which then writes canonical evidence consumed by the Task167 readiness gate.
- Execution manifests are append-only by `execution_id`, scrub host paths/secrets in service results and persisted artifacts, and audit `agent_adapter.os_isolation_sandbox_execution_probed` with non-authority semantics.

Verification evidence:

- The original RED for the existing uncommitted Task172 test/code was not available in this continuation.
- Fresh initial verification before documentation closeout: `corepack pnpm --filter @comath/comathd build` exited 0; `node services/comathd/tests/unit/goal3-task172-agent-adapter-os-isolation-sandbox-execution.test.mjs` exited 0.
- GREEN focused regressions exited 0: Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Task170 adapter OS-isolation host collection, Task171 adapter OS-isolation sandbox launch, Task172 adapter OS-isolation sandbox execution, Phase43 agent adapter package, and Phase44 Codex external invocation.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task172 discovered by the default comathd runner.
- Root/smoke gates exited 0: `node scripts/phase0-smoke.mjs` with 33 required entries and 33 invariants, `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test`, including Pi package tests, Phase45 install-session e2e, Task125 Pi research-loop public UX authority, and Phase17 integrity evaluation.
- Post-code checks exited 0 or clean: `git diff --check` exited 0 with Windows LF-to-CRLF warnings only; `Test-Path -LiteralPath .comath` returned `False`; `git ls-files -o --exclude-standard` showed only the new Task172 test before commit.

Boundary notes: Task172 bridges ready preflight manifests to service-owned sandbox execution probe evidence. It does not implement a production provider-specific runner for OCI/Nix/Firejail/Windows AppContainer/macOS sandbox-exec, does not guarantee kernel/firewall isolation on this workstation, does not promote mathematical claims, does not certify GA, and does not provide durable long-lived operator transport.

Residual risks: Goal 3 remains incomplete. Production provider-specific sandbox runner implementation beyond injected probe collection, Pi-facing sandbox execution consumer wiring, broad cross-platform OS-enforced adapter execution, durable long-lived operator transport, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 171 / Agent Adapter OS-Isolation Sandbox Launch Preflight

Scope: add a service-owned provider-specific sandbox-launch preflight manifest for adapter OS-isolation work, while preserving the Task167-170 boundary that preflight is not collected execution evidence, not readiness-review evidence, not proof authority, and not GA certification.

Work performed:

- Re-read the Goal 3 required context set and treated Task170's next step as authoritative.
- Added `goal3-task171-agent-adapter-os-isolation-sandbox-launch.test.mjs`.
- Added `prepareAgentAdapterOsIsolationSandboxLaunch()` and `POST /agent/adapter/package/os-isolation-sandbox-launch`.
- Added `agent_adapter_os_isolation_sandbox_launch_preflight` to the service capability ledger.
- The preflight manifest writes `.comath/release/agent-adapter-os-isolation/<launch_id>/sandbox-launch.json`, binds adapter id/backend/provider, records a provider command contract with `shell=false`, `network_policy=disabled`, `command_override_allowed=false`, and `caller_supplied_success_allowed=false`, and remains `proof_authority: none` with `can_promote_claim=false` and `can_certify_ga=false`.
- Updated README, TODO, adapter contracts, GA release criteria, and threat model to document that sandbox-launch preflight is distinct from collected OS-enforced adapter execution evidence.

Boundary hardening:

- Caller-supplied `launcher_environment` metadata, launcher hashes, command overrides, Pi/request payloads, and success-shaped fields cannot make a route result ready or satisfy the Task167 readiness review.
- A ready preflight can be produced only through an internal service-owned `launcher_probe` callback. Even then it only marks readiness for a future service-owned OS-sandbox execution probe; `adapter_execution_isolation.os_enforced` remains false until collected execution evidence is produced through the Task170 collector path and accepted by the readiness gate.
- Preflight manifests are append-only by `launch_id`, scrub host paths/secrets, and audit `agent_adapter.os_isolation_sandbox_launch_preflighted` with non-authority semantics.

Verification evidence:

- TDD RED: after adding Task171 test and before implementation, `node services/comathd/tests/unit/goal3-task171-agent-adapter-os-isolation-sandbox-launch.test.mjs` failed because `../../dist/index.js` did not provide `prepareAgentAdapterOsIsolationSandboxLaunch`.
- GREEN focused test exited 0: Task171 adapter OS-isolation sandbox launch.
- GREEN adjacent focused regressions exited 0: Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Task170 adapter OS-isolation host collection, Phase43 agent adapter package, and Phase44 Codex external invocation. An initial Phase44 command used the old wrong filename and failed with `MODULE_NOT_FOUND`; the correct `phase44-codex-cli-external-invocation.test.mjs` then exited 0.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task171 discovered by the default comathd runner.

Boundary notes: Task171 adds a service-owned preflight contract for provider-specific sandbox launch preparation. It does not run adapters inside OCI/Nix/Firejail/AppContainer/macOS sandbox, does not guarantee kernel/firewall isolation on this workstation, does not promote mathematical claims, does not certify GA, and does not provide durable long-lived operator transport.

Residual risks: Goal 3 remains incomplete. Actual service-owned sandbox execution runners, broad cross-platform OS-enforced adapter execution, durable long-lived operator transport, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 170 / Agent Adapter OS-Isolation Host Collection Contract

Scope: extend the Task168 adapter OS-isolation probe producer so configured-host OS-enforcement collection can be recorded through a service-owned collector contract, while preserving the Task167 readiness boundary that caller-supplied request metadata, Pi payloads, operator attestations, and package metadata cannot self-certify OS isolation.

Work performed:

- Re-read the Goal 3 tracker/context, v2 no-reinvent and open formal workbench docs, agent prompt protocol, AGENTS, README, TODO, REVIEW, runbook, module boundaries, and current repo state before selecting Task170.
- Added `goal3-task170-agent-adapter-os-isolation-host-collection.test.mjs`.
- Extended `probeAgentAdapterOsIsolation()` with an optional service-owned `collector` callback, `os_isolation_probe_collected` evidence shape, and readiness-time binding to the canonical collected probe manifest.
- Added `agent_adapter_os_isolation_host_probe_collection` to the service capability ledger.
- Preserved fail-closed default route/Pi semantics: ordinary `/agent/adapter/package/os-isolation-probe` requests cannot submit successful OS-enforcement evidence through request fields.
- Updated README, TODO, adapter contracts, and GA release criteria to document the collector boundary and keep proof/GA authority false.

Boundary hardening:

- Initial GREEN would have allowed request-supplied `execution_collected` metadata to be rewritten as service-owned evidence. Self-review identified this as a trust-boundary bug because it could satisfy the Task167 readiness gate without a real service-owned collector. The implementation was revised so only the internal collector callback can produce collected OS-enforcement evidence; route callers still get blocker evidence unless a future service host runner invokes the collector path. A second hardening pass made the readiness gate require binding to the canonical collected probe manifest and evidence hash, so hand-written JSON that merely claims `service_owned_probe` cannot pass.

Verification evidence:

- TDD RED: after adding Task170 test and before implementation, `node services/comathd/tests/unit/goal3-task170-agent-adapter-os-isolation-host-collection.test.mjs` failed because `agent_adapter_os_isolation_host_probe_collection` was not advertised.
- GREEN focused test exited 0: Task170 agent adapter OS-isolation host collection.
- GREEN adjacent focused regressions exited 0: Task167 adapter OS-isolation readiness, Task168 adapter OS-isolation probe, Phase43 agent adapter package, and Phase44 Codex external invocation.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task170 discovered by the default comathd runner.
- Smoke/diff/runtime-state checks exited 0: `node scripts/phase0-smoke.mjs`, `git diff --check` with LF/CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task170 records configured-host collection evidence only through a service-owned collector contract. It does not add a production cross-platform sandbox launcher, does not guarantee kernel/firewall isolation on this workstation, does not promote mathematical claims, does not certify GA, and does not provide durable long-lived operator transport.

Residual risks: Goal 3 remains incomplete. Production host-specific sandbox launchers, broad cross-platform OS-enforced adapter execution, durable long-lived operator transport, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 169 / Pi Agent Adapter OS-Isolation Probe Consumer

Scope: expose the Task168 service-owned adapter OS-isolation probe route through Pi release tooling and `/cm:release agent-adapter-os-isolation-probe`, while preserving host confirmation, Pi thin-client boundaries, public sanitizer behavior, and non-authority semantics.

Work performed:

- Re-read the Goal 3 tracker/context and treated Task168's next step as authoritative.
- Added `goal3-task169-pi-agent-adapter-os-isolation-probe-consumer.test.mjs`.
- Added `comath.release.agentAdapterOsIsolationProbe` to Pi tool descriptors, runtime executable tool registration, runtime-registration metadata, and `/cm:release agent-adapter-os-isolation-probe` command dispatch.
- The Pi consumer strips `confirmation_id`, forwards only through `comathd` route `/agent/adapter/package/os-isolation-probe`, sanitizes actor/probe-environment/result text for host paths, secrets, proof-success vocabulary, and long-lived transport overclaims, and keeps `.comath/` writes service-owned.
- Wired Task169 into the default `@comath/pi-extension` test chain and updated Phase6/Phase26 registration guards.

Verification evidence:

- TDD RED: after adding Task169 test and before implementation, `node extensions/comath-pi/tests/goal3-task169-pi-agent-adapter-os-isolation-probe-consumer.test.mjs` failed because `comath.release.agentAdapterOsIsolationProbe` was not registered.
- GREEN focused test exited 0: Task169 Pi adapter OS-isolation probe consumer.
- GREEN adjacent focused tests exited 0: Task165 Pi guided real-Pi execution consumer and Task168 service adapter OS-isolation probe.
- GREEN package-cwd guards exited 0: Phase6 extension and Phase26 Pi runtime registration. Initial direct repo-root runs of those package-cwd tests failed because they read `process.cwd()/package.json`; rerunning from `extensions/comath-pi` produced the valid result.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension build`, `corepack pnpm --filter @comath/pi-extension typecheck`, and `corepack pnpm --filter @comath/pi-extension test`, with Task169 discovered by the default Pi extension runner.

Boundary notes: Task169 is Pi-facing consumer wiring for the service-owned Task168 probe artifact producer. It does not execute adapters inside OCI/Nix/Firejail/AppContainer/macOS sandbox, enforce kernel/firewall network denial, promote mathematical claims, certify GA, or provide durable long-lived operator transport.

Residual risks: Goal 3 remains incomplete. Actual OS-enforced adapter execution/probe collection on a configured host, durable long-lived operator transport, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 168 / Agent Adapter OS-Isolation Probe Artifact Producer

Scope: add a service-owned, append-only adapter OS-isolation probe artifact producer that can supply Task167 readiness-review evidence while staying honest that this slice does not execute adapters inside an OS-enforced sandbox.

Work performed:

- Re-read the Goal 3 tracker/context and treated Task167's next step as authoritative.
- Added `goal3-task168-agent-adapter-os-isolation-probe.test.mjs`.
- Added `probeAgentAdapterOsIsolation()` and `POST /agent/adapter/package/os-isolation-probe`.
- Added the `agent_adapter_os_isolation_service_probe` status capability.
- The probe writes `.comath/release/agent-adapter-os-isolation/<probe_id>/probe.json` and `evidence.json`, marks the evidence as `service_owned_probe`, binds adapter id/backend/probe id, scrubs host-path and secret-like text, records audit evidence, and remains non-authoritative.
- The probe deliberately emits blocker evidence for unsupported, unavailable, non-OS-enforced, or uncollected sandbox providers instead of claiming runtime sandbox enforcement from request metadata.

Verification evidence:

- TDD RED: after adding Task168 test and before implementation, `node services/comathd/tests/unit/goal3-task168-agent-adapter-os-isolation-probe.test.mjs` failed because `../../dist/index.js` did not export `probeAgentAdapterOsIsolation`.
- GREEN focused test exited 0: Task168 agent adapter OS-isolation probe.
- GREEN adjacent focused tests exited 0: Task167 adapter OS-isolation readiness, Phase43 agent adapter package, Phase44 Codex external invocation, Phase51 Codex API backend, Phase52 Codex API retry telemetry, and Phase53 installed Codex CLI validation. A first adjacent Phase44 command used the wrong filename and failed with `MODULE_NOT_FOUND`; the correct Phase44 test was then run and exited 0.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task168 discovered by the default comathd runner.

Boundary notes: Task168 records service-owned OS-isolation blocker/probe artifacts. It does not run adapters inside OCI/Nix/Firejail/AppContainer/macOS sandbox, does not enforce kernel/firewall network denial, does not promote mathematical claims, and does not certify GA.

Residual risks: Goal 3 remains incomplete. Actual OS-enforced adapter execution/probe collection, durable long-lived operator transport, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 167 / Agent Adapter OS-Isolation Readiness Gate

Scope: add a service-owned release-readiness review gate for agent adapter OS-enforced isolation evidence, while keeping adapter package execution honest about its current `process_boundary_only` launcher boundary and preserving `proof_authority=none`.

Work performed:

- Re-read the Goal 3 tracker/context and treated Task166's next step as authoritative.
- Continued the existing uncommitted Task167 worktree state rather than overwriting it.
- Added `goal3-task167-agent-adapter-os-isolation-readiness.test.mjs` and `agent-adapter-os-isolation.ts`.
- Added adapter package `os_isolation` metadata to `codex-cli`, launch environment metadata (`COMATH_AGENT_ADAPTER_OS_ISOLATION_*`), launch audit metadata, service capability exposure, and `POST /agent/adapter/package/os-isolation-review`.
- The review gate requires project-local JSON evidence and checks OS-enforced provider class, process/filesystem/network/no-new-privileges/escape-prevention booleans, adapter/backend binding, service-owned probe source, host-path/secret cleanliness, and non-authority semantics.
- Review hardening made readiness review manifests append-only by `review_id`, rejects cross-adapter/backend/operator-attested evidence, and scrubs audit actor text for host paths and secret-like material.

Verification evidence:

- The existing uncommitted Task167 service test was verified after handoff; the original RED for that pre-existing work was not available in this continuation.
- Review-regression RED: after adding append-only coverage, the focused Task167 test failed because duplicate `review_id` calls did not throw.
- GREEN focused test exited 0: Task167 agent adapter OS-isolation readiness.
- GREEN adjacent focused tests exited 0: Phase43 agent adapter package, Phase44 Codex external invocation, Phase51 Codex API backend, Phase52 Codex API retry telemetry, Phase53 installed Codex CLI validation, Task162 operator transport lease, Task164 guided real-Pi execution, and Task166 guided real-Pi host-chain binding.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`, with Task167 discovered by the default comathd runner.
- Root gates exited 0: `node scripts/phase0-smoke.mjs`, `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test`, including Pi package tests, Phase45 install-session e2e, Task125 Pi public UX authority, and Phase17 integrity evaluation.
- Post-code checks exited 0: `git diff --check` with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`; `git ls-files -o --exclude-standard` showed only the two new Task167 source/test files before commit.

Boundary notes: Task167 is a readiness/evidence gate. It does not execute adapters inside OCI/Nix/Firejail/AppContainer/macOS sandbox, enforce kernel/firewall network denial, promote mathematical claims, or certify GA.

Residual risks: Goal 3 remains incomplete. Actual OS-enforced adapter execution/probe collection, durable long-lived operator transport, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 166 / Guided Real-Pi Host Chain Binding

Scope: harden the Task164-165 guided real-Pi execution chain so a promoted lifecycle evidence record cannot mix a Task152 real-Pi runtime snapshot from one Pi host with Task157/159/162 operator-session, recovery, and lease artifacts from another host, and cannot accept an explicit Pi host label that contradicts the bound artifact chain.

Work performed:

- Re-read the Goal 3 tracker/context and treated Task165's next step as authoritative.
- Audited Task152 real-Pi runtime snapshots, Task157 operator-session manifests, Task159 recovery checkpoints, Task162 bounded transport leases, Task164 guided execution service chaining, and Task165 Pi consumer sanitizer/host-confirmation wiring.
- Added `goal3-task166-guided-real-pi-host-chain-binding.test.mjs`.
- RED showed `recordPiCodexLifecycleGuidedRealPiExecution()` accepted a host-01 runtime snapshot together with a host-02 operator-session chain.
- Review-regression RED showed aligned runtime/session artifacts could still be recorded with a contradictory explicit `pi_host_label`.
- Hardened the guided-execution runtime snapshot reader to require `pi_host_label`, then required runtime snapshot, operator-session manifest, and optional explicit guided-execution host label to bind the same host before writing a guided execution artifact.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task166-guided-real-pi-host-chain-binding.test.mjs` failed because the runtime/session host mismatch did not throw.
- Review-regression RED: after temporarily removing the explicit-input host-label branch, the same focused test failed because input host-label spoofing did not throw.
- GREEN focused test exited 0: Task166 guided real-Pi host chain binding.
- GREEN adjacent tests exited 0: Task164 guided real-Pi execution, Task162 operator transport lease, Task157 operator-session persistence, and Task152 real-Pi install/runtime-registration probe.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task166 discovered by the default comathd runner.
- Smoke/diff/runtime-state checks exited 0: `node scripts/phase0-smoke.mjs`, `git diff --check` with LF/CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task166 is a service-side artifact-chain hardening for guided real-Pi execution records. It does not add durable long-lived WebSocket/SSE/terminal transport, execute an uncontrolled external real Pi host in tests, add OS-level adapter isolation, promote claims, or certify GA.

Residual risks: Goal 3 remains incomplete. Durable long-lived operator transport, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 165 / Pi Guided Real-Pi Execution Consumer

Scope: expose the Task164 service-owned guided real-Pi execution evidence route through Pi tooling and `/cm:release lifecycle-guided-real-pi-execution`, while preserving host confirmation, no direct Pi `.comath/` writes, public sanitizer boundaries, non-authority semantics, and no durable long-lived transport or GA-certification claims.

Work performed:

- Re-read the Goal 3 tracker/context and treated Task164's next step as authoritative.
- Audited the Task163 Pi consumer pattern, Task164 service route `POST /release/pi-codex-lifecycle/guided-real-pi-execution`, runtime-registration metadata, public sanitizer behavior, and lifecycle/operator residual blockers.
- Added `goal3-task165-pi-guided-real-pi-execution-consumer.test.mjs`.
- RED showed `comath.release.piCodexLifecycleGuidedRealPiExecution` was not registered.
- Added the mutating `comath.release.piCodexLifecycleGuidedRealPiExecution` tool, host-confirmed runtime execution, route dispatch to the Task164 service endpoint, `/cm:release lifecycle-guided-real-pi-execution`, runtime-registration subcommand metadata, Phase6/Phase26 exposure guards, and default Pi package test wiring.
- The Pi consumer strips `confirmation_id`, keeps `.comath/` writes owned by `comathd`, forwards guided-execution evidence-chain fields only through the service route, and sanitizes host-path, secret, proof-success, and long-lived transport overclaim text before request, confirmation prompt, and notification exposure.
- Code-review hardening added a public-result boolean overclaim regression: even if a service response echoes `can_promote_claim=true`, `can_certify_ga=true`, or long-lived/durable transport booleans, Pi public results must surface those fields as `false`.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task165-pi-guided-real-pi-execution-consumer.test.mjs` failed because `comath.release.piCodexLifecycleGuidedRealPiExecution` was not registered.
- Review-regression RED: after adding boolean overclaim assertions, the same focused test failed because `can_promote_claim=true` was still surfaced in the direct public result.
- GREEN focused test exited 0: Task165 Pi guided real-Pi execution consumer.
- GREEN adjacent tests exited 0: Task163 Pi operator transport lease consumer, Task164 service guided real-Pi execution, Phase6 extension, and Phase26 Pi runtime registration.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension typecheck` and `corepack pnpm --filter @comath/pi-extension test`, with Task165 discovered by the default Pi extension runner.

Boundary notes: Task165 is Pi-facing consumer wiring for a service-owned guided execution evidence artifact. It does not provide durable long-lived WebSocket/SSE/terminal transport, execute an uncontrolled external real Pi host in tests, add OS-level adapter isolation, promote claims, or certify GA.

Residual risks: Goal 3 remains incomplete. Durable long-lived operator transport, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, fully interactive end-to-end real-Pi execution, and final GA audit remain open.

# Goal 3 Task 164 / Pi-Codex Guided Real-Pi Execution Evidence

Scope: add a service-owned guided real-Pi execution evidence chain that binds Task152 real-Pi runtime artifacts, Task157 operator-session manifests, Task159 operator transport recovery checkpoints, and Task162 bounded operator transport leases without claiming proof authority, GA certification, durable long-lived transport, or Pi direct `.comath/` writes.

Work performed:

- Re-read the Goal 3 tracker/context and treated Task163's next step as authoritative.
- Audited Task152 real-Pi install/runtime-registration probe artifacts, Task157 service-owned operator-session persistence, Task159 transport recovery checkpointing, Task162 bounded transport leases, Task163 Pi lease consumer wording, and current lifecycle/operator residual blockers.
- Added `goal3-task164-pi-guided-real-pi-execution.test.mjs`.
- RED showed `recordPiCodexLifecycleGuidedRealPiExecution` was not exported.
- Added `recordPiCodexLifecycleGuidedRealPiExecution`, `POST /release/pi-codex-lifecycle/guided-real-pi-execution`, and the `pi_codex_lifecycle_guided_real_pi_execution` capability.
- The guided execution recorder verifies the Task152 runtime snapshot is real-Pi, runtime-registered, host-confirmed, non-authoritative, and bound to the requested project/probe; verifies Task157/159/162 artifact chain hashes and non-authority boundaries; writes an append-only guided execution artifact; and sanitizes host paths, secrets, proof-success vocabulary, and long-lived/durable transport overclaims from result, artifact, route response, and audit payloads.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task164-pi-guided-real-pi-execution.test.mjs` failed because `../../dist/index.js` did not provide `recordPiCodexLifecycleGuidedRealPiExecution`.
- GREEN focused test exited 0: Task164 Pi guided real-Pi execution.
- GREEN adjacent tests exited 0: Task152 real-Pi install/runtime-registration probe, Task157 operator-session persistence, Task159 operator transport recovery, and Task162 operator transport lease.
- `corepack pnpm --filter @comath/comathd typecheck` exited 0.
- Package gate exited 0: `corepack pnpm --filter @comath/comathd test`, with Task164 discovered by the default comathd runner.
- Root gates exited 0: `node scripts/phase0-smoke.mjs`, `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test`, including comathd, Pi package, Phase45 e2e, Task125 Pi research-loop public UX authority, and Phase17 integrity evaluation.

Boundary notes: Task164 records a service-owned guided real-Pi execution evidence chain. It does not add a Pi-facing consumer for the new route, provide durable long-lived WebSocket/SSE/terminal transport, execute an uncontrolled external real Pi host in tests, add OS-level adapter isolation, promote claims, or certify GA.

Residual risks: Goal 3 remains incomplete. Pi-facing guided execution consumer wiring, durable long-lived operator transport, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 163 / Pi Operator Transport Lease Consumer

Scope: expose the Task162 service-owned bounded operator transport lease route through Pi tooling and `/cm:release lifecycle-operator-transport-lease`, while preserving host confirmation, no direct Pi `.comath/` writes, public sanitizer boundaries, non-authority semantics, and bounded lease wording.

Work performed:

- Re-read the Goal 3 tracker/context and treated Task162's next step as authoritative.
- Audited the Task158/160 Pi consumer patterns, Task162 service route `POST /release/pi-codex-lifecycle/operator-transport-lease`, runtime-registration metadata, public sanitizer behavior, and lifecycle/operator residual blockers.
- Added `goal3-task163-pi-operator-transport-lease-consumer.test.mjs`.
- RED showed `comath.release.piCodexLifecycleOperatorTransportLease` was not registered.
- Added the mutating `comath.release.piCodexLifecycleOperatorTransportLease` tool, host-confirmed runtime execution, route dispatch to the Task162 service endpoint, `/cm:release lifecycle-operator-transport-lease`, runtime-registration subcommand metadata, Phase6/Phase26 exposure guards, and default Pi package test wiring.
- The Pi consumer strips `confirmation_id`, keeps `.comath/` writes owned by `comathd`, forwards bounded lease fields only through the service route, and sanitizes host-path, secret, proof-success, and long-lived transport overclaim text before request, confirmation prompt, and notification exposure.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task163-pi-operator-transport-lease-consumer.test.mjs` failed because `comath.release.piCodexLifecycleOperatorTransportLease` was not registered.
- GREEN focused test exited 0: Task163 Pi operator transport lease consumer.
- GREEN adjacent tests exited 0: Task158 Pi operator-session persistence consumer, Task160 Pi operator transport recovery consumer, Task162 service operator transport lease, Phase6 extension, and Phase26 Pi runtime registration.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension typecheck` and `corepack pnpm --filter @comath/pi-extension test`, with Task163 discovered by the default Pi extension runner.
- Root gates exited 0: `node scripts/phase0-smoke.mjs`, `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test`, including comathd, Pi package, Phase45 e2e, Task125 Pi research-loop public UX authority, and Phase17 integrity evaluation.
- Post-code `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task163 is Pi-facing consumer wiring for a bounded service-owned lease artifact. It does not provide durable long-lived WebSocket/SSE/terminal transport, end-to-end guided real-Pi execution, OS-level adapter isolation, proof authority, claim promotion, or GA certification.

Residual risks: Goal 3 remains incomplete. Durable long-lived operator transport, end-to-end guided real-Pi execution, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 162 / Pi-Codex Operator Transport Lease

Scope: add a service-owned bounded Pi/Codex lifecycle operator transport lease after Task159 recovery checkpointing and Task160 Pi recovery consumer wiring, without claiming durable long-lived WebSocket/SSE/terminal transport, Pi direct `.comath/` writes, proof authority, or GA certification.

Work performed:

- Re-read the Goal 3 tracker/context and treated Task161's next step as authoritative.
- Continued the existing uncommitted Task162 worktree state rather than overwriting it.
- Added `goal3-task162-pi-codex-operator-transport-lease.test.mjs`.
- Added `openPiCodexLifecycleOperatorTransportLease`, `POST /release/pi-codex-lifecycle/operator-transport-lease`, and the `pi_codex_lifecycle_operator_transport_lease` capability.
- The lease opener requires an existing Task157 operator-session manifest and Task159 operator-transport recovery checkpoint, verifies project/session/path/hash binding, rejects poisoned recovery checkpoints, writes a service-owned `.comath/release/pi-codex-lifecycle/<lease_id>/operator-transport-lease.json`, records audit evidence, and preserves original session/recovery artifacts.
- Review hardening added an append-only lease-id guard so duplicate lease ids fail closed with `PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_ALREADY_EXISTS` instead of overwriting the existing service artifact.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- The existing uncommitted Task162 service test was verified after handoff; the original RED for that pre-existing work was not available in this continuation.
- Review-regression RED was observed in this continuation: after adding the duplicate lease-id assertion, `node services/comathd/tests/unit/goal3-task162-pi-codex-operator-transport-lease.test.mjs` failed because duplicate leases did not throw and could overwrite the existing artifact.
- GREEN focused test exited 0: Task162 Pi/Codex operator transport lease.
- GREEN adjacent tests exited 0: Task157 operator-session persistence, Task159 operator transport recovery, and Task146 lifecycle readiness.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task162 discovered by the default comathd runner.
- Post-code `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants; `git diff --check` exited 0 with Windows LF-to-CRLF warnings only; `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task162 is a bounded service-owned lease artifact for operator transport continuity after a recovery checkpoint. It sets `live_transport_open=true` only for the bounded lease window and keeps `bounded_live_transport_lease_provided=true`, `durable_transport_provided=false`, `indefinite_stream_open=false`, `long_lived_websocket_provided=false`, `long_lived_sse_provided=false`, `proof_authority=none`, and `can_certify_ga=false`. It does not provide indefinite WebSocket/SSE/terminal sessions, Pi consumer wiring for the new lease route, end-to-end guided real-Pi execution, OS-level adapter isolation, proof authority, claim promotion, or GA certification.

Residual risks: Goal 3 remains incomplete. Pi-facing lease consumer wiring, real durable long-lived operator transport, end-to-end guided real-Pi execution, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 159 / Pi-Codex Operator Transport Recovery

Scope: add service-owned Pi/Codex lifecycle operator transport recovery checkpointing after Task158 operator-session persistence, without claiming live long-lived WebSocket/SSE/terminal transport, Pi direct `.comath/` writes, proof authority, or GA certification.

Work performed:

- Re-read the Goal 3 tracker/context and treated Task158's next step as authoritative.
- Continued the existing uncommitted Task159 worktree state rather than overwriting it.
- Added `goal3-task159-pi-codex-operator-transport-recovery.test.mjs`.
- Added `recoverPiCodexLifecycleOperatorTransport`, `POST /release/pi-codex-lifecycle/operator-transport-recovery`, and the `pi_codex_lifecycle_operator_transport_recovery` capability.
- The recovery checkpoint requires an existing Task157 operator-session manifest, verifies session/project/path binding, rejects poisoned non-authority boundary fields, writes a service-owned `.comath/release/pi-codex-lifecycle/<recovery_id>/operator-transport-recovery.json`, records audit evidence, and preserves the original operator-session completed steps and route.
- Review hardening added complete non-authority fields to audit payloads and scrubbed transport overclaim text from public recovery fields and audit actor text.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task159-pi-codex-operator-transport-recovery.test.mjs` failed because recovery audit payloads did not carry all non-authority transport boundary fields.
- Review-regression RED: the focused Task159 test failed after adding `long-lived SSE` to the actor, proving actor/audit text still needed transport-overclaim scrubbing.
- GREEN focused test exited 0: Task159 Pi/Codex operator transport recovery.
- GREEN adjacent tests exited 0: Task146 lifecycle readiness, Task148 lifecycle evidence intake, Task149 durable service lifecycle probe, Task150 Codex API account/network probe, Task157 service operator-session persistence, and Task158 Pi operator-session persistence consumer.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task159 discovered by the default comathd runner.
- Post-code gates exited 0: `node scripts/phase0-smoke.mjs` with 33 required entries and 33 invariants, `git diff --check` with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task159 is durable checkpointing for operator transport recovery, not live transport. It does not provide indefinite WebSocket/SSE/terminal sessions, end-to-end guided real-Pi execution, OS-level adapter isolation, proof authority, claim promotion, or GA certification.

Residual risks: Goal 3 remains incomplete. Live durable long-lived operator transport, end-to-end guided real-Pi execution, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 158 / Pi Operator Session Persistence Consumer

Scope: expose the Task157 service-owned Pi/Codex lifecycle operator-session manifest persistence route through Pi tooling and `/cm:release lifecycle-operator-session`, while preserving host confirmation, no direct Pi `.comath/` writes, non-authority semantics, and public secret/host-path/proof-vocabulary scrubbing.

Work performed:

- Re-read the Goal 3 tracker/context and treated Task157's next step as authoritative.
- Used a read-only explorer to confirm Task158 should be Pi-extension consumer wiring only, leaving the Task157 service route unchanged.
- Added `goal3-task158-pi-operator-session-persistence-consumer.test.mjs`.
- RED showed `comath.release.piCodexLifecycleOperatorSession` was not registered.
- Added the mutating `comath.release.piCodexLifecycleOperatorSession` tool, `POST /release/pi-codex-lifecycle/operator-session` dispatch, `/cm:release lifecycle-operator-session`, runtime-registration subcommand metadata, Phase6 and Phase26 exposure checks, and default Pi package test wiring.
- The Pi consumer strips `confirmation_id`, requires Pi host confirmation, forwards only service-owned operator-session payload fields, uses Task157 service step ids, and sanitizes actor/cursor/summary/artifact text before public output or service dispatch.
- Code review found raw confirmation prompt leakage, verbatim `artifact_paths` forwarding, and secret-ish object-key leakage in `last_result_summary`. Added regression coverage and fixed confirmation prompt scrubbing, artifact ref field scrubbing, and object-key secret redaction before commit.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task158-pi-operator-session-persistence-consumer.test.mjs` failed because `comath.release.piCodexLifecycleOperatorSession` was not registered.
- Review-regression RED: the focused Task158 test failed before the review fixes because raw `D:/research/project/.../OPENAI_API_KEY=plain-token.json` artifact paths and `api_key: plain-token` summary fields were still forwarded.
- GREEN focused test exited 0: Task158 Pi operator-session persistence consumer.
- GREEN adjacent tests exited 0: Task153 real-Pi runtime probe consumer, Task155 lifecycle operator controls, Task156 lifecycle session recovery, Task157 service operator-session persistence, Phase6 extension, and Phase26 Pi runtime registration.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension typecheck` and `corepack pnpm --filter @comath/pi-extension test`, with Task158 discovered by the default Pi extension runner.
- Post-code gates exited 0: `node scripts/phase0-smoke.mjs` with 33 required entries and 33 invariants, `git diff --check` with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task158 is Pi-facing consumer wiring for Task157 service persistence. It does not provide indefinite WebSocket/SSE/terminal operator transport, cross-process transport recovery, an end-to-end guided real-Pi session, OS-level adapter isolation, proof authority, claim promotion, or GA certification.

Residual risks: Goal 3 remains incomplete. Durable long-lived operator transport/recovery, end-to-end guided real-Pi execution, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 157 / Pi Lifecycle Operator Session Persistence

Scope: add service-owned Pi/Codex lifecycle operator-session manifest persistence so a bounded operator session can write a sanitized `.comath/release/pi-codex-lifecycle/<session_id>/operator-session-manifest.json`, route to the next lifecycle action, and remain non-authoritative without claiming durable transport, real-Pi execution, or GA.

Work performed:

- Re-read the Goal 3 tracker/context and treated Task156's next step as authoritative.
- Used the read-only explorer result to choose the smallest safe Task157 slice: service-owned durable operator-session manifests rather than indefinite transport, OS isolation, broad Lean replay, or full guided real-Pi execution.
- Added `goal3-task157-pi-codex-operator-session-persistence.test.mjs`.
- RED showed `../../dist/index.js` did not export `persistPiCodexLifecycleOperatorSession`.
- Added `persistPiCodexLifecycleOperatorSession`, `POST /release/pi-codex-lifecycle/operator-session`, and the `pi_codex_lifecycle_operator_session_persistence` capability.
- The manifest writer validates session ids and project ids, canonicalizes artifact references, records `release.pi_codex_lifecycle_operator_session_persisted`, and preserves `proof_authority: "none"`, `durable_transport_provided: false`, `pi_direct_write_allowed: false`, `can_promote_claim: false`, and `can_certify_ga: false`.
- Code review found that raw `project_id`, actor/cursor fields, assignment-style secrets, bearer tokens, and poisoned `created_at` values could leak or be trusted too early. Added regressions and fixed validation/scrubbing before commit.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task157-pi-codex-operator-session-persistence.test.mjs` failed because `persistPiCodexLifecycleOperatorSession` was not exported.
- Leak-regression RED: the focused Task157 test failed on unsanitized API secret material before the review fixes.
- GREEN focused test exited 0: Task157 Pi/Codex operator-session persistence.
- GREEN adjacent tests exited 0: Task148 lifecycle evidence intake, Task149 durable-service lifecycle probe, Task150 Codex API account/network probe, Task152 real-Pi runtime probe, and Task146 lifecycle readiness.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task157 discovered by the default comathd runner.
- Post-doc gates exited 0: `node scripts/phase0-smoke.mjs` with 33 required entries and 33 invariants, `git diff --check` with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task157 persists a service-owned operator-session manifest and audit event. It does not provide indefinite WebSocket/SSE/terminal transport, cross-process operator transport recovery, real Pi execution by itself, Pi consumer wiring for this new route, OS-level adapter isolation, proof authority, claim promotion, or GA certification.

Residual risks: Goal 3 remains incomplete. Pi consumer wiring for the service-owned session persistence route, end-to-end guided real-Pi execution, durable long-lived operator transport, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 156 / Pi Lifecycle Operator Session Recovery

Scope: add a read-only Pi lifecycle session recovery surface that records operator-supplied session ids, completed lifecycle steps, log cursors, and sanitized last-result summaries so a Pi host can resume with the next host-confirmed lifecycle-control command, without calling `comathd`, writing `.comath/`, claiming durable transport, or weakening Lean Authority v3 boundaries.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed Task155 was the latest completed task before opening Task156.
- Used the read-only explorer result to choose the smallest safe Task156 slice: Pi-side lifecycle session recovery planning rather than OS isolation, broad Lean replay, or service-owned durable-session manifests.
- Added `goal3-task156-pi-lifecycle-operator-session.test.mjs`.
- RED showed `comath.release.piCodexLifecycleSession` was not registered in the Pi extension.
- Added the read-only `comath.release.piCodexLifecycleSession` tool, `/cm:release lifecycle-session` command, runtime-registration subcommand metadata, default package test wiring, Phase6 tool exposure guard, and Phase26 executable-tool guard.
- The session surface exposes `plan`, `status`, and `resume-plan`, preserves `proof_authority: "none"`, `can_promote_claim: false`, `can_certify_ga: false`, and `direct_trusted_state_mutation: false`, and returns only recovery guidance whose next action must be executed through Task155 `lifecycle-control` host confirmation.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task156-pi-lifecycle-operator-session.test.mjs` failed because `comath.release.piCodexLifecycleSession` was not registered.
- GREEN focused test exited 0: Task156 Pi lifecycle operator session recovery.
- GREEN adjacent tests exited 0: Task154 Pi lifecycle operator walkthrough, Task155 Pi lifecycle operator controls, Phase47 agent log subscription snapshots, Phase50 bounded log sessions, Phase6 extension, and Phase26 Pi runtime registration.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension typecheck`, `corepack pnpm --filter @comath/pi-extension test`, and `node scripts/phase0-smoke.mjs`.

Boundary notes: Task156 is a Pi-side read-only recovery-planning task. It does not create service-owned lifecycle evidence, persist a session manifest, open an indefinite WebSocket/SSE/terminal transport, run a real Pi host by itself, bypass host confirmation, promote claims, or certify GA.

Residual risks: Goal 3 remains incomplete. Durable persistent operator sessions, end-to-end guided real-Pi execution, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 155 / Pi Lifecycle Operator Controls

Scope: upgrade the Task154 read-only lifecycle walkthrough into bounded Pi operator controls that can plan/status locally and route selected lifecycle actions through existing host-confirmed service tools, without letting Pi write `.comath/`, carry secrets, overclaim proof authority, or certify GA.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed Task154 was the latest completed task before opening Task155.
- Audited the Task147 lifecycle review consumer, Task151 Codex API probe consumer, Task153 real-Pi runtime probe consumer, Task154 lifecycle walkthrough, runtime-registration metadata, and Pi release-command dispatch pattern.
- Added `goal3-task155-pi-lifecycle-operator-controls.test.mjs`.
- RED showed `comath.release.piCodexLifecycleControl` was not registered in the Pi extension.
- Added the read-only `comath.release.piCodexLifecycleControl` tool, local operator-control plan/status generator, `/cm:release lifecycle-control` command, runtime-registration subcommand metadata, default package test wiring, Phase6 tool exposure guard, and Phase26 executable-tool guard.
- The control surface exposes `plan` and `status` without service calls or host confirmation, and routes `run-real-pi-runtime-probe`, `run-codex-api-probe`, and `review` through the existing host-confirmed lifecycle tools. Public outputs are sanitized and retain `proof_authority: "none"`, `can_promote_claim: false`, `can_certify_ga: false`, and `direct_trusted_state_mutation: false`.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task155-pi-lifecycle-operator-controls.test.mjs` failed because `comath.release.piCodexLifecycleControl` was not registered.
- GREEN focused test exited 0: Task155 Pi lifecycle operator controls.
- GREEN adjacent tests exited 0: Task147 Pi/Codex lifecycle consumer, Task151 Pi/Codex API probe consumer, Task153 Pi real-Pi runtime probe consumer, Task154 Pi lifecycle operator walkthrough, Phase6 extension, and Phase26 Pi runtime registration.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension typecheck`, `corepack pnpm --filter @comath/pi-extension test`, and `node scripts/phase0-smoke.mjs`.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task155 is a Pi-side bounded operator UX/composition task. It does not create new service evidence producers, run a real Pi host by itself, provide persistent operator sessions, bypass host confirmation, promote claims, or certify GA.

Residual risks: Goal 3 remains incomplete. Persistent operator sessions with recovery semantics, end-to-end guided real-Pi execution, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 154 / Pi Lifecycle Operator Walkthrough

Scope: add a read-only Pi operator walkthrough for the Task146-153 lifecycle evidence/probe chain, without calling `comathd`, writing `.comath/`, carrying secrets, overclaiming proof authority, or certifying GA.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed Task153 was the latest completed task before opening Task154.
- Audited the Task147 lifecycle review consumer, Task151 Codex API probe consumer, Task153 real-Pi runtime probe consumer, runtime registration metadata, and the Task146-152 service evidence chain.
- Added `goal3-task154-pi-lifecycle-operator-walkthrough.test.mjs`.
- RED showed `comath.release.piCodexLifecycleWalkthrough` was not registered in the Pi extension.
- Added the read-only `comath.release.piCodexLifecycleWalkthrough` tool, local walkthrough generator, `/cm:release lifecycle-walkthrough` command, runtime-registration subcommand metadata, default package test wiring, Phase6 tool exposure guard, and Phase26 executable-tool guard.
- The walkthrough returns ordered operator steps and command templates for `real-pi-runtime-probe`, `codex-api-probe`, and `pi-codex-lifecycle`, references the service-owned durable lifecycle probe as evidence source material, uses placeholder executable fields, redacts public secret/path/proof-success vocabulary, and records `proof_authority: "none"`, `can_promote_claim: false`, `can_certify_ga: false`, and `direct_trusted_state_mutation: false`.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task154-pi-lifecycle-operator-walkthrough.test.mjs` failed because `comath.release.piCodexLifecycleWalkthrough` was not registered.
- GREEN focused test exited 0: Task154 Pi lifecycle operator walkthrough.
- GREEN adjacent tests exited 0: Task147 Pi/Codex lifecycle consumer, Task151 Pi/Codex API probe consumer, Task153 Pi real-Pi runtime probe consumer, and Phase26 Pi runtime registration.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension typecheck`, `corepack pnpm --filter @comath/pi-extension test`, and `node scripts/phase0-smoke.mjs`.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task154 is a Pi-side read-only UX/composition task. It does not run a real Pi host, run allowlisted probe commands, create lifecycle evidence, validate production Codex credentials, promote claims, or certify GA.

Residual risks: Goal 3 remains incomplete. Richer interactive operator controls beyond this read-only walkthrough, indefinite operator sessions, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 153 / Pi Real-Pi Runtime Probe Release Consumer

Scope: expose the Task152 service-owned real-Pi install/runtime-registration probe through the Pi release consumer surface, without letting Pi write `.comath/` directly, carry secrets, overclaim proof authority, or certify GA.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed Task152 was the latest completed task before opening Task153.
- Audited Task152 service route `POST /release/pi-codex-lifecycle/real-pi-runtime-probe`, Task147/151 release consumer patterns, and Phase26 runtime-registration guards.
- Added `goal3-task153-pi-real-pi-runtime-probe-consumer.test.mjs`.
- RED showed `comath.release.piRealPiRuntimeProbe` was not registered in the Pi extension.
- Added the mutating `comath.release.piRealPiRuntimeProbe` tool, executable runtime registration, public sanitizer coverage, route dispatch to `POST /release/pi-codex-lifecycle/real-pi-runtime-probe`, `/cm:release real-pi-runtime-probe` command parsing, runtime-registration subcommand metadata, default package test wiring, and the Phase26 executable-tool guard.
- The Pi payload forwards only project metadata, optional probe id, real-Pi host label/kind/session fields, timeout, and the three operator command specs; `confirmation_id` remains host-injected and is stripped before service dispatch, and API credentials or other secret material are not accepted from Pi payloads.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task153-pi-real-pi-runtime-probe-consumer.test.mjs` failed because `comath.release.piRealPiRuntimeProbe` was not registered.
- GREEN focused test exited 0: Task153 Pi real-Pi runtime probe consumer.
- GREEN adjacent tests exited 0: Task147 Pi/Codex lifecycle consumer, Task151 Pi/Codex API probe consumer, and Task152 service real-Pi install/runtime-registration probe.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension typecheck` and `corepack pnpm --filter @comath/pi-extension test`, with Task153 discovered by the default Pi extension runner.

Boundary notes: Task153 is a Pi consumer and command exposure task only. It calls the service-owned Task152 probe route through host-confirmed Pi tooling and sanitizes public notifications. It does not itself prove this workstation ran on a Pi, does not bypass service command allowlists, does not carry credentials, does not promote claims, and cannot certify GA.

Residual risks: Goal 3 remains incomplete. Richer operator UI/manual real-Pi walkthrough, indefinite operator sessions, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 152 / Real-Pi Install Runtime Probe

Scope: add a service-owned non-authoritative producer for real-Pi install/runtime-registration evidence artifacts, without accepting fake Pi host evidence, exposing host paths, promoting proof claims, or certifying GA.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed Task151 was the latest completed task before opening Task152.
- Audited Task148 lifecycle evidence intake, Task149 durable service lifecycle probe, Task150 Codex API probe, `comathd` route wiring, and capability reporting.
- Added `goal3-task152-real-pi-install-runtime-probe.test.mjs`.
- RED showed `probePiCodexRealPiInstallRuntimeRegistration` was not exported by `comathd`.
- Added `probePiCodexRealPiInstallRuntimeRegistration()` plus `POST /release/pi-codex-lifecycle/real-pi-runtime-probe`.
- The probe executes service-configured allowlisted `shell:false` install/runtime-registration/host-confirmation commands, writes a scrubbed `pi-install-transcript.md` and `runtime-registration-snapshot.json`, returns readiness-compatible real-Pi runtime fields, and emits artifacts ingestible by Task148 evidence intake.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0 before RED and after implementation.
- TDD RED: `node services/comathd/tests/unit/goal3-task152-real-pi-install-runtime-probe.test.mjs` failed because `../../dist/index.js` did not export `probePiCodexRealPiInstallRuntimeRegistration`.
- GREEN focused test exited 0: Task152 real-Pi install/runtime-registration probe.
- GREEN adjacent tests exited 0: Task148 lifecycle evidence intake, Task149 durable service lifecycle probe, and Task150 Codex API account/network probe.
- Package gate exited 0: `corepack pnpm --filter @comath/comathd typecheck`.
- Package gate exited 0: `corepack pnpm --filter @comath/comathd test`, with Task152 discovered by the default comathd runner.
- Post-code `node scripts/phase0-smoke.mjs`, `git diff --check`, and `Test-Path -LiteralPath .comath` exited cleanly, with diff check reporting only Windows LF-to-CRLF warnings and `.comath` remaining absent at the repo root.

Boundary notes: Task152 is a service-owned artifact producer. It can collect operator-configured real-Pi install/runtime-registration command evidence into project-local release artifacts, but it does not itself prove that this workstation ran on a Pi, does not grant proof authority, does not expose API secrets, and cannot certify GA.

Residual risks: Goal 3 remains incomplete. Pi-facing consumer UX for this new probe, richer operator UI/manual walkthrough, OS-level adapter isolation, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 151 / Pi-Codex API Probe Release Consumer

Scope: expose the Task150 service-owned production Codex API account/network validation probe through the Pi release consumer surface, without letting Pi carry API credentials, write `.comath/` directly, overclaim proof authority, or certify GA.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed `main` was clean at `b730265` before opening Task151.
- Audited Task150 service route `POST /release/pi-codex-lifecycle/codex-api-probe`, Task147 release consumer patterns, Phase6 tool registration, and Phase26 runtime registration.
- Added `goal3-task151-pi-codex-api-probe-consumer.test.mjs`.
- RED showed `comath.release.piCodexApiProbe` was not registered in the Pi extension.
- Added the mutating `comath.release.piCodexApiProbe` tool, host-confirmed runtime execution, public sanitizer coverage, `/cm:release codex-api-probe` command parsing, runtime-registration subcommand metadata, and default Pi package test wiring.
- The Pi request forwards only project metadata and optional validation id to `comathd`; API keys remain service-owned env/config and are not accepted from Pi payloads.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task151-pi-codex-api-probe-consumer.test.mjs` failed because `comath.release.piCodexApiProbe` was not registered.
- GREEN focused test exited 0: Task151 Pi/Codex API probe consumer.
- GREEN adjacent tests exited 0: Task147 Pi/Codex lifecycle consumer, Phase6 extension, Phase26 Pi runtime registration, and Task150 service Codex API account/network probe.
- Package gate exited 0: `corepack pnpm --filter @comath/pi-extension test`, with Task151 discovered by the default Pi extension runner.

Boundary notes: Task151 is a Pi consumer and command exposure task only. It calls the service-owned Task150 probe route through host-confirmed Pi tooling and sanitizes public notifications. It does not validate a real Pi host install/runtime registration path, does not carry or inspect Codex API credentials, does not promote claims, and cannot certify GA.

Residual risks: Goal 3 remains incomplete. Direct real-Pi install/runtime-registration probes, OS-level adapter isolation, richer operator UI, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 150 / Production Codex API Account-Network Probe

Scope: move from durable `comathd` service lifecycle evidence to a service-owned production Codex API account/network validation probe that can produce the `codex_validation_report` artifact consumed by Task148, without claiming proof authority or GA certification.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed `main` was clean at `ab88067` before opening Task150.
- Audited Task146 readiness review, Task148 evidence intake, Task149 durable service lifecycle probe, and Phase51-53 Codex API/CLI validation.
- Added `goal3-task150-codex-api-account-network-probe.test.mjs`.
- RED showed `probePiCodexProductionCodexAccountNetwork` was not exported by `comathd`.
- Added `validateCodexApiAccountNetworkConnectivity()` over the existing service-configured Codex API backend config/retry path.
- Added `probePiCodexProductionCodexAccountNetwork()` and `POST /release/pi-codex-lifecycle/codex-api-probe`.
- The probe writes `.comath/release/pi-codex-lifecycle/<id>/codex-account-network-validation.json`, emits a `codex_validation_report` artifact descriptor, feeds Task148 lifecycle evidence intake through a readiness fragment, preserves bounded retry/rate-limit/status metadata, and records missing credentials, API/network failures, thrown client errors, and invalid base URLs as non-authoritative blocker evidence.
- Added the `pi_codex_production_codex_api_account_network_probe` service status capability.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task150-codex-api-account-network-probe.test.mjs` failed because `../../dist/index.js` did not export `probePiCodexProductionCodexAccountNetwork`.
- GREEN focused tests exited 0: Task150 Codex API account/network probe.
- GREEN adjacent regressions exited 0: Task146 Pi/Codex lifecycle readiness, Task148 Pi/Codex lifecycle evidence intake, Task149 durable service lifecycle probe, Phase51 Codex API backend, Phase52 Codex API retry telemetry, and Phase53 installed Codex CLI validation.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task150 discovered by the default comathd runner.
- Post-code `node scripts/phase0-smoke.mjs`, `git diff --check`, and `Test-Path -LiteralPath .comath` exited 0.
- Code commit: `a9379f0` (`Add Codex API lifecycle validation probe`).

Boundary notes: Task150 validates Codex API account/network reachability only through service-owned credentials and a bounded Responses-compatible request. It does not expose credentials, raw auth headers, host paths, raw prompts, or raw model output in persisted artifacts. It is lifecycle readiness evidence only: `proof_authority: none`, `can_promote_claim: false`, and `can_certify_ga: false`.

Residual risks: Goal 3 remains incomplete. Task150 does not add a Pi command/tool consumer for the probe, does not validate a real Pi host install/runtime-registration path, does not provide OS-level adapter isolation, does not provide indefinite operator sessions, does not broaden Lean/mathlib replay, does not complete nontrivial theorem synthesis, and does not certify GA.

# Goal 3 Task 149 / Pi-Codex Durable Service Lifecycle Probe

Scope: move from artifact-backed operator-submitted lifecycle evidence to a service-owned durable `comathd` lifecycle probe that can directly produce the service lifecycle log consumed by Task148, without claiming proof authority or GA certification.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed `main` was clean at `ef4c465` before opening Task149.
- Audited Task146 readiness review, Task148 evidence intake, Phase43 packaged adapter execution, and Phase53 installed Codex CLI validation against the remaining durable-service lifecycle collector gap.
- Added `goal3-task149-pi-codex-service-lifecycle-probe.test.mjs`.
- RED showed `probePiCodexDurableServiceLifecycle` was not exported by `comathd`.
- Added `probePiCodexDurableServiceLifecycle()` and `POST /release/pi-codex-lifecycle/service-probe`.
- The probe executes configured allowlisted `shell:false` start/status/stop/restart/status commands with bounded timeout/output capture, writes `.comath/release/pi-codex-lifecycle/<id>/service-lifecycle-probe.json`, emits a `durable_service_lifecycle_log` artifact descriptor, and returns readiness-compatible durable service lifecycle booleans.
- Missing commands, unallowlisted programs, shell-like arguments, nonzero exits, and timeouts fail closed; failed command probes still persist non-authoritative blocker evidence.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task149-pi-codex-service-lifecycle-probe.test.mjs` failed because `../../dist/index.js` did not export `probePiCodexDurableServiceLifecycle`.
- GREEN focused/adjacent tests exited 0: Task149 durable service lifecycle probe, Task148 Pi/Codex lifecycle evidence intake, Task146 Pi/Codex lifecycle readiness, Task147 Pi/Codex lifecycle consumer, Phase53 installed Codex CLI validation, and Phase43 agent adapter package.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task149 discovered by the default comathd runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Post-code `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task149 only probes durable service lifecycle commands configured by the service operator. It does not validate a real Pi host install/runtime registration path, does not validate production Codex credentials or network access, does not provide OS-level process isolation, does not promote claims, and cannot certify GA.

Residual risks: Goal 3 remains incomplete. Real Pi host install/runtime-registration probes beyond durable service lifecycle, production Codex account/network validation, OS-level adapter isolation, richer operator UI, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

Code commit: `2857649` (`Add Pi Codex service lifecycle probe`)

# Goal 3 Task 148 / Pi-Codex Lifecycle Evidence Intake

Scope: move from Pi-side lifecycle review exposure to service-owned artifact-backed evidence intake for real-host Pi/Codex lifecycle review, without treating operator-submitted evidence as proof authority or GA certification.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed `main` was clean at `e94634c` before opening Task148.
- Audited Task146 readiness review and Task147 Pi release consumer wiring and identified the remaining gap: lifecycle evidence could be submitted as bare structured fields without a service-owned artifact manifest binding real-host install, runtime registration, durable service lifecycle, and Codex validation material.
- Added `goal3-task148-pi-codex-lifecycle-evidence-intake.test.mjs`.
- RED showed `collectPiCodexLifecycleEvidence` was not exported by `comathd`.
- Added `collectPiCodexLifecycleEvidence()` and `POST /release/pi-codex-lifecycle/evidence`.
- The intake reads project-contained evidence artifacts, records project-relative paths, SHA-256 hashes, and byte sizes, writes `.comath/release/pi-codex-lifecycle/<id>/evidence.json`, and produces a readiness-gate input envelope.
- Missing or non-file evidence artifacts fail closed before a readiness review can be assembled.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task148-pi-codex-lifecycle-evidence-intake.test.mjs` failed because `../../dist/index.js` did not export `collectPiCodexLifecycleEvidence`.
- GREEN focused/adjacent tests exited 0: Task148 Pi/Codex lifecycle evidence intake, Task146 Pi/Codex lifecycle readiness, Task147 Pi/Codex lifecycle consumer, Phase53 installed Codex CLI validation, and Phase43 agent adapter package.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task148 discovered by the default comathd runner.
- Post-code `git diff --check` exited 0 and `Test-Path -LiteralPath .comath` returned `False`.
- Code commit: `678c574` (`Add Pi Codex lifecycle evidence intake`).

Boundary notes: Task148 is evidence intake and manifest binding only. It does not independently operate a real Pi host, install or manage a durable `comathd` service, validate production Codex credentials/network access, promote claims, certify proofs, or certify GA.

Residual risks: Goal 3 remains incomplete. Real-host Pi lifecycle execution, durable service start/stop/restart automation, production Codex account/network validation, OS-level adapter isolation, richer operator UI, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 147 / Pi-Codex Lifecycle Release Consumer

Scope: expose the Task146 service-owned Pi/Codex lifecycle readiness review gate through the Pi release consumer surface without letting Pi write `.comath/` directly, overclaim proof authority, or treat submitted lifecycle evidence as verified real-host validation.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed `main` was clean at `01c730c` before opening Task147.
- Audited the Task146 service gate and route plus the existing Task143 `/cm:release` public archive consumer path.
- Added `goal3-task147-pi-codex-lifecycle-consumer.test.mjs`.
- RED showed `comath.release.piCodexLifecycleReview` was not registered in the Pi extension.
- Added the `comath.release.piCodexLifecycleReview` mutating Pi tool, executable runtime registration, public result sanitization, and route dispatch to `POST /release/pi-codex-lifecycle/review`.
- Added `/cm:release pi-codex-lifecycle` command parsing for explicit install-session and Codex evidence fields, reusing Pi host confirmation and sanitized notifications.
- Wired the Task147 regression into the default `@comath/pi-extension` package test chain and updated adjacent Phase6/Phase26 registration checks.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task147-pi-codex-lifecycle-consumer.test.mjs` failed because `comath.release.piCodexLifecycleReview` was not registered.
- GREEN focused/adjacent tests exited 0: Task147 Pi/Codex lifecycle consumer, Task143 Pi public release review consumer, Phase6 extension, Phase26 Pi runtime registration, and Task146 service Pi/Codex lifecycle readiness.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension typecheck` and `corepack pnpm --filter @comath/pi-extension test`, with Task147 discovered by the default Pi extension runner.
- Post-code `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants, `git diff --check` exited 0, and `Test-Path -LiteralPath .comath` returned `False`.
- Code commit: `d99122c` (`Add Pi Codex lifecycle release consumer`).

Boundary notes: Task147 is a Pi consumer and release-command exposure task only. It does not create real Pi host evidence, install or manage a durable `comathd` service, validate a production Codex account/network path, provide OS-enforced adapter isolation, promote claims, certify proofs, or certify GA.

Residual risks: Goal 3 remains incomplete. The lifecycle readiness gate is now reachable from Pi tooling and `/cm:release`, but actual evidence producers for real-host Pi installation, durable service start/stop/restart, and production Codex account/network validation remain open, along with richer Lean/mathlib replay, nontrivial theorem synthesis, OS-level sandboxing, and final GA audit.

# Goal 3 Task 146 / Pi-Codex Lifecycle Readiness Gate

Scope: move from public archive hardening to the real-host Pi/Codex lifecycle residual blocker by adding a service-owned readiness gate that refuses to treat fake-host install-session evidence as full production lifecycle validation.

Work performed:

- Re-read the Goal 3 required context set and confirmed `main` was clean with no earlier `[ ]`, `[~]`, or `Commit: pending` tracker item before opening Task146.
- Audited Phase45 local Pi/comathd install-session e2e, Phase43 packaged Codex adapter lifecycle metadata, Phase53 installed Codex CLI validation, and the TODO/REVIEW residual-risk wording around real-host Pi UX and production Codex validation.
- Added `goal3-task146-pi-codex-lifecycle-readiness.test.mjs`.
- RED showed `reviewPiCodexLifecycleReadiness` was not exported by `comathd`.
- Added `reviewPiCodexLifecycleReadiness()` and `POST /release/pi-codex-lifecycle/review`.
- The review writes `.comath/release/pi-codex-lifecycle/<id>/review.json`, records `proof_authority: "none"`, `can_promote_claim: false`, and `can_certify_ga: false`, and vetoes missing real Pi host validation, ephemeral/non-durable service lifecycle evidence, and missing production Codex account/network validation.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task146-pi-codex-lifecycle-readiness.test.mjs` failed because `../../dist/index.js` did not export `reviewPiCodexLifecycleReadiness`.
- GREEN focused tests exited 0: Task146 Pi/Codex lifecycle readiness, Phase53 installed Codex CLI validation, and Phase43 agent adapter package.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck`, `corepack pnpm --filter @comath/comathd test`, and `corepack pnpm --filter @comath/pi-extension test`, with Task146 discovered by the default comathd runner.
- Post-doc `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants, and `Test-Path -LiteralPath .comath` returned `False`.
- Code commit: `6bc1ebb` (`Add Pi Codex lifecycle readiness gate`).

Boundary notes: Task146 is a lifecycle readiness gate and blocker-evidence surface only. It does not run a real Pi host, does not install a durable service, does not validate a production Codex account/network path, does not expose a Pi UI walkthrough, does not promote claims, and does not certify GA.

Residual risks: Goal 3 remains incomplete. Task146 prevents fake-host and ephemeral local install-session evidence from satisfying full lifecycle readiness, but actual real-host Pi validation, durable service start/stop/restart validation, production Codex account/network validation, richer Lean/mathlib replay, nontrivial theorem synthesis, OS-level sandboxing, and final GA audit remain open.

# Goal 3 Task 145 / Public Archive Notarization Policy Evidence

Scope: move the public source-review archive line to the next highest-risk release blocker by adding explicit tamper-evident/notarization-policy evidence while preserving the public/internal archive authority boundary.

Work performed:

- Re-read the Goal 3 required context set and confirmed `main` was clean with no earlier `[ ]`, `[~]`, or `Commit: pending` tracker item before opening Task145.
- Audited `source-review-public-archive`, `public-archive-review`, adjacent Task141/142/144 regressions, and release-hardening docs.
- Added `goal3-task145-public-archive-notarization-policy.test.mjs`.
- RED showed assembled source-review public archives had no `notarization_manifest_path` or immutability/notarization policy evidence.
- Added a service-owned `.comath/release/source-review/public-archive/<id>/notarization-policy.json` sidecar that binds the source-review manifest hash and public report hashes.
- Recorded an explicit `source_review_public_archive_immutability_policy` with `proof_authority: "none"`, `can_promote_claim: false`, `can_restore: false`, `tamper_evident_manifest: true`, and OS immutable storage / external notarization statuses set to `not_configured`.
- Hardened the public archive review gate so legacy source-review public archive manifests without sidecar evidence, or archives whose sidecar manifest hash no longer matches, receive sanitized non-authoritative vetoes.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task145-public-archive-notarization-policy.test.mjs` failed because `notarization_manifest_path` was `undefined`.
- GREEN focused tests exited 0: Task145 public archive notarization policy, Task141 source-review public archive, Task142 public archive review gate, and Task144 public archive review error contract.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck`, `corepack pnpm --filter @comath/comathd test`, and `corepack pnpm --filter @comath/pi-extension test`.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Post-doc `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.
- Code commit: `d9e9be8` (`Add public archive notarization policy evidence`).

Boundary notes: Task145 adds tamper-evident policy evidence for public diagnostic archives only. It does not provide OS-level immutable storage, does not perform external notarization, does not make public archives restorable, does not promote claims, and does not weaken Lean Authority v3 source-report or final packaging gates.

Residual risks: Goal 3 remains incomplete. Task145 closes one public archive policy-evidence gap, but richer visual review workflows, real OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, final-release-candidate Lean/mathlib breadth audit, full real-host Pi/Codex lifecycle validation, and final GA audit remain open.

# Goal 3 Task 144 / Public Archive Review Error Contract

Scope: audit public review package presentation surfaces outside the Pi command/tool path, especially service-side release review error responses that could leak host paths or privileged proof-authority vocabulary.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task; Task143's next step named Task144 as the next frontier.
- Audited `source-review-public-archive`, `public-archive-review`, release routes, and adjacent Task141-143 tests.
- Found that `/release/public-archive/review` could inspect a source-review public archive manifest whose `reports[].public_relative_path` points to a missing public report, then surface Node's `ENOENT` message with the absolute host path in the public route error body.
- Added `goal3-task144-public-archive-review-error-contract.test.mjs`.
- RED showed the route returned `500 INTERNAL_ERROR` and exposed an absolute temp path for a missing referenced report.
- Hardened referenced public report reads so missing referenced reports and directory-valued report paths fail as structured `ComathError` responses with stable codes and no path echo.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task144-public-archive-review-error-contract.test.mjs` failed because the route returned `500 INTERNAL_ERROR` and echoed an absolute `C:\Users\...\missing-public.md` path.
- GREEN focused tests exited 0: Task144 public archive review error contract, Task142 public archive review gate, and Task141 source-review public archive.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck`, `corepack pnpm --filter @comath/comathd test`, and `corepack pnpm --filter @comath/pi-extension test`.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task144 changes only the public archive review error contract for referenced public report material. It does not make public archives restorable, does not alter internal source-report fidelity, does not promote claims, and does not weaken Lean Authority v3 gates.

Residual risks: Goal 3 remains incomplete. Task144 closes one remaining service-side public review error leak, but richer visual review workflows, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, final-release-candidate Lean/mathlib breadth audit, full real-host Pi/Codex lifecycle validation, and final GA audit remain open.

# Goal 3 Task 143 / Pi Public Release Review Consumer

Scope: audit Pi/UI and public release consumer ergonomics for the source-review public archive and public archive review routes added by Tasks141-142, without letting Pi write `.comath/` directly, leak host paths, or present public diagnostics as proof authority.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task before Task143; also repaired the stale Task142 `Commit: pending` tracker marker to `cf9cfba`.
- Audited Pi runtime registration, executable tool allowlists, `/cm:*` command parsing/handlers, public tool result sanitization, and adjacent snapshot/replay/campaign export sanitizer tests.
- Added `goal3-task143-pi-public-release-review-consumer.test.mjs`.
- RED showed `comath.release.sourceReviewPublicArchive` was not registered in the Pi extension.
- Added `comath.release.sourceReviewPublicArchive` and `comath.release.publicArchiveReview` tools, both routed only to `comathd` release endpoints and both requiring Pi host confirmation.
- Added `/cm:release source-review|review` command handling and runtime-registration metadata.
- Expanded public Pi result/notification sanitization so release review responses redact privileged proof-authority vocabulary and host-path echoes.
- Updated Phase6/Phase26 runtime contract tests, Pi package test chain, README public surface wording, and TODO deferred-risk wording.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task143-pi-public-release-review-consumer.test.mjs` failed because `comath.release.sourceReviewPublicArchive` was not registered.
- GREEN focused test exited 0: Task143 Pi public release review consumer.
- Package gate exited 0: `corepack pnpm --filter @comath/pi-extension test`, with Task143 discovered by the default runner.
- Typecheck gates exited 0 for `@comath/pi-extension` and `@comath/comathd`.
- Adjacent service regressions exited 0: Task141 source-review public archive and Task142 public archive review gate.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.

Boundary notes: Task143 is a Pi consumer and presentation hardening task only. It does not change service-side release archive semantics, does not make public archives restorable, does not promote claims, and does not weaken final Lean Authority v3 packaging gates.

Residual risks: Goal 3 remains incomplete. Task143 closes the Pi public release review consumer gap, but richer visual review workflows, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, final-release-candidate Lean/mathlib breadth audit, full real-host Pi/Codex lifecycle validation, and final GA audit remain open.

# Goal 3 Task 142 / Public Archive Review Gate

Scope: audit final GA public archive review and public review package consumers after the new source-review assembly route, especially cross-route archive manifests or download presentation surfaces that could reintroduce authority vocabulary, host-path echoes, or restorable-public-archive semantics.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task before Task142.
- Audited Task134-141 public archive/download surfaces: source-review public archive manifests, public snapshot export payloads, paper export payloads, generated report sanitization, and the service route table.
- Added `goal3-task142-public-archive-review-gate.test.mjs`.
- RED showed `dist/index.js` did not export `reviewGoal3PublicArchiveSurfaces`.
- Added `reviewGoal3PublicArchiveSurfaces()` and `/release/public-archive/review`.
- The review gate inspects manifest files and route payloads without treating the review as proof authority, writes `.comath/release/public-archive-review/<id>/review.json`, emits non-authoritative audit metadata, and reports sanitized veto codes for public archive restorable semantics, proof-authority claims, host-path exposure, authority vocabulary, and host-path echoes.
- The review output deliberately does not repeat leaked host paths or final-authority vocabulary found in malicious public material.

Verification evidence:

- `corepack pnpm build` in `services/comathd` exited 0.
- TDD RED: `node tests/unit/goal3-task142-public-archive-review-gate.test.mjs` failed because `../../dist/index.js` did not export `reviewGoal3PublicArchiveSurfaces`.
- GREEN focused test exited 0: Task142 public archive review gate.
- Adjacent public archive/path regressions exited 0: Task141 source-review public archive, Task139 public snapshot export path contract, Task137 public paper export path contract, and Task134 release public archive contract.
- Package gates exited 0: `corepack pnpm typecheck` and `corepack pnpm test` in `services/comathd`, with Task142 discovered by the default runner.

Boundary notes: Task142 adds a public archive review gate only. It does not make public archives restorable, does not certify proofs, does not change final authority packaging, and does not weaken internal restore fidelity.

Residual risks: Goal 3 remains incomplete. Task142 closes the discovered final public archive review gap for service-side manifests and route payloads, but it does not add Pi/UI review-export ergonomics, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, final-release-candidate Lean/mathlib breadth audit, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 141 / Source-Review Public Archive Contract

Scope: audit remaining source-review package assembly and generated HTML/Markdown/JSON download presentation surfaces after the Pi-host project-relative snapshot manifest UX fix, without letting public review material act as proof authority or expose host paths.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task before Task141.
- Audited release public archive contracts, snapshot public generated-report sanitization, `/paper/export`, `/snapshot/export`, and the service route table after Task134-140.
- Found a real contract gap: Task134 declared source-review public archives and sanitized generated Markdown/HTML/JSON reports, but `comathd` had no service-owned source-review public archive assembler or route that enforced those semantics at package time.
- Added `goal3-task141-source-review-public-archive.test.mjs`.
- RED showed `dist/index.js` did not export `assembleSourceReviewPublicArchive`.
- Added `assembleSourceReviewPublicArchive()` and `/release/source-review/public-archive`.
- The assembler writes a public diagnostic archive manifest plus sanitized Markdown/HTML/JSON report copies under `.comath/release/source-review/public-archive/<id>/`, exposes only project-relative paths, records `proof_authority: "none"`, `can_restore: false`, `can_promote_claim: false`, and preserves source report files unchanged.
- Bound the audit event target to `project_id` while keeping the free-form archive id in payload/result, because audit `target_id` requires a CoMath stable id.

Verification evidence:

- `corepack pnpm build` in `services/comathd` exited 0.
- TDD RED: `node tests/unit/goal3-task141-source-review-public-archive.test.mjs` failed because `../../dist/index.js` did not export `assembleSourceReviewPublicArchive`.
- GREEN focused test exited 0: Task141 source-review public archive.
- Adjacent public archive/path regressions exited 0: Task134 release public archive contract, Task135 public generated report sanitizer, Task137 public paper export path contract, and Task139 public snapshot export path contract.
- Package gates exited 0: `corepack pnpm typecheck` and `corepack pnpm test` in `services/comathd`, with Task141 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task141 adds a public diagnostic package assembly surface only. It does not make public archives restorable, does not promote claims, does not alter internal snapshot restore fidelity, and does not make Markdown/HTML/JSON reports proof authority.

Residual risks: Goal 3 remains incomplete. Task141 closes the discovered source-review public archive assembly gap for generated Markdown/HTML/JSON report presentation, but it does not complete final GA public archive review, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, final-release-candidate Lean/mathlib breadth audit, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 140 / Pi Relative Snapshot Manifest Contract

Scope: audit the public-download presentation consumer side after Task139's project-relative snapshot export path contract, with emphasis on Pi-host UX for project-relative snapshot manifest paths and without weakening internal restore or replay fidelity.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task before Task140.
- Audited Pi snapshot tool schemas, live `/cm:snapshot` command handling, runtime registration metadata, and adjacent snapshot/replay sanitizer tests after Task139.
- Found that public `/snapshot/export` now returns project-relative manifest paths, but Pi `comath.snapshot.verify`, `comath.snapshot.restore`, `comath.replay.verifyManifest`, and `/cm:snapshot verify|restore|verify-manifest` still did not advertise or forward `project_root`.
- Added `goal3-task140-pi-relative-snapshot-manifest-contract.test.mjs`.
- RED showed `comath.snapshot.verify` did not advertise optional `project_root`; after the first fix, RED also showed `/cm:snapshot` did not advertise `verify-manifest`.
- Hardened Pi tool execution and live command handling so relative public snapshot manifest paths are submitted with `project_root` when available while absolute manifest paths remain compatible.
- Advertised `verify-manifest` in `/cm:snapshot` runtime metadata and wired the Task140 regression into the Pi extension default test chain.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task140-pi-relative-snapshot-manifest-contract.test.mjs` first failed because `comath.snapshot.verify` lacked `project_root`, then failed because `/cm:snapshot` did not advertise `verify-manifest`.
- GREEN focused tests exited 0: Task140, Task131 Pi snapshot runtime consistency, Phase59 Pi product surface tool routing, and Task130 Pi snapshot/replay public authority sanitizer.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension typecheck` and `corepack pnpm --filter @comath/pi-extension test`, with Task140 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task140 is Pi extension consumer/metadata hardening only. It does not change service-side snapshot resolution, persisted snapshot manifests, direct internal restore fidelity, public download non-restorability, replay semantics, or proof-authority gates.

Residual risks: Goal 3 remains incomplete. Task140 closes the discovered Pi-host project-relative snapshot manifest UX gap, but it does not audit any future source-review package assembly route, generated HTML/Markdown download renderers, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, final-release-candidate Lean/mathlib breadth audit, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 139 / Public Snapshot Export Path Contract

Scope: audit remaining source-review/package assembly or public download route surfaces for host-path, metadata, and non-authority contract leaks after the paper and snapshot route hardening line, without weakening internal restore or replay fidelity.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task item before Task139.
- Audited the remaining public snapshot download route surface after Task137/Task138 hardening and found `POST /snapshot/export` still returned the direct `exportSnapshot()` result, including absolute `snapshot_root`, `manifest_path`, and `replay_manifest_path`.
- Added `goal3-task139-public-snapshot-export-path-contract.test.mjs`.
- RED showed `/snapshot/export` lacked the expected non-authoritative public archive contract and still exposed internal route shape before any project-relative path checks could pass.
- Wrapped public `/snapshot/export` responses so they expose project-relative snapshot paths and explicit `proof_authority: none`, `can_restore: false`, and `exposes_host_paths: false` public download semantics.
- Added optional `project_root` handling to public snapshot verify/restore/replay routes so project-relative manifest paths returned by public export can still be verified while absolute internal manifest inputs remain supported.
- Preserved direct internal `exportSnapshot()` fidelity, including absolute local paths and explicit `internal_restore` byte-for-byte restore material.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task139-public-snapshot-export-path-contract.test.mjs` failed because `public_archive_contract` was missing from `/snapshot/export`.
- GREEN focused tests exited 0: Task139, Task133 public snapshot restore contract, Task134 release public archive contract, Task138 snapshot route public contract, Phase16 snapshot/replay, and Phase55 runner cross-machine replay.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task139 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task139 is public route response hardening only. It does not rewrite persisted snapshot manifests, does not change public snapshot copy contents, does not weaken direct `internal_restore` fidelity, and does not promote snapshot or replay diagnostics into proof authority.

Residual risks: Goal 3 remains incomplete. Task139 closes the discovered public snapshot export path/contract leak, but it does not audit any future source-review package assembly route, generated HTML/Markdown download renderers, real Pi-host UX around project-relative snapshot manifests, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, final-release-candidate Lean/mathlib breadth audit, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 138 / Snapshot Route Public Path Contract

Scope: audit snapshot verify/restore and replay-verify public route payloads for path/metadata exposure, caller-supplied absolute path echoes, and public-vs-internal restore semantics while preserving explicit `internal_restore` byte-for-byte fidelity.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task before Task138.
- Audited `/snapshot/verify`, `/snapshot/restore`, and `/replay/verify-manifest` after the Task133-137 public archive hardening line.
- Added `goal3-task138-snapshot-route-public-contract.test.mjs`.
- RED showed public `/snapshot/restore` echoed the caller-provided absolute restore target.
- Hardened public snapshot verify/replay-verify responses with recursive host-path redaction before public authority vocabulary sanitization.
- Wrapped public `/snapshot/restore` so it returns restored entry count, project id, and explicit non-authoritative restore contract metadata without exposing the internal `target_root`.
- Preserved direct internal `restoreSnapshot()` behavior, including absolute `target_root` and byte-for-byte `internal_restore` material.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task138-snapshot-route-public-contract.test.mjs` failed because public `/snapshot/restore` echoed the Windows absolute route restore target.
- GREEN focused tests exited 0: Task138, Task133 public snapshot restore contract, Task137 public paper export path contract, Phase16 snapshot/replay, and Phase55 runner cross-machine replay.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task138 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task138 is public route response hardening only. It does not change persisted snapshot manifests, public snapshot export paths, direct internal restore fidelity, public download non-restorability, runner replay semantics, or proof authority gates.

Residual risks: Goal 3 remains incomplete. Task138 closes the discovered snapshot verify/restore/replay public route host-path echo surface, but it does not yet audit any future source-review package assembly route, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, final-release-candidate Lean/mathlib breadth audit, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 137 / Public Paper Export Path Contract

Scope: audit remaining public export/package route payloads for non-authoritative archive semantics and path/metadata exposure, with emphasis on `/paper/export` route fields.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task item before Task137.
- Audited remaining public export/package route payloads after the Task133-136 public archive and route-sanitizer line.
- Added `goal3-task137-public-paper-export-path-contract.test.mjs`.
- RED showed `/paper/export` exposed the internal absolute `path` returned by `exportPaper()`.
- Wrapped the public `/paper/export` route response so it omits the internal host path, exposes a slash-normalized project-relative artifact path, and includes a non-authoritative public archive contract with `proof_authority: none`, `can_restore: false`, and `exposes_host_paths: false`.
- Preserved direct internal `exportPaper()` behavior, including its absolute local source path for internal file fidelity.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task137-public-paper-export-path-contract.test.mjs` failed because `/paper/export` still returned public `path`.
- GREEN focused tests exited 0: Task137, Task136 public paper/literature route sanitizer, Task135 public generated report sanitizer, Task134 release public archive contract, Task133 public snapshot restore contract, and Phase12 working paper.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task137 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task137 is public route response hardening only. It does not rewrite persisted paper artifacts, does not change `exportPaper()` internal return fidelity, does not change snapshot restore rules, and does not make paper export material proof authority.

Residual risks: Goal 3 remains incomplete. Task137 closes the discovered public paper export host-path leak and adds explicit non-authoritative archive semantics for that route, but it does not yet fully audit snapshot verify/restore route response path echoes, any future source-review package assembly route, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, final-release-candidate Lean/mathlib breadth audit, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 136 / Public Paper And Literature Route Sanitizer

Scope: audit remaining public export/read-model route bodies outside snapshot material, with emphasis on paper and literature responses that could bypass the public authority vocabulary sanitizer.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task item before Task136.
- Audited public `comathd` route bodies after the Task131-135 sanitizer line and found that paper and literature routes still returned internal records directly.
- Added `goal3-task136-public-paper-literature-route-sanitizer.test.mjs`.
- RED showed `/paper/update-section` returned raw `formal_replay_passed`, `lean_kernel_clean_replay`, `formally_checked`, `proven`, and related privileged public vocabulary.
- Hardened public route responses for `/literature/import-bibtex`, `/literature/import-pdf`, `/literature/register-citation`, `/literature/check-condition`, `/literature/list`, `/paper/init`, `/paper/state`, `/paper/update-section`, `/paper/render-claim`, `/paper/check`, and `/paper/export`.
- Preserved internal paper and literature stores unchanged; sanitizer is applied only to public HTTP route response bodies.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task136-public-paper-literature-route-sanitizer.test.mjs` failed on `/paper/update-section must sanitize route response vocabulary`.
- GREEN focused tests exited 0: Task136, Task132 public read-model route sanitizer, Task135 public generated report sanitizer, Task128 paper export public authority sanitizer, Phase12 working paper, Phase11 literature, Task127 campaign export public authority sanitizer, and Phase21 read-model routes.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task136 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task136 is response-surface hardening only. It does not rewrite persisted paper/literature evidence, does not change claim promotion gates, and does not make citation, paper, or export material proof authority.

Residual risks: Goal 3 remains incomplete. Task136 closes the discovered public paper/literature route vocabulary leaks, but it does not provide OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, final-release-candidate Lean/mathlib breadth audit, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 135 / Public Generated Report Snapshot Sanitizer

Scope: comprehensive check-debug loop over the Task133-134 public/internal archive and release-metadata hardening line, with emphasis on generated Markdown/HTML/JSON reports copied into public snapshot downloads.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task item before Task135.
- Audited source-review/package assembly references, generated report paths, snapshot verify/restore semantics, public archive docs/runbooks, and public proof-authority vocabulary scans.
- Added `goal3-task135-public-generated-report-sanitizer.test.mjs`.
- RED showed `.comath/artifacts/papers/main.md` was copied raw into a default `public_download` snapshot when it contained `proven`, `formally_checked`, and `clean_replay_passed`.
- Hardened public snapshot copy sanitization so generated working-paper/report material under `.comath/artifacts/papers/**` is sanitized like release, evidence, audit, workstream, artifact-index, and UTF-8 artifact-blob material.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task135-public-generated-report-sanitizer.test.mjs` failed on `.comath/artifacts/papers/main.md` leaking privileged public vocabulary.
- GREEN focused tests exited 0: Task135, Task134 release public archive contract, Task133 public snapshot restore contract, Phase16 snapshot/replay, Task131 public download consumer sanitizer, and Task17 GA acceptance workflow.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task135 discovered by the default comathd test runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task135 preserves the Task133 split: default/public snapshots remain sanitized `public_download` artifacts with `can_restore=false`, while explicit `internal_restore` snapshots preserve byte-for-byte generated paper/report material and remain local restore sources only.

Residual risks: Goal 3 remains incomplete. Task135 closes the discovered generated paper/report public-snapshot leak, but it does not provide OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, final-release-candidate Lean/mathlib breadth audit, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 134 / Release Public Archive Contract Metadata

Scope: align release/source-review package wording and generated GA acceptance metadata after the Task133 public-vs-internal snapshot split.

Work performed:

- Added `goal3-task134-release-public-archive-contract.test.mjs`.
- Added `public_archive_contract` to `runGoal3GaAcceptanceWorkflow()` so generated release reports explicitly distinguish source-review public diagnostic archives, sanitized `public_download` snapshots with `can_restore=false`, explicit `internal_restore` byte-for-byte runtime-fidelity snapshots, and FinalAuthorityPackagingV3 / Lean Authority v3 source-report evidence.
- Hardened `scripts/phase0-smoke.mjs` so README, REVIEW, runbook, GA release criteria, and evidence-pack policy must preserve that distinction.

Boundary notes: source-review public diagnostic archives remain non-authoritative with `proof_authority: none`; public snapshot downloads are not restore sources; internal restore snapshots are not public release artifacts; none of these archive forms can substitute for Lean Authority v3 final packaging evidence.

Residual risks: final GA audit, external notarization, richer real Lean/mathlib replay coverage, and full real-host Pi/Codex lifecycle validation remain open.

# Goal 3 Task 112 / Artifact-Backed Statement-Equivalence Replay Evidence Gate

Scope: prevent marker-only or id-only non-exact statement-equivalence evidence from satisfying candidate arbitration, StatementDiffGate, or registered logical/transitive statement-equivalence acceptance.

Work performed:

- Used two read-only subagents to inspect remaining equivalence replay evidence risks across decision arbitration, StatementDiffGate, registered logical/transitive witnesses, and bounded materialization.
- Added `goal3-task112-statement-equivalence-artifact-gate.test.mjs`. RED showed `lean_equivalence_replay:CAND-*` marker-only evidence could still select a non-exact equivalent candidate.
- Added `hasVerifiedServiceOwnedLeanEquivalenceEvidence()` requiring equivalence-specific evidence refs to resolve to verified service-owned LeanRunManifest v3 or FinalReplayManifest v3 artifacts with matching campaign/claim/candidate identity.
- Hardened non-exact `statement_equivalence_claim: "equivalent"` arbitration, StatementDiffGate replay witnesses, registered logical equivalence, registered transitive equivalence, and bounded materialized equivalence witness propagation.
- Updated Task5, Phase56, Phase78, Phase79, and Phase80 fixtures so positive non-exact equivalence cases carry artifact-backed Lean replay manifest paths.

Verification evidence:

- Focused GREEN tests: Task112, Task5, Phase18 proof-kernel gates, Phase56, Phase62, Phase78, Phase79, Phase80, and Task111.
- Package gates passed: `corepack pnpm --dir services/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`.

Boundary notes: Task112 still does not make equivalence-search plans or materialized metadata proof authority. Non-exact statement equivalence can satisfy these local gates only when it points at verified service-owned Lean replay manifests; final promotion remains downstream Lean Authority and clean replay gated.

Residual risks: automatic equivalence proof search/execution, real live Lean/mathlib execution for broader candidates, OS-level isolation, production Pi/Codex lifecycle validation, and final GA audit remain open.

# Goal 3 Task 111 / Artifact-Backed Live Adapter Lean Evidence Gate

Scope: prevent marker-only live adapter evidence strings from substituting for service-owned LeanRunManifest v3 or FinalReplayManifest v3 artifacts when candidates are marked `candidate_kernel_checked` or when replay-project descriptors/material sources are produced.

Work performed:

- Used two read-only subagents to inspect marker-string evidence risks in the agent-stage runner, decision forest, and Task106/107 material producers.
- Added `goal3-task111-live-adapter-evidence-artifact-gate.test.mjs`. RED showed `service_owned_lean_replay:CAND-*` marker-only evidence could still satisfy replay-project descriptor emission.
- Added a shared service-owned Lean evidence resolver requiring project-contained LeanRunManifest v3 or FinalReplayManifest v3 artifacts with matching campaign/claim/candidate identity and passing service-owned Lean authority fields.
- Hardened agent-stage replay-project descriptor emission, decision-forest `candidate_kernel_checked` proof-grade evidence, candidate replay-material source production, and final replay material production to call the artifact-backed resolver.
- Updated Task14/106/107/108 and Phase18/62 fixtures to use real service-owned LeanRunManifest v3 artifact paths instead of bare replay markers.

Verification evidence:

- Focused GREEN tests: Task111, Task110, Task109, Task108 production/fail-closed, Task107 production/fail-closed, Task106 production/fail-closed, Task14, Phase18 proof-kernel gates, and Phase62 decision forest.
- Package/root gates passed: `corepack pnpm --dir services/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, `corepack pnpm --filter @comath/comathd test`, `corepack pnpm build`, and `corepack pnpm typecheck`.

Boundary notes: Task111 still does not make agent output proof authority. Adapter evidence can only satisfy these local gates when it points at verified service-owned Lean replay manifest artifacts; final proof authority still requires downstream Lean Authority packaging and clean replay gates.

Residual risks: full live Lean/mathlib execution, OS-level isolation, production Pi/Codex lifecycle validation, and GA audit remain open. The older non-exact statement-equivalence replay marker surface is intentionally left for a separate targeted audit.

# Goal 3 Task 110 / Line-Map-Owned Native Candidate Generation Request

Scope: move production of the native `candidate_generation_request.json` into the live campaign line-map gate, so Task109 native candidate generation no longer depends on hand-authored request artifacts.

Work performed:

- Used two read-only subagents to inspect the safest insertion point and request/manifest no-cheat risks.
- Added `goal3-task110-planning-native-generation-request.test.mjs`. RED showed `line_map_gate` did not produce the request; strengthened REDs exposed missing line-map hash binding and candidate-verification drift.
- Added a line-map-owned request writer that records the request in the completed `line_map_gate` stage run.
- Hardened request consumption with project/campaign/claim/obligation/statement identity, stage-run provenance, line-map and obligation hashes, V1-V8 variant requirements, and non-authority statement-boundary metadata.
- Hardened `candidate_verification` to parse candidate manifests and require candidate records plus manifests to bind the current obligation statement hash.
- Converted proof-grade-empty native arbitration to `blocked_with_replayable_reason` instead of unsupported `repair`.

Verification evidence:

- Focused GREEN tests: Task110, Task109, Task108 production/fail-closed, Task107 production/fail-closed, Task106 production/fail-closed, Task14, Phase20, Phase61, Phase62, Phase70, and Phase71.
- Package-level build/typecheck/test evidence is recorded in `goal-3/tasks.md` for this task.

Boundary notes: Task110 does not make agent output proof authority. Generated requests, candidates, manifests, and arbitration blockers remain `proof_authority: none` / non-promotional until downstream service-owned Lean Authority evidence and final replay pass.

Residual risks: live adapter evidence for replay-project descriptors still needs stronger artifact-backed LeanRunManifest/FinalReplayManifest validation; default live candidates remain plausible-only.

# Goal 3 Task 100 / Terminal Read-Model Authority-Evidence Gate

Scope: prevent campaign/Pi proof-success read models from treating legacy or imported `completed_formal_proof` campaign records as `formal_proof_verified`, `formal_replay_passed`, or export-ready proof evidence unless explicit current Lean Authority pass evidence is bound.

Work performed:

- Used high-concurrency read-only subagents to inspect service terminal projections, Pi goal-mode mapping, tests, and documentation targets.
- Added `goal3-task100-terminal-read-model-authority-gate.test.mjs`. RED showed legacy `completed_formal_proof` records projected to proof success before the authority gate.
- Added `formalReplayAuthorityEvidenceSchema` and persisted optional `formal_replay_authority_evidence` on campaigns; `formal_replay_authority_passed: true` now requires that evidence envelope.
- Hardened service terminal projections and goal-mode export readiness so proof-success aliases require both `completed_formal_proof` and a valid `comath.formal_replay_authority_evidence.v1` envelope.
- Hardened Pi `mapGoalTerminalState()` so stale `goal_mode_terminal_state: formal_replay_passed` or `external_v3_terminal_state: formal_proof_verified` cannot bypass the evidence envelope.

Verification evidence:

- TDD RED: Task100 service test initially failed because legacy `completed_formal_proof` projected to `formal_proof_verified`; Phase22 Pi test initially failed because stale external proof state mapped to `formal_replay_passed`.
- GREEN focused tests: Task100 service gate, Phase22 Pi loop, Phase69 v3 terminal vocabulary, Task16 service goal-mode routes, and Task16 Pi goal-mode.
- `corepack pnpm --filter @comath/comathd test`, `corepack pnpm build`, and `corepack pnpm typecheck` exited 0 after the evidence-envelope hardening.

Boundary notes: Task100 is read-model/export semantic hardening only. It does not install Lean, fetch mathlib, execute fresh live Lean/mathlib replay, promote any positive-matrix task, broaden theorem coverage, validate production Pi/Codex lifecycle behavior, provide OS-level sandboxing, or complete Goal 3 GA.

Residual risks: the real campaign final replay path still blocks before producing live `formal_replay_authority_evidence`; future live authority production must set that envelope only from promotion-grade Lean Authority v3 artifacts after clean replay.

# Goal 3 Task 99 / Lean-Lake Binary Provenance Gate Hardening

Scope: require promotion-grade FinalReplayManifest v3 evidence to bind Lean/Lake executable binary hashes to a passing final-replay LeanRunManifest. This closes the gap where a replay bundle could bind toolchain files and registry provenance while omitting the actual executed `lean` / `lake` binary provenance.

Work performed:

- Used high-concurrency read-only subagents to inspect binary provenance, terminal read-model semantics, and test compatibility.
- Added `goal3-task99-final-replay-binary-provenance-gate.test.mjs`. RED showed an otherwise valid v3 final-authority bundle with empty `binary_hashes` and no LeanRunManifest binary hashes could still promote a claim to `formally_checked`.
- Hardened `services/comathd/src/verification/gate.ts` so v3 final-authority packaging only satisfies promotion when `binary_hashes.lean` and `binary_hashes.lake` are SHA-256 values matching a passing final-replay LeanRunManifest v3.
- Added the explicit veto `formally_checked requires Lean/Lake binary hash provenance`.
- Updated promotion-grade positive fixtures in Task45/66/68/70 to carry dummy Lean/Lake executable files, LeanRunManifest binary hashes, and matching FinalReplayManifest `binary_hashes`.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task99-final-replay-binary-provenance-gate.test.mjs` failed because `promotion.gate.ok` was `true`.
- GREEN focused tests: Task99, Task45, Task66, Task68, and Task70.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task99 included.

Boundary notes: Task99 is promotion-gate evidence hardening only. It does not install Lean, fetch mathlib, execute fresh clean replay, promote any positive-matrix task, harden campaign/Pi terminal read-model wording, or complete Goal 3 GA.

Residual risks: concurrent read-only review confirmed the remaining high-value read-model risk: legacy or imported `completed_formal_proof` campaign records can still be projected to `formal_proof_verified` / `formal_replay_passed` unless the projection is bound to explicit current Lean Authority pass evidence.

# Goal 3 Task 98 / Legacy PM-002 Packaging Promotion-Gate Hardening

Scope: prevent legacy `comath.goal3_pm002_final_authority_packaging.v1` reports from authorizing `formally_checked` promotion. PM-002 v1 packaging remains historical compatibility material; promotion-grade proof authority now requires generic `comath.final_authority_packaging.v3`.

Work performed:

- Used high-concurrency read-only subagents to inspect final-authority/no-cheat risks, Pi goal-mode terminal read-model risks, and real Lean replay readiness gaps.
- Added `goal3-task98-legacy-pm002-packaging-v1-gate.test.mjs`. RED showed a PM-002 v1 packaging report plus FinalReplayManifest v3 could still promote a claim to `formally_checked`.
- Hardened `services/comathd/src/verification/gate.ts` so `hasVerifiedFinalAuthorityPackagingV3()` accepts only `comath.final_authority_packaging.v3` with the requested claim id.
- Updated the older Task44 PM-002 regression to assert v1 packaging cannot satisfy promotion-grade authority, while Task45 continues to cover the generic v3 positive path.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task98-legacy-pm002-packaging-v1-gate.test.mjs` failed because `promotion.gate.ok` was `true`.
- GREEN focused tests: Task98, Task44, Task45, and Task97.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `node services/comathd/scripts/run-default-tests.mjs` exited 0.

Boundary notes: Task98 is final-authority/no-cheat gate hardening only. It does not install Lean, fetch mathlib, execute fresh clean replay, promote any positive-matrix task, broaden theorem coverage, harden Pi terminal read-model wording, or complete Goal 3 GA.

Residual risks: concurrent read-only review flagged two high-value next targets: FinalReplayManifest v3 does not yet require Lean/Lake executable binary hash provenance, and campaign/Pi terminal read-model projection can still overstate legacy `completed_formal_proof` records as proof success unless bound to an explicit current authority pass.

# Goal 3 Task 97 / Legacy Final Replay Promotion-Gate Hardening

Scope: prevent old `finalLeanReplaySchema` artifacts from authorizing `formally_checked` promotion. Legacy final replay material remains historical/diagnostic schema compatibility only; promotion authority is now Lean Authority v3 final replay packaging with registry provenance, derived binding, report checks, and replay-pack binding.

Work performed:

- Added `goal3-task97-legacy-final-replay-promotion-gate.test.mjs`. RED showed a fresh hash-bound legacy final replay manifest could still promote a claim through the old OR branch.
- Hardened `services/comathd/src/verification/gate.ts` so `formally_checked` passed-replay and promotion-grade authority checks require `hasVerifiedFinalAuthorityPackagingV3()`.
- Added explicit veto text: `formally_checked requires Lean Authority v3 final replay packaging`.
- Removed the dead legacy `hasPassedProofKernelReplay()`, `hasHashBoundFreshProofKernelReplay()`, and `finalReplayArtifactsAreFresh()` helper path from the promotion gate.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task97-legacy-final-replay-promotion-gate.test.mjs` failed because `promotion.gate.ok` was `true`.
- GREEN focused tests: Task97, Phase64 Lean authority v2 negative fixtures, Phase18 proof-kernel gates, Phase18 campaign vertical slice, Task45/62/64/66 final-authority v3 regressions.
- `corepack pnpm --filter @comath/comathd build`, `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test` exited 0.
- Static scan confirmed `gate.ts` no longer references `finalLeanReplaySchema` or the legacy proof-kernel replay helper names. `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task97 is final-authority/no-cheat gate hardening only. It does not install Lean, fetch mathlib, execute fresh clean replay, promote any positive-matrix task, broaden theorem coverage, or complete Goal 3 GA.

Residual risks: final-release-candidate Lean/mathlib breadth audit, production Pi/Codex lifecycle validation, OS-level sandboxing, and final GA audit remain open. Local `lean` and `lake` still resolve to elan shims but fail because no default Lean toolchain is configured.

# Goal 3 Task 96 / Positive-Matrix Batch Consumer Semantics Hardening

Scope: prevent batch positive-matrix consumers from presenting PM-001 representative fixture or aggregate harness evidence as per-task `lean_kernel_clean_replay`, without claiming live Lean replay or GA completion.

Work performed:

- Added `goal3-task96-positive-batch-consumer-semantics.test.mjs`, proving the separate representative proof workflow remains available while `runGoal3GaPositiveMatrixBatch()` keeps PM-001 and all other batch tasks non-authoritative unless each task has its own clean Lean/mathlib replay evidence.
- Hardened `runGoal3GaPositiveMatrixBatch()` so it no longer calls the representative proof workflow or copies its replay IDs into PM-001 batch output.
- Updated the older Task21 matrix-runner regression to require `proof_authority: "none"`, empty evidence binding, and `replayable_blocker` classification for PM-001 batch output.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task96-positive-batch-consumer-semantics.test.mjs` failed with `batch matrix consumers cannot inherit the representative fixture clean replay` because `summary.clean_replay_passed` was `1`.
- GREEN focused tests: Task96, Task21, Task94 positive-matrix consumer semantics, Task17 GA acceptance workflow, Task95 real replay toolchain mismatch blocker, Task86 real Lean replay slice gate, Task90 final authority provenance gate, Task91 final replay artifact kind gate, and Task94 final-authority FormalSpec schema gate.
- `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, full `corepack pnpm --filter @comath/comathd test`, root `corepack pnpm build`, root `corepack pnpm typecheck`, and root `corepack pnpm test` exited 0.
- Static scans found no direct privileged claim-status writes outside read-only paper checks, no `can_promote_claim: true`, no `direct_claim_mutation: true`, no non-Lean `proof_authority` assignment, and no restored theorem-family/Nat-linear/default-assumption production path. `Test-Path -LiteralPath .comath` returned `False`, and no `.comath`, `.tmp`, `dist`, `node_modules`, or package `dist` paths are tracked by Git.

Boundary notes: Task96 is consumer-semantics hardening only. It does not install Lean, fetch mathlib, execute fresh clean replay, promote any positive-matrix task, broaden theorem coverage, or complete Goal 3 GA.

Residual risks: a read-only subagent flagged the legacy `hasHashBoundFreshProofKernelReplay()` promotion-gate OR branch as a higher-risk remaining final replay binding audit target. Final-release-candidate Lean/mathlib breadth audit, production Pi/Codex lifecycle validation, OS-level sandboxing, and final GA audit remain open.

# Goal 3 Task 95 / Real Replay Toolchain Mismatch Blocker Contract

Scope: make the real positive-matrix Lean replay path fail closed when the declared `lean-toolchain` does not match the probed Lean version, without throwing out of the workflow or producing authority-shaped replay evidence.

Work performed:

- Added `goal3-task95-real-replay-toolchain-mismatch-blocker.test.mjs`. RED showed `runServiceOwnedLeanCommandV3()` threw `lean_toolchain_mismatch` through the existing replay executor instead of returning a structured blocker.
- Added a dedicated blocker code, `lean_toolchain_mismatch_for_live_replay`, for real replay setup mismatches.
- Hardened the generic existing replay executor, PM-002 legacy executor, and final replay completion boundary so Lean/Lake/toolchain metadata failures are converted into non-authoritative replayable blockers before any replay command runs.
- Preserved archive and environment diagnostic semantics: mismatch archives remain `proof_authority: none`, `can_promote_claim: false`, and diagnostic-only.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task95-real-replay-toolchain-mismatch-blocker.test.mjs` initially failed with thrown `Error: lean_toolchain_mismatch`.
- GREEN focused tests: Task95, Task86, Task89, Task90, Task91, Task94 schema gate, Task94 positive-matrix consumer semantics, and Task17 acceptance workflow.
- `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, full `corepack pnpm --filter @comath/comathd test`, root `corepack pnpm build`, root `corepack pnpm typecheck`, and root `corepack pnpm test` exited 0.
- Static scans found no direct claim-status mutation writes outside read-only paper checks, no `can_promote_claim: true`, no `direct_claim_mutation: true`, and no restored theorem-family/Nat-linear/default-assumption production path.
- `lean` and `lake` still resolve to elan shims, but both fail with no default toolchain configured; Task95 records mismatch/unavailable states as blockers rather than proof authority.

Boundary notes: Task95 does not install Lean, fetch mathlib, execute a fresh real clean replay, or broaden theorem coverage. It only hardens the live replay environment boundary.

Residual risks: a read-only subagent flagged that PM-001 batch consumer semantics can still look like per-task `lean_kernel_clean_replay`, and another flagged the older final replay gate path as a future binding audit target. Those are left for Task96+.

# Goal 3 Task 94 / Final-Authority Binding Schema And Matrix Consumer Semantics

Scope: close the Task91-93 check-debug gap where final-authority derived binding material could omit explicit claim-bound FormalSpecLock / AssumptionLedger fields while still verifying, and prevent the GA acceptance positive matrix from inheriting proof authority from a separate representative fixture.

Work performed:

- Added `goal3-task94-final-authority-formal-spec-schema-gate.test.mjs`. RED showed malformed FormalSpecLock / AssumptionLedger material still returned `verified_final_authority_evidence`; GREEN now requires explicit `schema_version`, `task_id`, `claim_id`, `statement_hash` / `formal_spec_lock_hash`, theorem identity, and `proof_authority: "none"` in both packaging and ordinary promotion-gate derived binding checks.
- Added `goal3-task94-positive-matrix-consumer-semantics.test.mjs`. RED showed `runGoal3GaAcceptanceWorkflow()` rewrote the first positive-matrix seed into `representative_verified_fixture` with `lean_kernel_clean_replay`; GREEN now leaves the broad matrix-style positive campaign as replayable blockers and keeps the representative proof workflow separate.
- Reworked default `@comath/comathd` test execution through `scripts/run-default-tests.mjs` after Windows rejected the previous long package test command line.
- Updated final-authority positive fixtures to carry explicit claim-bound FormalSpecLock / AssumptionLedger binding fields.
- Added a Goal 3 supersession note to `docs/progress/product-readiness-matrix.md`; also corrected the external agent prompt source so only Lean4/mathlib clean replay is proof authority, with computation/literature/search/votes remaining evidence or hints only.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task94-final-authority-formal-spec-schema-gate.test.mjs` initially failed because malformed bindings verified.
- TDD RED: `node services/comathd/tests/unit/goal3-task94-positive-matrix-consumer-semantics.test.mjs` initially failed because the positive matrix rewrote `PM-001` as proof-authority fixture evidence.
- GREEN focused tests: Task94 schema gate, Task94 consumer semantics, Task17 acceptance workflow, Task62/64/70/90/91 final-authority regressions.
- `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and full `corepack pnpm --filter @comath/comathd test` exited 0.
- Static scans over `services/comathd/src` and `extensions/comath-pi/src` found no direct claim-status mutation writes, no `can_promote_claim: true`, no `direct_claim_mutation: true`, no non-Lean proof-authority assignment, and no restored `Lean Nat notation` / `Lean Nat syntax` production wording. Remaining `n : Nat` hits are documented historical/negative fixtures.
- `where.exe lean` and `where.exe lake` resolve to elan shims, but `lean --version` and `lake --version` still fail with no default toolchain configured; Task94 did not install or configure Lean.

Boundary notes: Task94 is still not live Lean/mathlib proof execution. It hardens evidence binding and consumer semantics while preserving fail-closed behavior on this workstation's missing Lean toolchain. Broader live replay, real Pi/Codex lifecycle validation, OS-level sandboxing, and complete GA release validation remain open.

# Goal 3 Task 92 / Dashboard Audit Evidence Semantics

Scope: fix Pi dashboard read-model wording so `audit` evidence from real replay attempt archives is not rendered as generic `runner` evidence.

Changes:

- Added `goal3-task92-dashboard-audit-evidence-semantics.test.mjs`.
- Extended `EvidenceBoardItem.source` with `audit`.
- Updated Pi dashboard evidence normalization so `kind: "audit"` renders as `audit`, while Lean/symbolic/computation/counterexample evidence still renders as `runner`.
- Wired the Task92 regression into the default `@comath/pi-extension` test chain.

TDD evidence:

```text
node tests/goal3-task92-dashboard-audit-evidence-semantics.test.mjs
Initial RED result: exit 1; `kind: "audit"` rendered as `runner`.
```

Verification:

- `corepack pnpm --filter @comath/pi-extension build`
- `node tests/goal3-task92-dashboard-audit-evidence-semantics.test.mjs`
- `corepack pnpm --filter @comath/pi-extension typecheck`
- `node tests/phase15-dashboard.test.mjs`
- `node tests/goal3-task16-pi-goal-mode.test.mjs`
- `corepack pnpm --filter @comath/pi-extension test`
- `node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs`
- `node services/comathd/tests/unit/goal3-task89-real-replay-environment-diagnostic.test.mjs`
- `node services/comathd/tests/unit/goal3-task91-final-replay-artifact-kind-gate.test.mjs`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task92 is a Pi read-model/UI semantics fix only. It does not alter service-side promotion gates, artifact kinds, audit evidence records, final replay manifests, replay registry provenance, Lean environment probing, theorem recognition, Nat-linear synthesis, default assumptions, or proof authority. Archive and diagnostic evidence remain non-authoritative unless an ordinary `comathd` final Lean Authority promotion gate passes.

Residual risks: this workstation still has elan shims without an active/default Lean toolchain, so real Lean/mathlib clean replay remains blocked. A read-only no-reinvent scan also flagged a `notation_gate` wording risk in `campaign-tick.ts` that mentions Lean Nat notation; it did not inject `n : Nat` in this task, but should be reviewed as a later formal-spec-derived notation cleanup.

# Goal 3 Task 91 / Final Replay Artifact Provenance Gate

Scope: harden the ordinary promotion gate so FinalReplayManifest v3 evidence must have both runner-output artifact provenance and service-owned append-only registry audit provenance.

Changes:

- Added `goal3-task91-final-replay-artifact-kind-gate.test.mjs`.
- Extended `appendFinalReplayRegistryEntryV3()` with optional audit provenance emission via `lean.final_replay_registry_appended`.
- Hardened `hasFinalReplayRegistryProvenance()` so JSONL equality alone is insufficient; the gate now also requires the matching audit event with replay id, manifest hash, runner, proof authority, and service-owned provenance flag.
- Hardened `hasVerifiedFinalAuthorityPackagingV3()` so the submitted FinalReplayManifest v3 artifact itself must be `runner_output`.
- Added explicit veto `formally_checked requires final replay manifest runner_output artifact provenance`.
- Updated positive final-authority fixtures to append registry entries with audit provenance.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task91-final-replay-artifact-kind-gate.test.mjs
Initial RED result: exit 1; registry JSONL equality alone promoted helper-created final-authority evidence.

Earlier RED variant: exit 1; FinalReplayManifest v3 submitted as artifact kind "other" still promoted.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/goal3-task91-final-replay-artifact-kind-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task44-pm002-packaging-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task45-generic-final-authority-packaging-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task66-derived-binding-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task68-derived-report-binding-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task70-derived-binding-promotion-bundle.test.mjs`
- `node services/comathd/tests/unit/goal3-task8-lean-authority-v3-final-replay.test.mjs`
- `node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs`
- `node services/comathd/tests/unit/goal3-task89-real-replay-environment-diagnostic.test.mjs`
- `node services/comathd/tests/unit/goal3-task90-final-authority-provenance-gate.test.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task91 does not install Lean, configure elan, download mathlib, add theorem recognition, add Nat-linear synthesis, add default assumptions, or turn archive/diagnostic/UI evidence into proof authority. On this workstation `lean` and `lake` still resolve to elan shims but fail with no default toolchain configured.

Residual risks: the Pi dashboard currently renders `audit` evidence with a generic runner label in read-only UI text; this is a consumer-semantics issue rather than a promotion-gate bypass and should be handled in a later task. Real PM-084 Lean/mathlib execution still requires a prepared Lean toolchain and declared replay material.

## Goal 3 Task 90 / Final Authority Provenance Check-Debug Loop

Scope: comprehensive check-debug loop over Tasks 87-89, closing helper-created final-authority artifact promotion and clarifying real replay archive non-authority semantics.

Changes:

- Added `goal3-task90-final-authority-provenance-gate.test.mjs`.
- Hardened final-authority promotion gating so FinalReplayManifest v3 packaging must be submitted as `runner_output` and must match an exact append-only `final_replay_registry.jsonl` entry before it can satisfy Lean authority evidence.
- Added the explicit veto `formally_checked requires service-owned clean replay provenance`.
- Updated positive final-authority fixtures to append registry entries before promotion.
- Made final-authority promotion bundles report `proof_authority: none` and `promoted_by_ordinary_gate: false` when the ordinary gate rejects.
- Added archive-only semantics and a dedicated `goal3.real_replay_attempt_archived` audit event for Task88/89 replay attempt archives.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task90-final-authority-provenance-gate.test.mjs
Initial RED result: exit 1; helper-created authority-shaped artifacts promoted without replay registry provenance.
```

Verification:

- `node services/comathd/tests/unit/goal3-task90-final-authority-provenance-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs`
- `node services/comathd/tests/unit/goal3-task89-real-replay-environment-diagnostic.test.mjs`
- `node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task44-pm002-packaging-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task45-generic-final-authority-packaging-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task66-derived-binding-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task68-derived-report-binding-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task70-derived-binding-promotion-bundle.test.mjs`
- `corepack pnpm --filter @comath/comathd build`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task90 does not install Lean, configure elan, download mathlib, add theorem recognition, add Nat-linear synthesis, add default assumptions, or turn archives/diagnostics into proof authority. On this workstation `lean` and `lake` still resolve to elan shims but fail with no default toolchain configured.

Residual risks: real PM-084 Lean/mathlib execution still requires a prepared Lean toolchain and declared replay material. Broader positive-matrix live replay, production Pi/Codex lifecycle validation, OS-level sandboxing, and comprehensive GA release validation remain open.

## Goal 3 Task 89 / Real Replay Environment Diagnostic Archive

Scope: bind real Lean/Lake replay-readiness diagnostics into the Task88 archive path without making environment probes or archives proof authority.

Changes:

- Added `Goal3GaRealReplayEnvironmentDiagnostic` and embedded `environment_diagnostic` in `Goal3GaPositiveMatrixRealReplayAttemptArchive`.
- The diagnostic records `lean --version` and `lake --version` probe results, probe source, `can_run_clean_replay`, blocker details, and explicit non-authority fields.
- Hardened `executeGoal3GaPositiveMatrixLeanAuthorityReplay()` so final-authority completion with injected version probes and no real service-owned replay command fails closed before authority evidence is produced.
- Added `goal3-task89-real-replay-environment-diagnostic.test.mjs` and wired it into the default `@comath/comathd` test chain.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task89-real-replay-environment-diagnostic.test.mjs
Initial RED result: exit 1; archived.environment_diagnostic was undefined.
```

Verification:

- `node services/comathd/tests/unit/goal3-task89-real-replay-environment-diagnostic.test.mjs`
- `node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs`
- `node services/comathd/tests/unit/goal3-task40-pm002-lean-authority-executor.test.mjs`
- `node services/comathd/tests/unit/goal3-task58-pm079-pm089-generic-lean-executor.test.mjs`
- `corepack pnpm --filter @comath/comathd build`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task89 does not install Lean, configure elan, download mathlib, restore injected final replay authority, or add theorem recognition/Nat-linear/default-assumption paths. On this workstation `lean` and `lake` resolve to elan shims, but both version commands fail because no default toolchain is configured; Task89 records that as `lean_toolchain_unavailable_for_live_replay` with `proof_authority: none`.

Residual risks: real PM-084 Lean/mathlib execution still requires a prepared Lean toolchain and declared replay material in runtime state. Broader positive-matrix live replay, production Pi/Codex lifecycle validation, and comprehensive GA release validation remain open.

## Goal 3 Task 88 / Real Replay Attempt Archive Evidence Layer

Scope: add a service-owned archive/evidence layer for Task86 real Lean replay attempts without turning replay blockers into proof authority.

Changes:

- Added `archiveGoal3GaPositiveMatrixRealReplayAttemptEvidence()`.
- The archive helper calls the Task86 real replay slice, writes `.comath/release/positive_matrix/<TASK>/real_lean_replay_attempt_archive_v1.json`, imports archive/blocker/packaging files as `other` artifacts, and appends `audit` evidence.
- The archive helper rejects replay material whose FormalSpecLock or AssumptionLedger is bound to a different claim.
- Archive records stay non-authoritative: `proof_authority: none`, `can_promote_claim: false`, `archive_is_proof_authority: false`, `no_injected_final_replay_authority: true`, `direct_claim_mutation: false`.
- Added `goal3-task88-real-replay-attempt-archive.test.mjs` and wired it into the default `@comath/comathd` test chain.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs
Initial RED result: exit 1; ../../dist/index.js did not export archiveGoal3GaPositiveMatrixRealReplayAttemptEvidence.
```

Verification:

- `node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs`
- `node services/comathd/tests/unit/goal3-task85-pm084-live-final-authority-completion.test.mjs`
- `node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task45-generic-final-authority-packaging-gate.test.mjs`
- `corepack pnpm --filter @comath/comathd build`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task88 does not enable real replay by default, does not download or install Lean/mathlib, does not restore injected final replay authority, and does not add theorem recognition, Nat-linear synthesis, default assumptions, or a new proof authority. On this workstation, `lean`/`lake` resolve to elan shims but no active toolchain is configured, so real PM-084 replay remains a replayable environment blocker.

Residual risks: real PM-084 Lean/mathlib execution still requires a prepared Lean toolchain and declared replay material in runtime state. Broader positive-matrix live replay, production Pi/Codex lifecycle validation, and comprehensive GA release validation remain open.

## Goal 3 Task 87 / Injected Final Replay Authority Gate

Scope: close the no-cheat gap where the exported generic positive-matrix Lean Authority executor could use an injected `runReplayCommand` callback to fabricate final replay success.

Changes:

- Added `goal3-task87-injected-final-replay-authority-gate.test.mjs`.
- Hardened `executeGoal3GaPositiveMatrixLeanAuthorityReplay()` so `completeFinalAuthorityEvidence: true` with an injected replay callback returns a replayable blocker before final replay generation.
- Preserved non-authoritative injected check/build callback coverage for executor blocker tests, but final Lean Authority evidence now requires real service-owned `lean/lake` process execution.
- Updated Task85 and Task86 regressions so mocked replay callbacks are no longer treated as verified final-authority evidence.
- Wired Task87 into the default `@comath/comathd` test chain.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs
Initial RED result: exit 1; the injected runner was called three times, including the final replay command.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/goal3-task85-pm084-live-final-authority-completion.test.mjs`
- `node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task42-pm002-final-authority-packaging.test.mjs`
- `node services/comathd/tests/unit/goal3-task44-pm002-packaging-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task45-generic-final-authority-packaging-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task58-pm079-pm089-generic-lean-executor.test.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task87 does not introduce theorem recognition, Nat-linear synthesis, default assumptions, a new proof authority, or claim promotion. It makes the final replay path stricter: injected callbacks can no longer produce `verified_final_authority_evidence`.

Residual risks: real PM-084 Lean/mathlib execution remains environment-gated and was not run by default CI. A durable archive/evidence layer for real replay attempts remains the next useful frontier.

## Goal 3 Task 86 / Environment-Gated Real Lean Replay Slice

Scope: make the PM-084 real Lean/mathlib replay path explicit and fail-closed by default, and harden final-authority packaging against same-path LeanRunManifest semantic drift.

Changes:

- Added `executeGoal3GaPositiveMatrixRealLeanReplaySlice()` and `goal3RealLeanReplaySliceEnabled()`.
- The real slice validates declared PM material but returns a replayable blocker unless explicitly enabled by `COMATH_ENABLE_GOAL3_REAL_LEAN_REPLAY=1` or a service-owned enable flag.
- The real slice does not accept injected `runReplayCommand` stubs; enabled execution uses the existing service-owned Lean/Lake runner path.
- Hardened PM-002 and generic final-authority source verification so a submitted LeanRunManifest set must contain a final replay run with matching claim, campaign, clean cwd, command, disabled network policy, zero exit code, and `proof_authority: lean_kernel_check`.
- Updated older Task42/44/45 positive fixtures to include explicit final replay LeanRunManifest evidence rather than relying on check/build manifests.
- Added `goal3-task86-real-lean-replay-slice-gate.test.mjs` and wired it into the default `@comath/comathd` test chain.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs
Initial RED result: exit 1; ../../dist/index.js did not export executeGoal3GaPositiveMatrixRealLeanReplaySlice.

node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs
Second RED result: exit 1; a same-path final LeanRunManifest mutated to purpose=build/proof_authority=none/command=echo still returned verified_final_authority_evidence.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task42-pm002-final-authority-packaging.test.mjs`
- `node services/comathd/tests/unit/goal3-task44-pm002-packaging-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task85-pm084-live-final-authority-completion.test.mjs`
- `node services/comathd/tests/unit/goal3-task84-structured-audit-run-binding.test.mjs`
- `node services/comathd/tests/unit/goal3-task45-generic-final-authority-packaging-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task8-lean-authority-v3-final-replay.test.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task 86 does not add theorem recognition, Nat-linear synthesis, default assumptions, or a new proof authority. Without explicit real-replay enablement it records only a blocker. Verified packaging still cannot directly promote a claim.

Residual risks: Task 86 does not make default CI a real Lean/mathlib proof authority run. The real replay path is explicit and environment-gated; broader PM matrix live replay coverage and final GA validation remain open.

## Goal 2 Task 33 / Phase 81 Controlled Nat Linear Identity Synthesis

Scope: move broad theorem synthesis one product step beyond the Phase 76 registered Nat target table by adding a controlled one-variable Nat linear identity synthesizer.

Changes:

- Added a safe Nat linear-expression parser for `n`, natural-number constants, `+`, and constant multiplication with `n`.
- `theoremSpecificLeanTarget()` can now synthesize targets outside the registered table only when both sides normalize to identical coefficient/constant forms.
- The synthesized path reuses the existing theorem-specific Lean package, bounded `by omega` proof-body artifact, Lean Authority v2 report-preparation artifacts, final clean replay manifest, and promotion gate.
- Target and proof-body artifacts now record `synthesis_scope: controlled_nat_linear_identity_synthesis` and `linear_normal_form` for synthesized targets.
- False identities, negative/refutation prompts, unsafe syntax, unsupported multi-variable syntax, and nonlinear terms such as `n * n` remain fail-closed without theorem-specific packages or final replay authority.
- Wired Phase 81 into the default `@comath/comathd` test chain, service status capability, README, TODO, acceptance matrix, and readiness matrix without claiming arbitrary theorem proving.

TDD evidence:

```text
node services/comathd/tests/integration/phase81-controlled-nat-linear-synthesis.test.mjs
Initial RED result: exit 1; `2 * n + 3 = n + n + 3` stopped at blocked broad synthesis instead of reaching `completed_formal_proof`.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/integration/phase81-controlled-nat-linear-synthesis.test.mjs`
- `node services/comathd/tests/integration/phase76-registered-nat-linear-targets.test.mjs`
- `node services/comathd/tests/integration/phase75-bounded-final-clean-replay.test.mjs`
- `node services/comathd/tests/integration/phase73-bounded-lean-proof-body-synthesis.test.mjs`
- `node services/comathd/tests/integration/phase72-theorem-specific-lean-generation.test.mjs`
- `node services/comathd/tests/phase0-smoke.test.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`

Boundary notes: Phase 81 is controlled one-variable Nat linear synthesis only. It does not implement arbitrary theorem proving, nonlinear arithmetic synthesis, multi-variable theorem synthesis, broad MathProve proof authority, or automatic statement-equivalence proof search.

Residual risks: global GA still needs product-code work on broader theorem planning/synthesis beyond this safe linear grammar, broad MathProve proof search/proof-authority semantics, production Pi/Codex lifecycle validation, OS-level runner/process sandboxing, indefinite operator sessions, and statement-equivalence proof execution beyond registered bounded materializations.

## Goal 2 Task 32 / Comprehensive Check-Debug Loop 10

Scope: comprehensive check-debug loop over Phase 79 statement-equivalence proof-search plan artifacts and Phase 80 bounded equivalence-search witness materialization.

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase79-lean-equivalence-search-plan.test.mjs`
- `node services/comathd/tests/unit/phase80-bounded-equivalence-witness-materialization.test.mjs`
- `node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs`
- `node services/comathd/tests/phase0-smoke.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`

Audit result:

- Phase 79 remains a non-authoritative `blocked_unproved` obligation artifact path. It writes only bounded search-plan metadata for unresolved unique target-signature mismatches with safe lemma hints.
- Phase 80 remains bounded witness-metadata materialization. It validates exact source/target binding, safe registered hints, non-empty witness artifact id, required next artifacts, and bounded allowlisted materializations before returning a registered witness candidate.
- Authority scans over the Phase 79/80 source and tests found no `claim.status =`, `formally_checked`, `applyGatePromotedClaim`, or `promoteClaim` usage in the Phase 79/80 surfaces. The only promotional tamper case is the negative test that must fail closed.
- Runtime/generated cleanliness checks found no repo-root `.comath` and no tracked `.comath`, `.tmp`, `dist`, `node_modules`, `services/comathd/dist`, or `extensions/comath-pi/dist` artifacts.
- Current-facing documentation continues to state that Phase 79/80 do not provide automatic proof discovery, arbitrary semantic-equivalence discovery, claim promotion, or a replacement for final Lean Authority v2.

Residual risks: no high-risk Phase 79/80 regression was found. Global GA still needs product-code work on automatic proof search/execution beyond registered bounded materializations, broader mathematical-domain trust profiles, arbitrary theorem synthesis, broad MathProve proof authority semantics, production Pi/Codex lifecycle validation, OS-level runner/process sandboxing, and indefinite operator/cross-process recovery.

## Goal 2 Task 31 / Phase 80 Bounded Equivalence-Search Witness Materialization

Scope: materialize a bounded Phase 79 blocked statement-equivalence plan into registered logical-equivalence witness metadata without proof authority or claim promotion.

Changes:

- Added `materializeStatementEquivalenceSearchPlan()` and `StatementEquivalenceWitnessMaterialization`.
- The materializer reads a non-authoritative `blocked_unproved` plan, validates exact formal-spec/target binding, safe registered lemma hints, non-empty witness artifact id, and a bounded allowlisted materialization.
- It writes `.comath/evidence/<CLAIM>/lean/equivalence_witness_materialized.json` with `proof_authority: none`, `can_promote_claim: false`, SHA-256 materialization binding, lemma names, justification, and required final Lean Authority v2 gates.
- The returned witness can be supplied to `checkStatementEquivalence()` through the existing `allowed_registered_logical_equivalences` path.
- Wired Phase 80 into the default `@comath/comathd` test chain, smoke/status markers, and current-facing docs.

TDD evidence:

```text
node services/comathd/tests/unit/phase80-bounded-equivalence-witness-materialization.test.mjs
Initial RED result: exit 1; materializeStatementEquivalenceSearchPlan was not exported from ../../dist/index.js.

Reviewer-strengthened RED result: exit 1; missing witnessArtifactId was accepted instead of fail-closed.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase80-bounded-equivalence-witness-materialization.test.mjs`

Boundary notes: Phase 80 is bounded witness-metadata materialization only. It does not discover equivalence lemmas, prove arbitrary semantic equivalence, certify proof terms, promote claims, or replace final clean Lean replay/static audit/dependency closure/axiom profile.

Residual risks: automatic proof search/execution beyond registered bounded materializations, broader mathematical-domain trust profiles, arbitrary theorem synthesis, broad MathProve proof authority, production Pi/Codex lifecycle validation, OS-level sandboxing, and indefinite operator/cross-process recovery remain open global-GA blockers.

## Goal 2 Task 30 / Phase 79 Statement-Equivalence Proof-Search Plan Artifacts

Scope: add a bounded, service-owned, non-authoritative plan artifact for unresolved statement-equivalence mismatches without claiming automatic proof discovery.

Changes:

- Added `StatementEquivalenceSearchPlan` plus optional `equivalence_search_plan_path` and `equivalence_search_hints` inputs to `checkStatementEquivalence()`.
- When the extracted target signature is unique but mismatched, and no exact, alias, direct registered, or transitive registered witness accepts it, safe lemma-name hints can write `equivalence_search_plan.json`.
- The plan records `result: blocked_unproved`, `proof_authority: none`, `can_promote_claim: false`, exact formal-spec/target binding, candidate lemma names, and required next artifacts for a future kernel-checked equivalence witness.
- Exact matches, direct registered witnesses, transitive registered witnesses, missing target output, empty hints, and unsafe hint strings do not write unresolved plans.
- Wired Phase 79 into the default `@comath/comathd` test chain, smoke/status markers, and current-facing docs.

TDD evidence:

```text
node services/comathd/tests/unit/phase79-lean-equivalence-search-plan.test.mjs
Initial RED result: exit 1; statement-equivalence reports lacked equivalence_search_plan_path for unresolved mismatches.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase79-lean-equivalence-search-plan.test.mjs`
- `node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs`
- `node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs`

Boundary notes: Phase 79 is obligation planning evidence only. It does not prove equivalence lemmas, discover arbitrary semantic equivalence, certify proof terms, promote claims, or replace final clean Lean replay/static audit/dependency closure/axiom profile.

Residual risks: executing proof-search plans into kernel-checked equivalence witnesses, broader mathematical-domain trust profiles, arbitrary theorem synthesis, broad MathProve proof authority, production Pi/Codex lifecycle validation, OS-level sandboxing, and indefinite operator/cross-process recovery remain open global-GA blockers.

## Goal 2 Task 29 / Comprehensive Check-Debug Loop 9

Scope: comprehensive check-debug loop over Phase 77 runner network sandbox policy and Phase 78 registered transitive statement-equivalence witnesses.

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase77-runner-network-sandbox-policy.test.mjs`
- `node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs`
- `node services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs`
- `node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs`
- `node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

All commands exited 0. The root test included the Pi package tests, the default `@comath/comathd` chain with Phase 77/78, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation.

Static audit:

- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path D:\MATH _Studio\comath-pi-lab\.comath` returned `False`.
- `git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'` returned no tracked runtime/build artifacts.
- Current-facing stale/overclaim scan found no unqualified `Phase 18-77`, `Phase 18-76`, old `lean_logical_equivalence_deferred`, arbitrary-transitive-equivalence claims, or OS-enforced network-sandbox claims. README hits for `COMATH_RUNNER_NETWORK=disabled` and OS-enforced sandboxing are explicit boundary statements.

Repair:

- Clarified the Phase 56 historical note in `docs/progress/design-handoff.md` so it no longer reads as if transitive registered witness chains remain wholly deferred after Phase 78. The updated wording preserves the remaining global-GA blockers: automatic equivalence proof search and broader mathematical-domain trust profiles.
- A sidecar subagent verification attempt failed because the agent thread limit was reached, so this loop was completed locally with focused, package, root, e2e, integrity, and static checks.

Residual risks: no high-risk regression was found in Phase 77 or Phase 78. Global GA still needs product-code work on automatic theorem/equivalence proof search, arbitrary theorem synthesis, broad MathProve proof authority semantics, production Pi/Codex lifecycle validation, OS-level runner/process sandboxing, and indefinite operator/cross-process recovery.

## Goal 2 Task 28 / Phase 78 Registered Transitive Statement-Equivalence Witnesses

Scope: add a conservative registered transitive logical-equivalence statement-binding path without claiming arbitrary equivalence proof search.

Changes:

- Added `StatementRegisteredTransitiveLogicalEquivalence` and `allowed_registered_transitive_logical_equivalences` to `checkStatementEquivalence()`.
- Added `registered_transitive_logical_equivalence` witness reports for accepted chains.
- Required the chain endpoint to bind the locked formal spec to the extracted target signature exactly.
- Required every intermediate link to close exactly from the previous signature to the next signature.
- Required every link to carry `lean_kernel_checked_equivalence`, a non-empty witness artifact id, a valid SHA-256 witness artifact hash, and non-empty lemma names.
- Added `phase78-lean-transitive-equivalence.test.mjs`, wired it into the default `@comath/comathd` test chain, smoke/status markers, and current-facing docs.

TDD evidence:

```text
node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs
Initial RED result: exit 1; valid registered transitive witness chains returned fail instead of pass.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs`
- `node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`

Boundary notes: Phase 78 is registered statement-binding metadata only. It does not discover equivalence lemmas, prove arbitrary semantic equivalence, certify proof terms, promote claims, or replace final clean Lean replay, static audit, dependency closure, axiom profile, and the ordinary claim promotion path.

Residual risks: automatic equivalence proof search, broader mathematical-domain trust profiles, arbitrary theorem synthesis, broad MathProve proof authority, production Pi/Codex lifecycle validation, OS-level sandboxing, and indefinite operator/cross-process recovery remain open global-GA blockers.

## Goal 2 Task 27 / Phase 77 Runner Network Sandbox Policy

Scope: add a service-level runner network-denial contract for compute-runner execution and replay, narrowing the runner sandbox GA blocker without claiming OS-enforced isolation.

Changes:

- Added shared `runnerNetworkDenialPolicy` with `COMATH_RUNNER_NETWORK=disabled`.
- Compute-runner metadata now records `sandbox_policy.network_denial` and `runner_env`.
- Initial Python runner execution and replay re-execution both launch with the same network-denial environment marker.
- Replay integrity and re-execution preflight now fail closed with `runner_network_denial_policy_missing` when the network-denial contract or runner environment marker is absent.
- Replay manifests preserve the network-denial contract and runner environment marker.
- Added `phase77-runner-network-sandbox-policy.test.mjs`, wired it into the default `@comath/comathd` test chain, smoke/status markers, and current-facing docs.

TDD evidence:

```text
node services/comathd/tests/unit/phase77-runner-network-sandbox-policy.test.mjs
Initial RED result: exit 1; runner reports lacked sandbox_policy.network_denial and runner_env.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase77-runner-network-sandbox-policy.test.mjs`
- `node services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs`
- `node services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs`
- `node services/comathd/tests/unit/phase10-compute-runners.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`

All commands exited 0.

Static audit:

- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path D:\MATH _Studio\comath-pi-lab\.comath` returned `False`.
- `git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'` returned no tracked runtime/build artifacts.
- At Task 27 completion, current-facing docs described Phase 18-77 and distinguished the service-level network-denial policy from still-deferred OS/kernel/firewall-enforced network sandboxing.

Boundary notes: Phase 77 is a service process-environment policy and replay preflight gate. It does not prove OS-level network isolation; that remains deferred.

Residual risks: OS-level runner process sandboxing, kernel/firewall-enforced network denial, broader runner-family lockfiles, arbitrary theorem synthesis, broad MathProve proof authority, production Pi/Codex lifecycle validation, indefinite operator sessions/cross-process recovery, and broad statement-equivalence proof search remain open global-GA blockers.

## Goal 2 Task 26 / Comprehensive Check-Debug Loop 8

Scope: comprehensive check-debug loop over Phase 75 bounded final clean replay promotion and Phase 76 registered Nat linear identity target registry.

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/integration/phase76-registered-nat-linear-targets.test.mjs`
- `node services/comathd/tests/integration/phase75-bounded-final-clean-replay.test.mjs`
- `node services/comathd/tests/integration/phase72-theorem-specific-lean-generation.test.mjs`
- `node services/comathd/tests/integration/phase73-bounded-lean-proof-body-synthesis.test.mjs`
- `node services/comathd/tests/integration/phase74-bounded-authority-report-preparation.test.mjs`
- `node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`

All commands exited 0. Root build/typecheck/test gates were not rerun in this loop because the task found no cross-package defect and made no product-code or package-interface changes; the default `@comath/comathd` test chain already exercised the Phase 72-76 proof path plus the older campaign, Lean authority, Pi/service, AgentRun, Codex-adapter, formal-slice, and negative-slice regressions.

Static audit:

- `git diff --check` exited 0.
- `Test-Path D:\MATH _Studio\comath-pi-lab\.comath` returned `False`.
- `git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'` returned no tracked runtime/build artifacts.
- Direct claim-status mutation scan found no `claim.status =` writes in `services/comathd/src`; hits were read-only status comparisons in paper rendering.
- Proof-authority scan found the Phase 75/76 promotion path still routed through `runCleanLeanReplay()`, `applyGatePromotedClaim()`, and `promoteClaim()` with `final_replay_manifest.json` binding; preview artifacts remain non-authoritative.
- Current-facing documentation scans continue to describe Phase 75/76 as bounded registered-target evidence and continue to mark arbitrary theorem proving, broad MathProve proof authority, production Pi/Codex lifecycle validation, OS/network sandboxing, indefinite operator sessions/cross-process recovery, and broad statement-equivalence proof search as deferred or not achieved.

Repair:

- No high-risk product-code or documentation defect was found, so no product behavior repair was made in this loop.

Residual risks: Phase 75-76 remain bounded registered-target slices. Global GA still needs further product work on arbitrary theorem synthesis beyond registered target tables, broad MathProve proof authority semantics, production Pi/Codex lifecycle validation, OS/network sandboxing, indefinite operator sessions/cross-process recovery, and broad statement-equivalence proof search.

## Goal 2 Task 25 / Phase 76 Registered Nat Linear Identity Targets

Scope: replace the single hardcoded bounded non-template target path with a small registered Nat linear identity target table, adding a second final-clean-replay-positive target without claiming arbitrary theorem proving.

Changes:

- Added `registeredNatLinearIdentityTargets` in the campaign tick path with entries for `n + n = 2 * n` and `n + 0 + n = 2 * n`.
- Bound `target_family_id` and `canonical_proposition` through theorem-specific formal spec, target package, proof-body synthesis, authority preparation, LeanProject replay metadata, final replay manifest, and proof-route metadata.
- Added `phase76-registered-nat-linear-targets.test.mjs`, wired it into the default `@comath/comathd` test chain, smoke markers, and service status capability `registered_nat_linear_identity_targets`.
- Preserved fail-closed behavior for unregistered broad goals; `n + 2 = n` receives no theorem-specific target package or final replay manifest.

Initial RED result: exit 1; `n + 0 + n = 2 * n` still terminated at `blocked` instead of `completed_formal_proof`.

Verification:

```text
node services/comathd/tests/integration/phase76-registered-nat-linear-targets.test.mjs
```

Result: exit 0; the second registered Nat linear identity reaches `completed_formal_proof`, writes target/proof-body/authority/final replay artifacts with the selected registered target metadata, promotes only through the existing Lean Authority v2 gate, and keeps an unregistered broad goal fail-closed.

Boundary notes: Phase 76 is a registered-target-table generalization, not a generic theorem prover. It does not add direct claim-status mutation, arbitrary theorem parsing, broad proof search, or MathProve proof authority.

Residual risks: arbitrary theorem synthesis, broad MathProve proof authority, production Pi/Codex lifecycle validation, OS/network sandboxing, indefinite operator sessions/cross-process recovery, and broad statement-equivalence proof search remain open global-GA blockers.

## Goal 2 Task 24 / Phase 75 Bounded Final Clean Replay Promotion

Scope: convert the bounded Phase 72-74 `n + n = 2 * n` target from campaign-scoped preview evidence into claim-scoped final Lean Authority v2 evidence, without generalizing to arbitrary theorem proving.

Implementation:

- Added a bounded final clean replay path for the theorem-specific `n + n = 2 * n` target.
- The bounded target now writes the missing `Audit/Target.lean` file and is represented as a proper `LeanProjectFiles` replay package.
- Reused the existing `runCleanLeanReplay()` and `promoteClaim()` gate path through a shared final replay/promotion helper.
- Wrote claim-scoped final static audit, statement equivalence, dependency closure, axiom profile, stdout/stderr, and `final_replay_manifest.json` under `.comath/evidence/<CLAIM>/lean/`.
- Updated the bounded target package, authority-preparation package, and broad replay target to `final_clean_replay_passed` only after the final gate passes.
- Added `phase75-bounded-final-clean-replay.test.mjs`, wired it into the default `@comath/comathd` test chain, and exposed `bounded_final_clean_replay_promotion`.

TDD evidence:

```text
node services/comathd/tests/integration/phase75-bounded-final-clean-replay.test.mjs
Initial RED result: exit 1; bounded broad target still terminated at `blocked` instead of `completed_formal_proof`.
```

Boundary notes: Phase 75 does not add direct claim-status mutation. It promotes only through the existing Lean Authority v2 gate after `runCleanLeanReplay()` writes fresh hash-bound final artifacts. Negative/non-proof prompts containing `n + n = 2 * n` still receive no final clean replay authority.

Residual risks: Phase 75 proves one bounded non-template target. It does not implement arbitrary theorem proving, broad proof search, broad MathProve proof authority, OS-enforced sandboxing, production Pi/Codex lifecycle hardening, or broad statement-equivalence proof search.

## Goal 2 Task 23 / Comprehensive Check-Debug Loop 7

Scope: comprehensive check-debug loop over Phase 72 theorem-specific Lean target package, Phase 73 bounded proof-body synthesis, and Phase 74 bounded authority-report preparation.

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/integration/phase72-theorem-specific-lean-generation.test.mjs`
- `node services/comathd/tests/integration/phase73-bounded-lean-proof-body-synthesis.test.mjs`
- `node services/comathd/tests/integration/phase74-bounded-authority-report-preparation.test.mjs`
- `node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs`
- `node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

All commands exited 0.

Static audit:

- Proof authority boundaries were rechecked around Phase 72-74 artifacts. The bounded target package, proof-body package, and authority-preview package remain non-promotional; `bounded_authority_report_preparation.json` keeps `final_replay_manifest_path: null`, and the Phase 73/74 tests assert no claim-scoped final replay manifest is written.
- `runCleanLeanReplay()`, `applyGatePromotedClaim()`, and `promoteClaim()` remain in the existing refutation/final-replay promotion paths, not in the Phase 72-74 preview/report-preparation branch.
- Runtime/generated cleanliness checks found no repo-root `.comath` and no tracked `.comath`, `.tmp`, `dist`, `node_modules`, `services/comathd/dist`, or `extensions/comath-pi/dist` artifacts.

Repair:

- Updated `COMATH_PI_LAB_DEV_PLAN.md`, `AGENTS.md`, and `docs/progress/design-handoff.md` to stop describing the current state as only Phase 18-72 and to include Phase 73 bounded proof-body candidate plus Phase 74 bounded authority-preview reports without overclaiming proof authority.

Residual risks: no high-risk regression was found in Phases 72-74. Global GA remains incomplete: the bounded broad target still lacks final clean replay/promotion, and arbitrary theorem synthesis, broad MathProve proof authority, OS/network sandboxing, production Pi/Codex lifecycle validation, indefinite operator sessions/cross-process recovery, and broader statement-equivalence proof search remain open.

## Goal 2 Task 22 / Phase 74 Bounded Lean Authority Report Preparation

Scope: implement bounded, non-promotional Lean Authority v2 report-preparation artifacts for the Phase 73 `n + n = 2 * n` proof-body candidate, without creating final replay authority.

Implementation:

- Added campaign-scoped `bounded_authority_report_preparation.json`.
- Added preview reports for static audit, statement equivalence, dependency closure, and axiom profile.
- Bound the preview package to the theorem-specific target package, proof-body synthesis artifact, target Lean file, problem lock, obligation DAG, line map, formal spec, and locked statement hash.
- Kept all preview reports non-authoritative with `proof_authority: "none"`, `can_run_clean_replay: false`, `can_promote_claim: false`, and `final_replay_manifest_path: null`.
- Updated `theorem_specific_lean_project.json`, `broad_replay_target.json`, and `broad_synthesis_failure.json` to point at the report-preparation package while preserving terminal `blocked_with_replayable_reason` and root claim `conjectural`.
- Added `phase74-bounded-authority-report-preparation.test.mjs`, wired it into the default `@comath/comathd` test chain, exposed `bounded_lean_authority_report_preparation`, and updated README, TODO, acceptance/readiness docs, and smoke markers.

TDD evidence:

```text
node services/comathd/tests/integration/phase74-bounded-authority-report-preparation.test.mjs
Initial RED result: exit 1; `.comath/campaign/CAM-0001/bounded_authority_report_preparation.json` was missing.
```

Boundary notes: Phase 74 does not call `runCleanLeanReplay()`, `applyGatePromotedClaim()`, or `promoteClaim()`. It writes no `.comath/evidence/<CLAIM>/lean/final_replay_manifest.json`, produces no final replay result, and keeps the root claim `conjectural`. The axiom-profile preview is explicitly blocked until clean replay supplies authoritative `#print axioms` output.

Residual risks: Phase 74 is still not final proof authority for the broad target. It does not run clean replay, produce final hash-bound authority reports under the claim evidence directory, promote the claim, or generalize beyond the bounded `n + n = 2 * n` target.

## Goal 2 Task 21 / Phase 73 Bounded Theorem-Specific Proof-Body Synthesis

Scope: implement a bounded proof-body synthesis artifact for the Phase 72 non-template target `Prove in Lean that n + n = 2 * n for natural numbers.`, without treating the synthesized body as final proof authority.

Implementation:

- Added bounded `by omega` proof-body candidate generation in the broad-planning target branch.
- Generated `.comath/campaign/<CAM>/bounded_proof_body_synthesis.json` and `bounded_proof_body_static_audit.json`.
- Bound the proof-body package to the problem lock, obligation DAG, line map, theorem-specific target package, target Lean file, locked statement hash, and formal spec.
- Updated `theorem_specific_lean_project.json` and `broad_replay_target.json` to record `proof_body_synthesized_unreplayed` while preserving `proof_authority: "none"`, `can_run_clean_replay: false`, and `can_promote_claim: false`.
- Added negative prompt coverage so negation/non-proof prompts containing `n + n = 2 * n` do not receive the positive proof-body package.
- Added `phase73-bounded-lean-proof-body-synthesis.test.mjs`, wired it into the default `@comath/comathd` test chain, exposed `bounded_theorem_specific_proof_body_synthesis`, and updated README, TODO, acceptance/readiness docs, and smoke markers.

TDD evidence:

```text
node services/comathd/tests/integration/phase73-bounded-lean-proof-body-synthesis.test.mjs
Initial RED result: exit 1; `.comath/campaign/CAM-0001/bounded_proof_body_synthesis.json` was missing.
```

Boundary notes: Phase 73 is proof-body candidate evidence only. It does not call `runCleanLeanReplay()`, `applyGatePromotedClaim()`, or `promoteClaim()`, produces no final replay manifest, returns no promotion gate, and leaves the root claim `conjectural`. Final Lean Authority v2 remains the only path to `formally_checked`.

Residual risks: Phase 73 is intentionally limited to one bounded target and one proof body. It does not implement arbitrary proof search, statement-equivalence proof search, dependency/axiom final reports for this target, final clean replay, broad MathProve proof authority, production Pi/Codex lifecycle hardening, or OS-enforced sandboxing.

## Goal 2 Task 20 / Comprehensive Check-Debug Loop 6

Scope: comprehensive check-debug loop over the recent global-GA product-code slices: Phase 70 broad theorem planning, Phase 71 stage-gate repair/resume, and Phase 72 theorem-specific Lean target package.

Checks performed:

- Rechecked Phase 70-72 requirement drift and proof-authority boundaries.
- Re-ran focused campaign/proof-kernel tests for Phase 70, Phase 71, Phase 72, Phase 20, and Phase 63.
- Re-ran root build, typecheck, and test gates.
- Audited runtime artifact cleanliness, tracked generated files, repo-root `.comath`, stale current-state docs, and overclaim language.
- Used a read-only verifier lane for Phases 70-72; it found no promotion/authority or Pi trusted-state issue, but did identify stale current-state wording in `COMATH_PI_LAB_DEV_PLAN.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

Verification:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0.

node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs
Result: exit 0.

node services/comathd/tests/unit/phase71-stage-gate-repair-resume.test.mjs
Result: exit 0.

node services/comathd/tests/integration/phase72-theorem-specific-lean-generation.test.mjs
Result: exit 0.

node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Result: exit 0.

node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Result: exit 0.

node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0.

corepack pnpm build
Result: exit 0.

corepack pnpm typecheck
Result: exit 0.

corepack pnpm test
Result: exit 0; root test included Phase 0 smoke, Pi extension tests through Phase 66, comathd tests through Phase 72, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation.

git diff --check
Result: exit 0 with only Windows LF-to-CRLF warnings.

Test-Path D:\MATH _Studio\comath-pi-lab\.comath
Result: False.

git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'
Result: no tracked runtime/build artifacts.
```

Static audit result: targeted stale-current-state scan found no remaining `Phase 18-58` / `Current repository state after Phase 58` / `no broad Lean project generator` wording in current-facing docs after the repair. Overclaim scan hits are explicit guardrails or non-authority statements such as `proof_authority: none`, `can_promote_claim: false`, "not an arbitrary theorem prover", and "not final global v3 GA".

Changed surfaces:

- Updated `COMATH_PI_LAB_DEV_PLAN.md` current status from Phase 18-58 to Phase 18-72 and clarified that Phase 70/72 are bounded planning/target-package evidence, not proof synthesis.
- Updated `AGENTS.md` current frontier through Phase 72 while preserving the no-broad-discovery guardrail.
- Updated `docs/progress/design-handoff.md` to retire stale "broad planning next" wording and point the next blocker at proof-body synthesis and remaining global-GA hardening.

Residual risks: no high-risk regression was found in Phases 70-72. Global GA is still incomplete: arbitrary proof-body synthesis beyond the bounded target-package slice, broad MathProve proof search/proof-authority semantics, OS/network sandboxing, richer real-host Pi UX lifecycle, production Codex API/network validation, indefinite operator sessions/cross-process recovery, and broader statement-equivalence proof search remain open.

## Goal 2 Task 19 / Phase 72 Theorem-Specific Lean Target Package

Scope: implement a bounded theorem-specific Lean target package for one non-template broad-planning goal, `Prove in Lean that n + n = 2 * n for natural numbers.`, without claiming arbitrary theorem proving or proof authority.

Implementation:

- Added theorem-specific target package generation in the Phase 70 broad-planning candidate-generation block.
- Generated `.comath/campaign/<CAM>/theorem_specific_lean_project.json`, `.comath/lean/broad/<CAM>/MathResearch/Target.lean`, `FormalSpec/target.json`, `lakefile.lean`, and `lean-toolchain`.
- Bound the target package to the problem lock, obligation DAG, line map, locked statement hash, replay command, and formal spec.
- Marked the theorem-specific target package and broad replay target as non-promotional with `proof_authority: "none"`, `can_run_clean_replay: false`, and `can_promote_claim: false`.
- Added negative statement-binding coverage so negation/refutation/non-proof prompts that contain `n + n = 2 * n` do not receive a positive theorem target package.
- Added `phase72-theorem-specific-lean-generation.test.mjs`, wired it into the default `@comath/comathd` test chain, exposed `theorem_specific_lean_target_package`, and updated README, TODO, acceptance/readiness docs, and smoke markers.

TDD evidence:

```text
node services/comathd/tests/integration/phase72-theorem-specific-lean-generation.test.mjs
Initial RED result: exit 1; `theorem_specific_lean_project.json` was missing for the bounded `n + n = 2 * n` target.
```

Boundary notes: Phase 72 creates a Lean target package, not a proof. The generated Lean file records only a target proposition and `#check targetStatement`; it contains no `sorry`, `admit`, `axiom`, `unsafe`, `opaque`, or `constant`. The campaign remains terminal `blocked_with_replayable_reason`, the root claim remains `conjectural`, and no final replay or promotion gate is returned.

Residual risks: Phase 72 does not synthesize a proof body, produce Lean Authority v2 reports, run final clean replay, or promote claims. The target recognizer is intentionally narrow and does not parse arbitrary theorem statements. Broad MathProve proof search/proof-authority semantics, production Pi/Codex lifecycle hardening, OS-enforced sandboxing, and arbitrary attachment/paper-driven research closure remain open global-GA blockers.

## Goal 2 Task 18 / Phase 71 Stage-Gate Repair/Resume

Scope: implement a narrow service-owned repair/resume path for campaigns blocked by missing required stage-gate artifacts. This closes the Phase 63 residual gap without turning repair/resume into proof repair, theorem synthesis, or claim promotion.

Implementation:

- Added `repairStageGateAndResume()` in `services/comathd/src/proof-kernel/campaign/campaign-tick.ts`.
- Added `POST /campaign/:id/repair-resume` in `services/comathd/src/api/server.ts`.
- Tightened ordinary `POST /campaign/:id/resume` so it no longer unblocks `status: "blocked"` campaigns; blocked campaigns now return `CAMPAIGN_REPAIR_REQUIRED`.
- Repair requests must cite the persisted `stage_gate_blocker.json` and the exact missing artifact set. The service re-reads the blocker, verifies campaign/stage/rewind/missing-artifact consistency, checks all repaired artifacts exist under the project root, writes `stage_gate_repair.json`, and resumes only to the recorded rewind target.
- The repair artifact carries `proof_authority: "none"` and `can_promote_claim: false`. Historical blockers and blocked stage runs remain preserved.

Verification:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0.

node services/comathd/tests/unit/phase71-stage-gate-repair-resume.test.mjs
Result: exit 0. The test first failed before implementation because ordinary /resume returned 200 for a blocked missing-artifact campaign. After implementation it verifies blocked /resume, incomplete repair rejection, exact blocker/artifact matching, non-promotional repair artifact evidence, unchanged conjectural claim status, and continuation from the rewind target.
```

Boundary notes: Phase 71 handles `MISSING_REQUIRED_STAGE_ARTIFACT` recovery only. It does not implement arbitrary theorem repair loops, Lean proof synthesis, semantic-equivalence search, or broad promotion authority. Future theorem-specific Lean project generation remains a separate global-GA blocker.

## Goal 2 Task 17 / Phase 70 Broad Theorem Planning Slice

Scope: implement a bounded product slice beyond the registered Nat theorem-family replay path without claiming arbitrary theorem proving. Phase 70 upgrades non-template theorem targets from a one-line unsupported blocker into replayable service-owned planning/synthesis evidence while preserving the Lean Authority v2 promotion boundary.

Code changes:

- Added a fail-closed broad synthesis branch in `tickCampaign()` for non-template obligations at `candidate_generation`.
- The branch writes `.comath/campaign/<CAM>/broad_synthesis_plan.json`, `broad_replay_target.json`, and `broad_synthesis_failure.json`.
- The plan binds the locked statement hash, existing problem lock, obligation DAG, line map, candidate-plan requirements, and unresolved replay target.
- The failure evidence records `proof_authority: "none"`, `can_promote_claim: false`, and the missing theorem-specific Lean replay target.
- The claim remains `conjectural`; no `final_replay`, promotion gate, or kernel-checked metadata is fabricated.
- Added `phase70-broad-theorem-planning-slice.test.mjs`, wired it into the default `@comath/comathd` test chain, and updated release-facing docs/smoke checks.

TDD evidence:

```text
node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs
RED result: exit 1; existing unsupported path returned `unsupported final replay target` and lacked the required broad-planning evidence package.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding the broad-planning branch.

node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs
Result: exit 0; Phase 70 writes `broad_synthesis_plan.json`, `broad_replay_target.json`, and `broad_synthesis_failure.json` for a non-template number-theory goal, preserves problem lock / obligation DAG / line-map evidence, terminal-blocks with `blocked_with_replayable_reason`, and keeps the root claim `conjectural`.
```

Residual risk: Phase 70 is broad-planning evidence, not broad proof synthesis. It does not yet generate theorem-specific Lean projects, run live proof search over arbitrary tactic states, or promote arbitrary claims. Those remain global-GA blockers.

## Goal 2 Task 16 / Phase 69 v3 Terminal Vocabulary Compatibility

Scope: implement the product-code gap identified by Task 15: external v3 terminal vocabulary compatibility. The change keeps internal campaign state authoritative and adds only a read-only API/Pi projection for the external document names.

Code changes:

- Added `services/comathd/src/proof-kernel/campaign/external-terminal-vocabulary.ts` with `projectExternalV3TerminalState()`, `withExternalV3TerminalState()`, and `withExternalV3CampaignResult()`.
- Wrapped campaign start/status/tick/replay/final-audit/pause/resume responses so returned campaign payloads include `external_v3_terminal_state` when a trusted internal terminal state maps to an external v3 name.
- Kept persisted `ResearchCampaign` schema and `.comath/campaign/*/status.json` state unchanged; the compatibility field is not a mutation or proof-authority input.
- Updated the Pi research loop to preserve `external_v3_terminal_state` and treat the projected external v3 terminal state as terminal loop outcome.
- Added `phase69-v3-terminal-vocabulary.test.mjs`, wired Phase 69 into the default `@comath/comathd` test chain, and extended Phase 22 Pi loop coverage.

Verification evidence:

```text
node services/comathd/tests/unit/phase69-v3-terminal-vocabulary.test.mjs
Result: exit 0; service API responses projected `formal_proof_verified`, `verified_counterexample`, and `replayable_environment_blocker`, and the exported projection function covered `user_visible_theorem_repair_required` and `user_cancelled`.

node extensions/comath-pi/tests/phase22-research-loop.test.mjs
Result: exit 0; Pi loop preserved `external_v3_terminal_state` and treated projected external v3 terminal states as terminal.
```

Residual risk: this is compatibility vocabulary, not broad theorem planning or production lifecycle hardening. The projection intentionally does not allow Pi/model input to write terminal authority, and later work must still address remaining global-GA blockers.

## Goal 2 Task 15 / Final v3 GA Completion Audit

Scope: close the final-audit gate quickly and return the goal to product implementation. This audit used the four external v3 documents plus `Goal 指令.txt` as the requirement source, checked the current Phase 18-68 implementation evidence, and deliberately did not convert vertical-slice evidence into a global GA claim.

Subagent lanes used for this task:

- Retriever lane: extracted the remaining requirement deltas from the v3 blueprint/spec/team prompts and the local readiness matrices.
- Verifier lane: cross-checked current code/tests for external v3 terminal-vocabulary support and confirmed this is an executable API gap, not only a documentation mismatch.
- Builder lane: synchronized `goal-2/tasks.md` so the next continuation starts with product implementation rather than another review.

Requirement result:

| Requirement family | Current evidence | Task 15 decision |
| --- | --- | --- |
| Native CoMath proof-kernel path for implemented slices | Phase 18, 57, 63, 64, 67 tests; final replay hash binding; positive v3 formal slice. | Covered for registered elementary Nat theorem-family slices. |
| ResearchCampaign as service-owned workflow | Phase 20, 60, 63, 66, 67 evidence. | Covered for bounded resumable product slices. |
| 8-way ensemble and evidence-weighted arbitration | Phase 19, 61, 62, 67 evidence. | Covered for registered theorem-family slices and required failure aggregate paths. |
| Failed-route memory | Phase 61 and 65 evidence. | Covered with deterministic retrieval and stale/superseded warnings. |
| Lean Authority v2 final promotion gate | Phase 31-37, 54, 56, 57, 64 evidence. | Covered for registered slices with fail-closed replay artifact hash binding. |
| Positive v3 formal campaign | Phase 67 `.comath/campaign/<CAM>/v3_formal_campaign_slice.json` evidence. | Covered for `n + 0 = n`. |
| Required negative GA slices | Phase 68 `.comath/release/v3_negative_ga_slices.json` evidence. | Covered for statement drift, cheat artifact, false theorem, all-candidate failure, and snapshot-only promotion rejection. |
| Full external terminal vocabulary | `TODO.md` still records missing aliases for `formal_proof_verified`, `verified_counterexample`, `user_visible_theorem_repair_required`, `replayable_environment_blocker`, and `user_cancelled`. | Not complete; promoted to Task 16 product code. |
| Broad theorem planning/synthesis | Current theorem registry remains bounded to registered Nat families and exact refutation slices. | Not complete; remains a global-GA blocker. |
| Broad MathProve proof search / MathProve-as-authority | MathProve runners remain non-authoritative evidence only. | Not complete as global GA proof path; do not mark the goal complete. |
| Production Pi/Codex lifecycle and OS sandboxing | Existing slices cover bounded local adapters, fake-host/runtime registration, local install e2e, provenance, and environment gates. | Not complete as production hardening. |

Verification evidence:

```text
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
git diff --check
Test-Path D:\MATH _Studio\comath-pi-lab\.comath
git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'
rg -n 'claim\.status\s*=' services/comathd/src
rg -n 'shell:\s*true|exec\(|execSync\(' services/comathd/src
```

Result: the Task 15 verification pass exited 0 for the root build/typecheck/test gates, `git diff --check`, and runtime/build artifact tracking checks. `.comath/` was absent from the repo root, no runtime/build artifacts were tracked, and static scans found no direct privileged claim-status assignment or service shell-execution regression. The root test chain covered Phase 0 smoke, Pi extension tests through Phase 66, comathd tests through Phase 68, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation. The read-only subagent checks independently confirmed that external v3 terminal names are required by the v3 docs but currently rejected or absent from the product API.

Decision: Goal 2 is not complete. The repository has real Phase 18-68 product code and evidence, but final global v3 GA remains blocked by executable-feature gaps. The next continuation must start Task 16, a product-code task for external v3 terminal-vocabulary compatibility, rather than extending review text.

## Goal 2 Task 14 / Documentation And Release Evidence Synchronization

Scope: synchronize release-facing documentation with the actual Goal 2 Phase 18-68 implementation, especially the Phase 67 positive v3 formal campaign slice and Phase 68 negative GA slice runner. This task updates evidence matrices and guardrails only; it does not claim final global v3 GA completion.

Documentation changes:

- Updated `README.md` from Phase 18-67 to Phase 18-68 and added the Phase 68 release negative GA slice runner, `.comath/release/v3_negative_ga_slices.json`, and the remaining Task 15 final-audit boundary.
- Added Phase 60-68 Goal 2 acceptance rows to `docs/architecture/acceptance-matrix.md`, including Phase 68 release artifact/test coverage and non-authority boundaries.
- Rewrote `docs/progress/product-readiness-matrix.md` from the stale Goal 1 / Phase 18-58 product-scope audit into the current Goal 2 / Phase 18-68 readiness matrix.
- Updated `SECURITY_REVIEW.md`, `MATH_INTEGRITY_REVIEW.md`, and `docs/architecture/risk-register.md` so Phase 68 is recorded as service-owned release evidence, not proof authority.
- Extended `scripts/phase0-smoke.mjs` to require current Phase 18-68 README language and Phase 60-68 acceptance/test markers, including `v3_negative_ga_slices.json`.

Verification evidence:

```text
node scripts/phase0-smoke.mjs
Result: exit 0; design smoke check passed with current Phase 18-68 README evidence and Phase 60-68 acceptance/test markers.

rg -n "Phase 18-58|Phase 18-67|Goal 1" README.md docs/progress/product-readiness-matrix.md docs/architecture/acceptance-matrix.md SECURITY_REVIEW.md MATH_INTEGRITY_REVIEW.md docs/architecture/risk-register.md
Result: no stale current-state Goal 1 / Phase 18-58 / Phase 18-67 wording remained in the current-facing release docs. Historical `REVIEW.md` entries are intentionally left as prior-phase records and are not part of this current-facing scan.

rg -n "arbitrary theorem prover|MathProve.*proof authority|MathProve-as-proof-authority|proof_authority|v3_negative_ga_slices" README.md docs/progress/product-readiness-matrix.md docs/architecture/acceptance-matrix.md SECURITY_REVIEW.md MATH_INTEGRITY_REVIEW.md docs/architecture/risk-register.md
Result: hits are explicit false/guardrail statements or non-authority metadata such as `proof_authority: none`; no current-facing release doc claims arbitrary theorem proving, MathProve proof authority, or release-summary proof authority.
```

Residual risks:

- Task 14 synchronized docs and smoke invariants; it does not run the final root build/typecheck/test matrix.
- Task 15 still owns the final v3 GA completion audit, root gates, static scans, and decision whether the overall goal can be marked complete.

## Goal 2 Task 13 / Phase 68 v3 Negative GA Slice Runner

Scope: implement product code for the release-level negative GA slices required by the v3 external documents. This is a `comathd` runner and API route, not a review-only checklist: it creates runtime evidence for statement drift rejection, cheating Lean artifact rejection, false-theorem refutation, all-candidate failure recovery, and snapshot replay that still cannot promote without fresh hash-bound final replay artifacts.

TDD / implementation evidence:

```text
node services/comathd/tests/integration/phase68-v3-negative-ga-slices.test.mjs
Initial RED result: exit 1; `POST /release/v3-negative-ga-slices` returned 404, proving the release negative-slice runner was not product code yet.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build and agent-adapter copy step completed after adding the release runner, route, export, and status capability.

node services/comathd/tests/integration/phase68-v3-negative-ga-slices.test.mjs
Result: exit 0; Phase 68 created `.comath/release/v3_negative_ga_slices.json`, covered all five required negative slices, kept every final claim out of `formally_checked`, preserved evidence paths, and reported `all_required_slices_passed: true`.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; no-emit TypeScript check passed after switching negative promotion attempts to the normal `promoteClaim()` path.

node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs
Result: exit 0; existing proof-kernel claim promotion gate behavior still passes.

node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs
Result: exit 0; evidence-weighted all-candidate failure/recovery arbitration still passes.

node services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs
Result: exit 0; false theorem refutation path still reaches the refutation terminal behavior.

node services/comathd/tests/integration/phase18-ga-snapshot-replay.test.mjs
Result: exit 0; existing snapshot replay integrity behavior still passes.

node services/comathd/tests/integration/phase67-v3-formal-campaign-slice.test.mjs
Result: exit 0; the positive v3 formal campaign slice still passes after adding the negative release runner.
```

Changed surfaces:

- Added `services/comathd/src/release/v3-negative-ga-slices.ts` as a service-owned release runner that writes `.comath/release/v3_negative_ga_slices.json`.
- Added `POST /release/v3-negative-ga-slices`, exported the runner from `@comath/comathd`, exposed `v3_negative_ga_slice_runner`, and wired Phase 68 into the default comathd test chain.
- Added `services/comathd/tests/integration/phase68-v3-negative-ga-slices.test.mjs` asserting all five negative slices block promotion and preserve evidence.

Requirement result: Task 13 now has executable release evidence for the negative GA paths named in the v3 blueprint/spec: statement drift cannot promote, Lean escape hatches are rejected by static audit, a registered false theorem returns a refutation rather than proof-looking text, eight failed candidates aggregate into recovery evidence, and a restored snapshot replay is preserved but insufficient for a different claim without fresh hash-bound final replay artifacts.

Residual risks:

- This runner covers the registered theorem-family/product slice evidence required for Task 13; it is not a claim of arbitrary theorem proving or final global GA completion.
- Task 14 must still synchronize release-facing docs and matrices with Phase 68 evidence.
- Task 15 must still run the final v3 GA completion audit before marking the overall goal complete.

## Goal 2 Task 12 / Comprehensive Check-Debug Loop 4

Scope: fourth Goal 2 comprehensive check-debug loop over the Phase 67 v3 formal campaign slice and release-facing root gates. This loop verifies that the final positive v3 slice did not leave stale Phase 18-58 smoke invariants, tracked runtime artifacts, secrets, direct Pi trusted-state writes, claim-gate bypasses, or documentation overclaims before moving to the required negative GA slices.

Verification evidence:

```text
node services/comathd/tests/integration/phase67-v3-formal-campaign-slice.test.mjs
Result: exit 0; Phase 67 v3 formal campaign slice passed.

node scripts/phase0-smoke.mjs
Initial Task 12 finding: root `corepack pnpm test` first failed because the Phase 0 smoke check still required stale Phase 18-58 README evidence while the current product docs correctly describe Phase 18-67.
Result after repair: exit 0; Phase 0/design smoke check passed with 25 required entries and 28 invariants, including Phase 18-67 README evidence and Phase 67 acceptance-matrix coverage.

corepack pnpm build
Result: exit 0; workspace build passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm typecheck
Result: exit 0; workspace TypeScript no-emit checks passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm test
Result: exit 0; root Phase 0 smoke, Pi extension tests through Phase 66, comathd tests through Phase 67, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repo-root runtime `.comath` directory was left behind.

git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'
Result: no output; no runtime, dependency, or build-output paths from those patterns are tracked.

git diff --check
Result: exit 0; no whitespace errors were found in the Task 12 diff.
```

Static scan result:

- Claim-gate/status scans found status reads and the expected `applyGatePromotedClaim` / `promoteClaim` service-owned surfaces only; no direct `claim.status =` privileged assignment was found.
- Pi direct-write scan found only service-authority metadata and scoped subagent workstream policy strings; no Pi source `writeFile`, `appendFile`, `mkdir`, `rm`, `rmdir`, or `unlink` trusted-state mutation path was found.
- Secret scan found only intentional test fixtures such as fake `OPENAI_API_KEY`, `GH_TOKEN`, and `sk-phase51/52-secret` values plus secret-scanner code; no real secret candidate was introduced by Task 12.
- MathProve/proof-authority and documentation scans continue to mark MathProve, AgentRun, adapter, and runner output as non-authoritative evidence with `proof_authority: none`; current-facing docs still state that arbitrary theorem proving, broad MathProve proof authority, full v3 GA completion, production Pi/Codex hardening, OS sandboxing, and broader theorem synthesis are not achieved or remain deferred.

Changed surfaces:

- Updated `scripts/phase0-smoke.mjs` so the README invariant requires current Phase 18-67 GA/v3 vertical-slice evidence rather than stale Phase 18-58 evidence.
- Added Phase 67 acceptance-matrix smoke invariants requiring `67 v3 end-to-end formal campaign slice` and `phase67-v3-formal-campaign-slice.test.mjs` coverage language.

Requirement drift result: Task 11's positive v3 formal campaign slice is still aligned with Goal 2, and the root smoke gate now protects that evidence instead of failing on a stale bounded-product checkpoint. No additional high-risk product-code defect was found during this loop.

Residual risks:

- Task 13 still needs release-level negative GA slices for statement drift rejection, cheating Lean artifact rejection, false-theorem refutation, all-candidate failure recovery, and clean replay from snapshot.
- Task 14 and Task 15 still need documentation/evidence synchronization and the final v3 GA completion audit before any full v3 GA claim.
- Some historical docs still mention Phase 18-58 as a past bounded checkpoint; that is acceptable as history, but Task 14 must synchronize current-facing release evidence.

## Goal 2 Task 11 / Phase 67 v3 End-To-End Formal Campaign Slice

Scope: implement and verify the positive v3 formal campaign slice required by the external GA docs: user goal intake for `n + 0 = n`, workspace/runtime creation, problem lock, v3 planning/stage-gate artifacts, 8-way candidate generation, candidate verification, evidence-weighted arbitration, Lean formalization, final static audit, clean replay, `formally_checked` promotion, memory update, and replayable artifact bundle.

TDD evidence:

```text
node services/comathd/tests/integration/phase67-v3-formal-campaign-slice.test.mjs
Initial RED result: exit 1; `.comath/campaign/<CAM>/v3_formal_campaign_slice.json` was missing after the campaign reached terminal state, proving the previous product path did not produce the v3 end-to-end slice summary artifact.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; no-emit TypeScript check passed after replacing the incorrect `blocked_terms` summary field with the current static-audit `hard_vetoes` and `warnings` fields.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build and agent-adapter copy step completed after the Phase 67 implementation.

node services/comathd/tests/integration/phase67-v3-formal-campaign-slice.test.mjs
Result: exit 0; Phase 67 proves `/campaign/start` plus bounded service-owned ticks for `Prove in Lean that n + 0 = n for natural numbers.` reaches `completed_formal_proof`, writes `v3_formal_campaign_slice.json`, records the required v3 stage sequence, records 8 candidates with `CAND-0001` selected by `evidence_weighted` arbitration, passes static audit and clean replay, promotes the claim to `formally_checked`, and replays successfully from the campaign replay route.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
node services/comathd/tests/integration/phase57-ga-theorem-template-instantiation.test.mjs
node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs
Result: exit 0; existing positive campaign, claim-scoped final replay paths, theorem-template instantiation, native stage-gate coverage, and Lean Authority v2 final-gate hash binding still pass.

corepack pnpm --filter @comath/comathd test
Result: exit 0; full comathd default test chain passed with Phase 67 included.
```

Changed surfaces:

- Added `services/comathd/tests/integration/phase67-v3-formal-campaign-slice.test.mjs` and wired it into `@comath/comathd`'s default `test` script.
- Added terminal success emission of `.comath/campaign/<CAM>/v3_formal_campaign_slice.json` from the service-owned campaign tick path.
- Added the v3 slice summary to terminal `memory_update` artifact paths while preserving proof-memory events, final handoff, and final replay snapshot artifacts.
- Updated Phase 35 final replay artifact-path regression so it requires the new v3 summary artifact without treating additional memory artifacts as a regression.

Boundary notes:

- This is the required positive formal campaign slice for a registered theorem family, not a claim of arbitrary theorem proving or full v3 GA completion.
- The clean replay command is recorded from the theorem-family configured final replay command. The external docs permit `lake build` or a configured equivalent, and the test asserts the summary binds to the actual `final_replay.command` while accepting `lake build` or `lake env lean` forms.
- Pi goal-compatible intake remains covered by Phase 66; Phase 67 exercises the trusted `comathd` campaign API directly so the proof authority and state mutation stay service-owned.

Residual risks:

- Task 12 still needs the fourth comprehensive check-debug loop over this final-slice work and root gates.
- Task 13 still needs release-level negative GA slices for statement drift, cheating artifacts, false theorem refutation, all-candidate recovery, and clean replay from snapshot.
- Task 14 and Task 15 still need documentation/evidence synchronization and final v3 GA completion audit before any global GA claim.

## Goal 2 Task 10 / Phase 66 Pi Goal-Compatible Campaign UX

Scope: align the Pi command/tool UX with the v3 goal-compatible campaign surface required by the external GA docs: `/cm:research --goal`, `/cm:campaign status`, `/cm:campaign tick`, `/cm:campaign next-actions`, `/cm:campaign final-audit`, `/cm:campaign replay`, `/cm:audit final`, and `/cm:replay final`. This task keeps Pi as a thin client and does not move mathematical authority out of `comathd`.

TDD evidence:

```text
node tests/phase66-goal-compatible-campaign-ux.test.mjs
Initial RED result: exit 1; `/cm:research --goal "n + 0 = n" --strict` posted `user_goal: "--goal"` to `/campaign/start`, proving the goal-compatible flag form was not safe for unattended Pi goal mode.

corepack pnpm --filter @comath/pi-extension build
Result: exit 0; TypeScript build completed after command parsing and campaign subcommand routing updates.

node tests/phase66-goal-compatible-campaign-ux.test.mjs
Result: exit 0; Phase 66 proves `/cm:research --goal "<target>" --strict` sends the real target to `comathd`, and `/cm:campaign final-audit` plus `/cm:campaign replay` route through host-confirmed service-owned tools.

node tests/phase18-research-campaign-tools.test.mjs
node tests/phase22-research-loop.test.mjs
node tests/phase26-pi-runtime-registration.test.mjs
Result: exit 0; existing Pi campaign tool contracts, bounded research loop behavior, and runtime registration boundaries still pass.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; full Pi extension package test chain passed with Phase 66 included.

node tests/e2e/phase45-pi-comathd-install-session.test.mjs
Result: exit 0; installed Pi package can still talk to a real `comathd` HTTP server in the local install-session e2e.
```

Changed surfaces:

- Fixed `inferGoal()` so both `/cm:research --goal "<target>"` and `/cm:research "<target>" --goal` are parsed as goal-compatible user targets, while the historical `/cm:research start --goal "<target>"` form remains supported.
- Added `/cm:campaign final-audit` routing to `comath.campaign.finalAudit` with Pi host confirmation and service-owned `/campaign/:id/final-audit` mutation.
- Added `/cm:campaign replay` routing to `comath.campaign.replay` with Pi host confirmation and service-owned `/campaign/:id/replay` mutation.
- Added `extensions/comath-pi/tests/phase66-goal-compatible-campaign-ux.test.mjs` and wired it into the default Pi package test chain.

Boundary notes:

- Pi still does not write `.comath/`, assign claim status, certify proofs, run Lean authority, or own trusted campaign state. It submits campaign specs and host-confirmed bounded mutation requests to `comathd`.
- This task improves the goal-compatible command surface; the full `n + 0 = n` v3 formal campaign slice is covered by Task 11 / Phase 67 above.

Residual risks:

- Task 12 still needs the fourth comprehensive check-debug loop over the final-slice work and root gates.
- Task 13 still needs release-level negative GA slices for statement drift, cheating artifacts, false theorem refutation, all-candidate recovery, and clean replay from snapshot.
- Documentation and release evidence still need Task 14 synchronization and Task 15 final audit before any v3 GA completion claim.

## Goal 2 Task 9 / Comprehensive Check-Debug Loop 3

Scope: third Goal 2 comprehensive check-debug loop over Tasks 7-8 and the surrounding proof-kernel, proof-memory, campaign, Pi, and root surfaces. This loop verifies that Lean Authority v2 final replay binding and failed-route proof-memory retrieval did not weaken claim-promotion gates, introduce tracked runtime artifacts, make Pi a trusted-state writer, or reclassify MathProve/AgentRun output as proof authority.

Verification evidence:

```text
corepack pnpm build
Result: exit 0; workspace build passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm typecheck
Result: exit 0; workspace TypeScript no-emit checks passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm test
Result: exit 0; root Phase 0 smoke, Pi extension tests through Phase 59, comathd tests through Phase 65, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repo-root runtime `.comath` directory was left behind.

git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'
Result: no output; no runtime, dependency, or build-output paths from those patterns are tracked.

git status -sb --ignored
Result: clean tracked tree; only ignored `.pnpm-store/`, `.worktrees/`, package `dist/`, and `node_modules/` directories were present.
```

Static scan result:

- Claim-gate/status scan found expected status reads, process-result status checks, and the service-owned `applyGatePromotedClaim` / `promoteClaim` surfaces only; no direct privileged `formally_checked` assignment was found in Pi or non-gate code.
- Pi direct-write scan found only `.comath` strings used for service authority descriptors and scoped subagent workstream policy; no Pi `writeFileSync`, `appendFileSync`, `mkdirSync`, `rmSync`, `unlinkSync`, or `createWriteStream` direct runtime-state mutation was found.
- MathProve/proof-authority scan continues to describe MathProve, AgentRun, adapter, and runner outputs as non-authoritative evidence or orchestration material with `proof_authority: none`; no MathProve-as-`formally_checked` authority regression was found.
- Overclaim scan continues to mark global GA readiness, arbitrary theorem proving, broad MathProve proof authority, production Pi/Codex hardening, OS sandboxing, and broader theorem synthesis as deferred or not achieved.

Requirement drift result: Tasks 7-8 are still aligned with Goal 2 v3 direction. Phase 64 strengthened final promotion by hash-binding fresh Lean replay artifacts, while Phase 65 made failed proof routes retrievable memory without adding proof authority. The product is ready to move from proof-kernel/memory hardening into Task 10 Pi goal-compatible campaign UX work.

Boundary notes: no high-risk implementation defect was found during this check-debug loop, so no product-code repair was required. The remaining work is product development, not more review: Pi goal-compatible UX, an end-to-end v3 formal campaign slice, release-level negative slices, documentation synchronization, and the final v3 GA completion audit remain open.

Residual risks:

- Task 10 still needs Pi command/API alignment for goal-compatible campaign start, status, tick, next actions, final audit, and replay UX.
- Task 11 still needs an end-to-end v3 formal campaign slice from user goal intake to final clean replay and promotion.
- Task 13 still needs consolidated release-level negative GA slices for statement drift, cheating artifact rejection, false-theorem refutation, all-candidate recovery, and clean replay from snapshot.
- Task 14 and Task 15 still need documentation/evidence synchronization and the final v3 GA completion audit.

## Goal 2 Task 8 / Phase 65 Failed-Route Proof Memory Retrieval

Scope: make failed routes first-class proof-memory records that can be read and retrieved by later obligations with explicit stale/superseded warnings. This closes the Task 8 gap where previous phases preserved failed routes and aggregates, but did not yet expose an obligation-level retrieval surface or inject it into campaign context.

TDD evidence:

```text
node services/comathd/tests/unit/phase65-proof-memory-retrieval.test.mjs
Initial RED result: exit 1; `readProofMemoryEvents` was not exported, proving the existing implementation had no proof-memory read/retrieval API for failed routes.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after proof-memory event, retrieval, campaign knowledge-pack, status, and test-chain updates.

node services/comathd/tests/unit/phase65-proof-memory-retrieval.test.mjs
Result: exit 0; Phase 65 proves failed routes carry typed proof-memory fields, similar obligations retrieve prior failures, stale/superseded warnings are written, and a later campaign knowledge pack includes prior failed-route retrieval metadata.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs
node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Result: exit 0; existing failure preservation, failure aggregate, and stage-gate artifact regressions still pass.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; full comathd default test chain passed with Phase 65 included.
```

Changed surfaces:

- Extended proof-memory failure events written by `recordFailedRoutes()` with statement hash, theorem/proposition route keys, manifest and candidate artifact paths, blockers, repair hints, supersession fields, final handoff pointer, and `proof_authority: "none"`.
- Added `readProofMemoryEvents()` and `retrieveSimilarFailedRoutes()` in `services/comathd/src/proof-kernel/ensemble/failure-aggregator.ts`.
- Retrieval matches exact locked statement hashes and similar theorem/proposition keys, while logging stale/superseded/unresolved-blocker warnings to `.comath/proof_memory/stale_or_superseded_warnings.jsonl`.
- The `knowledge_pack` campaign stage now calls proof-memory retrieval and writes match/warning summaries into `knowledge_pack.json` and the context-lake knowledge shard.
- Added `services/comathd/tests/unit/phase65-proof-memory-retrieval.test.mjs`, wired it into `@comath/comathd test`, and exposed `proof_memory_failed_route_retrieval` in service status.

Boundary notes: this task implements native failed-route retrieval for the current proof-kernel theorem-family campaign path. It does not yet add a broad vector/Trivium-backed proof-memory ranking layer, a full automatic repair loop, or a Pi-facing proof-memory browser.

Residual risks:

- Similarity is conservative and deterministic: exact statement hash or normalized theorem/proposition route keys. Richer semantic matching remains future work.
- Supersession is represented and warned on, but no dedicated repair command yet marks routes superseded automatically after a theorem repair; later repair-loop work should own that lifecycle.
- Task 9 should run the broader check-debug loop over proof-kernel, memory, campaign, and root surfaces.

## Goal 2 Task 7 / Phase 64 Lean Authority v2 Final Gate Hash Binding

Scope: harden the final Lean authority path so `formally_checked` promotion is bound not only to a passed replay manifest for the claim, but also to fresh, hash-bound final replay artifacts: replay stdout/stderr, final static audit, axiom profile, dependency closure, and statement-equivalence reports.

TDD evidence:

```text
node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs
Initial RED result: exit 1; the promotion gate accepted an old-format final replay manifest with `result: "pass"` but no hash-bound final replay reports, promoting the claim instead of rejecting it.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after schema, clean replay, gate, and test-chain updates.

node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs
Result: exit 0; Phase 64 rejects both old-format stale replay manifests and hash-bound replay manifests whose live replay log has drifted after import.

node services/comathd/tests/unit/phase31-lean-trust-profile.test.mjs
node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs
node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs
node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs
Result: exit 0; existing unauthorized construct, axiom-profile, statement-signature, alias, and registered-equivalence checks still pass.

node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Result: exit 0; final replay stage-run artifact paths remain claim-scoped after adding replay artifact hashes.

node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs
node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Result: exit 0; existing proof-kernel promotion boundaries and native v3 stage-gate artifact coverage still pass.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; full comathd default test chain passed with Phase 64 included.
```

Changed surfaces:

- Extended `FinalLeanReplay` with `artifact_hashes` for final replay stdout, stderr, static audit, axiom profile, dependency closure, and statement equivalence.
- Updated `runCleanLeanReplay()` to hash each final replay report after writing it and before serializing `final_replay_manifest.json`.
- Hardened the promotion gate with a fresh-artifact check that re-reads every path named by the final replay manifest and compares its current SHA-256 and size to the manifest-bound values.
- Added `formally_checked requires hash-bound fresh final replay artifacts` as a separate fail-closed veto while preserving the older `passed proof-kernel final replay manifest` veto for missing or invalid manifests.
- Added `services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs`, wired it into `@comath/comathd test`, and exposed `lean_authority_v2_final_gate_hash_binding` in service status.

Boundary notes: this task completes the high-value final promotion binding gap for the current native theorem-family Lean replay path. It does not broaden Lean theorem synthesis, add arbitrary-domain equivalence proof search, or replace the existing Phase 31/32/37/56 trust and statement-equivalence checks.

Residual risks:

- Dependency closure and axiom profile reports remain as strong native audit reports for the current generated Lean project, but deeper transitive Lake/mathlib provenance and richer proof-search-grade equivalence are still bounded by the existing implementation.
- Required negative GA slices still need a later consolidated Task 13 run to prove statement drift, cheating artifacts, false-theorem refutation, all-candidate failure recovery, and clean replay from snapshot as release-level slices.
- Failure-memory retrieval remains Task 8.

## Goal 2 Task 6 / Comprehensive Check-Debug Loop 2

Scope: second Goal 2 comprehensive check-debug loop over Tasks 4-5. This loop verifies the Phase 62 evidence-weighted decision forest and Phase 63 native stage-gate artifact guard together, then checks root build/typecheck/test, stage-gate outputs, failure preservation, no-premature-closure semantics, Pi thin-client boundaries, runtime artifact cleanliness, and documentation overclaim risk.

Verification evidence:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; comathd TypeScript build passed after Task 5 commit.

node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs
Result: exit 0; evidence-weighted arbitration still rejects score/vote-as-proof, routes refutation candidates to repair, and blocks no-proof batches.

node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Result: exit 0; native v3 stage-gate artifact coverage and missing-artifact rewind/blocker behavior still pass.

node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Result: exit 0; campaign state machine follows the v3 native gate sequence.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive formal campaign still reaches `completed_formal_proof`.

node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Result: exit 0; final replay and memory-update artifact paths remain claim-scoped and recorded.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; full comathd default test chain passed with Phases 62 and 63 included.

corepack pnpm build
Result: exit 0; root recursive build passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation all passed.
```

Audit scans:

```text
Test-Path D:\MATH _Studio\comath-pi-lab\.comath
Result: False; no runtime campaign state was left in the repository root.

git status -sb --ignored
Result: clean tracked tree; only ignored `.pnpm-store/`, `.worktrees/`, `extensions/comath-pi/dist/`, `node_modules/`, `services/comathd/dist/`, and `services/comathd/node_modules/` were present.

git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'
Result: no tracked runtime/build/dependency artifacts.

rg over Pi extension source for direct `.comath` writes
Result: no direct Pi runtime-state write APIs in source; `.comath` occurrences are capability/write-scope strings or tests. Pi remains a thin client over `comathd`.

rg over proof-kernel campaign and Phase 62/63 tests for stage blockers, proof authority, formal promotion, and memory update
Result: `stage_gate_blocker`, `MISSING_REQUIRED_STAGE_ARTIFACT`, `refutation_red_team`, `integration_refactor`, `memory_update`, and `target_status: "formally_checked"` are covered by service-owned campaign code and focused tests.

rg over docs/review files for GA/proof-authority overclaim language
Result: docs continue to describe global GA readiness, arbitrary theorem proving, broad MathProve proof authority, production Pi/Codex hardening, OS sandboxing, and broader theorem synthesis as deferred or not achieved.
```

Result: no high-risk regression was found, so no product-code repair was made in this loop. The Task 4-5 implementation is coherent with the current v3 direction, while remaining explicitly bounded to the registered theorem-family campaign slices and the current native stage-gate artifact guard.

Residual risks:

- Stage-gate blocker repair/resume remains a later product task; blocked campaigns preserve evidence and rewind target but do not yet have a dedicated gate repair command.
- Failure-memory retrieval and similar-obligation warning behavior remain Task 8.
- Lean Authority v2 stale-log, unauthorized-construct, dependency drift, axiom-profile mismatch, and statement mismatch negative slices remain Task 7 / Task 13.

## Goal 2 Task 5 / Phase 63 v3 Native Stage-Gate Artifact Coverage

Scope: add native, service-owned stage-gate artifact coverage for the v3 campaign path. This task turns the previous implicit/merged planning and review stages into explicit campaign stage runs for knowledge, notation, skeleton, line-map, refutation/red-team, integration/refactor, final replay evidence, and memory handoff, with fail-closed artifact guards.

TDD evidence:

```text
node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Initial RED result: exit 1; the campaign had no `knowledge_pack` stage run, proving the test hit the missing v3 native stage-gate behavior rather than an incidental assertion.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after stage-gate implementation.

node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Result: exit 0; Phase 63 proves the positive campaign records required v3 stage runs and artifacts, and deleting `.comath/campaign/<id>/proof/line_map.json` blocks candidate generation with `stage_gate_blocker.json` and rewind target `line_map_gate`.

node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Result: exit 0; public campaign state-machine regression now follows the v3 native gate sequence.

node services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs
Result: exit 0; proof-obligation DAG, skeleton, line-map, and obligation YAML artifacts remain generated and campaign-scoped after the stage split.

node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Result: exit 0; final replay stage runs now record final replay log, static audit, axiom profile, dependency closure, statement equivalence, and replay manifest paths, and memory update records its handoff artifacts.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive formal campaign vertical slice still reaches `completed_formal_proof`.

node services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs
Result: exit 0; exact refutation path still terminates as `completed_refutation`.

node services/comathd/tests/integration/phase23-ga-integrity-boundaries.test.mjs
Result: exit 0; unsupported and mismatched integrity-boundary cases still fail closed.

node services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs
Result: exit 0; campaign-scoped ensemble isolation still passes.

node services/comathd/tests/unit/phase60-v3-campaign-pause-resume.test.mjs
Result: exit 0; paused campaign tick guard still blocks mutation, and resume now continues into the v3 `knowledge_pack` stage.

node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs
Result: exit 0; evidence-weighted arbitration behavior still passes.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; default comathd test chain passed with Phase 63 included.
```

Changed surfaces:

- Added v3 native public campaign stages to the schema while keeping older compatibility stages accepted for persisted campaigns.
- Changed new campaign ticks to advance through `knowledge_pack -> notation_gate -> skeleton_gate -> line_map_gate -> candidate_generation -> candidate_verification -> candidate_arbitration -> refutation_red_team -> integration_refactor -> final_static_audit -> final_global_replay -> completed_formal_proof`, with a `memory_update` stage run recorded before terminal completion.
- Added stage artifacts for knowledge packs, notation definitions/shards, skeleton and line-map gates, mandatory red-team report, integration/refactor outputs, final replay evidence, proof-memory events, final handoff shard, and final replay snapshot manifest.
- Added a required-artifact guard before downstream stages. Missing artifacts now persist `.comath/campaign/<id>/stage_gate_blocker.json`, set non-terminal `status: "blocked"`, rewind `current_stage` to the producing gate, and record a blocked stage run for the attempted stage.
- Updated state-machine, DAG, pause/resume, and final replay artifact-path regressions to reflect the v3 stage split.

Boundary notes: this task implements native artifact coverage and fail-closed missing-artifact behavior for the current theorem-family campaign path. It does not yet solve broad theorem synthesis, full terminal-vocabulary aliasing from every external document, richer failure-memory retrieval, or the later Lean Authority v2 stale-artifact/unauthorized-construct negative slices.

Residual risks:

- Blocked stage-gate campaigns currently stop in `status: "blocked"` with a rewind target and recorded blocker; an explicit repair/resume API for re-running just the producing gate remains later product work.
- Some v3 artifacts are structured native handoff artifacts for the current elementary theorem-family path, not a general literature/RAG pipeline for arbitrary math domains.
- Final memory update records the formal proof handoff but does not yet retrieve similar failed routes for future obligations; that remains Task 8.

## Goal 2 Task 4 / Phase 62 v3 Evidence-Weighted Decision Forest

Scope: harden candidate arbitration so it follows the v3 rule that the decision forest is not proof authority and must not treat majority, raw score, or plausibility as proof. This task builds on Phase 61 manifest validation and closes the specific Task 4 gap: evidence-weighted selection, verified refutation priority, and no-proof recovery behavior.

TDD evidence:

```text
node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs
Initial RED result: exit 1; decision output did not expose `selection_mode: "evidence_weighted"` and lacked the v3 decision metadata/branch semantics expected by the new regression.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after decision forest changes.

node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs
Result: exit 0; Phase 62 decision-forest regression passed. It proves high-score plausible-only candidates cannot beat a kernel-checked candidate, verified refutation enters `repair_required`, and skeleton/plausible-only batches block with a recovery plan.

node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs
Result: exit 0; existing gate and statement-drift regressions still pass.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Result: exit 0; seven-failures-plus-one-Lean-pass ensemble recovery still selects the Lean-valid candidate and preserves failures.

node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs
Result: exit 0; v3 candidate manifest validation and failure aggregate contract still pass.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; default comathd test chain passed with Phase 62 included.
```

Changed surfaces:

- Extended `EnsembleDecision` with `selection_mode`, optional `refutation_candidate_id`, and `proof_authority: "none"`.
- Replaced score-only ordering with evidence-layered scoring over manifest-valid kernel-checked exact/equivalent candidates: kernel check, statement-equivalence claim, dependency/replay evidence, maintainability, dependency/lemma reuse, and only capped low-weight candidate score/agreement.
- Kept candidate/manifest hard vetoes, missing statement-hash binding, statement drift, non-proof-grade statement-equivalence claims, and unapproved introduced assumptions as disqualifiers for proof selection.
- Added a verified-refutation branch that returns no selected proof candidate, records `refutation_candidate_id`, sets gate result `repair_required`, and supplies theorem repair/counterexample recovery actions.
- Added a no-proof branch that blocks with explicit failure aggregation and split/repair/refutation recovery instructions.
- Added `services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs`, wired it into `@comath/comathd test`, and exposed `evidence_weighted_decision_forest` in service status.

Boundary notes: this decision forest remains an artifact selector, not proof authority. Final claim promotion still requires the ordinary CoMath proof-kernel replay and promotion gate. Agreement/raw score is capped as a tie-break-like weak signal and cannot select a non-proof-grade candidate.

Residual risks:

- The evidence scorer uses current manifest fields as proxy evidence. Later Lean Authority v2 work should hash-bind final replay, statement equivalence, dependency closure, and axiom-profile artifacts more tightly into candidate manifests and decisions.
- Verified refutation at the decision-forest layer routes to repair/counterexample protocol; full campaign-stage refutation/red-team artifact coverage is Task 5/Task 13 work.
- The current implementation does not yet persist a separate decision-forest score breakdown artifact for every candidate.

## Goal 2 Task 3 / Comprehensive Check-Debug Loop 1

Scope: perform the first Goal 2 comprehensive check-debug loop after Phase 60 and Phase 61. This loop verifies the new campaign pause/tick guard and v3 candidate-manifest/failure-aggregate contract against the current v3 GA scope without re-running the older Goal 1 audit as the development objective.

Verification evidence:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; comathd TypeScript build passed after Tasks 1-2.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

node services/comathd/tests/unit/phase60-v3-campaign-pause-resume.test.mjs
Result: exit 0; paused campaigns reject tick with no state/artifact mutation and resume continues the bounded tick path.

node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs
Result: exit 0; candidate manifests are validated before arbitration and failure aggregates preserve all-failure evidence.

node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs
Result: exit 0; proof-kernel gate boundaries and v3 manifest fixture compatibility still pass.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Result: exit 0; seven-failures-plus-one-Lean-pass recovery still passes.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive formal campaign vertical slice still passes.

corepack pnpm build
Result: exit 0; root recursive build passed.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed.

corepack pnpm test
Result: exit 0; root test chain passed, including Phase 0/design smoke, Pi package tests, comathd package tests through Phase 61, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation.
```

Static scan evidence:

```text
rg -n "applyGatePromotedClaim|promoteClaim\(|formally_checked|gate\.ok" services/comathd/src services/comathd/tests extensions/comath-pi/src README.md TODO.md REVIEW.md MATH_INTEGRITY_REVIEW.md SECURITY_REVIEW.md
Result: expected hits only in the promotion gate, campaign proof/refutation path, tests, and guardrail documentation. `applyGatePromotedClaim()` remains a low-level store primitive used by the gate-controlled promotion path and campaign proof-kernel paths; no new direct Pi or documentation-driven authority path was found.

rg -n "status\s*=" services/comathd/src services/comathd/tests
Result: ordinary local variables, assertions, replay metadata mutation in a test fixture, and campaign terminal checks only.

rg -n "\.status\s*=" services/comathd/src services/comathd/tests
Result: no direct claim-status assignment bypass found.

rg -n "\.comath|writeRuntimeFile|writeFileSync|mkdirSync|rmSync|unlinkSync|appendFileSync|createWriteStream" extensions/comath-pi/src extensions/tools
Result: expected documentation/subagent scoped-write strings only; no direct Pi trusted `.comath/` runtime-file mutation path found.

git ls-files .comath .tmp dist node_modules services/comathd/dist extensions/comath-pi/dist
Result: no tracked generated/runtime/dependency artifacts.

git ls-files -o --exclude-standard
Result: no untracked files before record edits.

Test-Path 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

Requirement drift result: Tasks 1-2 are aligned with Goal 2's v3 direction and do not overclaim full GA. Phase 60 closes a live resumability/control-plane defect by making paused ticks fail closed. Phase 61 makes candidate manifests and failed-route aggregates first-class audit objects before Task 4's deeper decision-forest hardening.

Boundary notes: no high-risk implementation defect was found during this check-debug loop, so no product code repair was required. A sidecar verifier attempt was launched but failed with upstream 429; the final result is based on local build/typecheck/test/static-scan evidence.

Residual risks:

- Pause/resume currently restores `running` and does not preserve a richer pre-pause substatus if future states such as `blocked` or `repairing` become pausable.
- Candidate manifests are structure- and identity-validated, but artifact descriptors are not yet content-hash bound to the decision record.
- The `candidate_verification` campaign artifact still summarizes stored `CandidateRun[]`; manifest validation is enforced at arbitration rather than at the earlier artifact-write boundary.
- Full evidence-weighted arbitration remains Task 4, not a completed property of Task 3.

## Goal 2 Task 2 / Phase 61 v3 Candidate Manifest And Failure Aggregate Contract

Scope: harden the existing 8-way theorem-family candidate path so candidate artifacts are not merely per-workspace files plus in-memory `CandidateRun` records. This task makes candidate manifests and failed-route aggregation first-class campaign-scoped audit objects before arbitration.

TDD evidence:

```text
node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs
Initial RED result: exit 1; `candidate_manifest.json` did not expose the required `state` field.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after schema, runner, arbiter, and failure aggregate changes.

node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs
Result: exit 0; Phase 61 v3 candidate manifest and failure aggregate tests passed.

node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs
Result: exit 0; hand-built candidate fixture now carries v3 manifests and the existing statement-drift rejection still passes.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Result: exit 0; existing seven-failures-plus-one-Lean-pass ensemble recovery still passes.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive formal campaign vertical slice still passes.

node services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs
Result: exit 0; campaign-scoped ensemble isolation still passes.

corepack pnpm --filter @comath/comathd test
Result: exit 0; default comathd test chain passed with Phase 61 included.
```

Changed surfaces:

- Extended `candidateManifestSchema` with `campaign_id`, `workspace_path`, `state`, `dependencies`, `assumptions`, and structured candidate artifact descriptors.
- Updated theorem-family candidate generation to write those fields into each `candidate_manifest.json`.
- Added arbitration preflight validation in `decideCandidate()` so missing or mismatched candidate manifests fail closed with `CANDIDATE_MANIFEST_INVALID`.
- Upgraded `recordFailedRoutes()` to return and persist a `FailureRouteAggregate` with clusters, failed candidate ids, hard vetoes, recommendations, proof authority `none`, event-log path, and aggregate path.
- Added `services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs`, wired it into `@comath/comathd test`, and exposed `candidate_manifest_v3_contract` plus `failure_route_aggregate_memory` in service status.

Boundary notes: this task does not implement Task 4's full evidence-weighted decision forest scoring matrix. It ensures the current arbiter can only operate over validated candidate manifests and that failed routes have an aggregate audit object.

Residual risks: candidate artifact descriptors currently list relative artifact paths and semantic kinds, not content hashes. Full manifest hashing, batch-level candidate index files, and decision-to-aggregate hash binding remain useful hardening targets for later tasks.

## Goal 2 Task 1 / Phase 60 v3 Campaign Pause-Tick Contract

Scope: continue the v3 GA development line without repeating the Goal 1 audit. This task closes a live ResearchCampaign control-plane gap: `/campaign/:id/pause` persisted `status: "paused"`, but `/campaign/:id/tick` still advanced trusted state and wrote the next stage artifact.

TDD evidence:

```text
node services/comathd/tests/unit/phase60-v3-campaign-pause-resume.test.mjs
Initial RED result: exit 1; paused campaign tick returned 200 instead of expected 409.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node services/comathd/tests/unit/phase60-v3-campaign-pause-resume.test.mjs
Result: exit 0; Phase 60 v3 campaign pause/resume tests passed.

node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Result: exit 0; existing v3 campaign state-machine regression still passed.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive formal campaign vertical slice still passed.
```

Changed surfaces:

- Added a fail-closed `tickCampaign()` guard for paused campaigns with code `CAMPAIGN_PAUSED` and HTTP 409 through the API error wrapper.
- Added `services/comathd/tests/unit/phase60-v3-campaign-pause-resume.test.mjs` proving paused ticks do not advance stage, append stage runs, or write the next proof-obligation artifact, and that resume permits the bounded tick to continue.
- Wired the regression into the default `@comath/comathd` test chain and exposed `campaign_pause_tick_guard` in service status.
- Updated `TODO.md` and `goal-2/tasks.md` to record the implemented v3 development step and remaining GA gaps.

Boundary notes: this task improves bounded/resumable campaign semantics. It does not claim full v3 GA completion, terminal-vocabulary compatibility with every external document, broad theorem synthesis, or native stage-gate coverage beyond the existing implemented slices.

Residual risks: the external v3 documents still name terminal states as `formal_proof_verified`, `verified_counterexample`, `user_visible_theorem_repair_required`, `replayable_environment_blocker`, and `user_cancelled`; the current API exposes the Goal 1 canonicalized names and needs a later compatibility/alignment task.

## Goal 1 Task 11 Final Product Completion Audit

Scope: final requirement-by-requirement completion audit for Goal 1 on branch `ga-v3-implementation-20260527`. The audited product claim is bounded to the current Research Alpha plus Phase 18-58 vertical-slice implementation. This audit does not claim global GA readiness, arbitrary theorem proving, MathProve proof authority, production Codex/Pi managed-service hardening, OS-enforced runner isolation, default native TriviumDB deployment, or broad statement-equivalence proof search.

Requirement matrix:

| Requirement | Final evidence | Result |
| --- | --- | --- |
| Preserve the existing repo, branch, git history, and Goal Mode workspace. | `git status -sb` started clean on `ga-v3-implementation-20260527`; `git log --oneline --decorate -8` showed the Task 10 documentation commits at HEAD; `goal-1/input.md`, `goal-1/plan.md`, and `goal-1/tasks.md` were re-read before this task. | Satisfied. |
| Produce a coherent bounded product, not a rough scaffold. | `README.md`, `TODO.md`, `docs/progress/product-readiness-matrix.md`, and `docs/architecture/acceptance-matrix.md` define Research Alpha plus Phase 18-58 as the bounded product; Tasks 4-10 audited Pi, service, gate, proof/runner, memory/artifact, and documentation surfaces. | Satisfied inside bounded scope. |
| Keep Pi as a thin client with no trusted-state authority. | Final Pi static scan over `extensions/comath-pi/src` and `extensions/tools` found only documentation strings, dashboard rendering text, service-authority metadata, and subagent forbidden-scope strings for `.comath`/service paths; no source-level direct `.comath` mutation was found. Root `corepack pnpm test` included Pi Phase 6, 8, 12, 15, 18, 22, 26, 30, 41-44, 46-51, and 59 tests plus the Phase 45 Pi/comathd e2e. | Satisfied. |
| Keep `comathd` as trusted runtime owner and preserve gates/path policy/AgentRun/replay integrity. | Root tests passed across comathd Phase 1-58 unit/integration chain, including path policy, claim gate, GraphPatch, snapshot/replay, proof-kernel, runner provenance, writer locks, AgentRun scheduler, Codex/Pi service surfaces, and MathProve final-audit runner coverage. | Satisfied. |
| Preserve mathematical authority boundaries. | Final privileged-status scan found ordinary `promoteClaim()` / `applyGatePromotedClaim()` / proof-kernel paths and paper read checks; focused `claim.status =` scan found no direct assignment bypass. MathProve overclaim scan left only explicit guardrail/deferred statements. | Satisfied. |
| Keep process execution fixed/validated and non-shell by default. | Final process scan found expected `spawn`/`spawnSync` uses in validated scheduler, health, package, adapter, and Lean runner boundaries; focused `shell:\s*true` scan returned no hits. | Satisfied. |
| Keep secrets and runtime/generated artifacts out of committed state. | Secret scan hits were policy text, scanner patterns, and deterministic fake test fixtures. `Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'` returned `False`; `git ls-files .comath .tmp dist node_modules services/comathd/dist extensions/comath-pi/dist` and `git ls-files -o --exclude-standard` returned no output. | Satisfied. |
| Preserve bounded non-goals rather than overclaim them as complete. | `TODO.md` and `docs/progress/product-readiness-matrix.md` classify broad theorem synthesis, broad MathProve authority, production Codex/Pi hardening, OS/network sandboxing, richer real-host Pi lifecycle, and broad statement-equivalence as deferred global-GA work. | Satisfied. |
| Run final full validation from the final worktree. | `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test` all exited 0 during Task 11. The root test covered Phase 0/design smoke, Pi tests through Phase 59, comathd Phase 1-58, Phase 45 install-session e2e, and Phase 17 integrity evaluation. | Satisfied. |

Final validation evidence:

```text
corepack pnpm build
Result: exit 0; workspace build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; workspace no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, Pi package tests through Phase 59, comathd Phase 1-58 unit/integration chain, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation passed.
```

Final cleanliness and safety evidence:

```text
Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False.

git status -sb --ignored
Result: clean tracked tree on ga-v3-implementation-20260527; only ignored .pnpm-store/, .worktrees/, node_modules/, and dist/ directories were present.

git ls-files .comath .tmp dist node_modules services/comathd/dist extensions/comath-pi/dist
Result: no tracked runtime/generated entries.

git ls-files -o --exclude-standard
Result: no untracked commit candidates.

rg -n 'shell:\s*true' services/comathd/src
Result: no hits.
```

Residual risks: the remaining risks are explicitly deferred global-GA items, not hidden missing features in the bounded product: broad theorem synthesis, broad MathProve proof authority, production Codex/Pi account/network/operator lifecycle hardening, OS-enforced process/network sandboxing, cross-process scheduler recovery, richer real-host Pi service lifecycle management, and broader statement-equivalence proof search.

## Goal 1 Task 10 Documentation Synchronization Review Log

Scope: synchronize the product-facing documentation after Goal 1 Tasks 4-9 so the README, design plan, mathematical-integrity review, acceptance matrix, risk register, product-readiness matrix, and design handoff agree with the current bounded Research Alpha plus Phase 18-58 product state.

Documentation changes:

- Added a README "Usable Product Entrypoints" section naming the current local product path: `comathd` owns trusted runtime state, the Pi package is the interaction layer, root/package validation gates are the executable checks, the Phase 45 local install-session e2e is the current installed-session path, and `.comath/` remains runtime-only.
- Updated `COMATH_PI_LAB_DEV_PLAN.md` from the stale Phase 18-28 status language to Phase 18-58, including optional TriviumDB target-platform evaluation, local Pi/comathd install-session e2e, AgentRun profile/adapter slices, Codex CLI/API adapter boundaries, Lean statement-binding extensions, and controlled MathProve evidence runners.
- Updated `MATH_INTEGRITY_REVIEW.md`, `docs/architecture/acceptance-matrix.md`, `docs/architecture/risk-register.md`, `docs/progress/product-readiness-matrix.md`, and `docs/progress/design-handoff.md` so the current deferred set is not confused with already implemented bounded slices.

Boundary notes:

- The synchronized docs still describe CoMath Pi Lab as a bounded local Research Alpha plus Phase 18-58 vertical-slice product, not global GA readiness.
- `formally_checked` still requires CoMath proof-kernel replay plus the ordinary gate; MathProve final-audit output remains runner evidence only.
- TriviumDB remains optional and adapter-bound; native evaluation does not make it the default backend.
- AgentRun/Codex/Pi outputs remain untrusted runtime material with `proof_authority=none`.
- Remaining deferred work includes broad theorem synthesis, broad MathProve proof authority, OS/network sandboxing, production account/network validation, indefinite operator sessions, richer real-host Pi service lifecycle management, cross-process scheduler recovery, and broader statement-equivalence proof search.

Verification commands for this task are recorded in `goal-1/tasks.md` Task 10.

## Phase 58 MathProve Final-Audit Runner Review Log

Scope: Phase 58 adds a controlled external runner bridge for `MathProve-Skill` `final_audit.py`. CoMath generates the final-audit steps JSON, owns the workspace, hashes replay input/steps/solution/stdout/stderr/result/script material, archives host-path-scrubbed reports as `external-final-audit`, and feeds final-audit vetoes into the ordinary promotion gate.

TDD evidence:

```powershell
node services/comathd/tests/unit/phase58-mathprove-final-audit-runner.test.mjs
```

Initial RED result: exit 1; `runMathProveFinalAuditExternal` was not exported.

Focused GREEN evidence after implementation:

```powershell
corepack pnpm --filter @comath/comathd build
node services/comathd/tests/unit/phase58-mathprove-final-audit-runner.test.mjs
```

Result: both exited 0. Phase 58 invokes the real sibling `MathProve-Skill` `scripts/final_audit.py`, receives a passed MathProve final-audit report for the deterministic SymPy smoke step, archives it without Windows host paths, records `steps_sha256` and `solution_sha256`, and still rejects formal promotion with `mathprove_final_audit_not_formal_authority` plus missing CoMath kernel evidence.

Implementation notes:

- Added `phase58-final-audit-v1`, runner id `mathprove-skill.final_audit`, backend `external-final-audit`, and export `runMathProveFinalAuditExternal()` in `services/comathd/src/verification/mathprove.ts`.
- Added `services/comathd/tests/unit/phase58-mathprove-final-audit-runner.test.mjs` to the default `@comath/comathd` test chain and status capability `mathprove_final_audit_external_runner`.
- Updated smoke checks, README, TODO, security review, mathematical-integrity review, acceptance matrix, AGENTS, and design handoff to reflect the new runner boundary.

Boundary: Phase 58 is not broad MathProve proof search and not a MathProve proof-authority path. Final-audit reports are runner evidence only; `formally_checked` still requires CoMath proof-kernel replay evidence and the ordinary gate.

## Phase 57 Lean Theorem Template Instantiation Review Log

Scope: Phase 57 extends the native theorem-family registry with a third service-owned Nat identity template, `nat_zero_add`. User goals for `0 + n = n` now lock a normalized statement, Lean target, candidate metadata, final replay manifest, and proof dependency using `Nat.zero_add`, then pass only through the existing clean Lean replay and claim promotion gates.

TDD RED evidence:

```text
node services/comathd/tests/integration/phase57-ga-theorem-template-instantiation.test.mjs
```

Result: exit 1; the campaign locked the raw user goal text instead of `For every natural number n, 0 + n = n.`, showing that `0 + n = n` was not yet recognized as a supported theorem-family template.

Focused GREEN evidence:

```text
corepack pnpm --filter @comath/comathd build
node services/comathd/tests/integration/phase57-ga-theorem-template-instantiation.test.mjs
node services/comathd/tests/integration/phase23-ga-theorem-family-generalization.test.mjs
node services/comathd/tests/integration/phase23-ga-integrity-boundaries.test.mjs
```

Result: all exited 0 after implementation. Phase 57 proves the `nat_zero_add` template completes full campaign replay and promotion, while Phase 23 regressions preserve the existing `nat_mul_zero`, unsupported-goal, mismatch, and refutation boundaries.

Implementation notes:

- Added `nat_zero_add` to the service-owned theorem-family registry with proposition `0 + n = n`, Lean target `theorem C0001 (n : Nat) : 0 + n = n`, proof term `Nat.zero_add n`, and dependency `Nat.zero_add`.
- Extended goal classification and obligation matching to include `nat_zero_add`.
- Added `services/comathd/tests/integration/phase57-ga-theorem-template-instantiation.test.mjs` to the default `@comath/comathd` test chain and status capability `proof_kernel_theorem_template_instantiation`.

Residual risk:

Phase 57 is a registry-bound theorem template instantiation slice. It is not arbitrary theorem synthesis, broad proof planning, model-generated Lean code acceptance, or a replacement for final clean replay. The global GA blocker remains for broad theorem synthesis beyond registered theorem-family templates.

## Phase 56 Registered Lean Logical-Equivalence Witnesses Review Log

Scope: Phase 56 adds a controlled logical-equivalence statement-binding path. `checkStatementEquivalence()` can now accept `logically_equivalent_with_registered_lemmas` only when an explicitly registered entry exactly matches the locked formal spec and extracted target signature, supplies `witness_kind: lean_kernel_checked_equivalence`, a witness artifact id, a valid SHA-256 witness artifact hash, non-empty lemma names, and a justification. Missing witness material or a target-signature mismatch remains fail-closed.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs
```

Result: exit 1; the accepted registered logical-equivalence case returned `fail` instead of `pass`, showing the pre-existing `logically_equivalent_with_registered_lemmas` status was only a type placeholder and had no implementation path.

Focused GREEN evidence:

```text
corepack pnpm --filter @comath/comathd build
node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs
node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs
node services/comathd/tests/unit/phase54-lean-declaration-parser.test.mjs
```

Result: all exited 0 after implementation. Phase 56 validates registered witness acceptance plus fail-closed missing hash, missing lemma, and wrong-target cases; Phase 37/54 regressions preserve alias and declaration-parser behavior.

Implementation notes:

- Added `StatementRegisteredLogicalEquivalence` and optional `allowed_registered_logical_equivalences` input.
- Added `registered_logical_equivalence` witness reports with witness kind, artifact id/hash, lemma names, and justification.
- Required exact formal-spec/target-signature matching and valid witness metadata before reporting `logically_equivalent_with_registered_lemmas`.
- Added `services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs` to the default `@comath/comathd` test chain and status capability `lean_registered_logical_equivalence_witnesses`.

Residual risk:

Phase 56 does not search for equivalence lemmas, prove transitive semantic equivalence, or broaden the trusted mathematical domain automatically. It is a registered, witness-backed statement-binding gate; final authority still requires clean Lean replay, static audit, dependency closure, axiom profile, and the ordinary claim promotion path.

## Phase 55 Runner Cross-Machine Replay Environment Gate Review Log

Scope: Phase 55 adds a replay-integrity gate for cross-machine/environment drift. Snapshot replay verification now compares each replay run's recorded Node version, platform, and architecture against the current process before runner re-execution. A mismatch fails closed with `runner_reexecution_environment_mismatch` and does not launch runner replay.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs
```

Result: exit 1; after tampering `manifest.replay.runs[].environment.platform` and recomputing the manifest hashes, `/replay/verify-manifest` still returned `ok=true`. This was the expected missing environment-drift gate failure.

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs
node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
```

Result: both exited 0 after implementation. The Phase 55 test verifies tampered-but-rehashed replay environment metadata fails closed before runner launch; the Phase 16 regression keeps existing strict replay behavior intact.

Implementation notes:

- Added replay-run environment comparison in `verifySnapshot()` for `node`, `platform`, and `arch`.
- Added veto `runner_reexecution_environment_mismatch` before runner re-execution summaries are launched.
- Added `services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs` to the default `@comath/comathd` test chain.
- Added status capability `runner_cross_machine_replay_environment_gate` and smoke/acceptance documentation.

Residual risk:

Phase 55 is a replay environment drift gate, not an OS-level sandbox, enforced network-denial layer, dependency installation resolver, signed snapshot protocol, or proof authority. It reduces cross-machine replay ambiguity for the implemented Python compute runners while leaving OS isolation and network enforcement as global GA blockers.

## Phase 54 Lean Declaration Parser Signature Fallback Review Log

Scope: Phase 54 adds a conservative Lean theorem/lemma declaration parser as a fallback for statement-equivalence binding when target `#check` output is absent. It parses declaration headers from Lean source, supports namespace-qualified theorem binding and multi-line binders, records `signature_source: lean_declaration_parser`, and preserves fail-closed behavior for ambiguous declarations and comment-only substring matches.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase54-lean-declaration-parser.test.mjs
```

Result: exit 1; the test failed because `extractLeanTheoremDeclarationSignature` was not exported. This was the expected missing-parser-entrypoint failure.

GREEN evidence:

```text
corepack pnpm --filter @comath/comathd build
node services/comathd/tests/unit/phase54-lean-declaration-parser.test.mjs
```

Result: both exited 0 after implementation; the focused test validates multi-line declaration parsing, namespace-qualified target binding, statement-equivalence fallback, ambiguous declaration rejection, and comment-only substring rejection.

Implementation notes:

- Added `extractLeanTheoremDeclarationSignature()` in `statement-signature.ts` for target theorem/lemma declaration headers.
- Extended `checkStatementEquivalence()` with optional `lean_source` and `signature_source` reporting.
- Kept existing `#check` output as the preferred source when available; declaration parsing is a fallback, not a replacement for Lean kernel checks.
- Wired Phase 54 into the default `@comath/comathd` test chain and status capability `lean_declaration_parser_signature_fallback`.

Residual risk:

This is not a full Lean elaborator, proof-producing definitional equality engine, transitive logical-equivalence system, or broad mathematical-domain trust profile. It improves target binding for declaration headers only; final authority remains clean Lean replay plus the existing gate path.

## Phase 53 Installed Codex CLI Validation Review Log

Scope: Phase 53 adds a service-owned validation path for an installed external Codex-compatible CLI. `validateExternalCodexCliInstallation()` resolves `COMATH_CODEX_CLI_PROGRAM` and optional service prefix args inside `comathd`, runs bounded `--version` and `--health --profile <profile>` probes with `COMATH_PROOF_AUTHORITY=none`, exposes `/agent/adapter/package/validate-installed-cli`, and records audit telemetry without returning the configured executable path.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase53-installed-codex-cli-validation.test.mjs
```

Result: exit 1; the test failed because `validateExternalCodexCliInstallation` was not exported. This was the expected missing-product-entrypoint failure.

GREEN evidence:

```text
corepack pnpm --filter @comath/comathd build
node services/comathd/tests/unit/phase53-installed-codex-cli-validation.test.mjs
```

Result: both exited 0 after implementation; the focused test validates configured CLI version/health probes, fail-closed missing configuration, route exposure, audit event emission, executable-path non-disclosure, and `proof_authority=none`.

Implementation notes:

- Added `validateExternalCodexCliInstallation()` and exported typed installed-CLI validation/probe result shapes from the agent adapter package module.
- Added `POST /agent/adapter/package/validate-installed-cli` as a service-side endpoint; callers provide adapter/profile/project metadata and timeout, not executable paths.
- Added audit event `agent_adapter.installed_codex_cli_validated` keyed by project id, with package/profile ids, probe booleans, health version/capabilities, diagnostics, and `proof_authority=none`.
- Wired Phase 53 into the default `@comath/comathd` test chain and status capability `installed_codex_cli_validation`.

Residual risk:

Phase 53 validates a service-configured installed CLI contract with bounded probes, but it is not a live production Codex API account/network validation, streaming operator UX, credential rotation workflow, OS-enforced adapter isolation, or proof authority. Probe stdout/stderr and health metadata remain runtime diagnostics only.

## Phase 52 Codex API Retry And Rate-Limit Telemetry Review Log

Scope: Phase 52 hardens the Phase 51 `codex-api` backend with bounded retry behavior and operator-visible telemetry. The backend retries only retryable statuses (`429`, `5xx`), honors capped `Retry-After`, records attempt counts/status sequences/rate-limit detection in report and audit payloads, and fails closed after exhausted attempts without exposing service API keys.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase52-codex-api-retry-telemetry.test.mjs
Result: exit 1; the first injected 429 caused the Codex API backend AgentRun to fail instead of retrying and succeeding on the second attempt.
```

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase52-codex-api-retry-telemetry.test.mjs
Result: exit 0; 429 recovery, attempt/status telemetry, rate-limit report fields, exhausted 503 fail-closed behavior, `agent_adapter.codex_api_invoked` and `agent_adapter.codex_api_failed` audit events, and API-key non-disclosure passed.
```

Implementation summary:

- Added `COMATH_CODEX_API_MAX_ATTEMPTS` parsing with a conservative bounded range.
- Added retry handling for `429` and `5xx` Codex API backend responses with capped `Retry-After` delays.
- Added attempt/status/rate-limit telemetry to Codex API reports and audit events.
- Added fail-closed exhausted-attempt stderr diagnostics and `agent_adapter.codex_api_failed` audit events.
- Wired Phase 52 into the default `@comath/comathd` test chain and smoke status capability `codex_api_retry_telemetry`.

Boundary notes:

Phase 52 improves production reliability semantics, but it is still not live production API/network validation, streaming Responses API support, credential rotation UX, or proof authority. API output and retry telemetry remain AgentRun runtime material with `proof_authority=none`.

Residual risks:

- No live production OpenAI account/network call was run in this phase; tests use an injected client.
- Streaming Responses API handling, production quota dashboards, credential rotation UX, and installed production Codex CLI validation remain deferred.
- OS-enforced adapter isolation and network-denial policy remain deferred.

## Phase 51 Service-Configured Codex API Backend Contract Review Log

Scope: Phase 51 adds a `codex-api` backend option to the service-owned `codex-cli` adapter package. The backend is configured by `comathd` environment (`COMATH_CODEX_API_KEY`, optional base URL/model), exposes only secret-free launch metadata, executes through a Responses-compatible client boundary with test injection, and wraps output as non-authoritative AgentRun report/log material. Pi can select `--backend codex-api`, but cannot supply API keys, base URLs, executable paths, or proof authority.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase51-codex-api-backend.test.mjs
Result: exit 1; `setCodexApiBackendClientForTests` was not exported before implementation.

node extensions/comath-pi/tests/phase51-codex-api-backend-tools.test.mjs
Result: exit 1; `codex-api` was not present in packaged-adapter backend tool schemas before implementation.
```

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase51-codex-api-backend.test.mjs
Result: exit 0; service-configured Codex API backend execution, secret-free prepare payloads, injected Responses-compatible request shape, missing-key fail-closed behavior, audit events, and `proof_authority=none` report wrapping passed.

node extensions/comath-pi/tests/phase51-codex-api-backend-tools.test.mjs
Result: exit 0; Pi backend enum, prepare/execute POST payloads, command dispatch, host confirmation path, and absence of API-key/base-URL fields passed.
```

Implementation summary:

- Added `codex-api` as an `AgentAdapterBackend` for the service-owned `codex-cli` package.
- Added `setCodexApiBackendClientForTests()` and a default HTTPS `/responses` client boundary for service-configured API execution.
- Kept launch envelopes secret-free: they expose `COMATH_CODEX_API_KEY_REF`, configured flags, model metadata, and `proof_authority=none`, but not the API key value.
- Executed Codex API backend runs through AgentRun lifecycle (`startAgentRun()`/`submitAgentRunReport()`), `.tmp/comath/<ARUN>/logs`, audit events, and non-authoritative report wrapping.
- Added Pi `codex-api` backend selection for packaged adapter prepare/execute tools and `/cm:agent prepare-package|execute-package --backend codex-api`.

Boundary notes:

Phase 51 is not a proof-authority backend and not a production account/network validation claim. The API response is untrusted AgentRun material with `proof_authority=none`; it cannot certify claims, apply GraphPatch, select proof candidates as authoritative, or replace Lean replay/static audit. Real production API credential validation, streaming API UX, retry/backoff policy, and provider-specific quota/error observability remain future hardening work.

Residual risks:

- No live production OpenAI account/network call was run in this phase; tests use an injected Responses-compatible client.
- Streaming Responses API handling, credential-rotation UX, and production quota dashboards remain deferred.
- OS-enforced adapter isolation and production installed Codex CLI validation remain deferred.

## Phase 50 Bounded Multi-Event AgentRun Log Session Review Log

Scope: Phase 50 extends the Phase 46/47 log surfaces from single cursor reads and one-frame SSE snapshots to a bounded multi-event SSE response. The service emits multiple `agent_run.log_chunk` frames by advancing stdout/stderr cursors through `streamAgentRunLogs()`, stops at `max_events`, terminal completion, or no cursor progress, and records `agent_run.logs_sse_session`. Pi exposes the read-only surface as `comath.agent.logSession` and `/cm:agent log-session` through `getText()`.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase50-agent-log-session.test.mjs
Result: exit 1; `formatAgentRunLogSseSession` was not exported before implementation.

node extensions/comath-pi/tests/phase50-agent-log-session-tools.test.mjs
Result: exit 1; `comath.agent.logSession` was not registered before implementation.
```

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase50-agent-log-session.test.mjs
Result: exit 0; bounded multi-event SSE log-session formatting, route handling, max-event limiting, completion/no-progress termination, audit events, and `proof_authority=none` payloads passed.

node extensions/comath-pi/tests/phase50-agent-log-session-tools.test.mjs
Result: exit 0; Pi tool schema, text GET routing, runtime registration, `/cm:agent log-session`, and operator notification output passed.
```

Implementation summary:

- Added `formatAgentRunLogSseSession()` in AgentRun observability on top of cursor-bounded `streamAgentRunLogs()`.
- Added `GET /agent/run/:id/log-session` returning `text/event-stream` and service status capability `agent_run_log_session_sse`.
- Added Pi `comath.agent.logSession` and `/cm:agent log-session` as read-only text-client surfaces.
- Wired Phase 50 focused tests into the default `@comath/comathd` and `@comath/pi-extension` test chains.

Boundary notes:

Phase 50 is a bounded multi-event SSE response, not an indefinite browser-held WebSocket/SSE operator session, terminal emulator, cross-process scheduler channel, or proof-authority path. Log-session frames remain observability artifacts with `proof_authority=none`; they cannot certify claims, apply GraphPatch, promote candidate correctness, or replace Lean replay/static audit.

Residual risks:

- Indefinite WebSocket/SSE sessions and richer browser/operator UX remain deferred.
- Cross-process scheduler recovery and cancellation remain deferred.
- Production Codex CLI/API validation and OS-enforced adapter isolation remain deferred.

## Phase 49 Scheduler-Backed AgentRun Operator Cancellation Review Log

Scope: Phase 49 turns the Phase 48 operator panel's cancellation placeholder into a real same-process control path. The service now keeps an active scheduler registry for launched AgentRuns, exposes `cancelAgentRunFromOperator()` plus `POST /agent/run/:id/cancel`, and enables panel cancellation only while the active registry can prove that the run is cancellable. Pi exposes the control as a host-confirmed mutation via `comath.agent.cancelRun` and `/cm:agent cancel`.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase49-agent-operator-cancel.test.mjs
Result: exit 1; `cancelAgentRunFromOperator` was not exported before implementation.

node extensions/comath-pi/tests/phase49-agent-operator-cancel-tools.test.mjs
Result: exit 1; `comath.agent.cancelRun` was not registered before implementation.
```

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase49-agent-operator-cancel.test.mjs
Result: exit 0; long-running adapter execution became cancellable through the active scheduler registry, `POST /agent/run/:id/cancel` returned `proof_authority=none`, persisted the run as `cancelled`, emitted audit events, and panel cancellation disabled after terminal state.

node extensions/comath-pi/tests/phase49-agent-operator-cancel-tools.test.mjs
Result: exit 0; Pi cancel tool schema, required host confirmation, POST route payload, runtime registration, `/cm:agent cancel`, and operator notification output passed.
```

Implementation summary:

- Added an active scheduler registry in `agent-run-scheduler.ts` keyed by project root, project id, and AgentRun id.
- Added `isAgentRunCancellableByOperator()` and `cancelAgentRunFromOperator()` with fail-closed terminal/non-registry rejection.
- Added `POST /agent/run/:id/cancel` and service status capability `agent_run_operator_cancel`.
- Updated operator panels so `cancel.enabled=true` only for same-process active registry runs.
- Added Pi `comath.agent.cancelRun` and `/cm:agent cancel` behind host confirmation.
- Wired Phase 49 focused tests into the default `@comath/comathd` and `@comath/pi-extension` test chains.

Boundary notes:

Phase 49 is not cross-process cancellation, a persistent operator session, a terminal emulator, or a proof-authority path. Cancellation requires the active scheduler registry in the current `comathd` process; stale, terminal, or non-registry AgentRuns fail closed. Cancellation results remain runtime control metadata with `proof_authority=none` and cannot certify claims, apply GraphPatch, or replace Lean replay/static audit.

Residual risks:

- Cross-process cancellation and durable scheduler recovery remain deferred.
- Persistent multi-event WebSocket/SSE operator sessions remain deferred.
- Production Codex CLI/API validation and OS-enforced adapter isolation remain deferred.
## Phase 48 AgentRun Operator Panel Review Log

Scope: Phase 48 adds a service-owned AgentRun operator panel read model on top of Phase 46/47 log observability. The panel aggregates AgentRun status, cursor log stream metadata, SSE subscription snapshot metadata, endpoint hints, and action availability while keeping `proof_authority=none`. Cancellation is explicitly reported as unavailable unless a future real scheduler registry can prove live cancellability; this phase does not fake cross-process cancellation.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase48-agent-operator-panel.test.mjs
Result: exit 1; `readAgentRunOperatorPanel` was not exported before implementation.

node extensions/comath-pi/tests/phase48-agent-operator-panel-tools.test.mjs
Result: exit 1; `comath.agent.operatorPanel` was not registered before implementation.
```

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase48-agent-operator-panel.test.mjs
Result: exit 0; service operator panel aggregation, route handling, disabled-cancel semantics, audit event, endpoint metadata, and `proof_authority=none` passed.

node extensions/comath-pi/tests/phase48-agent-operator-panel-tools.test.mjs
Result: exit 0; Pi tool schema, JSON GET route payload, runtime registration, `/cm:agent panel`, and operator notification output passed.
```

Implementation summary:

- Added `readAgentRunOperatorPanel()` in AgentRun observability.
- Added `GET /agent/run/:id/operator-panel`, audit event `agent_run.operator_panel_read`, and service status capability `agent_run_operator_panel`.
- Added Pi `comath.agent.operatorPanel` and `/cm:agent panel` as read-only operator surfaces.
- Wired Phase 48 focused tests into the default `@comath/comathd` and `@comath/pi-extension` test chains.

Boundary notes:

Phase 48 is a read-only operator control panel, not a live terminal, not an indefinite browser-held SSE/WebSocket session, and not a scheduler-registry-backed cancellation API. Operator panel payloads remain observability metadata with `proof_authority=none`; they cannot certify claims, apply GraphPatch, mutate `.comath/` directly from Pi, or replace final Lean replay/static audit.

Residual risks:

- True scheduler-backed live cancellation remains deferred until a service-owned active scheduler registry exists.
- Persistent multi-event WebSocket/SSE sessions remain deferred.
- Production Codex CLI/API validation and OS-enforced adapter isolation remain deferred.
# REVIEW

## Phase 47 SSE-Style AgentRun Log Subscription Review Log

### Scope

Phase 47 adds an SSE-compatible AgentRun log subscription snapshot on top of Phase 46 cursor polling. The service exposes `formatAgentRunLogSseSnapshot()` and `GET /agent/run/:id/log-subscription`, returning `text/event-stream` frames with `retry`, `event: agent_run.log_chunk`, an event id bound to the run and next cursors, JSON `data`, audit events, and `proof_authority=none`. Pi exposes the same read-only surface through `comath.agent.subscribeLogs`, `createComathClient().getText()`, and `/cm:agent subscribe-logs`.

### TDD Evidence

Initial service RED result:

```text
node services/comathd/tests/unit/phase47-agent-log-subscription.test.mjs
Result: exit 1; `formatAgentRunLogSseSnapshot` was not exported before implementation.
```

Initial Pi RED result:

```text
node extensions/comath-pi/tests/phase47-agent-log-subscription-tools.test.mjs
Result: exit 1; `comath.agent.subscribeLogs` was not registered before implementation.
```

Focused validation:

```text
node services/comathd/tests/unit/phase47-agent-log-subscription.test.mjs
Result: exit 0; SSE-compatible service log snapshot formatting, route headers/body, audit event emission, and non-authoritative metadata passed.

node extensions/comath-pi/tests/phase47-agent-log-subscription-tools.test.mjs
Result: exit 0; Pi text client, tool schema, text route payload, runtime registration, `/cm:agent subscribe-logs`, and operator notification output passed.
```

### Implementation Notes

- Added `formatAgentRunLogSseSnapshot()` to `services/comathd/src/agents/agent-run-observability.ts`.
- Added `GET /agent/run/:id/log-subscription`, `text/event-stream` response support in the local server wrapper, audit event `agent_run.logs_sse_snapshot`, and service status capability `agent_run_log_subscription_sse`.
- Added Pi `ComathClient.getText()`, `comath.agent.subscribeLogs`, and `/cm:agent subscribe-logs`.
- Wired Phase 47 focused tests into the default `@comath/comathd` and `@comath/pi-extension` test chains.

### Boundary Statement

Phase 47 is an SSE-compatible snapshot frame, not an indefinite server loop, browser UI, or terminal session. It gives operators a real `text/event-stream` surface that can be polled or composed by a host, while all frame payloads remain untrusted observability material with `proof_authority=none`.

### Residual Risks

- Persistent multi-event WebSocket/SSE sessions and richer operator controls remain deferred.
- Production Codex API/backend validation and installed production Codex CLI validation remain deferred.
- OS-level process isolation and network-denial enforcement remain deferred.

## Phase 46 Cursor-Based AgentRun Log Stream Review Log

### Scope

Phase 46 adds service-owned cursor polling for AgentRun stdout/stderr logs. It exposes `streamAgentRunLogs()` and `GET /agent/run/:id/log-stream` with independent stdout/stderr byte cursors, bounded chunks, next cursors, terminal completion detection, audit events, and `proof_authority=none`. Pi exposes the same read-only path through `comath.agent.streamLogs` and `/cm:agent stream`.

### TDD Evidence

Initial service RED result:

```text
node services/comathd/tests/unit/phase46-agent-log-stream.test.mjs
Result: exit 1; `streamAgentRunLogs` was not exported before implementation.
```

Initial Pi RED result:

```text
node extensions/comath-pi/tests/phase46-agent-log-stream-tools.test.mjs
Result: exit 1; `comath.agent.streamLogs` was not registered before implementation.
```

Focused validation:

```text
node services/comathd/tests/unit/phase46-agent-log-stream.test.mjs
Result: exit 0; cursor-based service log streaming, route handling, invalid-cursor rejection, audit event emission, and non-authoritative metadata passed.

node extensions/comath-pi/tests/phase46-agent-log-stream-tools.test.mjs
Result: exit 0; Pi tool schema, GET route payload, runtime registration, `/cm:agent stream`, and operator notification output passed.
```

### Implementation Notes

- Added `streamAgentRunLogs()` to `services/comathd/src/agents/agent-run-observability.ts`.
- Added `GET /agent/run/:id/log-stream` and service status capability `agent_run_log_stream_cursor`.
- Added Pi `comath.agent.streamLogs` and `/cm:agent stream` as read-only operator polling surfaces.
- Wired Phase 46 focused tests into the default `@comath/comathd` and `@comath/pi-extension` test chains.

### Boundary Statement

Phase 46 is cursor-based polling, not WebSocket/SSE subscription and not an interactive terminal. It improves operator observability beyond one-shot capped reads, but streamed log chunks remain untrusted runtime artifacts with `proof_authority=none`; they cannot promote claims, certify proofs, apply GraphPatch, or replace proof-kernel replay.

### Residual Risks

- Continuous subscription transport, richer operator controls, and production Codex CLI/API validation remain deferred.
- OS-level process isolation and network-denial enforcement remain deferred.
- Cursor values are byte offsets into UTF-8 log files; callers should treat chunk text as display material, not a proof artifact.

## Phase 45 Pi/comathd Install-Session E2E Review Log

### Scope

Phase 45 adds a root-level local install-session e2e that crosses the package boundary: it starts a real `comathd` HTTP server, imports the built Pi extension from `extensions/comath-pi/package.json` `pi.extensions[0]`, registers the extension into a fake Pi host, and drives campaign/agent command flows through `createComathClient({ baseUrl })` rather than mocked client calls.

### TDD Evidence

Initial RED/debugging results:

```text
node tests/e2e/phase45-pi-comathd-install-session.test.mjs
Result: exit 1; the test initially assumed a nonexistent `details.project.project_id` field, exposing the real `/campaign/start` return shape.

node tests/e2e/phase45-pi-comathd-install-session.test.mjs
Result: exit 1; the install-session command used invalid run id `ARUN-PHASE45`, and comathd correctly rejected it against the stable-id regex.
```

Final focused validation:

```text
node tests/e2e/phase45-pi-comathd-install-session.test.mjs
Result: exit 0; real HTTP comathd server, built Pi entrypoint import, fake Pi host registration, live client wiring, host confirmation, campaign start/status/tick, agent package listing, packaged adapter prepare-launch, project status, and resources discovery passed.
```

### Implementation Notes

- Added `tests/e2e/phase45-pi-comathd-install-session.test.mjs`.
- Wired the Phase 45 e2e into root `corepack pnpm test` after workspace package tests and before Phase 17 evaluation.
- Verified the installed-session path preserves `rpm=4`, `comathd_only` trusted-state access, Pi host confirmation for mutating tools/commands, operator notifications, and non-authoritative packaged adapter launch visibility.

### Boundary Statement

Phase 45 is an automated local install-session e2e, not a full manual real-host Pi UX certification. It proves the built extension and local service can run through a realistic HTTP session with host-confirmed mutations. Richer operator UI, service lifecycle management, and real Pi host manual install walkthrough remain separate GA hardening targets.

## Phase 44 Codex CLI External Adapter Invocation Review Log

### Scope

Phase 44 upgrades the service-owned `codex-cli` package from bundled-launcher-only execution to an optional external Codex-compatible CLI backend. The external backend is enabled only by service environment configuration (`COMATH_CODEX_CLI_PROGRAM`, plus optional JSON `COMATH_CODEX_CLI_PREFIX_ARGS`), then selected by package prepare/execute inputs with `backend: "external"`. Pi can select the backend but cannot provide arbitrary external program paths.

### TDD Evidence

Initial service RED result:

```text
node services/comathd/tests/unit/phase44-codex-cli-external-invocation.test.mjs
Result: exit 1; COMATH_CODEX_ADAPTER_BACKEND was undefined in the prepared package launch envelope.
```

Initial Pi RED result:

```text
node extensions/comath-pi/tests/phase44-agent-adapter-external-tools.test.mjs
Result: exit 1; prepareAdapterPackage tool schema did not expose a backend enum.
```

### Implementation Notes

- Added `backend?: "bundled" | "external"` to package prepare/execute inputs and route payloads.
- Added service-side external CLI resolution from `COMATH_CODEX_CLI_PROGRAM`, requiring an absolute existing path and recording the realpath in the launcher environment.
- Added optional `COMATH_CODEX_CLI_PREFIX_ARGS` as a JSON string array for fixed service-owned prefix args, used by tests to execute a fake `.mjs` CLI through the current Node runtime without exposing arbitrary shell strings.
- Extended the bundled `codex-cli-adapter.mjs` to invoke the external program with `spawnSync`, `shell:false`, AgentRun-scoped cwd, bounded output capture, fixed argv (`--profile`, `--role`, `--goal-file`, `--context`, `--prompt-file`), and `COMATH_PROOF_AUTHORITY=none`.
- Wrapped external stdout/stderr as untrusted AgentRun report material under `external_output_untrusted: true`; the report still states no claim promotion, no GraphPatch authority, and no proof authority.
- Added Pi `backend` enum schema and `/cm:agent prepare-package|execute-package --backend external` passthrough while preserving host confirmation for mutating operations.
- Added `codex_cli_external_adapter_invocation` to service status and wired Phase 44 tests into default package test chains.

### Boundary Statement

The external backend is runtime orchestration only. It can produce draft agent material through a service-configured Codex-compatible CLI, but it cannot promote claims, certify proofs, apply GraphPatch, mutate trusted state directly, or replace Lean-backed final replay. Missing external CLI configuration fails closed as a durable failed AgentRun.

### Residual Risks

- Phase 44 validates against a fake Codex-compatible CLI, not an installed production Codex CLI or a real Codex API backend.
- Streaming/subscription log UX, richer operator controls, and OS-enforced adapter isolation remain deferred.
- External CLI network denial is not OS-enforced by this phase; the current boundary is fixed argv, scoped cwd, scheduler timeout/cancellation, rpm=4, and non-authoritative wrapping.

### Focused Validation

Fresh focused validation completed on 2026-05-28:

```text
node services/comathd/tests/unit/phase43-agent-adapter-package.test.mjs
Result: exit 0; bundled package lifecycle remains compatible after the v2 launcher health version update.

node services/comathd/tests/unit/phase44-codex-cli-external-invocation.test.mjs
Result: exit 0; external CLI backend invokes fixed service-configured argv, wraps output as untrusted, and fails closed when unconfigured.

node extensions/comath-pi/tests/phase43-agent-adapter-package-tools.test.mjs
Result: exit 0; default packaged adapter Pi tools still omit backend when unspecified.

node extensions/comath-pi/tests/phase44-agent-adapter-external-tools.test.mjs
Result: exit 0; Pi tools and `/cm:agent` commands pass `backend: external` without exposing program paths.
```

## Phase 0 Review Log

### Scope

Bootstrap only. No claim registry, verification gate, memory backend, MathProve bridge, compute runner, workstream lifecycle, or Pi runtime integration has been implemented.

### Runtime Assumptions

- Node detected locally before bootstrap: `v22.22.0`.
- npm detected locally before bootstrap: `10.9.4`.
- standalone `pnpm.cmd` was not on PATH.
- Corepack is available and reported `pnpm 11.3.0`.
- Pi ecosystem package versions checked before bootstrap included `@earendil-works/pi-agent-core@0.75.5`, `@earendil-works/pi-coding-agent@0.75.5`, and `@earendil-works/pi-tui@0.75.5`.
- TriviumDB registry check reported `triviumdb@0.7.1`.

### External Boundary Notes

- Pi official docs are normative for extension APIs. `buyixian/pi-ecosystem-docs` is useful taxonomy but may drift.
- TriviumDB is alpha/native and remains optional behind an adapter.
- AI co-mathematician arXiv:2605.06651 v2 is workflow inspiration only; no DeepMind performance or discovery claims are reproduced.
- MathProve-Skill is treated as an evidence producer and gate runner.

### Validation Commands

Phase 0 validation completed on 2026-05-25:

```text
corepack pnpm install
Result: exit 0; installed TypeScript 5.9.3; generated pnpm-lock.yaml.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; root Phase 0 smoke check passed for 19 required entries and 5 invariants; comathd Phase 0 smoke test passed.
```

### Risks

- Pi permission and subagent APIs must be revalidated before Phase 6; current docs support permission-gate patterns, not necessarily a separate stable permission subsystem.
- TriviumDB native loading must be probed on the target platform before any backend is enabled by default.
- Future agents must not edit `D:\MATH _Studio\math_studio` for this project.

### Phase 0 Changed Files

Created root documentation, workspace package files, ADRs, integration notes, skeleton extension/schema/test directories, `services/comathd` TypeScript package skeleton, root smoke test, Phase 0 handoff, and `pnpm-lock.yaml`.

### Next Phase Readiness

Ready for Phase 1 only: contracts, IDs, schemas, statement normalization/hash, and GraphPatch contract. Do not start service routes, memory backends, gates, or Pi runtime registration in Phase 1.

## Design Documentation Review Log

### Scope

Completed the whole project design and target goal documentation. This is a design/documentation deliverable, not Phase 1 implementation.

### Added Design Artifacts

- `COMATH_PI_LAB_DEV_PLAN.md`: complete target architecture, phase roadmap, milestones, and design completion criteria.
- `CODEX_GOAL_RUNBOOK.md`: Phase 0-17 goal templates, constraints, validation, stop rules, agent matrix, and anti-patterns.
- `docs/architecture/end-state-blueprint.md`: final system behavior and data/control flow.
- `docs/architecture/acceptance-matrix.md`: evidence required for design, phase, milestone, security, and mathematical-integrity acceptance.
- `docs/architecture/risk-register.md`: risk register for Pi API drift, TriviumDB native dependency, MathProve overclaiming, unsafe shell execution, paper overclaiming, workstream graph pollution, and context overflow.
- `docs/architecture/agent-operating-model.md`: subagent roles, write scopes, output contracts, and conflict rules.
- `docs/progress/design-handoff.md`: current state and next action for future sessions.
- `docs/superpowers/plans/2026-05-25-full-design-documentation.md`: implementation plan for completing the design documentation goal.

### Validation Commands

Design documentation validation completed on 2026-05-25:

```text
corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 15 invariants; comathd Phase 0 smoke test passed.
```

The first sandboxed validation attempt failed because pnpm tried to `lstat C:\Users\derst`; the same commands passed after using the approved `corepack pnpm` execution path.

### Required Follow-Up

Phase 1 should still be treated as a separate implementation goal. Do not infer from complete design docs that contracts or schemas are already implemented.

## Concurrency Policy Update

The user explicitly allowed high concurrency: `rpm=1000`, reasoning effort `high`.

Superseded on 2026-05-27: the active GA goal uses global `rpm=4` with reasoning effort `high`. Current coordination docs (`AGENTS.md`, `CODEX_GOAL_RUNBOOK.md`, `docs/architecture/agent-operating-model.md`, `docs/architecture/risk-register.md`, and `docs/progress/design-handoff.md`) now treat `rpm=4` as authoritative for Phase 18 and later work.

This has been written into:

- `CODEX_GOAL_RUNBOOK.md`
- `docs/architecture/agent-operating-model.md`
- `docs/architecture/risk-register.md`
- `docs/progress/design-handoff.md`

Operational interpretation: use high fan-out for read-only reviews and disjoint write scopes; do not let subagents edit the same public schema, route, path policy, claim gate, migration, GraphPatch apply contract, or root package file.

## Phase 1 Review Log

### Scope

Implemented contracts, IDs, schemas, statement normalization/hash, JSON schema files, and GraphPatch non-promotion constraints. No service routes, memory adapters, claim gates, Pi runtime integration, or MathProve bridge were implemented.

### Validation Commands

Phase 1 validation completed on 2026-05-25 and rerun after integrity hardening:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0 smoke test passed; Phase 1 contract/schema tests passed.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; Phase 0/design smoke check passed; comathd Phase 0 smoke test passed; Phase 1 contract/schema tests passed.
```

### Changed Files

- Added TypeScript/Zod contracts in `services/comathd/src/types/`.
- Added ID and statement hash utilities in `services/comathd/src/utils/`.
- Added StableIdMap placeholder type in `services/comathd/src/db/stable-id-map.ts`.
- Added root JSON schema files under `schemas/`.
- Added Phase 1 contract/schema tests.
- Hardened `claimSchema` and `graphPatchSchema` so GraphPatch cannot directly mutate protected claim promotion fields and privileged claim statuses require gate metadata.

### Remaining Risk

JSON schema files are currently manually aligned with Zod schemas. A later phase should add schema generation or a drift check before treating them as generated artifacts.

Phase 4 must still implement service-level promotion transitions. Schema-level checks are necessary but not sufficient as the only enforcement layer.

## Subagent Reports Incorporated

Read-only reports received and incorporated into boundary planning:

- security-auditor: Phase 2-4 path policy, artifact import, runner envelope, gate, `.comath/` ownership, and TriviumDB native-risk requirements were written into `SECURITY_REVIEW.md`.
- math-integrity-auditor: GraphPatch and privileged claim status hardening were implemented and written into `MATH_INTEGRITY_REVIEW.md`.
- service-engineer/repo-architect: Phase 2 implementation checklist will guide path-policy, runtime, project lifecycle, and server-route work.
- memory-db-engineer: Phase 5 will use `ResearchMemoryDB`, in-memory first, TriviumDB unavailable shim until Phase 13, and route edits remain out of memory engineer scope.
- pi-extension-engineer: Phase 6 will keep Pi extensions as a thin client over `comathd` and will not write `.comath/` or mutate claim status directly.

## Phase 2 Review Log

### Scope

Implemented `comathd` foundation and path policy only. Added semantic path-policy checks, runtime tree creation, idempotent project initialization, project open/status, config loading with `allowShell=false`, a no-op logger, and a Node built-in HTTP/JSON server with injectable route tests.

No artifact import, audit JSONL, claim registry, gate, memory backend, Pi runtime integration, MathProve bridge, compute runner, paper export, or snapshot/replay implementation was added.

### Validation Commands

Phase 2 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0 smoke, Phase 1 contract/schema, Phase 2 path policy, Phase 2 project runtime, and Phase 2 service route tests passed.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; root Phase 0/design smoke passed; comathd Phase 0/1/2 tests passed.
```

Additional check:

```text
Repository root .comath check
Result: NO_ROOT_COMATH
```

### Changed Files

- Added `services/comathd/src/security/path-policy.ts`.
- Added `services/comathd/src/project/runtime-layout.ts`.
- Added `services/comathd/src/project/project-store.ts`.
- Added `services/comathd/src/config/config.ts`.
- Added `services/comathd/src/api/server.ts`.
- Added `services/comathd/src/errors.ts` and `services/comathd/src/logger.ts`.
- Exported Phase 2 APIs from `services/comathd/src/index.ts`.
- Added Phase 2 path-policy, project-runtime, and service-route tests.

### Residual Risks

Phase 2 path policy is conservative and denies suspicious path forms, but Phase 3 artifact import must still treat external files as untrusted and copy by content hash. Symlink escape checks are covered when `resolveRealpath=true` and the target exists; future write paths should keep using runtime-write policy plus realpath checks where applicable.

## Phase 3 Planning Input

Read-only artifact/paper audit recommends Phase 3 remain limited to content-addressed artifact store plus append-only audit writer. Paper export, margin provenance, full snapshot/replay, restore, and secret-clean replay semantics remain deferred to Phases 12 and 16.

## Phase 3 Review Log

### Scope

Implemented artifact and audit kernel only. Added file hashing, content-addressed artifact import, artifact metadata JSONL, append-only audit JSONL, secret scan stub, and snapshot manifest stub.

No paper export, BibTeX integration, claim registry, promotion gate, memory backend, MathProve bridge, compute runner, full snapshot/replay, restore, or Pi runtime extension was implemented.

### Validation Commands

Phase 3 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2 tests and Phase 3 artifact/audit tests passed.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; root Phase 0/design smoke passed; comathd Phase 0/1/2/3 tests passed.
```

Additional check:

```text
Repository root .comath check
Result: NO_ROOT_COMATH
```

### Changed Files

- Added `services/comathd/src/artifacts/hash.ts`.
- Added `services/comathd/src/artifacts/store.ts`.
- Added `services/comathd/src/artifacts/snapshot-manifest.ts`.
- Added `services/comathd/src/audit/jsonl-writer.ts`.
- Added `services/comathd/src/security/secret-scan.ts`.
- Exported Phase 3 APIs from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase3-artifacts-audit.test.mjs`.
- Added `audit/` to runtime layout documentation and runtime directory list.

### Residual Risks

The secret scan is intentionally a stub and must become a real gate before snapshot/replay export. The snapshot manifest is a stub and explicitly cannot restore or replay. Artifact import uses content-addressed paths and sanitized audit payloads, but future Phase 11/12 literature and paper systems must still validate citations and overclaim wording.

## Phase 4 Review Log

### Scope

Implemented claim registry and fail-closed promotion gate. Added claim JSONL persistence, claim link JSONL, markdown rendering, gate result JSONL, direct status escalation rejection, fail-closed promotion decisions, and minimal claim HTTP routes.

No memory backend, GraphPatch apply lifecycle, MathProve bridge execution, compute runner, Pi extension runtime, paper export, or full snapshot/replay implementation was added.

### Validation Commands

Phase 4 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3 tests and Phase 4 claim/gate tests passed.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; root Phase 0/design smoke passed; comathd Phase 0/1/2/3/4 tests passed.
```

Additional check:

```text
Repository root .comath check
Result: NO_ROOT_COMATH
```

### Changed Files

- Added `services/comathd/src/claim/claim-store.ts`.
- Added `services/comathd/src/claim/markdown.ts`.
- Added `services/comathd/src/verification/gate.ts`.
- Added claim route handling in `services/comathd/src/api/server.ts`.
- Exported Phase 4 APIs from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase4-claim-gate.test.mjs`.

### Residual Risks

The Phase 4 gate is deliberately fail-closed and minimal. It records vetoes and blocks direct escalation, but later phases must wire real literature/computation/symbolic/Lean evidence producers. `formally_checked` remains impossible without kernel/audit/dependency/proof artifact metadata, and future MathProve integration must remain an evidence producer rather than a status authority.

## Phase 5 Review Log

### Scope

Implemented memory adapter and StableIdMap. Added `ResearchMemoryDB`, deterministic in-memory node/edge/search/context backend, GraphPatch begin/apply lifecycle, in-memory StableIdMap conflict checks, TriviumDB unavailable shim, and a static native-import guard.

No real TriviumDB native dependency, route integration, Pi runtime code, workstream scheduler, MathProve bridge, compute runner, paper export, or full snapshot/replay implementation was added.

### Validation Commands

Phase 5 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4 tests and Phase 5 memory DB tests passed.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; root Phase 0/design smoke passed; comathd Phase 0/1/2/3/4/5 tests passed.
```

Additional check:

```text
Repository root .comath check
Result: NO_ROOT_COMATH
```

### Changed Files

- Replaced `services/comathd/src/db/stable-id-map.ts` placeholder with `StableIdMap` interface and in-memory implementation.
- Added `services/comathd/src/memory/research-memory-db.ts`.
- Added `services/comathd/src/memory/in-memory-research-memory-db.ts`.
- Added `services/comathd/src/memory/trivium-shim.ts`.
- Added `services/comathd/src/memory/index.ts`.
- Exported Phase 5 APIs from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase5-memory-db.test.mjs`.

### Residual Risks

The memory backend is intentionally in-memory and deterministic. It is suitable for Research Alpha tests, not persistence. TriviumDB remains unavailable before Phase 13 and is not imported directly. Route-level memory APIs are intentionally deferred so service-engineer route ownership stays serialized.

## Dependency Repair Log

### Scope

Repaired workspace package-manager drift found after Phase 6. The root package is pinned to `pnpm@11.3.0`, but nested scripts and a bare user-level `pnpm` had recreated `node_modules` with pnpm v10 store links.

### Fixes

- Root, `@comath/comathd`, and `@comath/pi-extension` scripts now call `corepack pnpm` instead of bare `pnpm`.
- `@comath/comathd` pins `zod` exactly to `4.1.12` because `zod@4.4.3` lacked `zod/v4/core/json-schema.js` in the installed ESM file surface.
- `corepack pnpm install --force --store-dir ".pnpm-store"` rebuilt the workspace under the project-local pnpm v11 store.
- `corepack pnpm list zod --depth 0 --filter @comath/comathd` reported `zod@4.1.12`.

### Validation Commands

Dependency repair validation completed on 2026-05-25:

```text
corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, comathd Phase 0-5 tests, and Phase 6 extension tests passed.
```

### Residual Risks

Do not use bare `pnpm` in this repository. Continue to use `corepack pnpm ...` so package-manager major version and store layout remain stable.

## Phase 6 Review Log

### Scope

Implemented Pi extension layer as a thin client and metadata surface. Added command parsing, comathd HTTP/JSON client, tool descriptors, permission confirmation stubs, resource discovery, text dashboard fallback, and static boundary tests.

No Pi runtime registration, direct `.comath/` writes, TriviumDB access, service-internal imports, or claim-status mutation bypass was implemented.

### Validation Commands

Phase 6 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Phase 6 extension tests passed.

corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, comathd Phase 0-5 tests, and Phase 6 extension tests passed.
```

### Changed Files

- Added `extensions/comath-pi/src/index.ts`.
- Added `extensions/comath-pi/tests/phase6-extension.test.mjs`.
- Added `extensions/comath-pi/package.json` and TypeScript config.
- Updated workspace package scripts to use Corepack-pinned pnpm.

### Residual Risks

Installed Pi runtime API assumptions still need revalidation before production registration. Domain packs are still only resource metadata and become a first-class Phase 8/14 concern.

## Phase 7 Review Log

### Scope

Implemented workstreams and GraphPatch lifecycle as a service-owned file/runtime layer. Workstreams create `WS-XXXX` directories containing `spec.yaml`, `status.json`, `report.md`, and `graph_patch.json`. GraphPatch review requires `proposed -> under_review -> accepted`; accepted patches still do not mutate trusted graph until explicit apply.

No MathProve bridge, compute runner, literature system, paper export, real TriviumDB adapter, or production dashboard was implemented.

### Validation Commands

Phase 7 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0-5 tests, Phase 7 workstream/GraphPatch tests, and Phase 7 route tests passed.

corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, Phase 6 extension tests, and comathd Phase 0-7 tests passed.
```

### Changed Files

- Added `services/comathd/src/workstream/workstream-store.ts`.
- Added `services/comathd/src/workstream/index.ts`.
- Added `services/comathd/src/memory/builder.ts`.
- Added `services/comathd/src/memory/graph-patch.ts`.
- Added Phase 7 routes in `services/comathd/src/api/server.ts`.
- Updated `services/comathd/src/errors.ts` so schema validation errors return `400 VALIDATION_ERROR`.
- Added `services/comathd/tests/unit/phase7-workstream-graphpatch.test.mjs`.
- Added `services/comathd/tests/integration/phase7-workstream-routes.test.mjs`.

### Residual Risks

The route-level memory DB is still in-memory and process-local. That is acceptable before Phase 13 but not durable. GraphPatch `updated_nodes` remains rejected at schema/policy level for protected claim fields, and claim status promotion must continue to use `/claim/promote`.

## Phase 8 Review Log

### Scope

Implemented Codex/Pi subagent scaffolding. Added static `.pi` agent definitions and prompts, Pi extension subagent registry helpers, assignment validation for own-workstream writes, first-class domain-pack and subagent resource discovery, and workstream model documentation.

No real Pi subagent runtime, MathProve bridge, compute runner, literature system, paper export, real TriviumDB adapter, or production dashboard was implemented.

### Validation Commands

Phase 8 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Phase 6 extension tests and Phase 8 subagent scaffold tests passed.

corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, Phase 6/8 extension tests, and comathd Phase 0-7 tests passed.
```

### Changed Files

- Added `.pi/agents/*.md` role definitions.
- Added `.pi/prompts/*.md` workflow prompts.
- Added `extensions/comath-pi/src/subagents.ts`.
- Updated `extensions/comath-pi/src/index.ts` for subagent registry and resource discovery.
- Added `extensions/comath-pi/tests/phase8-subagents.test.mjs`.
- Added `docs/workstream-model.md`.

### Residual Risks

Phase 8 is static scaffolding and assignment validation only. It does not launch real Pi subagents. Runtime creation of `.comath/workstreams` remains owned by `comathd`; `.pi` files only constrain future orchestration behavior.

## Phase 9 Review Log

### Scope

Implemented the MathProve bridge mock as a fail-closed evidence producer and gate input. Added a Python CLI mock for `plan`, `route`, and `final_audit`, a TypeScript adapter that validates bridge output, archives bridge reports under service-owned evidence paths, imports the report through the artifact store as `runner_output`, registers audit evidence, and feeds bridge vetoes into the existing claim promotion gate.

No real MathProve proof execution, Lean kernel invocation, compute runner, paper export, real TriviumDB adapter, production dashboard, or snapshot/replay implementation was added.

### Validation Commands

Phase 9 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build; if ($LASTEXITCODE -eq 0) { node services/comathd/tests/unit/phase9-mathprove-bridge.test.mjs }
Result: exit 0; TypeScript build completed and Phase 9 MathProve bridge tests passed.
```

Full Phase 9 boundary validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9 comathd tests passed.

corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, Phase 6/8 extension tests, and comathd Phase 0/1/2/3/4/5/7/9 tests passed.

Repository root .comath check
Result: false; no repository-root .comath directory exists.
```

### Changed Files

- Added `python/mathprove_bridge.py`.
- Added `services/comathd/src/verification/mathprove.ts`.
- Updated `services/comathd/src/verification/gate.ts` to consume external vetoes/warnings.
- Exported the bridge adapter from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase9-mathprove-bridge.test.mjs`.
- Added the Phase 9 test to `services/comathd/package.json`.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Residual Risks

Phase 9 intentionally proves the bridge boundary, not mathematical correctness. The mock always fails closed. `formally_checked` still requires future durable kernel-checked proof artifacts, dependency-closure audit, and claim-level formal audit; `symbolically_checked` still cannot come from float-only computation; `literature_supported` still requires exact citation artifacts and condition matching in later phases. MathProve remains an evidence producer and veto source, never a claim status authority.

## Phase 10 Review Log

### Scope

Implemented bounded compute runners as artifact/evidence/audit producers. Added a fixed runner registry with no user-supplied command execution surface, shared evidence JSONL store, exact SymPy runner, deterministic counterexample search runner, Sage/SAT fail-closed placeholders, runner report archival, content-addressed artifact import, and runner audit events.

No literature system, paper export, real TriviumDB adapter, production dashboard, snapshot/replay implementation, or direct claim status mutation from runner output was added.

### Validation Commands

Phase 10 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build; if ($LASTEXITCODE -eq 0) { node services/comathd/tests/unit/phase10-compute-runners.test.mjs }
Result: exit 0; TypeScript build completed and Phase 10 compute runner tests passed.
```

Full Phase 10 boundary validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10 comathd tests passed.

corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, Phase 6/8 extension tests, and comathd Phase 0/1/2/3/4/5/7/9/10 tests passed.

Repository root .comath check
Result: false; no repository-root .comath directory exists.
```

### Changed Files

- Added `python/exact_compute.py`.
- Added `python/counterexample_search.py`.
- Added `services/comathd/src/evidence/store.ts`.
- Added `services/comathd/src/verification/runner-contracts.ts`.
- Added `services/comathd/src/verification/sympy.ts`.
- Added `services/comathd/src/verification/sage.ts`.
- Added `services/comathd/src/verification/sat.ts`.
- Updated `services/comathd/src/verification/mathprove.ts` to use the shared evidence store.
- Exported evidence and runner APIs from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase10-compute-runners.test.mjs`.
- Added the Phase 10 test to `services/comathd/package.json`.
- Added Phase 10/13 boundary progress notes under `docs/progress/`.

### Residual Risks

The SymPy runner is intentionally exact and narrow; it rejects unsafe syntax and decimal/float contamination rather than attempting broad Python evaluation. Counterexample search is deterministic numeric/search evidence and carries a `numeric_search_not_symbolic` veto. Sage and SAT are structured placeholders that fail closed. Future phases must add richer runner coverage, replay manifests, dependency fingerprints, and snapshot/replay integration before treating computation as replay-complete.

## Phase 11 Review Log

### Scope

Implemented the literature system as an auditable evidence producer. Added BibTeX parsing, BibTeX/PDF artifact import, citation records with locator and artifact linkage, conservative citation-condition matching, literature evidence registration, audit events, literature HTTP routes, and adapter interface descriptors for arXiv/OpenAlex/Semantic Scholar/Zotero.

No working paper generation, real network literature adapters, real TriviumDB adapter, production dashboard, or snapshot/replay implementation was added.

### Validation Commands

Phase 11 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node services/comathd/tests/unit/phase11-literature.test.mjs
Result: exit 0; Phase 11 literature system tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11 comathd tests passed.
```

### Changed Files

- Added `services/comathd/src/literature/store.ts`.
- Added `services/comathd/src/literature/index.ts`.
- Added `python/citation_check.py`.
- Added `services/comathd/tests/unit/phase11-literature.test.mjs`.
- Exported literature APIs from `services/comathd/src/index.ts`.
- Added literature routes in `services/comathd/src/api/server.ts`.
- Updated `services/comathd/src/verification/gate.ts` so `literature_supported` requires a successful citation-condition match.
- Added the Phase 11 test to `services/comathd/package.json`.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

`literature_supported` now fails closed unless the promotion request references evidence and artifacts produced by a successful condition match for the same project and claim. LLM memory, summaries, and agent reports are rejected as citation evidence. Citation existence alone is insufficient. Malformed or hand-written citation-condition JSONL rows are not trusted as evidence.

### Residual Risks

Condition matching is conservative string normalization, not semantic theorem matching. Network literature adapters are interface descriptors only. Phase 12 must consume the literature evidence without upgrading paper wording beyond claim status and must preserve blockers in margin provenance.

## Phase 12 Review Log

### Scope

Implemented the working paper as live, auditable project state. Added synchronized Markdown, TeX, BibTeX, manifest, sections, and margin-note files under service-owned `.comath/artifacts/papers`; claim block rendering with margin provenance; paper checks for overclaiming and stale provenance; content-addressed paper export; HTTP routes; and Pi extension paper tool descriptors.

No claim status promotion, gate mutation, real TriviumDB adapter, production dashboard, full snapshot/replay, or production Pi runtime registration was implemented.

### Validation Commands

Phase 12 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Phase 6 extension tests, Phase 8 subagent scaffold tests, and Phase 12 Pi extension paper tool tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11/12 comathd tests passed.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit check completed.

corepack pnpm --filter @comath/pi-extension typecheck
Result: exit 0; Pi extension no-emit check completed.
```

### Changed Files

- Added `services/comathd/src/artifacts/bibtex.ts`.
- Added `services/comathd/src/artifacts/paper.ts`.
- Added `services/comathd/tests/unit/phase12-working-paper.test.mjs`.
- Added paper routes in `services/comathd/src/api/server.ts`.
- Exported paper APIs from `services/comathd/src/index.ts`.
- Added `/cm:paper` parsing and paper tool descriptors in `extensions/comath-pi/src/index.ts`.
- Added `extensions/comath-pi/tests/phase12-paper-tools.test.mjs`.
- Added the Phase 12 tests to the comathd and Pi extension package scripts.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

Paper generation and export are not proof authority. The working paper preserves claim IDs, statement hashes, evidence IDs, workstreams, warnings, and blockers, then fails closed on theorem-like overclaiming, missing margin provenance, hidden blockers, stale claim statements, missing evidence, invalid margin-note files, and missing citation-condition support for `literature_supported` claims.

Pi extension paper tools are metadata/thin-client descriptors only. They do not import service internals or write `.comath/`; mutating tools require confirmation. `comath.paper.check` is explicitly read-only and cannot promote claims.

### Residual Risks

The TeX renderer is intentionally conservative escaping and is not a full LaTeX authoring engine. The paper system verifies provenance and overclaim boundaries, not mathematical truth. A future dashboard can render margin provenance more ergonomically, but must preserve the fail-closed paper checks as the authority. Phase 13 must keep TriviumDB native loading optional so this working paper path continues to run without native dependencies.

## Phase 13 Review Log

### Scope

Implemented TriviumDB as an optional native backend behind `ResearchMemoryDB`. Added capability probing, fallback policy, a `TriviumResearchMemoryDB` adapter, a memory DB factory, default-safe tests, and optional native test gating.

No ordinary dependency on `triviumdb`, eager native import, service-route default switch, production dashboard, snapshot/replay, or claim promotion behavior was added.

### External Package Check

The npm registry metadata checked on 2026-05-25 reported:

```text
triviumdb version: 0.7.1
description: AI-native embedded database: Vector + Graph + Relational in one file
main: index.js
types: triviumdb.d.ts
```

This metadata was used only to shape the optional capability boundary. The package was not installed into the workspace dependency graph.

### Validation Commands

Phase 13 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node tests/unit/phase13-trivium-capability.test.mjs
Result: exit 0; Phase 13 TriviumDB capability tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11/12/13 comathd tests passed.

corepack pnpm --filter @comath/comathd test:trivium
Result: exit 0; optional native TriviumDB tests skipped because COMATH_ENABLE_TRIVIUM_TESTS was not set.
```

### Changed Files

- Added `services/comathd/src/memory/trivium-capability.ts`.
- Added `services/comathd/src/memory/trivium-db.ts`.
- Added `services/comathd/tests/unit/phase13-trivium-capability.test.mjs`.
- Added `services/comathd/tests/optional/phase13-trivium-db.test.mjs`.
- Updated `services/comathd/src/memory/research-memory-db.ts` to accept the `trivium` backend selector.
- Exported Phase 13 memory APIs from `services/comathd/src/memory/index.ts`.
- Updated `services/comathd/tests/unit/phase5-memory-db.test.mjs` so it forbids top-level/static native imports while allowing Phase 13 function-scoped dynamic import inside adapter boundaries.
- Updated `services/comathd/package.json` with the Phase 13 default test and `test:trivium` script.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

`probeTriviumCapability()` returns diagnostics instead of throwing in default paths. `createResearchMemoryDB()` defaults to in-memory, falls back to in-memory with warnings when TriviumDB is requested but unavailable, and throws only when native TriviumDB is explicitly required. `triviumdb` is not an ordinary dependency and is not imported at module top level.

`TriviumResearchMemoryDB` preserves stable string IDs at the `ResearchMemoryDB` boundary. Native numeric IDs are assigned and looked up through `StableIdMap`; `MemoryNode.id`, `MemoryEdge.source_id`, `MemoryEdge.target_id`, and `GraphPatch.patch_id` remain stable business strings. GraphPatch schema protections still block direct privileged claim status injection.

### Residual Risks

The adapter can run its public semantics without the native package, and optional native coverage is gated. Real native persistence/search behavior still requires running `COMATH_ENABLE_TRIVIUM_TESTS=1 corepack pnpm --filter @comath/comathd test:trivium` on a machine with `triviumdb` installed or otherwise resolvable. The default service routes still use in-memory DB; switching runtime backend should remain explicit and audited.

## Phase 14 Review Log

### Scope

Implemented the braid statistics and parastatistics domain pack as pure domain scaffolding. Added a typed ontology, computation protocol descriptors, benchmark claim templates, Lean formalization map, literature prompts, a reviewable GraphPatch proposal builder, Python exact/combinatorial checks, and domain skill/prompt documentation.

No HTTP route, claim promotion path, gate mutation, GraphPatch apply bypass, real Lean proof, production dashboard, or snapshot/replay feature was added.

### Validation Commands

Phase 14 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node tests/unit/phase14-braid-domain-pack.test.mjs
Result: exit 0; Phase 14 braid statistics domain pack tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11/12/13/14 comathd tests passed.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit check completed.
```

### Changed Files

- Added `services/comathd/src/domain/braid-statistics/index.ts`.
- Added `services/comathd/tests/unit/phase14-braid-domain-pack.test.mjs`.
- Added `python/braid/check_braid.py`.
- Added `skills/braid-statistics/SKILL.md`.
- Added `prompts/domain-braid-statistics.md`.
- Exported the domain pack from `services/comathd/src/index.ts`.
- Added the Phase 14 test to `services/comathd/package.json`.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

The domain pack is an evidence/task/proposal producer only. It preserves assumptions, blockers, risk flags, notation conventions, category level, q/root-of-unity status, semisimplicity assumptions, and physical-interpretation boundaries. Benchmark claims are `conjectural` only and cannot preload privileged claim states. GraphPatch proposals remain `proposed` and carry apply preconditions requiring review.

The Python braid script rejects float-contaminated YBE inputs and reports exact/combinatorial or exact/symbolic checks as computational evidence only. It explicitly carries a `not_symbolic_proof` veto so runner results cannot be mistaken for proof authority.

### Residual Risks

The braid relation checker is intentionally small and combinatorial. The YBE script currently checks exactness/shape boundary rather than full matrix tensor equality. Lean map entries are skeleton/translation targets, not kernel-checked proofs. Future work can deepen the domain pack, but must keep the claim gate, literature condition matching, and paper overclaim checks authoritative.

## Phase 15 Review Log

### Scope

Implemented the Pi extension TUI dashboard as a read-only presentation layer. Added extension-local dashboard state types, a `comathd` client aggregator that calls read routes only, pure text and TUI renderers, blocker summarization, degraded read-model flags, and a review-queue helper.

No service-internal import, `.comath/` direct read/write, claim promotion, state repair, persistent dashboard snapshot, replay file, or Phase 16 snapshot/replay implementation was added.

### Validation Commands

Phase 15 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Phase 6 extension tests, Phase 8 subagent scaffold tests, Phase 12 paper tool tests, and Phase 15 dashboard tests passed.
```

Full Phase 15 boundary validation completed on 2026-05-25:

```text
corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, Phase 6/8/12/15 extension tests, and comathd Phase 0/1/2/3/4/5/7/9/10/11/12/13/14 tests passed.

Repository root .comath check
Result: false; no repository-root .comath directory exists.
```

### Changed Files

- Added `extensions/comath-pi/src/widgets.ts`.
- Added `extensions/comath-pi/src/renderers.ts`.
- Added `extensions/comath-pi/src/tools/review.ts`.
- Updated `extensions/comath-pi/src/index.ts` to export dashboard widgets, renderers, and review helpers.
- Added `extensions/comath-pi/tests/phase15-dashboard.test.mjs`.
- Updated `extensions/comath-pi/package.json` with the Phase 15 dashboard test.
- Updated `TODO.md` and `AGENTS.md`.

### Boundary And Integrity Notes

Dashboard aggregation uses the Pi extension client boundary and calls only `/project/status`, `/workstream/list`, `/paper/state`, and `/paper/check`. Since the service does not yet expose claim, evidence, or gate-result list APIs, the dashboard derives a conservative read model from paper margin provenance and reports `claim_list_unavailable`, `evidence_list_unavailable`, and `gate_result_list_unavailable` as degraded limitations rather than bypassing service ownership.

Renderers are pure presentation functions. Blockers include paper vetoes, margin-note blockers, blocked workstreams, and degraded read-model limitations. The dashboard cannot repair state, apply GraphPatch, promote claims, or export snapshots.

### Residual Risks

The dashboard currently has a text/TUI data model rather than a bound production Pi UI runtime. Claim/evidence boards are conservative because dedicated list routes do not yet exist. Phase 16 must keep persistent snapshots service-owned and must not reuse dashboard snapshots as integrity artifacts.

## Phase 16 Review Log

### Scope

Implemented service-owned snapshot and replay infrastructure. Added a real secret scanner, canonical snapshot export, snapshot verification, restore smoke support, replay manifest extraction from runner reports, stale-runner detection, and negative tamper tests.

The Phase 3 `createSnapshotManifestStub()` and `scanForSecretsStub()` remain exported for compatibility, but Phase 16 code uses `exportSnapshot()`, `verifySnapshot()`, `restoreSnapshot()`, `createReplayManifest()`, and `scanForSecrets()`.

### Validation Commands

Phase 16 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node tests/unit/phase16-snapshot-replay.test.mjs
Result: exit 0; Phase 16 snapshot/replay tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11/12/13/14/16 comathd tests passed.
```

### Changed Files

- Added `services/comathd/src/artifacts/snapshots.ts`.
- Added `services/comathd/src/artifacts/replay.ts`.
- Updated `services/comathd/src/security/secret-scan.ts` with real Phase 16 scanning while preserving the Phase 3 stub.
- Added `comathd` snapshot export/verify/restore and replay-manifest verification routes.
- Added Pi extension `/cm:snapshot`, `/cm:replay`, snapshot/replay tool descriptors, and artifact descriptor resources.
- Wired artifact import to the real secret scan gate while keeping the Phase 3 stub exported for compatibility tests.
- Exported snapshot/replay APIs from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase16-snapshot-replay.test.mjs`.
- Added the Phase 16 test to `services/comathd/package.json`.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

Snapshot export writes under `.comath/snapshots/SNAP-XXXX/` and excludes nested snapshots from capture. Manifest entries are sorted, relative, and copied into snapshot-local `files/` paths. Integrity covers entries, replay manifest, manifest material, artifact blobs, claims, evidence, audit logs, paper state, workstreams, and runner reports when present.

Replay manifests preserve runner IDs, versions, seed, timeout, input/script/output hashes, status, unreplayable reasons, environment, and dependency metadata. Host absolute script paths in `replay_argv` are scrubbed. Runner report verification recalculates `result_sha256` and flags stale runner output.

Verification fails closed on manifest-integrity tamper, entry hash mismatch, missing entries, path traversal, replay-manifest mismatch, secret hits, unreadable runner reports, and stale runner output. Restore verifies before copying into a separate target root and does not mutate the source snapshot.

### Residual Risks

Secret scanning is pattern-based and intentionally conservative; it is a fail-closed Research Alpha import/export gate, not a comprehensive DLP engine. Replay manifests record deterministic envelopes and stale-output checks, but they do not yet re-execute runner commands. The Phase 17 gaps around evidence/artifact binding, failed-runner promotion, and paper export on failed checks were closed in the Phase 17 remediation; remaining Research Beta risks are real runner re-execution and Lean/kernel proof checking.

## Post-Phase 17 Review Remediation

### Scope

Reviewed the Research Alpha implementation against the initial development plan and runbook with subagent assistance. Closed the remaining exposure/documentation gaps that made the system look narrower or less externally usable than the code intended.

### Findings Addressed

- Added `comathd` HTTP routes for snapshot export, snapshot verification, snapshot restore, and replay-manifest verification so Phase 16 is reachable through the service boundary rather than only library calls.
- Added Pi extension `/cm:snapshot` and `/cm:replay` command parsing, tool descriptors, mutability flags, and snapshot/replay artifact resources while preserving the no direct `.comath/` write rule.
- Replaced artifact import's non-blocking `scanForSecretsStub()` use with real `scanForSecrets()` fail-closed behavior and a durable `artifact.import_blocked` audit event.
- Updated extension READMEs, TODO, acceptance matrix, and audit wording to reflect Research Alpha reality without claiming production Pi runtime registration, native TriviumDB validation, full DLP, Lean proof checking, or runner re-execution replay.

### Validation Commands

Targeted remediation validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node tests/unit/phase3-artifacts-audit.test.mjs
Result: exit 0; Phase 3 artifact/audit tests passed, including secret import blocking.

node tests/unit/phase16-snapshot-replay.test.mjs
Result: exit 0; Phase 16 snapshot/replay tests passed, including service routes and route-level secret-scan blocking.

corepack pnpm --filter @comath/pi-extension build
Result: exit 0; TypeScript build completed.

node tests/phase6-extension.test.mjs
Result: exit 0; Phase 6 extension tests passed, including snapshot/replay command and descriptor registration.
```

### Current Verdict

At Phase 16, CoMath Pi Lab was a working Research Alpha local mathematical workbench prototype with service-mediated mutation, auditable artifacts, gates, paper provenance, snapshot verification, and Pi thin-client descriptors. It was not yet a production mathematical workbench or proof authority: Lean/MathProve kernel execution, production Pi runtime registration, native TriviumDB target validation, OS/network sandboxing, multi-process locks, and runner re-execution replay remained Research Beta work.

## Phase 17 Review Log

### Scope

Implemented the final Research Alpha evaluation and audit phase. Added a Phase 17 evaluation suite, retrieval benchmark fixture, gate evidence/artifact binding hardening, runner-report success checks for promotion, paper export fail-closed behavior, block-bound paper margin provenance, runner result-hash normalization, runner metadata path scrubbing, snapshot symlink/reparse traversal hardening, replay internal-hash verification, truncated-secret fail-closed scanning, security audit updates, mathematical-integrity audit updates, and a Research Alpha retrospective.

No real MathProve/Lean kernel execution, production Pi runtime registration, native TriviumDB requirement, or runner re-execution replay was added.

### Validation Commands

Phase 17 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node tests/evaluation/phase17-integrity-evaluation.test.mjs
Result: exit 0; Phase 17 integrity evaluation tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11/12/13/14/16 comathd tests passed after Phase 17 hardening.
```

Final root validation completed on 2026-05-25 after final review and documentation remediation:

```text
corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0 smoke, all workspace tests, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```
## Phase 42 AgentRun Observability Review Log

### Scope

Added a bounded runtime-inspection slice for live profile adapters. Phase 42 exposes capped AgentRun stdout/stderr reads and adapter health probes through `comathd` and Pi, without turning logs, adapter success, or health JSON into mathematical authority.

### TDD Evidence

```text
node services/comathd/tests/unit/phase42-agent-run-observability.test.mjs
Initial RED result: exit 1; `../../dist/index.js` did not export `probeAgentAdapterHealth`.

node extensions/comath-pi/tests/phase42-agent-observability-tools.test.mjs
Initial RED result: exit 1; `comath.agent.logs` was not registered.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after service implementation.

corepack pnpm --filter @comath/pi-extension build
Result: exit 0; TypeScript build completed after Pi implementation.

node services/comathd/tests/unit/phase42-agent-run-observability.test.mjs
Result: exit 0; Phase 42 AgentRun observability tests passed.

node extensions/comath-pi/tests/phase42-agent-observability-tools.test.mjs
Result: exit 0; Phase 42 Pi agent observability tool tests passed.
```

### Changed Surfaces

- Added `services/comathd/src/agents/agent-run-observability.ts` with `readAgentRunLogs()` and `probeAgentAdapterHealth()`.
- Added `GET /agent/run/:id/logs` and `POST /agent/adapter/health` routes.
- Added Pi runtime tools `comath.agent.logs` and `comath.agent.health` plus `/cm:agent logs` and `/cm:agent health` command paths.
- Added `agent_run_observability` to service status and wired Phase 42 tests into default package test chains.
- Updated README, TODO, acceptance matrix, security, math-integrity, and handoff notes.

### Boundary And Integrity Notes

AgentRun logs are read only from scheduler-derived `.tmp/comath/<ARUN>/logs/stdout.log` and `stderr.log` paths after resolving the owning run. Health probes require an absolute existing program, run with `shell:false`, bounded timeout/output, minimal environment inheritance, and `COMATH_PROOF_AUTHORITY=none`. Pi health probes are treated as mutating because they execute a process and therefore require host confirmation.

Logs and health responses carry `proof_authority: none`. They cannot promote claims, apply GraphPatch, certify candidate correctness, or replace static audit and final Lean replay.

### Residual Risks

- Phase 42 is capped readback plus bounded health probes, not a streaming/subscription log UI.
- Production Codex CLI/API adapter packaging and richer interactive operator controls remain deferred.
- OS-level process sandboxing and network-denial enforcement remain deferred.
- Global GA remains blocked by the deferred items in `TODO.md`.

## Phase 43 Agent Adapter Package Registry Review Log

### Scope

Added a service-owned packaged adapter lifecycle for the first built-in `codex-cli` adapter. Phase 43 reduces the production adapter packaging blocker by replacing model/user-supplied arbitrary fixture paths with a comathd-resolved package registry, bundled launcher script, package prepare/execute routes, and Pi package commands.

### TDD Evidence

```text
node services/comathd/tests/unit/phase43-agent-adapter-package.test.mjs
Initial RED result: exit 1; `../../dist/index.js` did not export `buildAgentAdapterPackageLaunch`.

node extensions/comath-pi/tests/phase43-agent-adapter-package-tools.test.mjs
Initial RED result: exit 1; `comath.agent.adapterPackageList` was not registered.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build and bundled adapter copy completed after service implementation.

corepack pnpm --filter @comath/pi-extension build
Result: exit 0; TypeScript build completed after Pi implementation.

node services/comathd/tests/unit/phase43-agent-adapter-package.test.mjs
Result: exit 0; Phase 43 Agent adapter package tests passed.

node extensions/comath-pi/tests/phase43-agent-adapter-package-tools.test.mjs
Result: exit 0; Phase 43 Pi agent adapter package tool tests passed.
```

### Changed Surfaces

- Added `services/comathd/src/agents/agent-adapter-packages.ts`.
- Added bundled launcher `services/comathd/src/agents/adapters/codex-cli-adapter.mjs` and build-time copy script `services/comathd/scripts/copy-agent-adapters.mjs`.
- Added `GET /agent/adapter/package/list`, `POST /agent/adapter/package/prepare-launch`, and `POST /agent/adapter/package/execute`.
- Added Pi tools `comath.agent.adapterPackageList`, `comath.agent.prepareAdapterPackage`, and `comath.agent.executeAdapterPackage` plus `/cm:agent packages`, `/cm:agent prepare-package`, and `/cm:agent execute-package`.
- Added `agent_adapter_package_registry` to service status and wired Phase 43 tests into default package test chains.
- Updated README, TODO, acceptance matrix, security, math-integrity, and handoff notes.

### Boundary And Integrity Notes

The packaged adapter registry is service-owned. The current `codex-cli` package resolves to `process.execPath` plus a bundled launcher script copied into `dist`, applies package prefix args before the profile launch args, caps rpm at 4, and injects `COMATH_ADAPTER_PACKAGE_ID`, `COMATH_ADAPTER_PACKAGE_KIND`, and `COMATH_PROOF_AUTHORITY=none`. Pi package prepare/execute tools are mutating and require host confirmation.

The built-in launcher emits a structured AgentRun report but does not call an external Codex CLI/API backend yet. Package selection, health, and successful execution are runtime orchestration only; they cannot promote claims, apply GraphPatch, certify proof candidates, or replace final Lean replay.

### Residual Risks

- Real external Codex CLI/API invocation remains deferred behind the package contract.
- Streaming/subscription log UI and richer interactive operator controls remain deferred.
- OS-level process sandboxing and network-denial enforcement remain deferred.
- Global GA remains blocked by the deferred items in `TODO.md`.

### Final Phase 43 Validation

Fresh Phase 43 validation completed on 2026-05-28:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-43 package tests passed.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed with Phase 43 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed.

corepack pnpm test
Result: exit 0; root smoke, workspace tests, Phase 43 tests, and Phase 17 integrity evaluation passed.

git diff --check
Result: exit 0; no whitespace errors. Git reported Windows LF-to-CRLF normalization warnings only.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```
### Final Phase 42 Validation

Fresh Phase 42 validation completed on 2026-05-28:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-42 package tests passed.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed with Phase 42 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed.

corepack pnpm test
Result: exit 0; root smoke, workspace tests, Phase 42 tests, and Phase 17 integrity evaluation passed.

git diff --check
Result: exit 0; no whitespace errors. Git reported Windows LF-to-CRLF normalization warnings only.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

### Changed Files

- Added `tests/evaluation/phase17-integrity-evaluation.test.mjs`.
- Added `tests/evaluation/fixtures/retrieval-benchmark.json`.
- Added `docs/progress/research-alpha-retrospective.md`.
- Updated `services/comathd/src/verification/gate.ts`.
- Updated `services/comathd/src/artifacts/paper.ts`.
- Updated `services/comathd/src/artifacts/snapshots.ts`.
- Updated `services/comathd/src/artifacts/replay.ts`.
- Updated `services/comathd/src/security/secret-scan.ts`.
- Updated `services/comathd/src/verification/runner-contracts.ts`.
- Updated `services/comathd/tests/unit/phase12-working-paper.test.mjs`.
- Updated `services/comathd/tests/unit/phase16-snapshot-replay.test.mjs`.
- Updated root `package.json` so `corepack pnpm test` runs Phase 17 evaluation.
- Updated `TODO.md`, `AGENTS.md`, `SECURITY_REVIEW.md`, `MATH_INTEGRITY_REVIEW.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

The promotion gate now validates that evidence and artifact IDs exist, belong to the same project, bind to the requested claim, link to each other, and satisfy stored artifact hash/size checks. Target statuses require appropriate evidence kinds and, for runner-backed states, successful runner reports bound through the requested evidence/artifacts: `symbolically_checked` requires `ok=true`, `supports_status=symbolically_checked`, `exactness=exact_symbolic`, and no runner vetoes; `computationally_supported` requires a successful computation runner output. Failed symbolic/computation attempts remain durable evidence but cannot promote claims.

Paper export is blocked if `checkPaper()` returns vetoes and records `paper.export_rejected`. Claim blocks now include `margin_note:<PMN-id>`, and paper checks bind each block to that exact margin note instead of accepting claim-global provenance. Runner metadata no longer stores host absolute Python script paths, runner result hashes use one canonical envelope for success, failure, and placeholders, and snapshot verification rejects copied runner reports that contain host-path leaks. Snapshot export/verification/restore reject symlink/reparse traversal, stale runner outputs, replay `runs_sha256` tamper, secret hits, missing entries, and tampered hashes. Secret scans now fail closed on truncated files.

The Phase 17 evaluation suite covers mathematical safety, failed-runner promotion rejection, paper correctness, block-bound provenance, dashboard read-only behavior, snapshot/replay tamper checks, placeholder replay integrity, secret scanning, stale runner output, and in-memory retrieval/context-pack behavior.

### Residual Risks

At Phase 17, Research Alpha remained an auditable local prototype. Real Lean kernel proof checking, production Pi runtime registration, native TriviumDB performance evaluation, full DLP-grade secret scanning, and runner re-execution replay were Research Beta candidates rather than completed Phase 17 capabilities.

## Phase 18 GA Proof-Kernel Vertical Slice Review Log

### Scope

Implemented a native CoMath proof-kernel GA vertical slice under `services/comathd/src/proof-kernel`, rather than treating the MathProve bridge as proof authority. Phase 18 adds service-owned `ResearchCampaign` state, proof-kernel campaign routes, 8-candidate ensemble artifacts, Lean clean replay gates, statement-drift rejection, exact refutation, snapshot restore/replay coverage, and Pi extension campaign tools.

This historical Phase 18 note upgraded the earlier "real Lean kernel checking is not implemented" limitation in a narrow but executable sense: the repository gained a tested Lean proof-kernel path for the elementary `Nat.add_zero` vertical slice and a tested counterexample path for `n + 1 = n`. At that phase it did not implement arbitrary theorem proving, broad Lean proof synthesis, production Pi runtime registration, real MathProve execution, or a persistent child-agent scheduler; later Phase 26 and Phase 28 notes record the bounded Pi registration and AgentRun scheduler slices.

### Implementation Checkpoints

```text
6fe58fe Add GA proof kernel campaign gates
a4319f1 Expose GA research campaign tools in Pi extension
5e3af2f Add GA refutation and snapshot replay slices
ab32780 Persist GA candidate audit artifacts
```

### Changed Surfaces

- Added proof-kernel campaign orchestration in `services/comathd/src/proof-kernel/campaign/`.
- Added candidate ensemble generation, decision filtering, and failure aggregation in `services/comathd/src/proof-kernel/ensemble/`.
- Added Lean project generation, static cheat scan, statement equivalence, dependency closure, axiom profile, and clean replay in `services/comathd/src/proof-kernel/lean/`.
- Added campaign routes in `services/comathd/src/api/server.ts` and exported proof-kernel APIs from `services/comathd/src/index.ts`.
- Hardened `services/comathd/src/verification/gate.ts` so `formally_checked` requires a passed proof-kernel `final_replay_manifest.json` artifact for the requested claim.
- Extended `services/comathd/src/types/schemas.ts` with campaign, candidate, decision, and final Lean replay schemas.
- Added Pi extension `/cm:research`, `/cm:campaign`, `executeComathTool()`, and six campaign tool descriptors in `extensions/comath-pi/src/index.ts`.
- Added Phase 18 comathd and Pi extension tests.

### Targeted Coverage

- `services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs`: starts a campaign for `n + 0 = n`, locks the problem, runs 8 candidates, persists candidate audit artifacts, performs final Lean replay, promotes the claim to `formally_checked`, and calls the replay route.
- `services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs`: rejects fake/preloaded formal metadata without proof-kernel replay, detects `sorry` and `axiom`, and rejects a high-scoring statement-drift candidate.
- `services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs`: keeps the locked statement `n + 1 = n`, records exact counterexample `n=0`, marks the claim `refuted`, and terminates as `completed_refutation`.
- `services/comathd/tests/integration/phase18-ga-snapshot-replay.test.mjs`: exports a snapshot after proof verification, restores it into a fresh root, removes replay byproducts, and verifies proof-kernel replay passes from restored state.
- `extensions/comath-pi/tests/phase18-research-campaign-tools.test.mjs`: verifies campaign tool descriptors, mutability flags, required inputs, and `comathd` route mapping.

### Boundary And Integrity Notes

`formally_checked` is now evidence-level 5 only when the normal claim promotion gate sees bound Lean evidence, proof artifacts, kernel metadata, dependency closure, audit pass, and a passed proof-kernel replay manifest matching the claim. A Lean source file, reviewer approval, agent consensus, MathProve bridge output, preloaded metadata, or candidate score is not enough.

Candidate selection filters hard vetoes and requires `candidate_statement_hash === locked_statement_hash` before score ranking. Voting or reviewer preference cannot promote a drifted theorem. Failed candidates are retained as route memory and candidate artifacts rather than being discarded.

Pi remains a thin client. Campaign tools call `comathd` routes and mutating descriptors require confirmation; the extension still does not write `.comath/` directly or import service internals.

### Residual Risks

- The positive proof path is intentionally narrow and currently generated by `createNatAddZeroLeanProject()`.
- Statement equivalence and axiom/dependency trust profiles are conservative file/output checks, not a full Lean AST equivalence engine.
- The 8-candidate ensemble was implemented for the Phase 18 vertical slice; broad proof-route scheduling and production child-agent profile integration remain deferred beyond the bounded Phase 28 scheduler slice.
- MathProve is still a fail-closed bridge mock outside this native proof-kernel slice.
- Snapshot replay reruns the Lean proof-kernel replay for the campaign proof; Phase 24 later added deterministic compute runner re-execution, while OS/network sandboxing remains deferred.

### Final Root Validation

Fresh Phase 18 documentation-boundary validation completed on 2026-05-27:

```text
corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, all workspace tests, Phase 18 comathd proof-kernel tests, Phase 18 Pi campaign tool tests, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

## Phase 26 Pi Runtime Registration Review Log

### Scope

Added a Pi 0.75.5-compatible runtime registration path for `@comath/pi-extension`. Phase 26 upgrades the extension from descriptor/test-only metadata to an installed Pi loader-compatible package with a default export runtime factory, package manifest entrypoints, a structured `runtime_registration` contract, and a narrow executable runtime surface for the already implemented research/campaign vertical slices.

This phase does not make a Pi session mathematical authority. Trusted state, proof authority, final audit, and global replay remain owned by `comathd`; MathProve remains a non-authoritative evidence runner.

### TDD Evidence

```text
node extensions/comath-pi/tests/phase26-pi-runtime-registration.test.mjs
Initial RED result: exit 1; Phase 26 runtime registration contract, package manifest, and default export runtime factory were missing.

Review-fix RED result: exit 1; runtime schemas exposed model-supplied `confirmation_id`, runtime commands did not dispatch to `comathd`, runtime registration declared commands that the default export did not register, `/cm:audit final` was parsed as a campaign id, and `--flag value` arguments could be mistaken for missing positional campaign ids.

node extensions/comath-pi/tests/phase26-pi-runtime-registration.test.mjs
Result: exit 0; Phase 26 runtime registration tests passed after host-side confirmation injection, command dispatch, and registration drift guards were added.
```

### Changed Surfaces

- Added `extensions/comath-pi/src/runtime-registration.ts` with `createPiRuntimeRegistration()` and `validatePiRuntimeRegistration()`.
- Updated `extensions/comath-pi/package.json` so `@comath/pi-extension` is package-loadable through `main`, `exports`, `files`, and `pi.extensions`.
- Added a default export runtime factory in `extensions/comath-pi/src/index.ts`.
- Registered only executable runtime tools in the production Pi runtime factory: `comath.research.startCampaign`, `comath.research.runCampaignLoop`, `comath.campaign.status`, `comath.campaign.tick`, `comath.campaign.nextActions`, `comath.campaign.finalAudit`, and `comath.campaign.replay`.
- Kept descriptor-only tools available through `createComathTools()` but unregistered from the production Pi runtime factory until executable handlers exist.
- Added host-side confirmation gating for runtime mutating tools and commands. Model parameters cannot supply `confirmation_id`; the runtime strips it from Pi schemas and injects a host-generated confirmation only after `ctx.ui.confirm()` approves the mutation.
- Added `extensions/comath-pi/tests/phase26-pi-runtime-registration.test.mjs` and wired it into the default `@comath/pi-extension` test chain.
- Updated README, TODO, acceptance matrix, Pi runtime assumptions, risk, handoff, security, math-integrity, and smoke/status docs so Phase 26 is no longer described as deferred.

### Boundary And Integrity Notes

The Pi runtime package exposes a loader-compatible default export and a structured registration contract, but all trusted mutations still cross the `comathd` client boundary. The extension does not write `.comath/`, does not import service internals, and does not inspect Lean proof artifacts directly.

The `runtime_registration` contract records `global_rpm=4`, `trusted_state_access=comathd_only`, `extension_writes_runtime_state=false`, and `pi_session_is_math_authority=false`. Mutating runtime tools are sequential, require Pi host-side confirmation, and delegate to `comathd` campaign routes.

### Residual Risks

- Full interactive Pi/comathd install-session e2e remains deferred beyond the installed-loader smoke.
- Runtime permission UX is currently the minimal `ctx.ui.confirm()` path, not a richer permission policy UI.
- At Phase 22, persistent child-agent scheduling remained deferred; `/cm:research` was a bounded campaign-loop client over `comathd`, not an always-on scheduler. Phase 28 later added bounded service-side process scheduling, while production Pi/Codex child-agent profile integration remains deferred.
- Broad proof planning/theorem synthesis beyond the registered elementary theorem families remains deferred.
- Broad MathProve proof search/final-audit semantics remain deferred; MathProve evidence cannot set `formally_checked`.
- Native TriviumDB performance/persistence validation, stronger OS/network sandboxing, dependency-lock capture, cross-machine replay, richer Lean parser/statement equivalence, and trust profiles remain global GA blockers.

### Final Root Validation

Fresh Phase 26 validation completed on 2026-05-27:

```text
pi --version
Result: exit 0; installed Pi CLI reported 0.75.5.

node --input-type=module -e "<installed @earendil-works/pi-coding-agent discoverAndLoadExtensions smoke>"
Result: exit 0; installed Pi 0.75.5 loader returned errors=[], extensionCount=1, 7 executable research/campaign tools, and commands cm:audit, cm:campaign, cm:replay, cm:research.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed, including Phase 26 runtime registration, host-confirmation, command dispatch, and drift guards.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, all workspace tests, Phase 26 Pi runtime registration tests, comathd Phase 0-25 tests, proof-kernel integrations, and Phase 17 integrity evaluation passed.

git diff --check
Result: exit 0; no whitespace errors found.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

## Phase 27 AgentRun Runtime Boundary Review Log

### Scope

Added the service-side AgentRun runtime contract needed before a real child-agent launcher can be trusted: persisted run records, explicit lifecycle transitions, scoped write permissions, structured report validation, GraphPatch producer/reviewer separation, and failed-route memory recording.

This phase does not launch model processes, schedule persistent agents, enforce OS process isolation, stream logs, or rate-limit real Pi/Codex child-agent execution. It creates the auditable boundary those later launchers must use.

### TDD Evidence

```text
node services/comathd/tests/unit/phase27-agent-run-runtime.test.mjs
Initial RED result: exit 1; `../../dist/index.js` did not export `assertAgentRunWriteAllowed`, `createAgentRun`, `getAgentRun`, `listAgentRuns`, `recordAgentRunFailureToMemory`, `startAgentRun`, or `submitAgentRunReport`.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding AgentRun schemas, store exports, runtime layout, and GraphPatch self-review rejection.

node services/comathd/tests/unit/phase27-agent-run-runtime.test.mjs
Result: exit 0; Phase 27 AgentRun runtime tests passed.

Code-review hardening RED result: exit 1; scoped AgentRun writer allowed a `.tmp/comath/<ARUN>/escape` junction/symlink to redirect an allowed lexical path outside the project root.

Code-review hardening RED result: exit 1; `graph_patch_path` and `artifact_manifest_path` report metadata were persisted without AgentRun scope validation or project-relative enforcement.

Code-review hardening RED result: exit 1; recording the same failed AgentRun twice created a second `FailureRoute` node instead of returning the existing failure memory record.

node services/comathd/tests/unit/phase27-agent-run-runtime.test.mjs
Result: exit 0; Phase 27 tests passed after adding existing-ancestor realpath checks, metadata path validation, invalid run-id rejection, and idempotent failed-run memory recording.
```

### Changed Surfaces

- Added `services/comathd/src/agents/agent-run-store.ts` and `services/comathd/src/agents/index.ts`.
- Added `agentRoleSchema`, `agentRunStatusSchema`, `agentRunSchema`, and AgentRun TypeScript exports.
- Added `.comath/agents` to the service runtime layout.
- Exported AgentRun APIs from `services/comathd/src/index.ts`.
- Hardened `reviewGraphPatch()` so a producer cannot review its own GraphPatch.
- Hardened AgentRun scoped writes against symlink/junction realpath escapes through the nearest existing ancestor.
- Validated submitted `graph_patch_path` and `artifact_manifest_path` as project-relative paths within the run's allowed write scope.
- Made `recordAgentRunFailureToMemory()` idempotent for the same failed AgentRun.
- Added `services/comathd/tests/unit/phase27-agent-run-runtime.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `agent_run_runtime_boundary` to `getComathdStatus()`.
- Updated README, TODO, acceptance matrix, risk, security, mathematical-integrity, and handoff documentation.

### Boundary And Integrity Notes

AgentRun write authorization is narrower than the global service path policy: a run may write only under its owning `.comath/workstreams/<WS>/` directory and `.tmp/comath/<ARUN>/`. The global `runtime-write` policy remains `.comath`-only; `.tmp` is allowed only by the AgentRun scoped writer. The scoped writer checks both lexical containment and nearest-existing-ancestor realpath containment, so symlink/junction escapes are rejected before a future launcher can write.

AgentRun reports are artifacts, not proof authority. A successful report cannot promote a claim, apply a GraphPatch, or certify a proof. GraphPatch proposals still require independent review and explicit apply through `ResearchMemoryDB`; failed AgentRuns are preserved as `FailureRoute` memory nodes.

### Residual Risks

- Real child-agent process launching, scheduling, cancellation, log streaming, and rate limiting remain deferred.
- Multi-process writer locks/session semantics remain deferred; current tests exercise single-process service behavior.
- AgentRun report schema is heading-based Markdown validation, not yet a typed artifact-manifest parser or model-output verifier.
- Producer/reviewer identity comparison is exact string equality; richer actor/run alias canonicalization remains a future identity-model task.
- Global GA remains blocked by the deferred items in `TODO.md`; Phase 27 validates the child-agent audit boundary, not autonomous proof research.

### Final Root Validation

Fresh Phase 27 validation completed on 2026-05-27 after code-review hardening:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-27 package tests passed, including AgentRun realpath/scope hardening, metadata path validation, idempotent failed-run memory, proof-kernel integrations, and theorem-family integrity coverage.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, Pi extension tests, comathd Phase 0-27 tests, proof-kernel integrations, and Phase 17 integrity evaluation passed.
```

## Phase 28 AgentRun Process Scheduler Review Log

### Scope

Added the service-side AgentRun process scheduler on top of the Phase 27 runtime boundary. Phase 28 can launch real allowlisted child processes, serialize them under `max_concurrent`, enforce rpm reservations before enqueue, capture scoped logs, persist scheduler reports through AgentRun state, and handle success, nonzero exit, invalid report, timeout, running cancellation, and queued cancellation.

This phase does not make child processes mathematical authorities. Scheduler completion cannot promote claims, apply GraphPatch, certify proof status, or bypass CoMath proof-kernel replay and gate checks. Production Pi/Codex child-agent profile adapters, network-denial sandboxing, and multi-process writer locks remain deferred GA blockers.

### TDD Evidence

```text
node services/comathd/tests/unit/phase28-agent-run-scheduler.test.mjs
Initial RED result: exit 1; `createAgentRunScheduler` was not exported.

node services/comathd/tests/unit/phase28-agent-run-scheduler.test.mjs
Result: exit 0; first scheduler slice passed after adding real child-process launch, serial scheduling, rpm rejection, timeout, cancellation, logs, and report persistence.

Security hardening RED result: exit 1; child process exit 0 with invalid stdout caused `submitAgentRunReport()` to throw, leaving the run without a durable failed report.

Security hardening RED result: exit 1; scheduler inherited parent `process.env`, accepted sensitive `input.command.env`, and allowed queued launches to enter the queue before rpm reservation.

Security hardening RED result: exit 1; relative executable names were rejected only as non-allowlisted rather than fail-closed as non-absolute command paths.

Security hardening RED result: exit 1; queued cancellation returned `false` and left queued AgentRuns runnable.

Security hardening RED result: exit 1; successful child stdout could become the AgentRun report without a scheduler envelope declaring `proof_authority: none` and `supports_claim_status: none`.

Security hardening RED result: exit 1; large stdout was accumulated then sliced without a durable `COMATH_OUTPUT_TRUNCATED` marker.

node services/comathd/tests/unit/phase28-agent-run-scheduler.test.mjs
Result: exit 0; Phase 28 AgentRun scheduler tests passed after hardening absolute realpath allowlists, minimal environment inheritance, sensitive env rejection, rpm reservation, invalid-report fail-closed persistence, queued cancellation, non-authoritative scheduler envelopes, output byte caps, and timeout/cancel process-tree termination.

Post-review hardening RED/GREEN: added guard coverage for non-Windows `SIGTERM` escalation to `SIGKILL` and canonical-realpath execution after allowlist validation; `node tests/unit/phase28-agent-run-scheduler.test.mjs` passed from `services/comathd`.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-28 package tests passed, including AgentRun scheduler hardening, AgentRun runtime-boundary tests, proof-kernel integrations, and theorem-family integrity coverage.
```

### Changed Surfaces

- Added `services/comathd/src/agents/agent-run-scheduler.ts` with `createAgentRunScheduler()` and `AgentRunScheduler`.
- Added `cancelQueuedAgentRun()` to `services/comathd/src/agents/agent-run-store.ts` for durable queued-run cancellation with structured report and audit event.
- Exported scheduler APIs from `services/comathd/src/agents/index.ts`.
- Added `services/comathd/tests/unit/phase28-agent-run-scheduler.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `agent_run_process_scheduler` to `getComathdStatus()`.
- Updated README, TODO, acceptance matrix, risk register, security review, mathematical-integrity review, smoke check, and handoff documentation.

### Boundary And Integrity Notes

Scheduler programs are deny-by-default and must match configured absolute realpaths; relative executable names such as `node` are rejected before PATH resolution. Processes are launched with `shell:false`, scoped cwd under `.tmp/comath/<ARUN>/`, minimal inherited environment, explicit `COMATH_*` runtime variables, and sensitive environment-variable name rejection.

Child stdout/stderr are scoped AgentRun artifacts, not proof evidence. Successful child stdout must still contain the required AgentRun report headings; the scheduler wraps it in a non-authoritative envelope with `proof_authority: none`, `supports_claim_status: none`, and `child_stdout_untrusted: true`. Invalid child reports fail closed as `exit_reason=invalid_report`.

Timeout and running cancellation attempt process-tree termination (`taskkill /T /F` on Windows, process-group termination on non-Windows, then `child.kill()` fallback). Output capture is byte-capped and writes `COMATH_OUTPUT_TRUNCATED` into persisted logs when truncated.

### Residual Risks

- Production Pi/Codex child-agent profile adapters remain unimplemented; Phase 28 uses allowlisted fixture commands and a service API, not a full Pi goal-mode worker pool.
- OS-level sandboxing and enforced network denial remain deferred. Phase 28 hardens command shape, environment, cwd, timeout/cancel, and process-tree termination, but it is not a container/job-object policy sandbox.
- Multi-process writer locks/session semantics remain deferred; current tests exercise single-process service behavior.
- Log streaming APIs remain deferred; Phase 28 persists bounded stdout/stderr logs after process completion.
- AgentRun report schema is still heading-based Markdown validation, not a typed artifact-manifest parser or model-output verifier.

## Phase 29 Agent Profile Service Integration Review Log

### Scope

Added service-owned GA agent profiles on top of the Phase 27 AgentRun runtime boundary and Phase 28 process scheduler. Phase 29 exposes validated profile metadata, profile-backed AgentRun creation, and scheduler launch-envelope preparation through `comathd`, so the child-agent orchestration surface is no longer only an internal TypeScript helper.

This phase does not make profiles, child processes, or AgentRun reports mathematical authorities. Every profile is constrained to `may_mutate_trusted_state=false`, `proof_authority=none`, scoped workstream/tmp write templates, `rpm<=4`, and forbidden direct-promotion/trusted-write tools. Live Pi/Codex adapter execution, richer profile UI, OS/network sandboxing, multi-process writer locks, and log streaming remain deferred.

### TDD Evidence

```text
corepack pnpm --filter @comath/comathd exec node tests/unit/phase29-agent-profile-integration.test.mjs
Initial RED result: exit 1; `dist/index.js` did not provide `buildAgentProfileLaunch`.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase29-agent-profile-integration.test.mjs
Route RED result: exit 1; `/agent/profile/list?global_rpm=4` returned 404 before the service routes existed.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase29-agent-profile-integration.test.mjs
Route-order RED result: exit 1; dynamic `/agent/profile/:id` treated `/agent/profile/list` as an unknown profile id.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase29-agent-profile-integration.test.mjs
Status RED result: exit 1; `/health` did not yet report `agent_profile_service_api`.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase29-agent-profile-integration.test.mjs
Result: exit 0; Phase 29 Agent profile integration tests passed.
```

### Changed Surfaces

- Added `services/comathd/src/agents/agent-profiles.ts`.
- Exported profile APIs from `services/comathd/src/agents/index.ts`.
- Added `GET /agent/profile/list`, `GET /agent/profile/:id`, `POST /agent/run/profile`, and `POST /agent/run/profile/prepare-launch` to `services/comathd/src/api/server.ts`.
- Added `services/comathd/tests/unit/phase29-agent-profile-integration.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `agent_profile_service_api` to `getComathdStatus()`.
- Updated README, TODO, AGENTS, acceptance matrix, and handoff documentation.

### Boundary And Integrity Notes

Profile validation fails closed on duplicate IDs, trusted-state mutation authority, proof authority, profile-local rpm above the global budget, forbidden tools also present in allowed tools, and missing write-scope templates. Unknown profile IDs return `AGENT_PROFILE_UNKNOWN`.

Profile-backed AgentRuns inherit the profile role/model/tool profile but still use the ordinary AgentRun scoped write policy. Launch envelopes only prepare scheduler-compatible command metadata and profile environment variables; they exclude secret-like env keys and do not run processes by themselves.

### Residual Risks

- Live Pi/Codex agent adapter execution remains deferred; Phase 29 provides the service contract, not an end-to-end remote model worker pool.
- OS-level sandboxing and enforced network denial remain deferred beyond the Phase 28 process-shape controls.
- Rich profile UI remains deferred beyond the Phase 30 `/cm:agent` command/tool harness.
- Multi-process writer locks/session semantics and log streaming APIs remain deferred.

## Phase 33 Proof Obligation DAG Planning Review Log

### Scope

Added native planning-stage proof-obligation artifacts to the service-owned proof kernel. Phase 33 writes a campaign-scoped lemma DAG, line map, obligation YAML, `Skeleton.lean`, and skeleton report during the public `planning` campaign state before candidate generation. This internalizes another MathProve v8 proof-factory concept without treating skeletons, DAGs, or line maps as proof authority.

### TDD And Review Evidence

```text
node scripts/phase0-smoke.mjs
Initial audit result: exit 1 before fix; root smoke still required README Phase 18-32 after README had moved to Phase 18-33.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed before Phase 33 regression hardening.

node services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs
Multi-obligation RED result: exit 1; a root -> lemma -> sublemma DAG marked the intermediate obligation as `leaf` instead of `intermediate`, exposing incomplete open-obligation closure semantics.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding campaign-scoped proof-planning artifacts and DAG validation.

node services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs
Result: exit 0; Phase 33 proof obligation DAG tests passed after DAG kind, multi-obligation skeleton, and skeleton-report closure fixes.

node services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs
Unsupported-relation RED result: exit 1; `validateProofObligationDag()` accepted a non-`decomposes_to` edge relation.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding unsupported-relation rejection.

node services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs
Result: exit 0; Phase 33 proof obligation DAG tests passed with duplicate-node, unknown-endpoint, unsupported-relation, cycle, multi-obligation closure, stage-run, and campaign-isolation coverage.

node scripts/phase0-smoke.mjs
Result: exit 0; root smoke now checks Phase 18-33 and Phase 33 acceptance while retaining Phase 32 statement-signature acceptance and mathematical-integrity guards.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-33 package tests passed with Phase 32 and Phase 33 wired into the default test chain.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 33, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

### Changed Surfaces

- Added `services/comathd/src/proof-kernel/stages/proof-obligation-dag.ts`.
- Added `validateProofObligationDag()` with duplicate-node, unknown-edge-endpoint, unsupported-relation, and cycle rejection.
- Wrote proof-planning artifacts under `.comath/campaign/<CAM>/proof/` instead of global `.comath/proof/`.
- Added `Skeleton.lean` with proof-obligation-tagged planning-stage `sorry` placeholders for all open obligations and a skeleton report that explicitly denies proof authority.
- Recorded Phase 33 artifact paths in the campaign `planning` stage run.
- Added `services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs` and wired it into `@comath/comathd` default tests.
- Added `proof_obligation_dag_planning` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

Phase 33 does not implement broad lemma decomposition or arbitrary theorem synthesis. The DAG is validated and campaign-scoped, and its planning artifacts now cover the current open-obligation closure rather than only the root obligation. `Skeleton.lean` may contain named `sorry` placeholders only as skeleton material; final proof authority still requires the existing static audit, statement-equivalence gate, axiom profile, dependency closure, clean Lean replay, and claim promotion gate.

### Residual Risks

- Broad proof planning beyond registered theorem families remains deferred.
- Rich line-map provenance over multi-line informal derivations, citations, and computations remains deferred.
- Generic theorem synthesis and production proof-route agent execution remain deferred.
- Skeleton artifacts are not built as final Lean targets; they are auditable planning outputs whose placeholders must be discharged later.

## Phase 41 Live Agent Adapter Execution Review Log

### Scope

Added a live profile-backed adapter execution slice. `executeProfileAgentRun()` creates a validated profile-bound AgentRun, prepares the launch envelope, executes a real allowlisted adapter process through the Phase 28/40 scheduler, and returns run/result/audit material. `POST /agent/run/profile/execute`, Pi `comath.agent.executeProfile`, and `/cm:agent execute` expose the same path with host confirmation on Pi.

This is a real local adapter execution path, not just a launch-envelope scaffold. It still does not package a production Codex CLI/API adapter, log streaming UI, adapter health checks, or OS-level sandboxing.

### TDD Evidence

```text
node services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs
Initial RED result: exit 1; `../../dist/index.js` did not export `executeProfileAgentRun`.

node services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs
Integration RED result after first implementation: exit 1; scheduler rejected `COMATH_PROOF_AUTHORITY` as sensitive env, exposing a profile/scheduler boundary mismatch.

node services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs
Fixture RED result: exit 1; adapter fixture script had invalid generated JavaScript string escaping, then a too-narrow report assertion.

node services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs
Result: exit 0; live profile-backed adapter execution tests passed.

node extensions/comath-pi/tests/phase41-agent-execute-tool.test.mjs
Initial RED result: exit 1; `comath.agent.executeProfile` was not registered.

node extensions/comath-pi/tests/phase41-agent-execute-tool.test.mjs
Result: exit 0; Pi profile execution tool and `/cm:agent execute` tests passed.
```

### Changed Surfaces

- Added `executeProfileAgentRun()` to `services/comathd/src/agents/agent-profiles.ts`.
- Added `POST /agent/run/profile/execute` to `services/comathd/src/api/server.ts`.
- Allowed the explicit non-secret `COMATH_PROOF_AUTHORITY=none` scheduler environment metadata while retaining sensitive env rejection.
- Added `services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added Pi `comath.agent.executeProfile` and `/cm:agent execute` in `extensions/comath-pi/src/index.ts`.
- Added `extensions/comath-pi/tests/phase41-agent-execute-tool.test.mjs` and wired it into the default `@comath/pi-extension` test chain.
- Added `live_agent_adapter_execution` to service status and updated README, TODO, acceptance matrix, smoke checks, security, math-integrity, and handoff notes.

### Boundary And Integrity Notes

The adapter executes through the same scheduler controls as other AgentRuns: absolute allowlisted program, `shell:false`, scoped cwd/log writes, rpm/concurrency controls, writer-lock acquisition, timeout/cancel behavior, and non-authoritative scheduler report wrapping. Child stdout is still marked untrusted; successful adapter exit cannot promote claims, apply GraphPatch directly, or replace proof-kernel replay.

### Residual Risks

- Production Codex CLI/API adapter packaging remains deferred.
- Live log streaming, adapter health checks, and richer interactive operator controls remain deferred.
- OS-level sandboxing and enforced network denial remain deferred.

### Final Root Validation

Fresh Phase 41 validation completed on 2026-05-28:

```text
node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd Research Alpha smoke accepted `live_agent_adapter_execution`.

node services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs
Result: exit 0; Phase 41 live agent adapter execution tests passed.

node extensions/comath-pi/tests/phase41-agent-execute-tool.test.mjs
Result: exit 0; Phase 41 Pi agent execute tool tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-41 package tests passed with Phase 41 wired into the default test chain.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed with Phase 41 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 41, and Phase 17 integrity evaluation passed.
```

## Phase 40 AgentRun Scheduler Writer Lock Integration Review Log

### Scope

Wired the service-side AgentRun process scheduler through the Phase 39 project writer session lock. A scheduled process run now acquires a project writer lock before starting run-state/log/report mutation, rejects launch while another active writer owns the project, preserves the queued run on blocked launch, and releases the scheduler-owned lock after terminal report handling.

This still does not provide OS-level process sandboxing, enforced network denial, or mandatory external-process locks.

### TDD Evidence

```text
node services/comathd/tests/unit/phase40-agent-scheduler-session-lock.test.mjs
Initial RED result: exit 1; missing expected rejection because the scheduler ignored an existing active writer lock and launched the child process.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding scheduler acquire/release integration.

node services/comathd/tests/unit/phase40-agent-scheduler-session-lock.test.mjs
Result: exit 0; Phase 40 scheduler writer-lock integration tests passed.

node tests/unit/phase28-agent-run-scheduler.test.mjs
Result: exit 0 from `services/comathd`; Phase 28 scheduler regression tests remained compatible with writer-lock integration.
```

### Changed Surfaces

- Updated `services/comathd/src/agents/agent-run-scheduler.ts` so `execute()` acquires/releases project writer sessions.
- Added scheduler audit events `agent_run.writer_lock_blocked`, `agent_run.writer_lock_acquired`, and `agent_run.writer_lock_released`.
- Added `services/comathd/tests/unit/phase40-agent-scheduler-session-lock.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `agent_run_scheduler_writer_lock_integration` to service status and removed the narrower lock-integration residual risk.
- Updated README, TODO, acceptance, smoke, security, mathematical-integrity, and handoff notes.

### Boundary And Security Notes

Blocked launches fail before `startAgentRun()` and before child process spawn, preserving the queued AgentRun and avoiding log/report side effects. Allowed launches hold the session through terminal report submission and release in a `finally` path so success, failure, timeout, cancellation, and invalid-report handling all relinquish the scheduler-owned lock.

The lock is still a CoMath-owned coordination file, not an OS mandatory lock. External processes that bypass `comathd` remain outside the guarantee.

### Residual Risks

- OS-level process sandboxing and network-denial enforcement remain deferred.
- Live Pi/Codex adapter execution remains deferred.
- Mandatory cross-process filesystem locks for arbitrary external writers remain outside Phase 40.

### Final Root Validation

Fresh Phase 40 validation completed on 2026-05-28:

```text
node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd Research Alpha smoke accepted `agent_run_scheduler_writer_lock_integration`.

node services/comathd/tests/unit/phase40-agent-scheduler-session-lock.test.mjs
Result: exit 0; Phase 40 AgentRun scheduler session-lock tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-40 package tests passed with Phase 40 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 40, and Phase 17 integrity evaluation passed.
```

## Phase 39 Project Writer Session Lock Review Log

### Scope

Added a service-owned project writer session lock primitive under `.comath/sessions/writer.lock.json`. Phase 39 gives `comathd` and future scheduled AgentRun writers an auditable single-writer coordination object with token-gated release, stale-lock takeover, and fail-closed malformed-lock behavior.

This is not OS-level process sandboxing and does not yet wire every AgentRun scheduler launch or mutation route through the lock. It retires only the lock primitive portion of the broader scheduled-process isolation blocker.

### TDD Evidence

```text
node services/comathd/tests/unit/phase39-project-session-lock.test.mjs
Initial RED result: exit 1; `../../dist/index.js` did not export `acquireProjectSessionLock`.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding the session-lock module and export.

node services/comathd/tests/unit/phase39-project-session-lock.test.mjs
Result: exit 0; Phase 39 lock tests passed for acquisition, active-lock rejection, token-gated release, and stale takeover.

node services/comathd/tests/unit/phase39-project-session-lock.test.mjs
Reviewer-strengthened RED result: exit 1; malformed lock input surfaced a raw `SyntaxError` instead of the required fail-closed unreadable-lock error.

node services/comathd/tests/unit/phase39-project-session-lock.test.mjs
Result: exit 0; malformed locks now fail closed with `active writer session lock is unreadable` and are not overwritten.
```

### Changed Surfaces

- Added `services/comathd/src/project/session-lock.ts` with `acquireProjectSessionLock()`, `releaseProjectSessionLock()`, and `readProjectSessionLock()`.
- Exported the lock API from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase39-project-session-lock.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `project_writer_session_lock` to `getComathdStatus()` and `agent_process_multi_process_lock_integration_deferred` as an explicit residual risk.
- Updated README, TODO, acceptance matrix, smoke checks, and coordination notes for Phase 39.

### Boundary And Security Notes

The lock path is resolved through the existing runtime-write path policy and lives under `.comath/sessions/`. Initial acquisition uses exclusive-create semantics, active locks reject contenders, release requires the current session token, stale takeover records the replaced session id, and malformed lock JSON is treated as an active fail-closed condition rather than silently repaired.

The session lock is coordination metadata only. It does not prove mathematical artifacts, does not grant claim-promotion authority, does not sandbox child processes, and does not yet enforce single-writer behavior across every AgentRun scheduler path.

### Residual Risks

- AgentRun scheduler integration with this writer lock remains deferred.
- OS-level process sandboxing and network-denial enforcement remain deferred.
- The primitive is file-lock-shaped coordination, not an operating-system advisory/mandatory lock across arbitrary external processes.

### Final Root Validation

Fresh Phase 39 validation completed on 2026-05-28:

```text
node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd Research Alpha smoke accepted `project_writer_session_lock` and the deferred AgentRun lock-integration residual risk.

node services/comathd/tests/unit/phase39-project-session-lock.test.mjs
Result: exit 0; Phase 39 project session lock tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-39 package tests passed with Phase 39 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 39, and Phase 17 integrity evaluation passed.
```

## Phase 38 Native TriviumDB Target-Platform Evaluation Review Log

### Scope

Added an explicit native TriviumDB target-platform evaluation harness. Phase 38 retires the previous "native TriviumDB performance/persistence validation" blocker for this Windows x64 workstation by installing `triviumdb@0.7.1` as a root optional dependency, adapting the CoMath Trivium adapter to the actual Node export/API shape, and recording fail-closed capability, persistence, search-quality, and timing evidence.

This does not make TriviumDB the default backend. Native memory remains optional, dynamically loaded, and selected only through the adapter/factory path.

### TDD Evidence

```text
node services/comathd/tests/unit/phase38-trivium-native-evaluation.test.mjs
Initial RED result: exit 1; `evaluateTriviumTargetPlatform` was not exported.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding the Trivium target-evaluation module and export.

node services/comathd/tests/unit/phase38-trivium-native-evaluation.test.mjs
Result: exit 0; evaluation contract passed for fail-closed native-unavailable reports and fake-native available reports.
```

### Real Native Evidence

```text
corepack pnpm --store-dir .pnpm-store add -w -O triviumdb@0.7.1
Result: exit 0; root optional dependency `triviumdb@0.7.1` installed without adding it to `services/comathd` ordinary dependencies.

$env:COMATH_ENABLE_TRIVIUM_TESTS='1'; corepack pnpm --filter @comath/comathd test:trivium
Initial native result: exit 1; target package exported `default.TriviumDB`, not `Database`, then exposed vector-API and lock/reopen behavior that required adapter support.

$env:COMATH_ENABLE_TRIVIUM_TESTS='1'; corepack pnpm --filter @comath/comathd test:trivium
Result: exit 0; real native adapter smoke passed for `triviumdb@0.7.1` after supporting `default.TriviumDB`, vector insert/search calls, lock cleanup, and idempotent restore/update.

corepack pnpm --filter @comath/comathd eval:trivium
Result: exit 0; real Windows x64 target evaluation passed with `backend=trivium`, `sample_size=64`, `search_top_hit_ratio=1`, `persistence_reopen.result=pass`, `upsert_ms_per_node=0.12635156250000001`, and no hard vetoes.
```

### Changed Surfaces

- Added `services/comathd/src/memory/trivium-evaluation.ts` with `evaluateTriviumTargetPlatform()`.
- Added `services/comathd/tests/unit/phase38-trivium-native-evaluation.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `services/comathd/scripts/run-trivium-target-evaluation.mjs` and `corepack pnpm --filter @comath/comathd eval:trivium`.
- Added root optional dependency `triviumdb@0.7.1`; `services/comathd/package.json` still has no `triviumdb` dependency.
- Extended Trivium capability probing and adapter construction for the actual Node export shape `default.TriviumDB`.
- Adapted native insert/search calls to the vector API while keeping CoMath's stable string IDs and in-process search semantics intact.
- Added native close/reopen lock cleanup for the adapter-owned `.comath/db/research-memory.tdb.lock` path.
- Made restore idempotent against already-persisted native nodes by updating payload after native "already exists" errors.
- Added `trivium_target_platform_evaluation` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

The native package is optional at the workspace root so target-platform evaluation can load it without making `services/comathd` depend on native code in ordinary package metadata. Default tests still exercise fallback and adapter semantics. Native validation is explicit: `eval:trivium` must pass before claiming target native persistence/performance readiness.

TriviumDB evidence remains memory-system evidence only. It does not promote claims, certify proofs, replace Lean replay, or authorize MathProve output.

### Residual Risks

- Broader multi-platform native benchmarking remains future work.
- Production default-backend selection policy remains explicit configuration work; Phase 38 keeps the default backend as memory.
- TriviumDB native lock behavior is handled for the adapter-owned evaluation path, but multi-process writer/session locks remain a separate AgentRun/comathd blocker.

### Final Root Validation

Fresh Phase 38 validation completed on 2026-05-28:

```text
node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd smoke accepted `trivium_target_platform_evaluation` and no longer lists `native_trivium_performance_evaluation_deferred` as a residual risk.

node services/comathd/tests/unit/phase38-trivium-native-evaluation.test.mjs
Result: exit 0; Phase 38 TriviumDB native evaluation contract tests passed.

$env:COMATH_ENABLE_TRIVIUM_TESTS='1'; corepack pnpm --filter @comath/comathd test:trivium
Result: exit 0; real `triviumdb@0.7.1` optional native smoke passed on Windows x64.

corepack pnpm --filter @comath/comathd eval:trivium
Result: exit 0; real target evaluation passed with `backend=trivium`, `sample_size=64`, `search_top_hit_ratio=1`, `persistence_reopen.result=pass`, `upsert_ms_per_node=0.08118437500000031`, and no hard vetoes.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-38 package tests passed with Phase 38 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 38, and Phase 17 integrity evaluation passed.
```

## Phase 37 Registered Lean Statement Alias Equivalence Review Log

### Scope

Added a conservative registered-alias path to Lean statement equivalence. Phase 37 permits a target theorem signature to differ from the locked formal spec only when an explicit `allowed_definitional_aliases` entry maps the formal spec statement to the exact extracted target signature and records a witness. It does not claim full Lean parser integration, arbitrary definitional equality, transitive semantic equivalence, or proof-producing logical equivalence.

### TDD Evidence

```text
node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs
Initial RED result: exit 1; alias output `MathResearch.C0001 (n : Nat) : Nat.add n 0 = n` failed because statement equivalence only accepted exact normalized target-signature equality.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding registered alias support and status capability wiring.

node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs
Result: exit 0; Phase 32 target-signature equality and missing/ambiguous/mismatch regressions remained valid.

node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs
Result: exit 0; registered alias equivalence passed for Lean notation expansion, while missing, ambiguous, and non-registered mismatched target output failed closed.
```

### Changed Surfaces

- Added `StatementDefinitionalAlias` and optional `allowed_definitional_aliases` input to `services/comathd/src/proof-kernel/lean/statement-equivalence.ts`.
- Added `equivalence_witness` output for accepted registered definitional aliases.
- Preserved existing exact-match status and hard vetoes for missing target output, ambiguous target output, and mismatched signatures.
- Added `services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `lean_statement_alias_equivalence` and `lean_parser_logical_equivalence_deferred` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

Registered aliases are allowlist entries, not inferred theorem equivalence. The implementation normalizes whitespace only, compares the locked formal statement and extracted target signature exactly after normalization, and records the alias justification as evidence metadata. A target theorem with the wrong operand order, missing `#check` output, or multiple target outputs is still rejected.

This keeps statement equivalence target-bound after Phase 32 while allowing narrowly audited notation expansion cases such as `n + 0 = n` versus `Nat.add n 0 = n`.

### Residual Risks

- Lean parser integration remains deferred.
- Proof-producing definitional/logical equivalence classes remain deferred.
- Transitive dependency semantics and broader mathematical-domain trust profiles remain deferred.

### Final Root Validation

Fresh Phase 37 validation completed on 2026-05-28:

```text
node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd Research Alpha smoke accepted `lean_statement_alias_equivalence` and the deferred Lean parser/logical-equivalence residual risk.

node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs
Result: exit 0; Phase 32 exact target-signature binding regressions remained green.

node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs
Result: exit 0; Phase 37 registered statement-alias equivalence tests passed.

node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-37 package tests passed with Phase 37 wired into the default test chain.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 37, and Phase 17 integrity evaluation passed.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.
```

## Phase 36 Runner Replay Sandbox And Dependency Provenance Review Log

### Scope

Added explicit sandbox-policy and dependency-lock provenance to compute-runner reports and replay manifests. Phase 36 reduces the runner replay hardening blocker by making provenance auditable and fail-closed; it does not claim OS-level isolation, enforced network denial, cross-machine replay validation, or arbitrary runner-family lockfile coverage.

### TDD Evidence

```text
node services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs
Initial RED result: exit 1; `metadata.sandbox_policy` was undefined in persisted runner reports.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding runner provenance metadata and replay-manifest propagation.

node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd smoke status accepted `runner_replay_sandbox_dependency_provenance` and the updated residual replay-sandbox risk.

node services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs
Result: exit 0; runner reports and replay manifests carried sandbox/dependency provenance, and missing provenance failed closed.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Result: exit 0; snapshot/replay tests passed after preserving dependency-lock script-hash drift in the existing script-drift fixture.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-36 package tests passed with Phase 36 wired into the default test chain.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 36, and Phase 17 integrity evaluation passed.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

git diff --check
Result: exit 0; no whitespace errors reported.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

### Changed Surfaces

- Added `sandbox_policy` and `dependency_lock` to compute runner metadata in `services/comathd/src/verification/runner-contracts.ts`.
- Preserved sandbox/dependency provenance in `ReplayRunManifest` entries from `services/comathd/src/artifacts/replay.ts`.
- Added replay-integrity vetoes `runner_sandbox_policy_missing` and `runner_dependency_lock_missing`.
- Added `services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `runner_replay_sandbox_dependency_provenance` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

The recorded sandbox policy is an auditable contract for the current runner execution path: `shell:false`, project-root cwd policy, fixed executable class, and `network: denied_by_contract`. It is not an OS-level sandbox. The dependency lock binds runner id/version, script hash, and Python package presence into replay artifacts so future replay checks can distinguish missing provenance from valid replayable material.

### Residual Risks

- OS-level runner isolation and enforced network denial remain deferred.
- Cross-machine replay validation remains deferred.
- Broader runner-family lockfiles beyond the implemented Python compute runners remain deferred.

## Phase 35 Claim-Scoped Final Replay Artifact Paths Review Log

### Scope

Removed the last hardcoded `C-0001` final replay stage-run artifact pointers from the supported proof-kernel campaign path. Phase 35 fixes a concrete audit-trail bug after Phase 34: supported campaigns could be ensemble-isolated but still report final replay artifact paths under the first claim id when the active root claim was a later claim.

### TDD And Review Evidence

```text
node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Initial RED result: exit 1; the second supported campaign's final replay stage run still pointed at `.comath/evidence/C-0001/lean/...` while `FinalLeanReplay.claim_id` was `C-0002`.

node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Result: exit 0; final replay stage-run artifact paths used the active second-campaign claim id.
```

### Changed Surfaces

- Updated `tickCampaign()` final replay stage-run artifact path generation to use `claim.id`.
- Added `services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs` and wired it into `@comath/comathd` default tests.
- Added `claim_scoped_final_replay_artifacts` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

Phase 35 changes audit-pointer correctness only. It does not alter final replay proof authority, candidate selection, static audit semantics, theorem-family scope, or claim promotion gates. The claim remains formally checked only when the service-owned final replay manifest for that same claim passes the existing gate path.

### Final Boundary Validation

Fresh Phase 35 validation completed on 2026-05-28:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after the Phase 35 code and documentation updates.

node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Result: exit 0; Phase 35 final replay artifact path regression passed.

node scripts/phase0-smoke.mjs
Result: exit 0; root smoke checked 25 required entries and 26 invariants.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-35 package tests passed with Phase 35 wired into the default test chain.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 35, and Phase 17 integrity evaluation passed.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

git diff --check
Result: exit 0; no whitespace errors reported.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

### Residual Risks

- Claim-scoped paths are covered for registered theorem-family proof campaigns, not arbitrary theorem synthesis.
- Release-bundle provenance is still minimal; richer cross-artifact traceability remains deferred.
- Full interactive Pi/comathd install-session e2e and live Pi/Codex agent adapter execution remain deferred.

## Phase 34 Campaign-Scoped Ensemble Artifacts Review Log

### Scope

Moved proof-kernel ensemble candidate and arbitration artifacts into campaign-scoped runtime paths. Phase 34 fixes a concrete multi-campaign isolation bug left after Phase 33: planning artifacts were campaign-scoped, but supported proof campaigns still shared `.comath/ensembles/lemma_sprint/PO-0001/` for candidates and decisions.

### TDD And Review Evidence

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed before writing the Phase 34 isolation regression.

node services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs
RED result: exit 1; campaign A read campaign B candidate runs after interleaved candidate-generation ticks.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding campaign-scoped ensemble paths.

node services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs
Result: exit 0; interleaved `Nat.add_zero` and `Nat.mul_zero` campaigns kept candidate workspaces, candidate batch indexes, and decisions in campaign-scoped paths.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; Phase 18 vertical slice passed with campaign-scoped candidate manifest paths.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Result: exit 0; Phase 19 ensemble recovery passed with campaign-scoped candidate workspace and decision artifacts.

node services/comathd/tests/integration/phase23-ga-theorem-family-generalization.test.mjs
Result: exit 0; Phase 23 theorem-family generalization passed with campaign-scoped candidate manifest paths.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-34 package tests passed with Phase 34 wired into the default test chain.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 34, and Phase 17 integrity evaluation passed.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.
```

### Changed Surfaces

- Added `services/comathd/src/proof-kernel/ensemble/paths.ts`.
- Updated `runTheoremFamilyCandidates()` to write candidate workspaces under `.comath/campaign/<CAM>/ensembles/lemma_sprint/<PO>/candidates/<variant>/`.
- Updated `decideCandidate()` to write `decision.json` under the active campaign's ensemble root.
- Updated campaign tick candidate verification, arbitration, integration, adversarial review, and final replay return paths to read `candidates.json` and `decision.json` from the active campaign.
- Added `services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs` and wired it into `@comath/comathd` default tests.
- Updated Phase 18, Phase 19, and Phase 23 tests for the new campaign-scoped artifact paths.
- Added `campaign_scoped_ensemble_artifacts` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

Phase 34 does not change candidate scoring or proof authority. It preserves the existing evidence-weighted arbitration semantics, but prevents a selected candidate or decision artifact from being read across campaign boundaries when campaigns reuse local `PO-0001` and `CAND-0001` identifiers.

### Residual Risks

- Candidate IDs remain campaign-local (`CAND-0001` etc.); this is acceptable only because artifacts are now campaign-scoped.
- Live child-agent candidate execution remains deferred; current candidates are deterministic theorem-family slices.
- OS-level sandboxing for untrusted candidate code remains deferred.

## Phase 32 Lean Statement Signature Binding Review Log

### Scope

Hardened statement equivalence by requiring a unique target theorem signature from Lean `#check` output. Phase 32 removes the previous substring-only acceptance path and adds explicit fail-closed vetoes for missing, ambiguous, and mismatched target signatures.

This is not full Lean parser integration and does not prove definitional or logical equivalence across non-identical statements. It is a conservative binding improvement for the current final replay evidence path.

### TDD Evidence

```text
corepack pnpm --filter @comath/comathd exec node tests/unit/phase32-lean-statement-signature.test.mjs
Initial RED result: exit 1; `checkStatementEquivalence()` returned no `target_signature` and still relied on substring matching.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase32-lean-statement-signature.test.mjs
Result: exit 0; Phase 32 Lean statement signature tests passed.
```

### Changed Surfaces

- Added `services/comathd/src/proof-kernel/lean/statement-signature.ts`.
- Updated `services/comathd/src/proof-kernel/lean/statement-equivalence.ts` to require a unique target theorem signature and emit `missing_target_check_output`, `ambiguous_target_check_output`, or `statement_signature_mismatch` vetoes.
- Exported the signature helper from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs`.
- Added Phase 32 to the default `@comath/comathd` test chain and phase tracking documents.

### Boundary And Integrity Notes

Statement equivalence now ignores target theorem text embedded inside arbitrary log lines. A passing report requires exactly one line beginning with the requested theorem name and matching the normalized formal spec signature.

### Residual Risks

- Definitional equivalence and registered-lemma logical equivalence still need Lean/parser-level support.
- The signature parser is conservative and line-oriented; it may block valid pretty-printer formats until those formats are explicitly supported.
- Broad proof planning and theorem synthesis beyond registered theorem families remain unresolved GA blockers.

## Phase 31 Lean Trust Profile Hardening Review Log

### Scope

Hardened Lean final-proof authority around configurable axiom trust profiles and skeleton-only placeholder policy. Phase 31 does not broaden theorem synthesis, add a Lean parser, or complete transitive Lake dependency semantics; it makes the existing final replay gate more explicit and more fail-closed.

### TDD Evidence

```text
corepack pnpm --filter @comath/comathd exec node tests/unit/phase31-lean-trust-profile.test.mjs
Initial RED result: exit 1; `checkAxiomProfile()` did not return or enforce a project-level `trust_profile`.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase31-lean-trust-profile.test.mjs
Second RED result: exit 1; missing target-theorem `#print axioms` output did not produce `missing_target_axiom_report`.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase31-lean-trust-profile.test.mjs
Result: exit 0; Phase 31 Lean trust profile tests passed.
```

### Changed Surfaces

- Added `services/comathd/tests/unit/phase31-lean-trust-profile.test.mjs`.
- Extended `services/comathd/src/proof-kernel/lean/axiom-profile.ts` with configurable `LeanTrustProfile`, target-theorem axiom-report detection, and fail-closed `missing_target_axiom_report`.
- Extended `services/comathd/src/proof-kernel/lean/static-cheat-scan.ts` with explicit skeleton allowlisting for `sorry`.
- Added Phase 31 to the default `@comath/comathd` test chain and phase tracking documents.

### Boundary And Integrity Notes

Trust profiles only govern which Lean axioms may pass the axiom-profile gate. They do not certify statement equivalence, dependency closure, static proof integrity, clean replay, or claim promotion.

Skeleton `sorry` allowlisting is opt-in per relative Lean file. Final proof files remain fail-closed on `sorry`, `admit`, unauthorized `axiom`, unauthorized `constant`, `unsafe`, and `opaque`.

### Residual Risks

- Statement equivalence still needs theorem-signature extraction rather than stdout substring matching.
- Axiom-profile extraction still parses Lean text output; it is target-bound but not yet a Lean environment object.
- Dependency closure is still local-file/import-hash oriented and not a full transitive Lake/mathlib trust proof.
- Broad proof planning and theorem synthesis beyond registered theorem families remain unresolved GA blockers.

## Phase 30 Pi Agent Profile Runtime UX Review Log

### Scope

Added a Pi runtime-facing agent profile UX over the Phase 29 `comathd` profile API. Phase 30 exposes `comath.agent.profileList`, `comath.agent.profileGet`, `comath.agent.runForProfile`, `comath.agent.prepareLaunch`, and `/cm:agent` command dispatch while keeping Pi as a thin client.

This phase does not execute a live Pi/Codex remote worker pool and does not make agent profiles proof authorities. Mutating profile actions still require Pi host confirmation and route through `comathd`; the extension still does not read or write `.comath/` directly.

### TDD Evidence

```text
corepack pnpm --filter @comath/pi-extension exec node tests/phase30-agent-profile-tools.test.mjs
Initial RED result: exit 1; `comath.agent.profileList` was not registered.

corepack pnpm --filter @comath/pi-extension exec node tests/phase30-agent-profile-tools.test.mjs
Parser RED result: exit 1; `/cm:agent profile proof-route` was parsed as the default `profiles` action until `agent` joined the subcommand-aware command list.

corepack pnpm --filter @comath/pi-extension exec node tests/phase30-agent-profile-tools.test.mjs
UX RED result: exit 1; missing `workstream_id` prompted for mutation confirmation before local argument validation.

corepack pnpm --filter @comath/pi-extension exec node tests/phase30-agent-profile-tools.test.mjs
Result: exit 0; Phase 30 Pi agent profile tool tests passed.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed with Phase 30 wired into the default package test chain.
```

### Changed Surfaces

- Added `extensions/comath-pi/tests/phase30-agent-profile-tools.test.mjs`.
- Added agent profile tool descriptors and `executeComathTool()` routing in `extensions/comath-pi/src/index.ts`.
- Added `/cm:agent` runtime command handling in `extensions/comath-pi/src/index.ts`.
- Added `/cm:agent` metadata in `extensions/comath-pi/src/runtime-registration.ts`.
- Updated `extensions/comath-pi/package.json` and Phase 26 registration tests so Phase 30 is part of the default Pi extension verification chain.

### Boundary And Integrity Notes

Read-only profile actions call `GET /agent/profile/list` and `GET /agent/profile/:id`. Mutating actions call `POST /agent/run/profile` and `POST /agent/run/profile/prepare-launch` only after Pi host confirmation. Runtime schemas continue to hide `confirmation_id` from model-supplied parameters.

Local command parsing validates required `project_id`, `workstream_id`, `run_id`, `program`, `goal`, and `context_path` before asking the host to confirm a mutation.

### Residual Risks

- Live Pi/Codex agent adapter execution remains deferred; Phase 30 provides product-facing controls for service-owned profile/run/launch contracts.
- Rich widgets/status UI and a full interactive Pi/comathd install-session e2e remain deferred.
- OS-level process sandboxing, network denial, multi-process writer locks, and log streaming APIs remain deferred.

## Phase 25 Real MathProve External Bridge Review Log

### Scope

Added a service-owned external MathProve evidence-runner bridge for `MathProve-Skill` `verify_sympy.py`. Phase 25 upgrades the earlier mock-only MathProve boundary in a narrow executable sense: CoMath can now invoke the sibling MathProve skill package, archive the result, and feed the resulting vetoes into the normal gate.

This is not broad MathProve proof search and not a MathProve proof-authority path. `formally_checked` still requires CoMath proof-kernel replay evidence and the ordinary promotion gate.

### TDD Evidence

```text
node services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs
Initial RED result: exit 1; `runMathProveBridgeExternal` was not exported.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding the external bridge.

node services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs
Debugging RED result: exit 1; external MathProve invocation failed because `verify_sympy.py` wrote a relative `logs/tool_calls.log` path without the log directory existing.

python <MathProve-Skill>/scripts/verify_sympy.py --workspace-dir <temp> --run-dir run --log <temp>/logs/tool_calls.log --timeout 5 --code "x=symbols('x'); emit({'ok': bool(expand((x+1)**2) == x**2 + 2*x + 1)})"
Result: exit 0; MathProve-Skill `verify_sympy.py` returned `status=success` and `output.ok=true` when given a controlled absolute log path.

node services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs
Result: exit 0; Phase 25 real MathProve bridge tests passed.

Code-review hardening RED result: exit 1; `scrubHostPaths()` only removed the drive-prefix portion of Windows paths containing spaces, leaving a host-specific suffix.

Code-review hardening RED result: exit 1; arbitrary `mathprove_root` overrides were treated as unavailable runners rather than rejected as untrusted command roots before invocation.

node services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs
Result: exit 0; Phase 25 tests passed after pinning the external root, improving Windows path scrubbing, and rejecting MathProve authority escalation.
```

### Changed Surfaces

- Added `runMathProveBridgeExternal()` and `phase25-external-v1` result metadata to `services/comathd/src/verification/mathprove.ts`.
- Refactored MathProve bridge report archival so mock and external backends both persist reports under `.comath/evidence/<claim>/mathprove`, import them as `runner_output`, record audit evidence, and append `mathprove.bridge_ran`.
- Added external-run metadata: runner id/version, MathProve root, script path/hash, controlled workspace, fixed argv template, timeout, network flag, exit code, stdout/stderr/result hashes, and replay input hash.
- Added fail-closed external paths for missing runner and claim statement-hash mismatch before invocation.
- Pinned `mathprove_root` overrides to the realpath-equivalent sibling `MathProve-Skill` root and reject untrusted roots before Python invocation.
- Scrubbed host paths from persisted external MathProve metadata and nested stdout/stderr/result payloads.
- Extended `promoteClaimWithMathProveBridge()` with `{ backend: "external" }` while preserving the mock default.
- Added `services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `mathprove_external_evidence_runner` to `getComathdStatus()` and smoke coverage.

### Boundary And Integrity Notes

The external bridge invokes only `MathProve-Skill` `scripts/verify_sympy.py` through `execFile` with a fixed argv shape and `shell:false`. CoMath owns the workspace under `.comath/evidence/<claim>/mathprove/external-workspace`, pre-creates the log directory, and hashes stdout, stderr, parsed result, script, and replay input.

The SymPy check is a deterministic external-runner smoke and carries the current claim id plus statement hash as binding metadata. It is not a proof of the claim statement. Even when MathProve returns `status=success` and `output.ok=true`, the bridge result keeps `gate_result=failed` and emits vetoes such as `mathprove_external_not_claim_proof`, `mathprove_external_not_formal_authority`, and `missing_kernel_checked_artifact`.

### Residual Risks

- Phase 25 covers only the external `verify_sympy.py` runner path, not MathProve `final_audit.py`, Lean checking through MathProve, route synthesis, or broad proof search.
- The external bridge records `network=false` intent and uses fixed argv/timeouts, but it is not yet an OS-enforced sandbox or dependency-locked replay environment.
- External root overrides are accepted only when they resolve to the realpath-equivalent sibling `MathProve-Skill` root; broader MathProve runner configuration remains deferred.
- At this historical Phase 25 checkpoint, broad proof planning, production Pi runtime registration, native TriviumDB validation, persistent child-agent scheduling, and richer statement equivalence remained global GA blockers; the current blocker set is superseded by `TODO.md` and the Phase 28 review log.

### Final Root Validation

Fresh Phase 25 validation completed on 2026-05-27:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-25 package tests passed, including the real MathProve bridge, authority-boundary, host-path scrub, and theorem-family integration coverage.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed after Phase 25 status/doc updates.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, workspace package tests, Phase 25 comathd bridge tests, proof-kernel integrations, Pi extension regressions, and Phase 17 integrity evaluation passed.
```

## Phase 24 Runner Re-Execution Replay Review Log

### Scope

Added service-owned deterministic re-execution for replayable compute runner reports. Phase 24 strengthens `/replay/verify-manifest` so it no longer relies only on snapshot/replay manifest integrity: `sympy-exact` and `counterexample-search` reports are rerun from stored canonical input, while placeholder runners remain explicitly skipped.

This is not a full OS-level sandbox or cross-machine reproducibility layer. Stronger network-denial enforcement, dependency lock capture, and cross-machine replay validation remain deferred.

### TDD Evidence

```text
node services/comathd/tests/unit/phase10-compute-runners.test.mjs
Initial RED result: exit 1; runner reports did not contain `metadata.replay_input_json`, so canonical replay input could not be reconstructed.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding canonical replay input metadata.

node services/comathd/tests/unit/phase10-compute-runners.test.mjs
Result: exit 0; compute runner reports now persist canonical replay input JSON and matching input hashes.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Initial RED result: exit 1; strict replay route still returned `ok=true` after a snapshot-local runner report's script hash was forged.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Review-strengthened RED result: exit 1; `/replay/verify-manifest` returned no per-runner `runner_reexecution` summaries.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Review-strengthened RED result: exit 1; replay manifest/report drift with recomputed manifest hashes was not rebound to the actual runner report fields.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Review-strengthened RED result: exit 1; snapshot entry hash mismatch still allowed the test to reach runner-level re-execution checks.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Review-strengthened RED result: exit 1; a replay report with an oversized `timeout_ms` still passed strict replay after manifest hashes were recomputed.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Review-strengthened RED result: exit 1; report-local `stdout_sha256` metadata could be forged alongside replay manifest hashes without a static stdio self-consistency veto.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding strict runner re-execution and replay summaries.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Result: exit 0; strict replay route re-executes `sympy-exact` and `counterexample-search`, skips placeholders, and fails closed on replay/report drift, static snapshot vetoes, script hash drift, canonical input hash drift, oversized replay timeout, report-local stdio hash drift, and untrusted replay argv.
```

### Changed Surfaces

- Added `replay_input_json` and `replay_input_sha256` to compute runner metadata in `services/comathd/src/verification/runner-contracts.ts`.
- Added `verifyRunnerReportReexecution()` in `services/comathd/src/artifacts/replay.ts`.
- Added `VerifySnapshotOptions.reexecuteRunners` and per-runner `runner_reexecution` summaries in `services/comathd/src/artifacts/snapshots.ts`.
- Added replay/report binding vetoes (`replay_run_duplicate`, `replay_run_report_missing`, `replay_run_missing`, `replay_run_report_mismatch`) so replay runs must match the actual snapshot runner report fields before Python execution is considered.
- Changed `/replay/verify-manifest` to call `verifySnapshot(..., { reexecuteRunners: true })` while ordinary `/snapshot/verify` and restore remain static snapshot-integrity checks.
- Added Phase 24 coverage to `phase10-compute-runners.test.mjs` and `phase16-snapshot-replay.test.mjs`.
- Added `runner_reexecution_replay` to `getComathdStatus()` and replaced the old residual risk with `stronger_runner_reexecution_sandbox_deferred`.

### Boundary And Integrity Notes

Strict runner replay reconstructs command shape from the fixed service runner registry. It does not trust report-local absolute paths, manifest replay descriptors, or arbitrary argv. The stored canonical input must hash back to the recorded input hash, report-local stdio fields must match their metadata hashes when untruncated, oversized report-supplied replay timeouts are rejected, and the current runner script hash must match the recorded script hash before re-execution can pass.

Runner reports do not currently carry a report-local `self_hash` or host `report_path`. Snapshot binding is instead represented by snapshot entry `relative_path`, `sha256`, and `size_bytes`, plus replay manifest `report_relative_path` and runner-field matching. This avoids host path leakage while still rebinding replay runs to the actual copied runner report.

Replay success is an integrity signal for prior compute evidence, not a claim-promotion authority. Symbolic/computational promotion still goes through the existing evidence/artifact/audit gate, and formal proof authority still belongs to service-owned Lean replay artifacts.

### Residual Risks

- Strict replay currently covers the implemented Python compute runners only: `sympy-exact` and `counterexample-search`.
- It relies on the local Python/SymPy environment and script hash checks, not a captured dependency lockfile or container image.
- It uses `execFile` with `shell:false`, timeouts, fixed scripts, and fixed argv shape, but it is not yet an OS-level sandbox with enforced network denial.
- Cross-machine replay validation, dependency-version capture, richer runner families, and external signed snapshot verification remain future work.

## Phase 23 Proof-Kernel Theorem-Family Registry Review Log

### Scope

Generalized the native proof-kernel proof campaign from a single hardcoded `Nat.add_zero` proof slice into an explicit registered theorem-family layer. Phase 23 adds the second true elementary Nat theorem family, `Nat.mul_zero`, while preserving the existing `Nat.add_zero` proof path, exact `n + 1 = n` refutation path, 8-candidate ensemble shape, `C0001` Lean target, `PO-0001` obligation contract, and v3 public campaign states.

This is not arbitrary theorem proving. Only registered theorem families can produce proof candidates or clean replay projects; unsupported goals still fail closed.

### TDD And Review Evidence

```text
corepack pnpm --filter @comath/comathd exec node tests/integration/phase23-ga-theorem-family-generalization.test.mjs
Initial RED result: exit 1; `n * 0 = 0 for natural numbers` was incorrectly locked as `n + 0 = n` because `classifyLockedProblem()` used `natural` as an add-zero fallback.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after introducing theorem-family registry, Lean project generation, replay command parameterization, and candidate-runner parameterization.

corepack pnpm --filter @comath/comathd exec node tests/integration/phase23-ga-theorem-family-generalization.test.mjs
Result: exit 0; `Nat.mul_zero` campaign locks `n * 0 = 0`, generates family-specific candidates, writes Lean/FormalSpec/Audit files, passes clean replay, promotes through the gate, and passes replay route.

corepack pnpm --filter @comath/comathd exec node tests/integration/phase23-ga-integrity-boundaries.test.mjs
Review-strengthened RED result: exit 1; unsupported campaigns could return stale ensemble data from a prior supported campaign in the same project root.

corepack pnpm --filter @comath/comathd exec node tests/integration/phase23-ga-integrity-boundaries.test.mjs
Result: exit 0; integrity-boundary regressions now cover stale ensemble prevention, theorem-family/proposition mismatch blocking, and completed-refutation replay immutability.
```

### Changed Surfaces

- Added `services/comathd/src/proof-kernel/lean/theorem-family.ts` with registered `nat_add_zero` and `nat_mul_zero` family definitions.
- Added `createLeanProjectForTheorem()` while keeping `createNatAddZeroLeanProject()` as a compatibility wrapper.
- Parameterized clean Lean replay commands over the generated Lean project instead of hardcoding only the add-zero theorem body.
- Added `runTheoremFamilyCandidates()` while keeping `runTrivialNatAddZeroCandidates()` as a compatibility wrapper.
- Added theorem-family metadata to candidate manifests and final replay manifests: family id, canonical proposition, primary dependency, normalized statement, and locked statement hash.
- Hardened promotion so `formally_checked` requires a passed proof-kernel replay manifest whose locked statement hash matches the claim statement hash.
- Hardened campaign replay so completed refutation campaigns return a read-only blocker instead of mutating `completed_refutation` into a blocked proof-replay state.
- Hardened unsupported campaign blocking so no stale ensemble decision is returned and unsupported goals fail closed before theorem-family candidates are fabricated.
- Added `phase23-ga-theorem-family-generalization.test.mjs` and `phase23-ga-integrity-boundaries.test.mjs` to the default `@comath/comathd` test chain.
- Added `proof_kernel_theorem_family_registry` to `getComathdStatus()`.

### Boundary And Integrity Notes

The theorem-family id is advisory only unless it matches the locked proposition, locked natural-language statement, and Lean target. A mismatched obligation is blocked before candidate generation. Final replay evidence is now bound to the promoted claim through the claim statement hash, reducing the risk that a replay of one registered theorem is attached to a different claim.

The registered families still share the public `MathResearch.C0001` target for compatibility with the existing Phase 18/19/20 contracts, but the replay manifest carries the family id, canonical proposition, normalized statement, primary dependency, and locked statement hash so audit consumers do not have to infer the proved proposition from the theorem name alone.

### Residual Risks

- The proof-kernel supports registered elementary Nat families only: `Nat.add_zero` and `Nat.mul_zero`, plus exact refutation of `n + 1 = n`.
- There is still no broad theorem synthesis, Lean parser integration, semantic statement equivalence, or real MathProve proof search.
- Candidate artifact paths still use the Phase 18 `PO-0001`/`C0001` layout; multi-obligation and multi-theorem campaigns remain future work.
- At this historical Phase 24 checkpoint, production Pi runtime registration, real persistent child-agent scheduling, native TriviumDB target validation, and stronger OS/network runner replay sandboxing remained deferred; the current blocker set is superseded by `TODO.md` and the Phase 28 review log.

### Final Root Validation

Fresh Phase 23 validation completed on 2026-05-27:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-23 package tests passed, including theorem-family generalization and integrity-boundary coverage.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed after comathd manifest/schema hardening.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, workspace package tests, Phase 23 comathd tests, Pi extension regressions, and Phase 17 integrity evaluation passed.
```

## Phase 22 Pi Research Campaign Loop Review Log

### Scope

Added a Pi-side one-command research campaign loop so `/cm:research "<goal>" --goal --strict` and `comath.research.runCampaignLoop` can start a service-owned campaign, advance bounded ticks through `comathd`, and return a service-backed dashboard snapshot. Phase 22 moves the Pi layer beyond descriptor-only campaign tools, while keeping proof authority, promotion gates, artifacts, and runtime state ownership in `comathd`.

### TDD And Review Evidence

```text
corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase22-research-loop.test.mjs
Initial RED result: exit 1; `../dist/index.js` did not provide `buildResearchCampaignLoopInput`.

corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase22-research-loop.test.mjs
Reviewer-strengthened RED result: exit 1; `../dist/index.js` did not provide `issueCampaignLoopCapability`, exposing that the loop helper was not yet tied to confirmation/capability issuance.

corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase22-research-loop.test.mjs
Parser/capability RED result: exit 1; `/cm:research start --goal "n + 0 = n"` incorrectly set `strict_mode=true` because `--goal` was treated as both value flag and strict marker.

corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase22-research-loop.test.mjs
Result: exit 0; Phase 22 research loop tests passed for quote-aware command parsing, target-scoped capability issuance, command-loop execution, tool-loop execution, bounded tick budget, and dashboard return.
```

### Changed Surfaces

- Added `extensions/comath-pi/src/research-loop.ts`.
- Added `extensions/comath-pi/tests/phase22-research-loop.test.mjs` and wired it into the default `@comath/pi-extension` test chain.
- Made `/cm:*` parsing quote-aware, with escaped quotes and unterminated quote rejection.
- Added `issueCampaignLoopCapability()` so campaign-loop capability issuance requires a positive mutation confirmation for `/cm:research` or `comath.research.runCampaignLoop`.
- Added `runResearchCampaignLoop()` for bounded `campaign/start -> campaign/tick* -> dashboard` orchestration through the existing client boundary.
- Added `runComathResearchCommand()` and the mutating `comath.research.runCampaignLoop` tool descriptor/handler.
- Added `pi_research_campaign_loop` to `getComathdStatus()` and updated README, TODO, acceptance, risk, handoff, extension, and math-integrity notes.

### Boundary And Integrity Notes

The loop does not read or write `.comath/` directly and does not import service internals. It only calls `comathd` through the extension client. A campaign-loop capability is scoped by project root, actor, confirmation ID, target, and tick budget; denied confirmations and unrelated confirmation targets fail closed.

The loop can start and tick a campaign, but it cannot promote a claim by itself. Formal proof authority remains the service-owned proof-kernel replay plus gate-mediated promotion path.

### Residual Risks

- At this historical Phase 22 checkpoint, production Pi runtime registration was still not validated against the installed Pi API.
- The loop was a thin-client orchestration path, not a real persistent child-agent scheduler; Phase 28 later added bounded service-side process scheduling.
- Generic proof planning, real MathProve execution, native TriviumDB target validation, runner re-execution replay, and richer statement equivalence remained global GA blockers at that point; the current blocker set is superseded by `TODO.md` and the Phase 28 review log.

### Final Root Validation

Fresh Phase 22 validation completed on 2026-05-27:

```text
corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed, including Phase 22 command/tool campaign-loop coverage and previous extension regressions.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-21 package tests passed after adding the Phase 22 status capability.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, workspace package tests, Phase 22 research loop, Phase 21 read-model routes, proof-kernel campaign regressions, and Phase 17 integrity evaluation passed.
```

## Phase 21 Service Read-Model Dashboard Review Log

### Scope

Added service-owned read-only list routes for claim, evidence, and gate-result state, then moved the Pi dashboard aggregator from degraded paper-derived placeholders to those routes. Phase 21 improves product inspection and dashboard fidelity; it does not change proof authority, promotion rules, or mathematical gate semantics.

### TDD Evidence

```text
node services/comathd/tests/integration/phase21-read-model-routes.test.mjs
Initial RED result: exit 1; route injection returned 404 for missing `/claim/list`, `/evidence/list`, and `/gate/list`.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding read-model routes.

node services/comathd/tests/integration/phase21-read-model-routes.test.mjs
Result: exit 0; Phase 21 read-model route tests passed for claim/evidence/gate boards and claim-filtered gate results.

corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase15-dashboard.test.mjs
Initial RED result after review: exit 1; paper-only margin provenance still appeared in the claim/evidence board without a degraded marker.

corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase15-dashboard.test.mjs
Result: exit 0; dashboard board aggregation now treats `/claim/list`, `/evidence/list`, and `/gate/list` as the sole claim/evidence/gate board sources while retaining paper margin provenance only in paper/blocker sections.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed, including dashboard aggregation over `/claim/list`, `/evidence/list`, and `/gate/list`.
```

### Changed Surfaces

- Added `GET /claim/list`, `GET /evidence/list`, and `GET /gate/list` to `services/comathd/src/api/server.ts`.
- Added `services/comathd/tests/integration/phase21-read-model-routes.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Updated `extensions/comath-pi/src/renderers.ts` so dashboard aggregation reads claim, evidence, and gate boards through `comathd` routes.
- Added `GateBoardItem` and gate blockers to `extensions/comath-pi/src/widgets.ts` and dashboard renderers.
- Updated Phase 15 dashboard tests so `claim_list_unavailable`, `evidence_list_unavailable`, and `gate_result_list_unavailable` are no longer expected for the implemented service read models.
- Added a regression guard that paper-only margin claims/evidence cannot silently populate the claim/evidence board.
- Added `claim_evidence_gate_read_models` to `getComathdStatus()`.

### Boundary And Integrity Notes

The new routes are inspection surfaces only. They call existing store readers and expose persisted claim, evidence, and gate-result records; they do not promote claims, apply GraphPatch, repair state, export snapshots, or write dashboard artifacts.

The Pi dashboard remains a thin client over `comathd` read routes. It still avoids service-internal imports and direct `.comath/` filesystem reads/writes. Failed gate vetoes can now appear as dashboard blockers, but those blockers are explanatory UI state, not proof authority.

Paper margin provenance remains visible in the Paper and Blockers sections. It is no longer used as a hidden fallback to create claim/evidence board rows after service read models exist.

### Residual Risks

- The dashboard still has text/TUI renderers rather than validated production Pi runtime registration.
- Route responses are service-owned JSON read models, not a richer query/index layer over native TriviumDB.
- At this historical Phase 21 checkpoint, global GA remained blocked by generic proof planning, real MathProve execution, real child-agent scheduling, native TriviumDB validation, sandboxed runner re-execution, production Pi registration, and richer statement equivalence; the current blocker set is superseded by `TODO.md` and the Phase 28 review log.

### Final Root Validation

Fresh Phase 21 validation completed on 2026-05-27:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-20 tests plus Phase 21 read-model route tests passed.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed, including the Phase 15 dashboard service-read-model regression.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, workspace package tests, Phase 21 read-model routes, dashboard tests, and Phase 17 integrity evaluation passed.
```

## Goal 3 Task 93 Notation Gate Formal-Spec-Derived Review Log

### Scope

Removed the remaining Nat-specific notation wording from the native campaign `notation_gate` artifacts. The change does not add theorem synthesis or proof authority; it makes notation provenance explicit and non-promotional.

### TDD Evidence

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0.

node services/comathd/tests/unit/goal3-task93-notation-gate-formal-spec-derived.test.mjs
Initial RED result: exit 1; `Definitions.lean` contained `Lean Nat notation`.

node services/comathd/tests/unit/goal3-task93-notation-gate-formal-spec-derived.test.mjs
Second RED result: exit 1; `createProofObligationFromFormalSpecLock()` dropped `notation_conventions`.

node services/comathd/tests/unit/goal3-task93-notation-gate-formal-spec-derived.test.mjs
Result: exit 0; notation gate no longer emits default Nat wording, records non-authoritative provenance, and preserves FormalSpecLock notation conventions.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0.

corepack pnpm --filter @comath/comathd test
Result: exit 0; full comathd chain passed with Task93 wired into the default script.
```

### Changed Surfaces

- `services/comathd/src/proof-kernel/campaign/formal-spec-lock.ts` now carries `FormalSpecLock.notation_conventions` into `ProofObligation.locked_statement_structured`.
- `services/comathd/src/proof-kernel/campaign/campaign-tick.ts` now renders notation from FormalSpecLock conventions when present and otherwise falls back to `.comath/lock/notation.md`.
- `notation_gate.json` now records `notation_source`, `notation_lock_path`, `notation_conventions`, `locked_statement_hash`, `default_notation_injected: false`, `proof_authority: "none"`, and `can_promote_claim: false`.
- Added `services/comathd/tests/unit/goal3-task93-notation-gate-formal-spec-derived.test.mjs` and wired it into the default `@comath/comathd` test chain.

### Boundary And Integrity Notes

The notation gate remains a stage artifact, not proof authority. It does not infer theorem-domain notation, inject `n : Nat`, or promote claims. The only promotion-grade mathematical authority remains final Lean/mathlib clean replay plus the existing integrity gates.

### Residual Risks

Task93 does not execute a real Lean/mathlib clean replay and does not broaden proof synthesis. Generic campaigns still fail closed at broad theorem planning/final replay boundaries. The workstation still needs a configured Lean toolchain before live replay blockers can be retired.

## Phase 20 GA Campaign State-Machine Vertical-Slice Review Log

### Scope

Aligned the public `ResearchCampaign` state machine with the v3 goal-instruction state set while preserving the existing proof-kernel artifact stage names internally. Phase 20 changes API-visible campaign stages and terminal states; it does not broaden theorem synthesis or replace the Phase 18-19 proof/refutation slices.

### TDD Evidence

```text
node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Initial RED result: exit 1; `campaignStageSchema` rejected required v3 state `problem_locked` and still accepted old public stages.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after schema/stage split and campaign tick migration.

node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Result: exit 0; Phase 20 GA campaign state-machine tests passed. The expanded test asserts terminal-state invariants, the complete proof path order, the exact-refutation shortcut boundary, and an unsupported-goal blocker instead of false proof completion.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive proof vertical slice still passes with canonical public states.

node services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs
Result: exit 0; refutation slice now terminates as `completed_refutation`.

node services/comathd/tests/integration/phase18-ga-snapshot-replay.test.mjs
Result: exit 0; snapshot restore and proof replay still pass with `completed_formal_proof`.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd package tests passed with Phase 20 included in the default chain.
```

### Changed Surfaces

- Updated `campaignStageSchema` to the v3 public state set and `campaignTerminalStateSchema` to `completed_formal_proof`, `completed_refutation`, `blocked_with_replayable_reason`, and `cancelled_by_user`.
- Added `proofKernelStageSchema` so internal candidate/gate artifacts can still use proof-stage names such as `lemma_sprint` and `final_global_lean_replay`.
- Split `tickCampaign()` into bounded public states: `problem_locked`, `context_built`, `planning`, `candidate_generation`, `candidate_verification`, `candidate_arbitration`, `integration`, `adversarial_review`, `final_static_audit`, `final_global_replay`, and canonical terminal states.
- Added service-owned context, plan, verification, integration, adversarial-review, and final-audit plan artifacts under `.comath/campaign/<id>/`.
- Blocked unsupported theorem targets at `final_global_replay` with `blocked_with_replayable_reason` instead of generating the hardcoded `Nat.add_zero` replay for unrelated goals.
- Added `services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs` and wired it into the default comathd test chain.
- Updated Phase 18/19 tests to use canonical public campaign states while retaining internal `lemma_sprint` artifact path checks.
- Added `campaign_state_machine_v3` to `getComathdStatus()`.

### Boundary And Integrity Notes

Public campaign state is now owned by `comathd` and uses the v3 vocabulary required by the goal instruction. Old names such as `problem_lock`, `lemma_sprint`, `final_global_lean_replay`, and `terminal` are rejected as public campaign stages. They remain available only where they describe proof-kernel artifacts or candidate/gate stages.

No campaign completes because a report was written or because agents agree. The formal-proof terminal state still requires the final replay/promotion gate path; the refutation terminal state still requires the exact counterexample path.

### Residual Risks

- The state machine was canonical for the implemented proof and refutation slices, but generic proof planning and real agent scheduling remained deferred at that historical checkpoint.
- The context and planning artifacts are deterministic service-owned capsules, not full Trivium-backed active retrieval or production Pi/Codex child-agent profile integration.
- Global GA remains blocked by the deferred items in `TODO.md`; Phase 20 validates public campaign state semantics, not autonomous research completion.

One Phase 17 evaluation assertion was updated after root-cause analysis: dashboard-only files still forbid `client.post`, filesystem writes, service-internal imports, and direct `.comath` access, while the extension entrypoint is checked separately so Phase 18 thin-client mutating campaign tools may call `comathd` without direct runtime-file writes.

## Phase 19 GA Ensemble Recovery Review Log

### Scope

Implemented the v3 16.4 ensemble recovery regression for the existing elementary proof-kernel slice. Phase 19 does not broaden theorem synthesis; it makes the current 8-candidate path preserve the required seven-failures-plus-one-Lean-pass evidence shape and turns V8 dialectical stress into a typed artifact.

### TDD Evidence

```text
node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Initial RED result: exit 1; failed on missing V8 dialectical_stress.json existence assertion.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after implementation.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Result: exit 0; Phase 19 GA ensemble recovery tests passed.
```

### Changed Surfaces

- Added `services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs`.
- Added `dialecticalStressSchema` and `DialecticalStress` to `services/comathd/src/types/schemas.ts`.
- Added V8 `dialectical_stress.json` writing in `services/comathd/src/proof-kernel/ensemble/candidate-runner.ts`.
- Added the Phase 19 unit test to `@comath/comathd` default test chain.
- Added `proof_kernel_ensemble_recovery` to `getComathdStatus()`.
- Updated README, TODO, acceptance matrix, math integrity notes, risk register, and handoff documentation.

### Boundary And Integrity Notes

The recovery test verifies that eight candidates are generated, exactly seven are failed routes, the Lean-valid candidate is selected, and every failed route is preserved in proof memory. The V8 artifact records `P`, `not_P`, `Q`, `not_Q`, `R`, `U`, `proof_authority: none`, and downstream authorities `Lean`, `exact computation`, and `citation gate`.

V8 remains a heuristic stress/revision artifact. It can generate objections, repairs, and assumption audits, but it cannot promote a claim, certify a proof, or override final Lean replay.

### Residual Risks

- Ensemble recovery is covered for the implemented elementary `Nat.add_zero` slice, not arbitrary proof domains.
- The V8 artifact is currently deterministic template output from the native runner, not a real child-agent prompt execution result.
- General proof-route scheduling, real MathProve execution, production Pi runtime registration, native TriviumDB target validation, stronger OS/network runner replay sandboxing, and richer statement equivalence remain deferred.

### Final Root Validation

Fresh Phase 19 validation completed on 2026-05-27:

```text
corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-18 tests plus Phase 19 ensemble recovery test passed.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, all workspace tests, Phase 19 comathd test, Phase 18 Pi campaign tool tests, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```
