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
- Phase 29 Agent profile service integration for profile validation, profile-backed AgentRun creation, and profile launch-envelope preparation;
- Phase 30 Pi agent profile runtime UX for `/cm:agent` and executable profile tools;
- Phase 31 Lean trust profile hardening for configurable axiom allowlists and skeleton-aware static audits;
- Phase 32 Lean statement signature binding for target-bound statement-equivalence checks;
- Phase 33 proof-obligation DAG planning for campaign-scoped lemma DAG, line-map, per-obligation YAML, and skeleton/report artifacts;
- Phase 34 campaign-scoped ensemble artifacts for candidate workspaces, candidate batch indexes, and arbitration decisions;
- Phase 35 claim-scoped final replay audit paths;
- Phase 36 runner replay sandbox and dependency provenance;
- Phase 37 registered Lean statement alias equivalence;
- Phase 38 native TriviumDB target-platform evaluation;
- Phase 39 project writer session lock;
- Phase 40 AgentRun scheduler writer lock integration;
- Phase 41 live agent adapter execution;
- Phase 42 AgentRun observability and adapter health probes;
- Phase 43 agent adapter package registry;
- Phase 44 Codex CLI external adapter invocation;
- Phase 45 Pi/comathd install-session e2e;
- Phase 46 cursor-based AgentRun log stream;
- Phase 47 SSE-style AgentRun log subscription snapshot;
- Phase 48 AgentRun operator panel read model;
- Phase 49 scheduler-backed AgentRun operator cancellation;
- Phase 50 bounded multi-event AgentRun log session;
- Phase 51 service-configured Codex API backend contract;
- Phase 52 Codex API retry and rate-limit telemetry;
- Phase 53 installed Codex CLI validation;
- Phase 54 Lean declaration parser signature fallback;
- Phase 55 runner cross-machine replay environment gate;
- Phase 56 registered Lean logical-equivalence witnesses;
- Phase 57 Lean theorem template instantiation;
- full target development plan;
- full Codex goal runbook;
- end-state blueprint;
- acceptance matrix;
- risk register;
- agent operating model;
- Phase 0 handoff.

Phase 0-17 Research Alpha implementation is complete, Phase 18 adds native GA proof-kernel vertical slices, Phase 19 adds the v3 ensemble recovery/V8 dialectical stress regression coverage, Phase 20 aligns public ResearchCampaign states with the v3 goal instruction, Phase 21 adds service-owned read models for dashboard inspection, Phase 22 adds a Pi-side one-command research campaign loop, Phase 23 adds a proof-kernel theorem-family registry covering `Nat.add_zero` and `Nat.mul_zero`, Phase 24 adds service-owned deterministic runner re-execution replay for the implemented Python compute runners, Phase 25 adds a controlled external MathProve evidence-runner bridge, Phase 26 adds Pi 0.75.5-compatible runtime registration with package manifest, default export factory, CoMath registration contract, Pi host-side mutating-tool confirmation gates, Phase 27 adds an AgentRun runtime boundary for child-agent persistence, scoped writes, report validation, producer/reviewer separation, and failure memory, Phase 28 adds a real allowlisted AgentRun process scheduler with logging, timeout/cancel, concurrency, and rpm controls, Phase 29 adds service-owned GA agent profiles plus profile/run/launch APIs, Phase 30 exposes those profile APIs through Pi runtime tools and `/cm:agent`, Phase 31 hardens Lean final-proof authority around configurable axiom trust profiles and skeleton-only `sorry` allowance, Phase 32 binds statement equivalence to a unique target theorem signature, Phase 33 writes campaign-scoped proof-obligation DAG, line-map, per-obligation YAML, and skeleton/report planning artifacts across the open-obligation closure, Phase 34 scopes ensemble candidate/decision artifacts by campaign, Phase 35 makes final replay audit paths claim-scoped, Phase 36 records runner sandbox/dependency provenance with fail-closed replay-integrity checks, Phase 37 accepts only explicitly registered Lean definitional-alias signatures with a witness while preserving fail-closed mismatch behavior, Phase 38 validates the optional native TriviumDB backend on the target Windows x64 platform with fail-closed reports, real native smoke, and performance/persistence metrics, Phase 39 adds a service-owned project writer session lock primitive with exclusive acquisition, token-gated release, stale takeover provenance, and malformed-lock fail-closed behavior, Phase 40 wires the service-side AgentRun scheduler through that lock before child-process mutation, Phase 41 adds live profile-backed adapter execution through comathd and Pi, Phase 42 adds capped AgentRun log readback plus bounded adapter health probes through comathd and Pi, Phase 43 adds a service-owned `codex-cli` adapter package registry plus bundled launcher lifecycle, Phase 44 adds service-configured external Codex-compatible CLI invocation behind the package contract with fail-closed missing configuration and untrusted output wrapping, Phase 45 adds a local Pi/comathd install-session e2e over a real HTTP server and built Pi package entrypoint, Phase 46 adds cursor-based AgentRun log-stream polling through comathd and Pi, Phase 47 adds SSE-compatible AgentRun log subscription snapshots through comathd and Pi, Phase 48 adds read-only AgentRun operator panels through comathd and Pi, Phase 49 adds same-process scheduler-backed AgentRun operator cancellation through comathd and Pi, Phase 50 adds bounded multi-event AgentRun log-session responses through comathd and Pi, Phase 51 adds a service-configured Codex API backend contract with secret-free Pi/package launch metadata, Phase 52 adds bounded Codex API retry and rate-limit telemetry, Phase 53 adds service-configured installed Codex CLI validation with path-free version/health probe telemetry, Phase 54 adds conservative Lean declaration-parser statement-signature fallback, Phase 55 adds fail-closed runner replay environment drift checks before compute-runner re-execution, Phase 56 adds registered Lean logical-equivalence witness metadata for statement binding, and Phase 57 adds registry-bound theorem template instantiation for `Nat.zero_add`. Phase 18-57 vertical-slice validation evidence is recorded in `REVIEW.md`; global GA readiness is still blocked by the deferred items in `TODO.md`.

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
/goal Start the next GA hardening phase for broad proof planning beyond registered theorem families, broad MathProve proof search/final-audit semantics, stronger runner replay sandboxing, full interactive Pi/comathd install-session e2e, live Pi/Codex agent adapter execution, and OS-level scheduled-process isolation.
```

Do not start broad generalization implementation without keeping the active GA goal and validation trail explicit. The next phase should retire global GA blockers, not merely add another documentation slice. Research Alpha and Phase 18-57 validation evidence is recorded in `REVIEW.md`.

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
- As of Phase 38, `triviumdb@0.7.1` is allowed only as a root optional dependency for target-platform evaluation.
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
- Remaining generalization work: broader proof planning, broad MathProve proof search/final-audit semantics, full interactive Pi/comathd install-session e2e, stronger OS/network runner replay sandboxing, richer statement equivalence, production Pi/Codex child-agent profile integration, and OS-level scheduled-process isolation.

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
- Broad theorem synthesis, broad MathProve proof search/final-audit semantics, full interactive Pi/comathd install-session e2e, and stronger runner replay sandboxing remain deferred.

## Phase 24 Completion Notes

- Added canonical `replay_input_json` and `replay_input_sha256` material to compute runner reports.
- Added strict `/replay/verify-manifest` runner re-execution for `sympy-exact` and `counterexample-search`.
- Kept ordinary `/snapshot/verify` and restore on static snapshot integrity checks; strict compute re-execution is explicit replay-route behavior.
- Strict replay reconstructs known commands from service-owned runner specs rather than trusting manifest paths or report argv.
- Added fail-closed vetoes for replay/report mismatch, static snapshot vetoes before Python execution, missing/mismatched replay input, untrusted argv, oversized replay timeout, runner-version drift, script hash drift, invalid JSON, runner ID mismatch, timeout/nonzero exit, report-local stdio hash drift, stderr drift, and result hash mismatch.
- Added per-runner `runner_reexecution` summaries so successful replays, failures, and placeholder skips are visible to API consumers.
- Stronger OS-level sandboxing and network-denial enforcement remain deferred.

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

## Phase 29 Completion Notes

- Added `services/comathd/src/agents/agent-profiles.ts` with the nine GA agent profiles required by the agent-team protocol.
- Profiles preserve `rpm<=4`, `may_mutate_trusted_state=false`, `proof_authority=none`, scoped write templates, and forbidden direct-promotion/trusted-write tools.
- Added `createAgentRunForProfile()` to bind AgentRuns to profile role/model/tool-policy metadata and audit `agent_run.profile_bound`.
- Added `buildAgentProfileLaunch()` to prepare scheduler-compatible launch envelopes with profile env metadata, timeout, concurrency, and rpm options while excluding secret-like env keys.
- Added service routes for profile list/get, profile-backed AgentRun creation, and profile launch preparation.
- Added `services/comathd/tests/unit/phase29-agent-profile-integration.test.mjs` and `agent_profile_service_api` status capability.
- Remaining agent hardening: live Pi/Codex adapter execution, richer profile UI, OS-level process sandboxing/network denial, log streaming APIs, and multi-process writer/session locks.

## Phase 30 Completion Notes

- Added executable Pi runtime tools for `comath.agent.profileList`, `comath.agent.profileGet`, `comath.agent.runForProfile`, and `comath.agent.prepareLaunch`.
- Added `/cm:agent` command handling for profile list/get, profile-backed AgentRun creation, and launch-envelope preparation.
- Kept mutating agent profile tools behind Pi host confirmation and removed model-supplied `confirmation_id` from runtime schemas.
- Kept all profile operations as thin `comathd` client calls; the extension still does not read or write `.comath/` directly.
- Added `extensions/comath-pi/tests/phase30-agent-profile-tools.test.mjs` and wired it into the default `@comath/pi-extension` test chain.
- Remaining agent hardening: live Pi/Codex adapter execution, richer UI widgets, OS-level process sandboxing/network denial, log streaming APIs, and multi-process writer/session locks.

## Phase 31 Completion Notes

- Added configurable Lean trust profiles to `checkAxiomProfile()`, including project-specific allowed axiom sets.
- Added fail-closed handling for missing target-theorem axiom reports when `require_print_axioms=true`.
- Added skeleton-aware static cheat scanning: `sorry` may be allowed in explicit skeleton allowlist files, while final Lean files still fail closed.
- Added `services/comathd/tests/unit/phase31-lean-trust-profile.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Remaining Lean authority hardening: theorem-signature extraction, Lean parser integration, transitive dependency closure, and broader domain-specific trust profiles.

## Phase 32 Completion Notes

- Added `services/comathd/src/proof-kernel/lean/statement-signature.ts` to extract a unique target theorem signature from Lean `#check` output.
- Replaced statement-equivalence stdout substring matching with target-signature equality in `checkStatementEquivalence()`.
- Added fail-closed vetoes for missing target check output, ambiguous target check output, and statement signature mismatch.
- Added `services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Remaining Lean authority hardening: Lean parser integration, definitional/logical equivalence classes, and transitive dependency semantics.

## Phase 33 Completion Notes

- Added `services/comathd/src/proof-kernel/stages/proof-obligation-dag.ts` for native planning-stage lemma DAG, line-map, obligation YAML, Lean skeleton, and skeleton-report artifacts.
- Scoped planning artifacts to `.comath/campaign/<CAM>/proof/` so concurrent or repeated campaigns preserve independent audit trails.
- Added `validateProofObligationDag()` with duplicate-node, unknown-endpoint, unsupported-relation, and cycle rejection before artifacts are written.
- Bound `Skeleton.lean` `sorry` placeholders to all open proof-obligation IDs and kept skeleton artifacts non-authoritative.
- Recorded Phase 33 planning artifact paths in campaign stage runs and added `proof_obligation_dag_planning` to service status.
- Added `services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Remaining proof-planning hardening: broad lemma decomposition, generic theorem synthesis, richer line-map provenance over multi-line derivations, and production proof-route agent execution.

## Phase 34 Completion Notes

- Added campaign-scoped ensemble path helpers under `services/comathd/src/proof-kernel/ensemble/paths.ts`.
- Moved theorem-family candidate workspaces, `candidates.json`, and `decision.json` under `.comath/campaign/<CAM>/ensembles/lemma_sprint/<PO>/`.
- Updated campaign ticks so candidate verification, arbitration, integration, adversarial review, and final replay returns read the current campaign's ensemble state.
- Added `services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Remaining ensemble hardening: live child-agent candidate execution, richer proof-step decomposition, and OS-level isolation for untrusted candidate code.

## Phase 35 Completion Notes

- Replaced hardcoded `C-0001` final replay stage-run artifact paths with paths generated from the active claim id.
- Added `services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs` for a second supported campaign whose root claim is not `C-0001`.
- Added `claim_scoped_final_replay_artifacts` to service status and smoke requirements.
- Remaining final replay hardening: richer release-bundle provenance, generalized theorem-family coverage, and broader proof-planning integration.

## Phase 36 Completion Notes

- Added runner `sandbox_policy` metadata for shell, network, cwd, allowed executable, and current process-boundary isolation semantics.
- Added runner `dependency_lock` metadata for runner id/version, script hash, and Python package presence.
- Preserved sandbox/dependency provenance in replay manifests and made missing provenance a replay-integrity veto.
- Added `services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Remaining replay hardening: OS-level isolation, enforced network denial, and broader runner-family lockfiles.

## Phase 37 Completion Notes

- Added explicit `allowed_definitional_aliases` support to `checkStatementEquivalence()`.
- Accepted non-identical Lean target theorem signatures only when a registered alias maps the locked formal spec statement to the exact extracted target signature.
- Added an `equivalence_witness` record for accepted registered aliases.
- Preserved hard vetoes for missing target check output, ambiguous target check output, and non-registered statement mismatches.
- Added `services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Remaining statement-equivalence hardening: Lean parser integration, proof-producing definitional/logical equivalence classes, transitive dependency semantics, and broader mathematical-domain trust profiles.

## Phase 38 Completion Notes

- Added `services/comathd/src/memory/trivium-evaluation.ts` with `evaluateTriviumTargetPlatform()`.
- Added root optional dependency `triviumdb@0.7.1` for explicit target-platform evaluation while keeping `services/comathd` ordinary dependencies free of native packages.
- Extended Trivium capability probing and adapter opening to support the actual Node export shape `default.TriviumDB`.
- Adapted native writes/search probes to the vector API while preserving CoMath stable business IDs behind `StableIdMap`.
- Added safe close/reopen handling for the target native lock file and idempotent restore/update behavior when native nodes already persist.
- Added `services/comathd/tests/unit/phase38-trivium-native-evaluation.test.mjs` and `services/comathd/scripts/run-trivium-target-evaluation.mjs`.
- Added `corepack pnpm --filter @comath/comathd eval:trivium` for real native target-platform evaluation.
- Remaining memory work: broader multi-platform benchmarking and production default-backend selection policy. The default backend remains in-memory unless TriviumDB is explicitly selected.

## Phase 39 Completion Notes

- Added `services/comathd/src/project/session-lock.ts` for project writer session locks under `.comath/sessions/writer.lock.json`.
- Added exclusive initial acquisition, active-lock rejection, token-gated release, stale takeover with `previous_session_id`, and malformed-lock fail-closed behavior.
- Added `services/comathd/tests/unit/phase39-project-session-lock.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `project_writer_session_lock` to service status and kept `agent_process_multi_process_lock_integration_deferred` as an explicit residual risk.
- Remaining agent hardening: integrate the lock into AgentRun scheduler mutation paths, add stronger OS-level process sandboxing/network denial, and validate live Pi/Codex adapter execution.

## Phase 40 Completion Notes

- Updated `services/comathd/src/agents/agent-run-scheduler.ts` so scheduled process execution acquires a project writer session before mutating AgentRun state, logs, reports, and audit trails.
- Blocked scheduler launch when another active writer session owns the project, preserving the queued run and avoiding child-process/log side effects.
- Released scheduler-owned writer sessions after terminal report handling through a `finally` path.
- Added writer-lock blocked/acquired/released audit events for scheduler execution.
- Added `services/comathd/tests/unit/phase40-agent-scheduler-session-lock.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Remaining agent hardening: stronger OS-level process sandboxing/network denial and live Pi/Codex adapter execution.

## Phase 41 Completion Notes

- Added `executeProfileAgentRun()` so service-owned GA profiles can create a profile-bound AgentRun and execute a real allowlisted adapter process through the scheduler.
- Added `POST /agent/run/profile/execute` route.
- Added Pi `comath.agent.executeProfile` runtime tool and `/cm:agent execute` command path behind host confirmation.
- Kept adapter output non-authoritative through scheduler wrapping: `proof_authority: none`, `supports_claim_status: none`, and `child_stdout_untrusted: true`.
- Added `services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs` and `extensions/comath-pi/tests/phase41-agent-execute-tool.test.mjs` to default package test chains.
- Remaining agent hardening: production Codex CLI/API adapter packaging, cursor/continuous log streaming beyond capped reads, richer operator controls, and OS-level sandbox/network denial.

## Phase 42 Completion Notes

- Added service-owned `readAgentRunLogs()` for capped stdout/stderr/report metadata readback from scheduler-owned AgentRun paths.
- Added service-owned `probeAgentAdapterHealth()` and `POST /agent/adapter/health` with absolute program validation, `shell:false`, bounded timeout/output, minimal environment, `COMATH_PROOF_AUTHORITY=none`, and audit events.
- Added `GET /agent/run/:id/logs` plus Pi `comath.agent.logs`, `comath.agent.health`, `/cm:agent logs`, and `/cm:agent health`.
- Remaining agent hardening: production Codex CLI/API adapter packaging, streaming/subscription log UI beyond capped reads, richer operator controls, and OS-level sandbox/network denial.

## Phase 43 Completion Notes

- Added service-owned `codex-cli` adapter package metadata with bundled launcher script, `rpm=4`, all GA profiles supported, and `proof_authority=none`.
- Added `listAgentAdapterPackages()`, `buildAgentAdapterPackageLaunch()`, and `executeAgentAdapterPackage()` plus `/agent/adapter/package/list`, `/agent/adapter/package/prepare-launch`, and `/agent/adapter/package/execute`.
- Added Pi `comath.agent.adapterPackageList`, `comath.agent.prepareAdapterPackage`, `comath.agent.executeAdapterPackage`, `/cm:agent packages`, `/cm:agent prepare-package`, and `/cm:agent execute-package`.
- Added `services/comathd/scripts/copy-agent-adapters.mjs` so bundled adapter launcher assets are copied into `dist` during build.
- Remaining agent hardening after Phase 43: real external Codex CLI/API invocation behind the package contract, streaming/subscription log UI beyond capped reads, richer operator controls, and OS-level sandbox/network denial.

## Phase 44 Completion Notes

- Added service-configured external Codex-compatible CLI invocation for the `codex-cli` adapter package through `backend: "external"`.
- Resolved external programs only from `COMATH_CODEX_CLI_PROGRAM` and optional service-owned JSON prefix args, preserving `shell:false`, AgentRun-scoped cwd, `rpm=4`, and `COMATH_PROOF_AUTHORITY=none`.
- Wrapped external stdout/stderr as untrusted AgentRun report material and kept claim promotion, GraphPatch application, and proof authority unavailable to adapter output.
- Added Pi backend schema/tool/command passthrough without exposing executable paths to model/Pi input.
- Remaining agent hardening: real production Codex CLI/API validation, cursor/continuous log streaming beyond capped reads, richer operator controls, and OS-level sandbox/network denial.

## Phase 45 Completion Notes

- Added `tests/e2e/phase45-pi-comathd-install-session.test.mjs` to start a real local `comathd` HTTP server and import the built Pi package entrypoint from its manifest.
- Registered the built extension into a fake Pi host and exercised campaign/agent commands through `createComathClient({ baseUrl })`, not mocked client calls.
- Verified `rpm=4`, `comathd_only` trusted-state access, host-confirmed mutating tools/commands, campaign start/status/tick, agent package listing, packaged adapter prepare-launch, project status, and resource discovery.
- Wired Phase 45 into root `corepack pnpm test`.
- Remaining Pi hardening: richer real-host Pi UI, manual install walkthrough, durable service lifecycle management, and runtime permission UX.

## Phase 46 Completion Notes

- Added service-owned `streamAgentRunLogs()` for incremental stdout/stderr byte-cursor polling with bounded chunks, next cursors, terminal completion, invalid-cursor rejection, and `proof_authority=none`.
- Added `GET /agent/run/:id/log-stream`, audit event `agent_run.logs_streamed`, and status capability `agent_run_log_stream_cursor`.
- Added Pi `comath.agent.streamLogs` and `/cm:agent stream` as read-only operator polling paths without host mutation confirmation.
- Added `services/comathd/tests/unit/phase46-agent-log-stream.test.mjs` and `extensions/comath-pi/tests/phase46-agent-log-stream-tools.test.mjs` to default package test chains.
- Remaining agent hardening: continuous WebSocket/SSE subscriptions, richer interactive operator controls, production Codex CLI/API validation, and OS-level sandbox/network denial.

## Phase 47 Completion Notes

- Added service-owned `formatAgentRunLogSseSnapshot()` for SSE-compatible AgentRun log frames over cursor-bounded stdout/stderr chunks with retry, event id, JSON data, and `proof_authority=none`.
- Added `GET /agent/run/:id/log-subscription`, `text/event-stream` route responses, audit event `agent_run.logs_sse_snapshot`, and status capability `agent_run_log_subscription_sse`.
- Added Pi `ComathClient.getText()`, `comath.agent.subscribeLogs`, and `/cm:agent subscribe-logs` as read-only operator subscription surfaces without host mutation confirmation.
- Added `services/comathd/tests/unit/phase47-agent-log-subscription.test.mjs` and `extensions/comath-pi/tests/phase47-agent-log-subscription-tools.test.mjs` to default package test chains.
- Remaining agent hardening: indefinite WebSocket/SSE sessions, richer interactive operator controls, production Codex CLI/API validation, and OS-level sandbox/network denial.

## Phase 48 Completion Notes

- Added service-owned `readAgentRunOperatorPanel()` to aggregate AgentRun status, cursor log chunks, SSE snapshot metadata, endpoint metadata, action availability, and `proof_authority=none`.
- Added `GET /agent/run/:id/operator-panel`, audit event `agent_run.operator_panel_read`, and status capability `agent_run_operator_panel`.
- Added Pi `comath.agent.operatorPanel` and `/cm:agent panel` as read-only operator panel surfaces without host mutation confirmation or direct `.comath/` access.
- Added `services/comathd/tests/unit/phase48-agent-operator-panel.test.mjs` and `extensions/comath-pi/tests/phase48-agent-operator-panel-tools.test.mjs` to default package test chains.
- Remaining agent hardening: true scheduler-backed live cancellation, indefinite WebSocket/SSE sessions, production Codex CLI/API validation, and OS-level sandbox/network denial.

## Phase 49 Completion Notes

- Added an active same-process scheduler registry keyed by project root, project id, and AgentRun id.
- Added `cancelAgentRunFromOperator()`, `isAgentRunCancellableByOperator()`, `POST /agent/run/:id/cancel`, audit event `agent_run.operator_cancel_requested`, and status capability `agent_run_operator_cancel`.
- Updated operator panels so cancellation is enabled only while the active scheduler registry can cancel the run.
- Added Pi `comath.agent.cancelRun` and `/cm:agent cancel` behind host confirmation.
- Added `services/comathd/tests/unit/phase49-agent-operator-cancel.test.mjs` and `extensions/comath-pi/tests/phase49-agent-operator-cancel-tools.test.mjs` to default package test chains.
- Remaining agent hardening: cross-process cancellation/recovery, indefinite WebSocket/SSE sessions, production Codex CLI/API validation, and OS-level sandbox/network denial.

## Phase 50 Completion Notes

- Added service-owned `formatAgentRunLogSseSession()` to emit multiple `agent_run.log_chunk` frames over cursor-bounded stdout/stderr reads.
- Added `GET /agent/run/:id/log-session`, audit event `agent_run.logs_sse_session`, and status capability `agent_run_log_session_sse`.
- Added Pi `comath.agent.logSession` and `/cm:agent log-session` as read-only operator log-session paths without host mutation confirmation.
- Added `services/comathd/tests/unit/phase50-agent-log-session.test.mjs` and `extensions/comath-pi/tests/phase50-agent-log-session-tools.test.mjs` to default package test chains.
- Remaining agent hardening: indefinite WebSocket/SSE operator sessions, richer browser/operator UX, cross-process scheduler recovery, production Codex CLI/API validation, and OS-level sandbox/network denial.

## Phase 51 Completion Notes

- Added `codex-api` backend selection for the service-owned `codex-cli` adapter package.
- Added service-configured Responses-compatible Codex API backend execution with injectable HTTP client tests, `COMATH_CODEX_API_KEY` fail-closed configuration, and `proof_authority=none` report wrapping.
- Kept package prepare-launch and Pi payloads secret-free by exposing only backend enum, `COMATH_CODEX_API_KEY_REF`, configured flags, and model metadata.
- Added Pi `/cm:agent prepare-package|execute-package --backend codex-api` and tool schema coverage.
- Added `services/comathd/tests/unit/phase51-codex-api-backend.test.mjs` and `extensions/comath-pi/tests/phase51-codex-api-backend-tools.test.mjs` to default package test chains.
- Remaining agent hardening: production Codex API account/network validation, retry/backoff and rate-limit telemetry, streaming API UX, installed production Codex CLI validation, and OS-level sandbox/network denial.

## Phase 52 Completion Notes

- Added bounded retry handling for the service-configured `codex-api` backend, retrying only `429` and `5xx` Responses-compatible failures.
- Added capped `Retry-After` handling and `COMATH_CODEX_API_MAX_ATTEMPTS` parsing with a bounded `1..5` attempt range.
- Added report and audit telemetry for Codex API attempts, status sequences, rate-limit detection, and exhausted-attempt fail-closed behavior.
- Preserved the Phase 51 credential boundary: Pi/package launch metadata remains secret-free, API keys stay service-owned, and retry telemetry carries `proof_authority=none`.
- Added `services/comathd/tests/unit/phase52-codex-api-retry-telemetry.test.mjs` to the default `@comath/comathd` test chain and status capability `codex_api_retry_telemetry`.
- Remaining agent hardening: live production API/network validation, streaming Responses API UX, credential rotation UX, installed production Codex CLI validation, indefinite operator sessions, and OS sandbox/network denial.

## Phase 53 Completion Notes

- Added `validateExternalCodexCliInstallation()` for service-owned installed Codex CLI validation through `COMATH_CODEX_CLI_PROGRAM` and optional service prefix args.
- Added bounded `--version` and `--health --profile <profile>` probes with `COMATH_PROOF_AUTHORITY=none`, fail-closed missing-configuration diagnostics, and path-free returned/audited metadata.
- Added `POST /agent/adapter/package/validate-installed-cli`, audit event `agent_adapter.installed_codex_cli_validated`, and status capability `installed_codex_cli_validation`.
- Added `services/comathd/tests/unit/phase53-installed-codex-cli-validation.test.mjs` to the default `@comath/comathd` test chain.
- Remaining agent hardening: live production API/network validation, streaming Responses API UX, credential rotation UX, indefinite operator sessions, richer operator controls, and OS sandbox/network denial.

## Phase 54 Completion Notes

- Added `extractLeanTheoremDeclarationSignature()` for conservative theorem/lemma declaration-header parsing from supplied Lean source.
- Added optional `lean_source` fallback to `checkStatementEquivalence()` and report field `signature_source`.
- Preserved fail-closed behavior for ambiguous declarations and comment-only substring matches.
- Added `services/comathd/tests/unit/phase54-lean-declaration-parser.test.mjs` to the default `@comath/comathd` test chain and status capability `lean_declaration_parser_signature_fallback`.
- Remaining statement-equivalence hardening: proof-producing definitional/logical equivalence classes, transitive dependency semantics, and broader mathematical-domain trust profiles.

## Phase 55 Completion Notes

- Added a replay-run environment drift gate in snapshot verification for recorded Node version, platform, and architecture.
- `/replay/verify-manifest` now fails closed with `runner_reexecution_environment_mismatch` before child runner launch when replay metadata is validly rehashed but does not match the current process environment.
- Added `services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs` to the default `@comath/comathd` test chain and status capability `runner_cross_machine_replay_environment_gate`.
- This retires the cross-machine replay validation portion of runner replay hardening. Remaining replay hardening: OS-level isolation, enforced network denial, and broader runner-family lockfiles.

## Phase 56 Completion Notes

- Added `StatementRegisteredLogicalEquivalence` and `allowed_registered_logical_equivalences` to the Lean statement-equivalence gate.
- Accepted `logically_equivalent_with_registered_lemmas` only when the registered witness exactly matches the locked formal spec and extracted target signature and includes `lean_kernel_checked_equivalence`, witness artifact id, valid SHA-256 witness artifact hash, and non-empty lemma names.
- Missing witness hashes, missing lemma names, and wrong target signatures remain hard statement-mismatch vetoes.
- Added `services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs` to the default `@comath/comathd` test chain and status capability `lean_registered_logical_equivalence_witnesses`.
- Remaining statement-equivalence hardening: proof search for equivalence lemmas, transitive semantic equivalence, and broader mathematical-domain trust profiles.

## Phase 57 Completion Notes

- Added `nat_zero_add` to the service-owned theorem-family registry with Lean target `theorem C0001 (n : Nat) : 0 + n = n`, proof term `Nat.zero_add n`, and dependency `Nat.zero_add`.
- Extended goal classification and obligation matching so `0 + n = n` enters the ordinary campaign, candidate, final replay, and promotion path.
- Added `services/comathd/tests/integration/phase57-ga-theorem-template-instantiation.test.mjs` to the default `@comath/comathd` test chain and status capability `proof_kernel_theorem_template_instantiation`.
- Remaining theorem-synthesis hardening: arbitrary theorem planning beyond registered templates, broad lemma decomposition, and non-registry Lean project generation.

## Verification To Run At Phase Boundary

```text
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
```
