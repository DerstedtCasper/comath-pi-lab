# Design Handoff

## Current State

The repository has completed:

- Phase 0 bootstrap;
- Phase 1 contracts, IDs, schemas, statement hash, JSON schema files, and GraphPatch integrity hardening;
- Phase 2 `comathd` foundation and path policy;
- Phase 3 artifact and audit kernel;
- Phase 4 claim registry and fail-closed gate;
- Phase 5 memory adapter and StableIdMap;
- Phase 6 Pi extension layer;
- Phase 7 workstreams and GraphPatch lifecycle;
- Phase 8 Codex/Pi subagent scaffolding;
- Phase 9 MathProve bridge mock;
- Phase 10 compute runners;
- Phase 11 literature system;
- Phase 12 working paper;
- Phase 13 optional TriviumDB adapter;
- Phase 14 braid statistics domain pack;
- Phase 15 TUI dashboard;
- Phase 16 snapshot and replay;
- Phase 17 evaluation, security, and mathematical-integrity audit;
- Phase 18 GA proof-kernel vertical slices;
- Phase 19 GA ensemble recovery and V8 dialectical stress coverage;
- Phase 20 GA canonical ResearchCampaign state-machine coverage;
- Phase 21 service read-model routes and dashboard aggregation;
- Phase 22 Pi research campaign loop;
- Phase 23 proof-kernel theorem-family registry;
- Phase 24 runner re-execution replay;
- Phase 25 real MathProve external evidence-runner bridge;
- Phase 26 Pi runtime registration against installed Pi 0.75.5 loader behavior;
- Phase 27 AgentRun runtime boundary for child-agent persistence, scoped writes, report validation, and failure memory;
- Phase 28 AgentRun process scheduler for allowlisted child-process launch, logging, timeout/cancel, concurrency, and rpm controls;
- full target development plan;
- full Codex goal runbook;
- end-state blueprint;
- acceptance matrix;
- risk register;
- agent operating model;
- Phase 0 handoff.

Phase 0-17 Research Alpha implementation is complete, Phase 18 adds native GA proof-kernel vertical slices, Phase 19 adds the v3 ensemble recovery/V8 dialectical stress regression coverage, Phase 20 aligns public ResearchCampaign states with the v3 goal instruction, Phase 21 adds service-owned read models for dashboard inspection, Phase 22 adds a Pi-side one-command research campaign loop, Phase 23 adds a proof-kernel theorem-family registry covering `Nat.add_zero` and `Nat.mul_zero`, Phase 24 adds service-owned deterministic runner re-execution replay for the implemented Python compute runners, Phase 25 adds a controlled external MathProve evidence-runner bridge, Phase 26 adds Pi 0.75.5-compatible runtime registration with package manifest, default export factory, CoMath registration contract, Pi host-side mutating-tool confirmation gates, Phase 27 adds an AgentRun runtime boundary for child-agent persistence, scoped writes, report validation, producer/reviewer separation, and failure memory, and Phase 28 adds a real allowlisted AgentRun process scheduler with logging, timeout/cancel, concurrency, and rpm controls. Phase 18-28 vertical-slice validation evidence is recorded in `REVIEW.md`; global GA readiness is still blocked by the deferred items in `TODO.md`.

## Authoritative Files

- `COMATH_PI_LAB_DEV_PLAN.md`
- `CODEX_GOAL_RUNBOOK.md`
- `AGENTS.md`
- `TODO.md`
- `REVIEW.md`
- `docs/architecture/end-state-blueprint.md`
- `docs/architecture/acceptance-matrix.md`
- `docs/architecture/risk-register.md`
- `docs/architecture/agent-operating-model.md`

## Next Correct Action

Next correct action:

```text
/goal Start the next GA hardening phase for broad proof planning beyond registered theorem families, broad MathProve proof search/final-audit semantics, TriviumDB native evaluation, stronger runner replay sandboxing, full interactive Pi/comathd install-session e2e, production Pi/Codex child-agent profile integration, and OS-level scheduled-process isolation.
```

Do not start broad generalization implementation without keeping the active GA goal and validation trail explicit. The next phase should retire global GA blockers, not merely add another documentation slice. Research Alpha and Phase 18-28 validation evidence is recorded in `REVIEW.md`.

## Concurrency Instruction

The current user-approved subagent concurrency is `rpm=4`, reasoning effort `high`.

Apply it as follows:

- use only a few bounded read-only reviewers at a time;
- use implementation workers only when their write scopes are disjoint and not on the active critical path;
- Phase 7 workstream directories and GraphPatch review are available;
- Phase 8 subagent roles, prompts, write scopes, and parent merge rules are now explicit;
- broad mutation fan-out still requires disjoint write scopes and parent merge review.

## Phase 1 Critical Requirements

- Business IDs must be stable strings.
- TriviumDB numeric IDs must not leak into contracts.
- GraphPatch contract must exist before workstream implementation.
- Claim status must model evidence and blockers, not confidence.
- Statement normalization and hash must be deterministic.
- GraphPatch must not be able to promote or mutate protected claim fields directly.
- Privileged status transitions must remain gate-mediated in service code.

## Phase 5 And Phase 6 Boundary Notes

- Phase 5 memory-db-engineer owns `services/comathd/src/memory` and `services/comathd/src/db/stable-id-map.ts`; it must not edit routes.
- Phase 5 starts with in-memory `ResearchMemoryDB` and a TriviumDB unavailable shim. No native import before Phase 13.
- Phase 6 pi-extension-engineer owns `extensions`, `skills`, `prompts`, and extension tests; it must call `comathd` and never write `.comath/` directly.
- Pi resources should discover local skills/prompts/domain packs, not expose claims or DB records as raw resources.

## Phase 7 Boundary Notes

- Workstreams are stored under `.comath/workstreams/WS-XXXX/`.
- Each workstream owns `spec.yaml`, `status.json`, `report.md`, and `graph_patch.json`.
- GraphPatch review requires `proposed -> under_review -> accepted`.
- Accepted patches still do not mutate trusted graph until explicit apply.
- GraphPatch apply uses `ResearchMemoryDB` and does not call claim promotion gates.

## Phase 8 Boundary Notes

- `.pi/agents` contains nine subagent role definitions with `may_mutate_trusted_state=false`.
- `.pi/prompts` contains reusable workstream, GraphPatch proposal, child-report, and merge-review prompts.
- Pi extension resources now distinguish skills, prompts, domain packs, subagents, and snapshot/replay artifact descriptors.
- Assignment validation accepts only the agent own workstream directory and rejects forbidden core files.

## Phase 9 Boundary Notes

- `python/mathprove_bridge.py` supports `plan`, `route`, and `final_audit` mock modes.
- The bridge is fail-closed and returns structured vetoes for formal, symbolic, and literature targets.
- `services/comathd/src/verification/mathprove.ts` validates bridge JSON, archives reports as artifacts, records evidence, and feeds vetoes into the gate.
- MathProve output is not proof authority and cannot mutate claim status without passing the ordinary promotion gate.
- Phase 25 adds `runMathProveBridgeExternal()` for controlled `MathProve-Skill` `verify_sympy.py` evidence runs; this extends evidence production but does not change the proof-authority boundary.

## Phase 10 Boundary Notes

- Use `docs/progress/phase10-compute-boundary.md` before implementation.
- Compute runners must use a fixed runner registry and `shell:false`.
- Exact symbolic and numeric/search results must remain separate.
- Runner output may become artifact/audit evidence, not direct claim promotion.

## Phase 11 Boundary Notes

- Use `services/comathd/src/literature` plus `python/citation_check.py`.
- Literature evidence must use exact source artifacts, not summaries or LLM memory.
- Citation condition matching may be conservative, but must fail closed on missing locator, missing artifact, missing assumptions, or condition mismatch.
- `literature_supported` remains a gate-mediated status and cannot be produced by citation existence alone.

## Phase 12 Boundary Notes

- Use `services/comathd/src/artifacts/paper.ts` and paper-focused tests.
- The working paper is live project state, not a cosmetic export.
- Paper sections must preserve claim IDs, claim status, evidence IDs, workstreams, warnings, and blockers.
- Paper checks must fail closed on theorem-like overclaiming, missing provenance, hidden blockers, missing evidence, and stale citation support.
- Paper generation must not promote claims or mutate gate state.

## Phase 13 Boundary Notes

- Use `services/comathd/src/memory/trivium-capability.ts` and `services/comathd/src/memory/trivium-db.ts`.
- Do not add `triviumdb` to ordinary dependencies or top-level imports.
- Capability probing must use dynamic native loading inside a function and return diagnostics without blocking default tests.
- Default memory backend remains in-memory unless TriviumDB is explicitly requested and available.
- Native TriviumDB tests must be gated by `COMATH_ENABLE_TRIVIUM_TESTS=1`.
- Business-facing node, edge, patch, and stable IDs must remain strings; any native numeric IDs stay behind `StableIdMap`.

## Phase 14 Boundary Notes

- Implement the braid statistics domain pack as typed domain knowledge and validation scaffolding, not as claim promotion authority.
- Domain pack outputs may propose claims, definitions, literature tasks, compute tasks, and GraphPatch candidates.
- Domain pack outputs must preserve assumptions and blockers explicitly: dimension, spacetime/topological setting, particle type, braid group/anyon model, regularity, and source requirements.
- Domain pack code must not bypass `/claim/promote`, paper checks, GraphPatch review, or MathProve/runner/literature evidence gates.

## Phase 15 Boundary Notes

- Implement extension-side read-only dashboard aggregation and renderers.
- Dashboard aggregation may call `comathd` read routes through the client; it must not read `.comath` files directly.
- Renderers must be pure presentation functions and must not write persistent dashboard snapshots.
- Service-owned claim/evidence/gate list APIs are available as of Phase 21; any future missing read model should be reported as `degraded` rather than bypassed from Pi extension code.
- Any future mutations remain explicit tool calls with confirmation; dashboard views cannot repair or promote state.
- Extension entrypoint descriptors may register snapshot/replay tools, but dashboard renderer/widget/review files must not implement persistence or read `.comath/` directly.

## Phase 16 Boundary Notes

- Implement service-owned snapshot export, verification, restore, and replay manifest code under `services/comathd/src/artifacts/`.
- Replace or supplement the Phase 3 snapshot/secret stubs without breaking existing stub exports unless tests intentionally change them.
- Artifact import and snapshot export must run real secret scans and fail closed on known token/private-key/truncated-file patterns.
- Snapshot export, verify, restore, and replay-manifest verification are exposed through `comathd` routes; Pi extension entries remain descriptor/command surfaces only.
- Snapshot integrity must cover manifest data, artifacts, claims, evidence, audit logs, replay inputs, and runner outputs when present.
- Manifests must use canonical ordering, relative paths under `.comath/`, and stable business IDs only.
- Restore tests must use a temporary project root and must not mutate the source snapshot.
- Replay must mark unsupported or stale runner output as unreplayable with reason, seed/environment/dependency metadata when available, and hash context.

## Phase 17 Completion Notes

- Added an evaluation suite under `tests/evaluation/` that exercises security, mathematical-integrity, paper, dashboard, and snapshot/replay regressions.
- Closed the known Phase 17 hardening gaps around evidence/artifact binding, trusted runner audit provenance, artifact-grounded citation quotes, failed runner promotion, blocked paper export, block-bound margin provenance, rendered block hashes, runner result hashes, replay `runs_sha256`, and runner host-path leak checks.
- Kept reviewer approval, agent consensus, summary-only literature, float-only computation, failed runner output, and unreplayable runner output out of privileged claim states.
- Updated `SECURITY_REVIEW.md` and `MATH_INTEGRITY_REVIEW.md` with inspected files, findings, residual risk, and validation commands.
- Preserved `docs/progress/research-alpha-retrospective.md` as the handoff summary for the completed Research Alpha slice.

## Phase 18 Completion Notes

- Added native proof-kernel modules under `services/comathd/src/proof-kernel` for campaign ticks, candidate ensembles, Lean project generation, static cheat scanning, statement equivalence, dependency closure, axiom profile, and clean replay.
- Added service-owned campaign routes for start, status, next-actions, tick, final-audit, replay, pause, and resume.
- Hardened `formally_checked` so a passed proof-kernel `final_replay_manifest.json` for the same claim is required.
- Added a positive `Nat.add_zero` campaign vertical slice with 8 candidate artifacts and gate-mediated formal promotion.
- Added negative coverage for fake formal metadata, static Lean cheats, statement drift, and high-scoring drifted candidates.
- Added exact counterexample refutation for `n + 1 = n` and snapshot restore followed by proof replay.
- Added Pi `/cm:research`, `/cm:campaign`, and campaign tool descriptors that call `comathd` without direct `.comath/` writes.
- Remaining generalization work: broader proof planning, broad MathProve proof search/final-audit semantics, full interactive Pi/comathd install-session e2e, native TriviumDB target validation, stronger OS/network runner replay sandboxing, richer statement equivalence, production Pi/Codex child-agent profile integration, and OS-level scheduled-process isolation.

## Phase 19 Completion Notes

- Added `services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs` for the v3 16.4 benchmark: seven failed candidates plus one Lean-valid candidate must select the Lean-valid candidate.
- Verified all seven failed routes are preserved in proof memory.
- Added `dialecticalStressSchema` and a V8 `dialectical_stress.json` artifact writer under the native proof-kernel candidate runner.
- Kept the dialectical stress cycle as a structured heuristic for objections, repairs, and assumption audits; `proof_authority` remains `none`.
- Added `proof_kernel_ensemble_recovery` to the service status capability list.

## Phase 20 Completion Notes

- Added `services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs`.
- Aligned public `ResearchCampaign.current_stage` with the v3 canonical state set from the goal instruction.
- Aligned terminal states with `completed_formal_proof`, `completed_refutation`, `blocked_with_replayable_reason`, and `cancelled_by_user`.
- Kept internal proof-kernel artifact stages such as `lemma_sprint` and `final_global_lean_replay` out of the public campaign state schema.
- Split campaign ticks into bounded resumable stages through context, planning, candidate generation, verification, arbitration, integration, adversarial review, final audit, final replay, and canonical terminal completion.
- Added explicit unsupported-target blocking so canonical state-machine coverage is necessary evidence, not sufficient global GA readiness.
- Added `campaign_state_machine_v3` to the service status capability list.

## Phase 21 Completion Notes

- Added `GET /claim/list`, `GET /evidence/list`, and `GET /gate/list` to `comathd`.
- Added `services/comathd/tests/integration/phase21-read-model-routes.test.mjs`.
- Updated the Pi dashboard aggregator to read claim, evidence, and gate-result boards from service routes.
- Kept dashboard rendering read-only: no service-internal imports, direct `.comath/` reads/writes, state repair, claim promotion, GraphPatch apply, or snapshot export.
- Added `claim_evidence_gate_read_models` to the service status capability list.

## Phase 22 Completion Notes

- Added `extensions/comath-pi/src/research-loop.ts` for Pi-side one-command campaign orchestration.
- Added quote-aware `/cm:research "<goal>" --goal --strict` command parsing without breaking existing `/cm:*` command tests.
- Added scoped campaign-loop capability checks for project root, actor, token presence, and tick budget.
- Added `extensions/comath-pi/tests/phase22-research-loop.test.mjs`.
- Kept proof authority and trusted state mutation in `comathd`; the loop starts and ticks campaigns through service routes and returns the service-backed dashboard.
- Full interactive Pi/comathd install-session e2e and production Pi/Codex child-agent profile integration remain deferred.

## Phase 23 Completion Notes

- Added `services/comathd/src/proof-kernel/lean/theorem-family.ts` as the registered theorem-family layer for supported elementary Nat proof targets.
- Added `Nat.mul_zero` campaign support without changing the public `C0001`, `PO-0001`, 8-candidate, or v3 campaign-state contracts.
- Added `services/comathd/tests/integration/phase23-ga-theorem-family-generalization.test.mjs` for the `n * 0 = 0` proof campaign and replay route.
- Added `services/comathd/tests/integration/phase23-ga-integrity-boundaries.test.mjs` for family/proposition mismatch blocking, stale ensemble prevention, and completed-refutation replay immutability.
- Final replay manifests now include theorem family, canonical proposition, normalized statement, primary dependency, and locked statement hash; promotion requires replay hash binding to the promoted claim.
- Broad theorem synthesis, broad MathProve proof search/final-audit semantics, full interactive Pi/comathd install-session e2e, native TriviumDB validation, and stronger runner replay sandboxing remain deferred.

## Phase 24 Completion Notes

- Added canonical `replay_input_json` and `replay_input_sha256` material to compute runner reports.
- Added strict `/replay/verify-manifest` runner re-execution for `sympy-exact` and `counterexample-search`.
- Kept ordinary `/snapshot/verify` and restore on static snapshot integrity checks; strict compute re-execution is explicit replay-route behavior.
- Strict replay reconstructs known commands from service-owned runner specs rather than trusting manifest paths or report argv.
- Added fail-closed vetoes for replay/report mismatch, static snapshot vetoes before Python execution, missing/mismatched replay input, untrusted argv, oversized replay timeout, runner-version drift, script hash drift, invalid JSON, runner ID mismatch, timeout/nonzero exit, report-local stdio hash drift, stderr drift, and result hash mismatch.
- Added per-runner `runner_reexecution` summaries so successful replays, failures, and placeholder skips are visible to API consumers.
- Stronger OS-level sandboxing, network-denial enforcement, dependency lock capture, and cross-machine replay validation remain deferred.

## Phase 25 Completion Notes

- Added `runMathProveBridgeExternal()` under `services/comathd/src/verification/mathprove.ts`.
- The external bridge invokes `MathProve-Skill` `scripts/verify_sympy.py` through a service-owned command shape, controlled workspace, bounded timeout, and `shell:false`.
- External reports include `phase25-external-v1`, runner id/version, script hash, workspace path, argv template, stdout/stderr/result hashes, replay input hash, claim id, and claim statement hash.
- Missing external runner and statement-hash mismatch paths are archived as fail-closed bridge reports rather than unhandled errors.
- `promoteClaimWithMathProveBridge(..., { backend: "external" })` feeds external vetoes into the ordinary gate; an external `ok=true` runner result still cannot promote `formally_checked` without CoMath proof-kernel replay evidence.
- Added `services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs` and `mathprove_external_evidence_runner` status capability.

## Phase 26 Completion Notes

- Added `extensions/comath-pi/src/runtime-registration.ts` as a CoMath runtime-registration contract for package metadata, `global_rpm=4`, command/tool policy, `comathd_only` trusted-state access, and no Pi proof authority.
- Updated `@comath/pi-extension` package metadata so installed Pi 0.75.5 sees `pi.extensions` as `["./dist/index.js"]`; CoMath-specific metadata lives under `pi.runtime_policy` and the named `runtime_registration` export.
- Added a default export runtime factory that registers only currently executable research/campaign tools through Pi while leaving descriptor-only tools out of the production runtime factory.
- Kept `confirmation_id` host-injected on the Pi runtime path: mutating runtime tools prompt through `ctx.ui.confirm()` and do not expose `confirmation_id` as a model-supplied parameter.
- Added `extensions/comath-pi/tests/phase26-pi-runtime-registration.test.mjs` and `pi_runtime_registration_v0755` status capability.
- Remaining Pi hardening: full interactive Pi/comathd install-session e2e, richer runtime permission UX, and production Pi/Codex child-agent profile integration.

## Phase 27 Completion Notes

- Added `services/comathd/src/agents/agent-run-store.ts` with create/start/report/list/get/write-scope and failure-memory APIs.
- Persisted `ARUN-XXXX` status under `.comath/agents/runs/<ARUN>/status.json` and reports under `.comath/workstreams/<WS>/agent_runs/<ARUN>/report.md`.
- Kept `.tmp/comath/<ARUN>/` writes scoped to `assertAgentRunWriteAllowed()` without weakening the global `.comath` runtime-write policy.
- Added GraphPatch producer self-review rejection and durable failed-run `FailureRoute` memory nodes.
- Added `services/comathd/tests/unit/phase27-agent-run-runtime.test.mjs` and `agent_run_runtime_boundary` status capability.
- Remaining agent hardening after Phase 27 was real process launch, scheduler controls, cancellation, logs, and multi-process writer locks.

## Phase 28 Completion Notes

- Added `services/comathd/src/agents/agent-run-scheduler.ts` with `createAgentRunScheduler()` and an `AgentRunScheduler` class.
- Scheduler launches real allowlisted child processes with `shell:false`, scoped cwd, AgentRun environment variables, timeout, cancellation, `max_concurrent`, and `rpm` controls.
- Captures stdout/stderr under `.tmp/comath/<ARUN>/logs/` through the Phase 27 scoped writer and persists reports through `submitAgentRunReport()`.
- Added scheduler audit events for process started/completed/timed out/cancelled/rate limited.
- Added `services/comathd/tests/unit/phase28-agent-run-scheduler.test.mjs` and `agent_run_process_scheduler` status capability.
- Remaining agent hardening: production Pi/Codex agent profile adapters, OS-level process sandboxing/network denial, log streaming APIs, and multi-process writer/session locks.

## Verification To Run At Phase Boundary

```text
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
```
