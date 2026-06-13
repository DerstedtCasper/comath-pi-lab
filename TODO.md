# TODO

## Phase 0: Repo Bootstrap

- [x] Create `D:\MATH _Studio\comath-pi-lab` as the target repository root.
- [x] Initialize Git in the target repository.
- [x] Add root Node/pnpm workspace files.
- [x] Add canonical development plan and goal runbook.
- [x] Add agent, review, security, and math-integrity tracking documents.
- [x] Add docs, ADR, integration, progress, extension, schema, service, and test skeletons.
- [x] Run `corepack pnpm install`.
- [x] Run `corepack pnpm build`.
- [x] Run `corepack pnpm typecheck`.
- [x] Run `corepack pnpm test`.
- [x] Record Phase 0 validation evidence in `REVIEW.md`.

## Phase 1: Contracts, IDs, Schemas

- [x] Define project, memory, claim, evidence, workstream, artifact, audit, and GraphPatch TypeScript contracts.
- [x] Add Zod schemas and JSON schema files.
- [x] Implement stable ID generation and statement hashing.
- [x] Add schema and ID tests.
- [x] Harden GraphPatch against direct claim status/evidence/gate mutation.
- [x] Require gate/audit/kernel metadata for privileged formal claim states.

## Phase 2: comathd Foundation And Path Policy

- [x] Add Phase 2 failing tests for path policy, runtime tree, project lifecycle, and service routes.
- [x] Implement semantic path policy and traversal/outside-root tests.
- [x] Implement runtime tree creation and idempotent project init.
- [x] Implement project open/status.
- [x] Implement local service health/status surface.
- [x] Verify no real repository-root `.comath/` is created by tests.

## Phase 3: Artifact And Audit Kernel

- [x] Add Phase 3 failing tests for hashing, safe artifact import, audit JSONL, secret-scan stub, and snapshot manifest stub.
- [x] Implement file hashing.
- [x] Implement content-addressed artifact import that does not trust source basename.
- [x] Implement artifact metadata storage.
- [x] Implement append-only audit JSONL writer.
- [x] Implement secret scan stub and snapshot manifest stub.
- [x] Verify Phase 3 does not implement paper export or full snapshot/replay.

## Phase 4: Claim Registry And Fail-Closed Gate

- [x] Add Phase 4 failing tests for claim register/get/update/link, markdown rendering, promotion request, fail-closed gate, and direct promotion rejection.
- [x] Implement claim registry persistence under `.comath/claims`.
- [x] Implement statement hash on claim registration.
- [x] Implement claim markdown renderer.
- [x] Implement claim links/dependencies.
- [x] Implement typed promotion request/decision and fail-closed gate.
- [x] Ensure `formally_checked` cannot be assigned outside promotion gate and cannot pass without kernel/audit/dependency/proof artifacts.

## Phase 5: Memory Adapter And StableIdMap

- [x] Add Phase 5 failing tests for ResearchMemoryDB, in-memory graph operations, context pack, patch lifecycle, StableIdMap conflicts, Trivium shim, and native import guard.
- [x] Implement `ResearchMemoryDB` interface.
- [x] Implement in-memory node/edge/search/context backend.
- [x] Implement GraphPatch begin/apply lifecycle without claim promotion bypass.
- [x] Implement `StableIdMap` interface and in-memory conflict checks.
- [x] Implement TriviumDB unavailable shim with no native imports.
- [x] Verify `triviumdb` remains absent from dependencies and source imports.

## Phase 6: Pi Extension Layer

- [x] Add Phase 6 failing tests for command parsing, comathd client normalization, tool contracts, permission gates, resource discovery, and dashboard rendering.
- [x] Implement extension package entrypoint.
- [x] Implement `/cm:*` command parser.
- [x] Implement comathd HTTP/JSON client.
- [x] Implement tool descriptors with schema-like parameter contracts.
- [x] Implement resource discovery for skills, prompts, domain packs, subagents, and snapshot/replay artifact descriptors.
- [x] Implement permission gate stubs that block mutating calls until confirmation.
- [x] Implement text dashboard fallback.
- [x] Verify extension code does not write `.comath/` or import service internals.

## Phase 7: Workstreams And GraphPatch Lifecycle

- [x] Add Phase 7 tests for workstream directory lifecycle, reports, GraphPatch proposal/review/apply, and HTTP routes.
- [x] Implement `WS-XXXX` directories with `spec.yaml`, `status.json`, `report.md`, and `graph_patch.json`.
- [x] Implement workstream spawn/status/list/bundle/report/transition APIs.
- [x] Implement GraphPatch proposal builder with audit events and protected claim-field rejection.
- [x] Implement GraphPatch review state machine requiring `proposed -> under_review -> accepted`.
- [x] Implement explicit GraphPatch apply through `ResearchMemoryDB`, with duplicate-apply rejection.
- [x] Verify proposed and accepted patches do not mutate trusted graph until explicit apply.
- [x] Verify `/claim/promote` remains the claim status promotion path.

## Phase 8: Codex/Pi Subagent Scaffolding

- [x] Add Phase 8 tests for subagent definitions, prompts, resource discovery, assignment guards, and static extension boundaries.
- [x] Add `.pi/agents` definitions for coordinator, librarian, computation, proof-route, formalization, reviewer, graph-builder, security-auditor, and math-integrity-auditor.
- [x] Add `.pi/prompts` workflows for parallel workstreams, GraphPatch proposals, child-agent reports, and merge review.
- [x] Implement Pi extension subagent registry and lookup helpers.
- [x] Implement assignment validation for own-workstream writes and forbidden core files.
- [x] Make domain packs and subagents first-class discoverable resources.
- [x] Add `docs/workstream-model.md` for concurrency, write scopes, and parent merge protocol.
- [x] Verify extension source still does not write runtime files, import service internals, touch TriviumDB, or call claim promotion internals.

## Phase 9: MathProve Bridge Mock

- [x] Add Phase 9 failing tests for MathProve bridge CLI shape, adapter validation, claim/target mismatch rejection, veto integration, and fail-closed promotion behavior.
- [x] Add `python/mathprove_bridge.py` with `plan`, `route`, and `final_audit` mock modes.
- [x] Implement structured fail-closed JSON for `formally_checked`, `symbolically_checked`, and `literature_supported`.
- [x] Implement `services/comathd/src/verification/mathprove.ts` as an evidence producer and gate-input adapter.
- [x] Archive MathProve bridge reports under service-owned `.comath/evidence/<claim>/mathprove`.
- [x] Import bridge reports through the content-addressed artifact store as `runner_output`.
- [x] Register bridge run evidence and append `mathprove.bridge_ran` audit events.
- [x] Merge MathProve bridge vetoes and warnings into the existing claim promotion gate.
- [x] Verify bridge-gated promotion leaves claim status unchanged under mock vetoes.

## Phase 10: Compute Runners

- [x] Add Phase 10 failing tests for fixed runner registry, exact symbolic runner, counterexample search, Sage/SAT placeholders, artifact/evidence/audit recording, and no claim-status mutation.
- [x] Add shared evidence JSONL store for verifier and runner evidence records.
- [x] Add fixed runner contracts and registry with no user-supplied command execution surface.
- [x] Implement `python/exact_compute.py` for exact SymPy checks with float/unsafe syntax rejection.
- [x] Implement `python/counterexample_search.py` for deterministic seeded numeric/search evidence.
- [x] Implement `runSympyExact`, `runCounterexampleSearch`, `runSagePlaceholder`, and `runSatPlaceholder`.
- [x] Archive runner reports under service-owned `.comath/evidence/<claim>/runners`.
- [x] Import runner reports through the content-addressed artifact store as `runner_output`.
- [x] Record runner evidence and append `runner.completed` / `runner.failed` audit events.
- [x] Verify numeric/search output cannot be used as symbolic evidence and claim status remains unchanged.

## Phase 11: Literature System

- [x] Add Phase 11 failing tests for BibTeX parsing, PDF import, citation records, condition matching, route coverage, and fail-closed literature promotion.
- [x] Implement BibTeX parsing with malformed-record rejection.
- [x] Import BibTeX sources through the content-addressed artifact store as `bibtex`.
- [x] Import literature PDF sources through the content-addressed artifact store as `pdf`.
- [x] Implement citation records requiring locator and exact artifact linkage.
- [x] Record quoted statement hashes and citation assumptions for claim-condition checks.
- [x] Implement conservative citation condition matching with fail-closed vetoes for missing assumptions, missing artifacts, claim/statement mismatch, and non-artifact sources.
- [x] Reject LLM memory, summaries, and agent reports as citation evidence.
- [x] Register successful citation-condition matches as literature evidence and audit events.
- [x] Require a successful citation-condition match before `literature_supported` promotion can pass the claim gate.
- [x] Harden condition-match JSONL parsing so malformed or hand-written records cannot impersonate trusted evidence.
- [x] Add literature HTTP routes for BibTeX/PDF import, citation registration, condition checking, and listing.
- [x] Add arXiv/OpenAlex/Semantic Scholar/Zotero adapter interface descriptors without enabling network adapters.
- [x] Verify citation existence alone cannot promote a claim.

## Phase 12: Working Paper

- [x] Add Phase 12 tests for working paper init, state, sections, claim blocks, checks, exports, routes, audit events, and Pi extension tool descriptors.
- [x] Implement live working paper state under service-owned `.comath/artifacts/papers`.
- [x] Generate synchronized Markdown, TeX, BibTeX, manifest, sections, and margin-note files.
- [x] Preserve margin provenance for claim IDs, statement hashes, evidence IDs, workstreams, warnings, and blockers.
- [x] Fail closed on theorem-like overclaiming, missing margin provenance, hidden blockers, stale statement hashes, missing evidence, invalid margin notes, and missing citation-condition support for literature claims.
- [x] Export Markdown and TeX through the content-addressed artifact store and audit log.
- [x] Add paper HTTP routes for init, state, update-section, render-claim, check, and export.
- [x] Add Pi extension `/cm:paper` parsing and six paper tool descriptors.
- [x] Keep Pi extension paper tools as thin descriptors only: no service-internal imports, no `.comath/` writes, and mutating tools require confirmation.
- [x] Verify paper generation/export does not promote claims or mutate gate state.

## Phase 13: Real TriviumDB Adapter

- [x] Add Phase 13 tests for TriviumDB capability probing, fallback policy, factory behavior, stable string ID preservation, and adapter import boundaries.
- [x] Implement `probeTriviumCapability()` with function-scoped native dynamic loading and diagnostics.
- [x] Implement `TriviumResearchMemoryDB` behind the `ResearchMemoryDB` interface.
- [x] Keep native numeric IDs private behind `StableIdMap`.
- [x] Implement `createResearchMemoryDB()` with memory default, optional Trivium selection, fallback-to-memory warnings, and required-native failure mode.
- [x] Preserve `MemoryNode.id`, `MemoryEdge.source_id`, `MemoryEdge.target_id`, and `GraphPatch.patch_id` as business-facing string IDs.
- [x] Keep native DB files under service-owned `.comath/db`.
- [x] Add optional native test gated by `COMATH_ENABLE_TRIVIUM_TESTS=1`.
- [x] Keep `triviumdb` out of ordinary dependencies and top-level imports.
- [x] Verify default tests pass without native TriviumDB installed.

## Phase 14: Braid Statistics Domain Pack

- [x] Add Phase 14 tests for braid ontology, computation protocols, benchmark claims, Lean map, literature prompts, GraphPatch candidates, Python exact checks, and domain boundary scans.
- [x] Implement a first-class `braid-statistics` domain pack under `services/comathd/src/domain/braid-statistics`.
- [x] Add ontology entries for braid groups, braid words, braid representations, R-matrices, Yang-Baxter equations, Hecke algebras, tensor categories, DHR sectors, parastatistics sectors, and anyon models.
- [x] Add risk flags for notation drift, category-level mismatch, missing semisimplicity, q root-of-unity case split, and physical-interpretation overclaiming.
- [x] Add computation protocol descriptors for braid relation, YBE, Hecke relation, fusion consistency, and small counterexample search.
- [x] Add benchmark claim templates that preserve assumptions, blockers, and `conjectural` target status only.
- [x] Add Lean formalization map entries as skeleton/translation targets only, with no kernel-checked claim.
- [x] Add literature prompts requiring exact source artifacts and rejecting LLM memory.
- [x] Add GraphPatch proposal builder that emits reviewable candidates without privileged claim fields.
- [x] Add `python/braid/check_braid.py` for exact braid relation, Hecke relation, and float-contamination rejection in YBE inputs.
- [x] Add `skills/braid-statistics/SKILL.md` and `prompts/domain-braid-statistics.md`.
- [x] Verify domain pack cannot promote claims or bypass the claim gate.

## Phase 15: Read-Only / Degraded TUI Dashboard

- [x] Add Phase 15 tests for read-only dashboard aggregation, text fallback, TUI model rendering, paper provenance, blockers, degraded read-model state, and extension boundary scans.
- [x] Add extension-local dashboard state types in `widgets.ts`.
- [x] Add read-only `aggregateDashboardSnapshot()` that calls comathd `GET` routes only.
- [x] Add pure `renderDashboardText()` and `renderTuiDashboard()` functions.
- [x] Add blocker summarization for paper vetoes, margin-note blockers, blocked workstreams, and degraded read-model limitations.
- [x] Add review queue helper in `tools/review.ts`.
- [x] Keep dashboard code out of service internals and direct `.comath/` reads/writes.
- [x] Preserve Phase 16 boundary by not writing persistent dashboard snapshots or replay files.

## Phase 16: Snapshot And Replay

- [x] Add Phase 16 failing tests for snapshot export, verification, restore smoke, replay manifest, real secret scan, and negative tamper cases.
- [x] Keep Phase 3 `createSnapshotManifestStub()` and `scanForSecretsStub()` compatible while adding real Phase 16 APIs.
- [x] Implement `scanForSecrets()` with fail-closed import/export blocking for API key, token, password, private-key, and truncated-file patterns.
- [x] Implement service-owned canonical snapshot export under `.comath/snapshots/SNAP-XXXX/`.
- [x] Exclude nested snapshots from export to avoid recursive snapshot capture.
- [x] Copy runtime files into snapshot-local `files/` entries and record sorted relative paths only.
- [x] Hash project metadata, config, claims, claim links, gate results, evidence records, audit logs, artifact index, artifact blobs, paper state, workstreams, and runner reports when present.
- [x] Add manifest integrity hashes for entries, replay manifest, and manifest material.
- [x] Implement replay manifest extraction from runner reports with seed, timeout, input/script/output hashes, replay argv, environment, dependency metadata, and replayable/unreplayable status.
- [x] Scrub replay command absolute paths so manifests do not leak host-specific paths.
- [x] Verify runner report `result_sha256` to detect stale runner output.
- [x] Implement snapshot verification with negative checks for manifest tamper, entry hash mismatch, missing entries, path traversal, secret hits, replay-manifest mismatch, and stale runner output.
- [x] Implement restore smoke path that writes into a temp target root without mutating source snapshot.
- [x] Expose service-owned snapshot export, verify, restore, and replay-manifest verification through `comathd` HTTP routes.
- [x] Expose Pi extension `/cm:snapshot` and `/cm:replay` commands plus snapshot/replay tool descriptors.
- [x] Verify route-level snapshot export fails closed when secret scanning blocks the project runtime.
- [x] Verify stable external IDs remain strings and no Trivium native IDs appear in manifests.

## Phase 17: Evaluation, Security, Math-Integrity Audit

- [x] Add `tests/evaluation/phase17-integrity-evaluation.test.mjs`.
- [x] Add retrieval benchmark fixture under `tests/evaluation/fixtures/`.
- [x] Add in-memory database benchmark checks for search top-hit behavior and context-pack graph expansion.
- [x] Add mathematical safety coverage for fake evidence IDs, missing artifact IDs, numeric/search evidence used as symbolic evidence, float contamination, and formal-proof attempts without Lean evidence.
- [x] Add paper correctness coverage that blocks paper export when `checkPaper()` returns vetoes.
- [x] Add dashboard read-only regression coverage for extension renderers and review helpers.
- [x] Add snapshot/replay regression coverage for stale runner output, secret scan blocking, and no Trivium/native ID leak in manifests.
- [x] Add adversarial coverage for forged runner reports without trusted runner audit provenance.
- [x] Add adversarial coverage for ungrounded literature quotes not present in source artifacts.
- [x] Add adversarial coverage for manually written theorem-like paper syntax and tampered margin block hashes.
- [x] Harden `runClaimPromotionGate()` so evidence IDs and artifact IDs must exist, match the project and claim, bind to each other, and match the requested target status.
- [x] Harden artifact verification in the promotion gate with stored SHA-256 and size checks.
- [x] Raise evidence level only through successful gate-mediated promotions.
- [x] Block paper export when paper checks fail and record `paper.export_rejected`.
- [x] Remove host absolute runner script paths from runner metadata at the source.
- [x] Strengthen snapshot verification and restore against symlink/reparse traversal.
- [x] Reject failed symbolic runner outputs and failed computation/counterexample runner outputs as support for privileged claim promotion.
- [x] Require `symbolically_checked` and `computationally_supported` promotions to bind to successful runner reports through requested evidence/artifacts.
- [x] Bind working-paper claim blocks to exact margin-note IDs instead of accepting claim-global provenance.
- [x] Use one canonical runner result hash envelope for success, failure, invalid JSON, and placeholder runner outputs.
- [x] Detect runner report host-path leaks during replay/snapshot verification.
- [x] Verify replay `runs_sha256` integrity so hand-edited replay manifests fail closed.
- [x] Make truncated secret scans fail closed instead of warning-only.
- [x] Wire Phase 17 evaluation into root `corepack pnpm test`.
- [x] Update `SECURITY_REVIEW.md` with final security audit findings and residual risks.
- [x] Update `MATH_INTEGRITY_REVIEW.md` with final mathematical-integrity audit findings and residual risks.
- [x] Add Research Alpha retrospective under `docs/progress/`.
- [x] Record final root validation evidence and confirm no repository-root `.comath/` state remains.

## Phase 18: GA Proof-Kernel Vertical Slices

Goal 3 note: this phase is retained as historical vertical-slice evidence only. Its `Nat.add_zero` slice is not a current production proof path under Goal 3 quarantine.

- [x] Add native `services/comathd/src/proof-kernel` campaign, ensemble, Lean replay, static audit, dependency closure, axiom profile, and statement-equivalence modules.
- [x] Add service-owned `ResearchCampaign` routes for start, status, next-actions, tick, final-audit, replay, pause, and resume.
- [x] Require `formally_checked` promotion to bind to a passed proof-kernel `final_replay_manifest.json` for the requested claim.
- [x] Retain the historical positive Lean vertical slice for `Nat.add_zero`: problem lock, 8 candidate manifests, candidate audit artifacts, final clean replay, gate promotion, and replay route as fixture evidence only.
- [x] Add negative proof-kernel gates for fake/preloaded formal metadata, `sorry`/`axiom` static cheats, and statement drift.
- [x] Add exact refutation path for `n + 1 = n` with `n=0` counterexample evidence and terminal `completed_refutation` campaign state.
- [x] Add snapshot restore then proof-kernel replay coverage for restored projects.
- [x] Expose Pi extension `/cm:research`, `/cm:campaign`, and six campaign tool descriptors as thin `comathd` client calls.
- [x] Persist candidate `dependency_delta.json`, `assumption_delta.json`, `replay_commands.json`, `failure_routes.json`, and `graph_patch.json` artifacts.
- [x] Preserve the Pi extension boundary: no direct `.comath/` writes, no service-internal imports, mutating tools require confirmation.

## Phase 19: GA Ensemble Recovery And Dialectical Stress

- [x] Add a regression test for the v3 16.4 ensemble recovery benchmark: seven failed candidates plus one Lean-valid candidate select the Lean-valid candidate.
- [x] Verify all seven failed routes are preserved in proof memory rather than discarded after selection.
- [x] Persist a structured V8 `dialectical_stress.json` artifact with `P`, `not_P`, `Q`, `not_Q`, `R`, `U`, `proof_authority`, and `must_be_checked_by`.
- [x] Keep V8 as a heuristic stress/revision artifact only; it does not certify proof validity or bypass Lean replay.
- [x] Wire the Phase 19 test into the default `@comath/comathd` test chain.

## Phase 20: GA ResearchCampaign State Machine

- [x] Align public `ResearchCampaign.current_stage` with the v3 canonical state set from the goal instruction.
- [x] Align terminal states with `completed_formal_proof`, `completed_refutation`, `blocked_with_replayable_reason`, and `cancelled_by_user`.
- [x] Split public campaign stages from internal proof-kernel artifact stages such as `lemma_sprint` and `final_global_lean_replay`.
- [x] Add bounded ticks for `problem_locked -> context_built -> planning -> candidate_generation -> candidate_verification -> candidate_arbitration -> integration -> adversarial_review -> final_static_audit -> final_global_replay -> completed_*`.
- [x] Add Phase 20 regression coverage and wire it into the default `@comath/comathd` test chain.

## Phase 21: Service Read Models For Dashboard

- [x] Add `/claim/list`, `/evidence/list`, and `/gate/list` read-only routes owned by `comathd`.
- [x] Add Phase 21 route coverage for claim/evidence/gate boards and gate-result filtering.
- [x] Update the Pi dashboard aggregator to read claims, evidence, and gate vetoes from service routes rather than paper-derived degraded placeholders.
- [x] Keep dashboard renderers pure and read-only; the dashboard still cannot promote claims, apply patches, repair state, or write snapshots.

## Phase 22: Pi Research Campaign Loop

- [x] Add quote-aware `/cm:research "<goal>" --goal --strict` parsing for one-command research entry.
- [x] Add a scoped campaign-loop capability envelope so unattended loop execution is limited by project root, actor, and tick budget.
- [x] Add `runResearchCampaignLoop()` to start a service-owned campaign, advance bounded ticks through `comathd`, and return a dashboard snapshot.
- [x] Add Phase 22 Pi extension coverage for start/tick/dashboard flow, capability fail-closed behavior, and no direct trusted-state mutation from the extension.
- [x] Keep runtime registration outside the Phase 22 loop scope and real child-agent scheduling deferred; the loop is a tested thin-client product path over `comathd`. Runtime registration is superseded by Phase 26.

## Phase 23: Proof-Kernel Theorem-Family Registry

Goal 3 note: this phase is retained as historical vertical-slice evidence only. The theorem-family registry is not a current production proof path and must not be used to bypass FormalSpecLock, AssumptionLedger, StatementDiffGate, Lean Authority v3 evidence, or the ordinary promotion gate.

- [x] Record the historical registered theorem-family layer for supported elementary Nat targets while keeping `C0001`, `PO-0001`, and the 8-candidate ensemble contract stable.
- [x] Retain the historical positive Lean campaign slice for `Nat.mul_zero`: lock `n * 0 = 0`, generate family-specific candidates, run clean replay, promote the claim, and support `/campaign/:id/replay` as fixture evidence only.
- [x] Keep `Nat.add_zero` and exact `n + 1 = n` refutation regressions compatible with the v3 campaign state machine.
- [x] Block unsupported goals before fabricating theorem-family candidates and keep broad theorem synthesis deferred.
- [x] Wire Phase 23 coverage into the default `@comath/comathd` test chain.

## Phase 24: Runner Re-Execution Replay

- [x] Persist service-owned canonical runner input JSON and input hash material in runner reports.
- [x] Add strict `/replay/verify-manifest` runner re-execution for `sympy-exact` and `counterexample-search`.
- [x] Reconstruct commands from the fixed runner registry instead of trusting replay-manifest paths or user-supplied argv.
- [x] Fail closed on replay/report mismatch, static snapshot vetoes before Python execution, canonical input mismatch, untrusted argv shape, oversized replay timeout, report-local stdio hash drift, runner-version drift, script hash drift, invalid runner JSON, runner ID mismatch, nonzero exit, timeout, and result hash mismatch.
- [x] Keep placeholder runners explicitly skipped with `placeholder_runner_has_no_executable_replay`.
- [x] Return per-runner `runner_reexecution` summaries for replay auditability.
- [x] Keep ordinary `/snapshot/verify` and restore on static snapshot integrity semantics; strict runner re-execution is owned by `/replay/verify-manifest`.
- [x] Wire Phase 24 coverage through the existing Phase 10 and Phase 16 tests in the default `@comath/comathd` test chain.

## Phase 25: Real MathProve External Bridge

- [x] Add `runMathProveBridgeExternal()` as a service-owned external MathProve evidence runner.
- [x] Invoke the sibling `<MathProve-Skill>/scripts/verify_sympy.py` through a fixed argv template, controlled workspace, bounded timeout, and `shell:false`.
- [x] Archive external bridge reports under `.comath/evidence/<claim>/mathprove`, import them as `runner_output`, and record audit evidence.
- [x] Bind the external run to the current claim statement hash and fail closed before invocation on statement-hash mismatch.
- [x] Return structured fail-closed reports when the external MathProve runner is unavailable or returns invalid/failed output.
- [x] Preserve proof-authority separation: even an external `ok=true` runner result remains gate input and cannot certify `formally_checked` without CoMath proof-kernel replay evidence.
- [x] Add Phase 25 tests for missing runner, real external runner smoke, statement-hash mismatch, runner metadata hashes, and promotion-gate non-authority.
- [x] Wire Phase 25 coverage into the default `@comath/comathd` test chain and smoke status capabilities.

## Phase 26: Pi Runtime Registration

- [x] Add a Pi 0.75.5-compatible package manifest with `pi.extensions` as a path array and CoMath runtime policy metadata under `pi.runtime_policy`.
- [x] Export a CoMath `runtime_registration` contract that records `global_rpm=4`, `comathd_only` trusted-state access, no Pi proof authority, goal-compatible research commands, and host-side mutating-tool confirmation requirements.
- [x] Register the executable research/campaign tools through the Pi default export while leaving descriptor-only tools out of the production runtime factory until they have executable handlers.
- [x] Keep `confirmation_id` host-injected in the Pi runtime path: mutating runtime tools prompt through `ctx.ui.confirm()` and do not expose `confirmation_id` as a model-supplied parameter.
- [x] Add Phase 26 tests for package manifest shape, runtime registration validation, dynamic entrypoint import, fake Pi API registration, command dispatch, host-side confirmation, and mutating-tool execution gates.
- [x] Smoke-test the built extension with the installed `@earendil-works/pi-coding-agent@0.75.5` extension loader.
- [x] Wire Phase 26 coverage into the default `@comath/pi-extension` test chain and smoke status capabilities.

## Phase 27: AgentRun Runtime Boundary

- [x] Add typed AgentRun runtime records with stable `ARUN-XXXX` IDs, roles, status transitions, campaign/workstream binding, scoped write permissions, and audit events.
- [x] Persist AgentRun status under `.comath/agents/runs/<ARUN>/status.json` and reports under `.comath/workstreams/<WS>/agent_runs/<ARUN>/report.md`.
- [x] Add scoped write checks that allow only the owning workstream directory and `.tmp/comath/<ARUN>/` while preserving the global `.comath` runtime-write path policy.
- [x] Require structured AgentRun report headings before report submission and record failed AgentRuns as durable `FailureRoute` memory nodes.
- [x] Reject GraphPatch producer self-review so an AgentRun cannot review its own proposed patch before trusted graph application.
- [x] Add Phase 27 tests for create/start/report/list/write-scope/self-review/failure-memory/audit behavior and wire them into the default `@comath/comathd` test chain.

## Phase 28: AgentRun Process Scheduler

- [x] Add a service-side `AgentRunScheduler` that launches real child processes with `shell:false`, absolute-realpath allowlisted programs, bounded timeout, and minimal AgentRun environment variables.
- [x] Enforce `max_concurrent` and `rpm` scheduler controls before child process start, including enqueue-time rpm reservation.
- [x] Capture byte-capped stdout/stderr under `.tmp/comath/<ARUN>/logs/` through the Phase 27 AgentRun scoped writer, with truncation markers.
- [x] Submit scheduler results back through `submitAgentRunReport()` so success, invalid report, timeout, nonzero failure, running cancellation, and queued cancellation become durable AgentRun state.
- [x] Add cancellation support for running and queued AgentRuns, process-tree termination attempts, and audit events for started/completed/timed-out/cancelled/queued-cancelled/rate-limited launches.
- [x] Add Phase 28 tests for real process launch, serial scheduling, absolute allowlist rejection, env isolation, invalid-report fail-closed handling, timeout, cancellation, rpm rejection, logs, output truncation, process-tree termination, non-authoritative report envelopes, and report persistence; wire them into the default `@comath/comathd` test chain.

## Phase 29: Agent Profile Service Integration

- [x] Add persisted GA agent profiles for coordinator, librarian, computation, proof-route, formalization, reviewer, graph-builder, security-auditor, and math-integrity-auditor with `may_mutate_trusted_state=false`, `proof_authority=none`, write-scope templates, forbidden direct-promotion tools, and `rpm<=4`.
- [x] Validate agent profiles against the global `rpm=4` budget and fail closed on duplicate IDs, forbidden tools, trusted-state mutation authority, proof authority, missing write scopes, or profile-local rpm overflow.
- [x] Bind AgentRun creation to profiles through service-owned `createAgentRunForProfile()`, preserving role, model profile, tool profile, scoped write directories, and audit events.
- [x] Prepare scheduler launch envelopes from profiles without leaking secret-like environment variables and with profile-specific timeout/rpm/concurrency settings.
- [x] Expose `GET /agent/profile/list`, `GET /agent/profile/:id`, `POST /agent/run/profile`, and `POST /agent/run/profile/prepare-launch` through `comathd`.
- [x] Add Phase 29 tests for profile validation, unknown-profile rejection, profile-backed AgentRun creation, launch-envelope preparation, audit events, and service route coverage.
- [x] Add `agent_profile_service_api` to service status capabilities.

## Phase 30: Pi Agent Profile Runtime UX

- [x] Add executable Pi runtime tools for `comath.agent.profileList`, `comath.agent.profileGet`, `comath.agent.runForProfile`, and `comath.agent.prepareLaunch`.
- [x] Route all agent profile tools through `comathd`; the Pi extension still does not read or write `.comath/` directly.
- [x] Register `/cm:agent` in the Pi runtime registration with profile list/get, profile-backed AgentRun creation, and launch-envelope preparation subcommands.
- [x] Keep mutating agent tools host-confirmed and strip model-supplied `confirmation_id` from runtime schemas.
- [x] Add local command argument validation so missing project/run/workstream/profile fields fail before prompting for mutation confirmation.
- [x] Add Phase 30 Pi extension tests and wire them into the default `@comath/pi-extension` test chain.

## Phase 31: Lean Trust Profile And Skeleton Audit Hardening

- [x] Add configurable Lean axiom trust profiles for final replay axiom-profile checks.
- [x] Fail closed when `require_print_axioms=true` but the replay output lacks a target-theorem axiom report.
- [x] Preserve ordinary classical and constructive trust-profile distinctions, including configurable `Classical.choice` authorization.
- [x] Add skeleton-aware static cheat scanning so `sorry` can be allowed only in explicitly listed skeleton files, never final proof artifacts by default.
- [x] Add Phase 31 Lean trust-profile tests and wire them into the default `@comath/comathd` test chain.

## Phase 32: Lean Statement Signature Binding

- [x] Add target theorem signature extraction for Lean `#check` output.
- [x] Replace statement-equivalence substring matching with unique target-signature matching.
- [x] Fail closed on missing target theorem signatures, ambiguous repeated target signatures, and mismatched theorem types.
- [x] Preserve statement-drift vetoes while adding more precise `missing_target_check_output`, `ambiguous_target_check_output`, and `statement_signature_mismatch` vetoes.
- [x] Add Phase 32 statement-signature tests and wire them into the default `@comath/comathd` test chain.

## Phase 33: Proof Obligation DAG Planning

- [x] Add native planning-stage proof artifacts for `lemma_dag.json`, `line_map.json`, per-obligation YAML, `Skeleton.lean`, and `skeleton_report.md`.
- [x] Scope Phase 33 proof-planning artifacts under `.comath/campaign/<CAM>/proof/` so independent campaigns do not overwrite one another's audit trail.
- [x] Add DAG validation that rejects duplicate nodes, unknown edge endpoints, unsupported edge relations, and dependency cycles before planning artifacts are written.
- [x] Bind skeleton `sorry` placeholders to all open proof-obligation IDs and record that the skeleton gate has no final proof authority.
- [x] Record proof-planning artifacts in the `planning` stage run before candidate generation.
- [x] Add Phase 33 regression coverage for multi-obligation skeleton/report closure, DAG validation, stage-run artifact paths, and two-campaign artifact isolation.
- [x] Add `proof_obligation_dag_planning` to service status capabilities and smoke requirements.

## Phase 34: Campaign-Scoped Ensemble Artifacts

- [x] Move theorem-family candidate workspaces from legacy `.comath/ensembles/lemma_sprint/<PO>/` paths to `.comath/campaign/<CAM>/ensembles/lemma_sprint/<PO>/`.
- [x] Move `candidates.json` and `decision.json` reads/writes to campaign-scoped ensemble paths.
- [x] Update candidate verification, arbitration, integration, adversarial review, and final replay returns to read the current campaign's ensemble state.
- [x] Add an interleaved supported-campaign regression proving `Nat.add_zero` and `Nat.mul_zero` campaigns do not overwrite or read each other's candidate/decision artifacts.
- [x] Update Phase 18/19/23 assertions and default `@comath/comathd` test chain for campaign-scoped ensemble paths.
- [x] Add `campaign_scoped_ensemble_artifacts` to service status capabilities and smoke requirements.

## Phase 35: Claim-Scoped Final Replay Artifact Paths

- [x] Replace hardcoded `C-0001` final replay stage-run artifact paths with paths generated from the active claim id.
- [x] Add a second-campaign regression proving final replay audit pointers use `C-0002` when the active root claim is `C-0002`.
- [x] Wire Phase 35 into the default `@comath/comathd` test chain.
- [x] Add `claim_scoped_final_replay_artifacts` to service status capabilities and smoke requirements.

## Phase 36: Runner Replay Sandbox And Dependency Provenance

- [x] Add sandbox-policy provenance to compute runner reports and replay manifests.
- [x] Add dependency-lock provenance for runner id/version, script hash, and Python package presence.
- [x] Fail closed when replay integrity sees missing sandbox policy or dependency lock material.
- [x] Wire Phase 36 into the default `@comath/comathd` test chain.
- [x] Add `runner_replay_sandbox_dependency_provenance` to service status capabilities and smoke requirements.

## Phase 37: Registered Lean Statement Alias Equivalence

- [x] Add explicit definitional-alias input for Lean statement-equivalence checks.
- [x] Accept alias-equivalent target theorem signatures only when a registered alias maps the locked formal spec to the actual target signature.
- [x] Preserve fail-closed behavior for missing target output, ambiguous target output, and non-registered mismatches.
- [x] Persist an equivalence witness for accepted registered aliases.
- [x] Wire Phase 37 into the default `@comath/comathd` test chain.
- [x] Add `lean_statement_alias_equivalence` to service status capabilities and smoke requirements.

## Phase 38: Native TriviumDB Target-Platform Evaluation

- [x] Add `evaluateTriviumTargetPlatform()` to run a fixed memory workload through the Trivium adapter and emit `.comath/db/trivium-target-evaluation.json`.
- [x] Add fail-closed native-unavailable reports instead of silently counting fallback memory as target-platform validation.
- [x] Support the actual `triviumdb@0.7.1` Node export shape (`default.TriviumDB`) while preserving stable business IDs behind `StableIdMap`.
- [x] Validate native persistence reopen behavior, search top-hit ratio, upsert latency, and context-pack traversal on the target platform.
- [x] Add `corepack pnpm --filter @comath/comathd eval:trivium` for real native evaluation.
- [x] Wire Phase 38 into the default `@comath/comathd` test chain and smoke status capabilities.

## Phase 39: Project Writer Session Lock

- [x] Add service-owned writer session lock under `.comath/sessions/writer.lock.json`.
- [x] Acquire the initial lock with exclusive create semantics.
- [x] Reject concurrent active writer sessions with `active_writer_session_lock_exists`.
- [x] Require a session token to release the lock.
- [x] Allow stale-lock takeover while preserving the previous session id.
- [x] Fail closed on unreadable or malformed active lock files without overwriting them.
- [x] Wire Phase 39 into the default `@comath/comathd` test chain and smoke status capabilities.

## Phase 40: AgentRun Scheduler Writer Lock Integration

- [x] Require scheduled AgentRun process execution to acquire a project writer session before mutating run state/logs/reports.
- [x] Reject scheduler launch when another active writer session exists without starting the child process or advancing the queued run.
- [x] Release the scheduler writer session after success, failure, timeout, cancellation, or invalid-report handling.
- [x] Record writer-lock blocked/acquired/released audit events.
- [x] Wire Phase 40 into the default `@comath/comathd` test chain and smoke status capabilities.

## Phase 41: Live Agent Adapter Execution

- [x] Add service-owned `executeProfileAgentRun()` that creates a profile-bound AgentRun and launches a real allowlisted adapter process through the scheduler.
- [x] Add `POST /agent/run/profile/execute` for live profile-backed adapter execution.
- [x] Preserve `proof_authority=none`, scheduler non-authoritative report wrapping, writer-lock acquisition, and scoped logs/reports.
- [x] Add Pi `comath.agent.executeProfile` runtime tool and `/cm:agent execute` command path with host confirmation.
- [x] Wire Phase 41 into default `@comath/comathd` and `@comath/pi-extension` test chains and smoke status capabilities.

## Phase 42: AgentRun Observability And Adapter Health

- [x] Add service-owned `readAgentRunLogs()` for capped stdout/stderr/report metadata readback from AgentRun scheduler paths.
- [x] Add `GET /agent/run/:id/logs` with audit events and no proof-authority semantics.
- [x] Add bounded `probeAgentAdapterHealth()` with `shell:false`, absolute program validation, minimal environment, `COMATH_PROOF_AUTHORITY=none`, and audit events.
- [x] Add `POST /agent/adapter/health` for host-confirmed adapter health probes.
- [x] Add Pi `comath.agent.logs` and `comath.agent.health` tools plus `/cm:agent logs` and `/cm:agent health` command paths.
- [x] Wire Phase 42 into default `@comath/comathd` and `@comath/pi-extension` test chains and smoke status capabilities.

## Phase 43: Agent Adapter Package Registry

- [x] Add service-owned `codex-cli` adapter package metadata with bundled launcher script, `rpm=4`, supported profiles, and `proof_authority=none`.
- [x] Add `listAgentAdapterPackages()`, `buildAgentAdapterPackageLaunch()`, and `executeAgentAdapterPackage()` for packaged launcher lifecycle.
- [x] Add `GET /agent/adapter/package/list`, `POST /agent/adapter/package/prepare-launch`, and `POST /agent/adapter/package/execute` routes.
- [x] Add Pi `comath.agent.adapterPackageList`, `comath.agent.prepareAdapterPackage`, and `comath.agent.executeAdapterPackage` tools plus `/cm:agent packages`, `/cm:agent prepare-package`, and `/cm:agent execute-package` command paths.
- [x] Copy bundled adapter launcher assets into `dist` during `@comath/comathd` build.
- [x] Wire Phase 43 into default `@comath/comathd` and `@comath/pi-extension` test chains and smoke status capabilities.

## Phase 44: Codex CLI External Adapter Invocation

- [x] Add fail-closed external backend support for the service-owned `codex-cli` package behind `COMATH_CODEX_CLI_PROGRAM` and optional fixed JSON prefix args.
- [x] Keep external adapter invocation behind the bundled launcher, `shell:false`, AgentRun-scoped cwd, bounded stdout/stderr wrapping, `rpm=4`, and `COMATH_PROOF_AUTHORITY=none`.
- [x] Wrap external Codex-compatible CLI output as untrusted AgentRun report material without claim promotion, GraphPatch authority, or proof authority.
- [x] Add Pi `backend` selection for packaged adapter prepare/execute tools and `/cm:agent prepare-package|execute-package --backend external`, without exposing arbitrary external program paths to Pi/model input.
- [x] Wire Phase 44 into default `@comath/comathd` and `@comath/pi-extension` test chains and smoke status capabilities.

## Phase 45: Pi/comathd Install-Session E2E

- [x] Add a root-level install-session e2e that starts a real local `comathd` HTTP server and imports the built Pi extension through its package manifest entrypoint.
- [x] Register the extension into a fake Pi host, then exercise a live Pi session through `createComathClient({ baseUrl })` instead of mocked client calls.
- [x] Verify host-confirmed mutating Pi tools/commands across campaign start, campaign tick, agent package listing, and packaged adapter launch preparation.
- [x] Verify read-only command paths, resources discovery, service status capabilities, project status, `rpm=4`, `comathd_only` trusted-state boundary, and non-authoritative packaged adapter envelope visibility.
- [x] Wire Phase 45 into the root `corepack pnpm test` chain.

## Phase 46: Cursor-Based AgentRun Log Stream

- [x] Add service-owned `streamAgentRunLogs()` with stdout/stderr byte cursors, bounded chunks, next cursors, terminal completion flag, and `proof_authority=none`.
- [x] Add `GET /agent/run/:id/log-stream` for cursor-based incremental log reads with audit events and path/realpath confinement inherited from AgentRun observability.
- [x] Add Pi `comath.agent.streamLogs` tool and `/cm:agent stream` command for read-only operator polling without host mutation confirmation.
- [x] Wire Phase 46 into default `@comath/comathd` and `@comath/pi-extension` test chains and smoke status capabilities.

## Phase 47: SSE-Style AgentRun Log Subscription Snapshot

- [x] Add service-owned `formatAgentRunLogSseSnapshot()` over cursor-based log chunks with `text/event-stream`, `retry`, event id, JSON data payload, audit events, and `proof_authority=none`.
- [x] Add `GET /agent/run/:id/log-subscription` for SSE-compatible read-only log subscription snapshots with bounded cursors and project-confined log paths.
- [x] Add Pi `comath.agent.subscribeLogs`, `createComathClient().getText()`, and `/cm:agent subscribe-logs` for read-only operator subscription surfaces without host mutation confirmation.
- [x] Wire Phase 47 into default `@comath/comathd` and `@comath/pi-extension` test chains and smoke status capabilities.

## Phase 48: AgentRun Operator Panel Read Model

- [x] Add service-owned `readAgentRunOperatorPanel()` that aggregates AgentRun status, cursor log chunks, SSE subscription metadata, read-only endpoints, action availability, and `proof_authority=none`.
- [x] Add `GET /agent/run/:id/operator-panel` with audit event `agent_run.operator_panel_read` and a fail-closed `cancel.enabled=false` marker unless a real active scheduler registry can prove cancellability.
- [x] Add Pi `comath.agent.operatorPanel` and `/cm:agent panel` as read-only operator panel surfaces without host mutation confirmation or direct `.comath/` access.
- [x] Wire Phase 48 into default `@comath/comathd` and `@comath/pi-extension` test chains and smoke status capabilities.

## Phase 49: Scheduler-Backed AgentRun Operator Cancellation

- [x] Add an in-process active scheduler registry so operator controls can prove cancellability only for currently managed AgentRuns.
- [x] Add service-owned `cancelAgentRunFromOperator()` and `POST /agent/run/:id/cancel` with audit event `agent_run.operator_cancel_requested` and `proof_authority=none`.
- [x] Upgrade operator panels so `cancel.enabled=true` only when the active scheduler registry can cancel the run, and false for terminal or non-registry runs.
- [x] Add Pi `comath.agent.cancelRun` and `/cm:agent cancel` as host-confirmed mutating surfaces without direct `.comath/` access.
- [x] Wire Phase 49 into default `@comath/comathd` and `@comath/pi-extension` test chains and smoke status capabilities.

## Phase 50: Bounded Multi-Event AgentRun Log Session

- [x] Add service-owned `formatAgentRunLogSseSession()` that emits multiple `agent_run.log_chunk` SSE frames from cursor-bounded stdout/stderr reads.
- [x] Add `GET /agent/run/:id/log-session` with `max_events` bounding, completion/no-progress termination, audit event `agent_run.logs_sse_session`, and `proof_authority=none`.
- [x] Add Pi `comath.agent.logSession` and `/cm:agent log-session` as read-only operator log-session surfaces without host mutation confirmation or direct `.comath/` access.
- [x] Wire Phase 50 into default `@comath/comathd` and `@comath/pi-extension` test chains and smoke status capabilities.

## Phase 51: Service-Configured Codex API Backend Contract

- [x] Add `codex-api` backend selection for the service-owned `codex-cli` adapter package without exposing API keys, base URLs, or executable paths to Pi/model input.
- [x] Add service-owned Responses-compatible Codex API backend execution with injectable HTTP client tests, `COMATH_CODEX_API_KEY` service configuration, fail-closed missing-key behavior, and `proof_authority=none` report wrapping.
- [x] Keep prepare-launch payloads secret-free by exposing only `COMATH_CODEX_API_KEY_REF`, configured flags, model metadata, and backend enum.
- [x] Add Pi `/cm:agent prepare-package|execute-package --backend codex-api` and tool schema coverage without any API-key or base-URL fields.
- [x] Wire Phase 51 into default `@comath/comathd` and `@comath/pi-extension` test chains and smoke status capabilities.

## Phase 52: Codex API Retry And Rate-Limit Telemetry

- [x] Add bounded retry handling for retryable Codex API backend statuses (`429`, `5xx`) with capped `Retry-After` support and configurable `COMATH_CODEX_API_MAX_ATTEMPTS`.
- [x] Record attempts, status sequence, rate-limit detection, and final status in AgentRun reports and audit events without leaking service API keys.
- [x] Fail closed after exhausted attempts with non-authoritative AgentRun failure state, stderr diagnostics, and `agent_adapter.codex_api_failed` audit events.
- [x] Wire Phase 52 into the default `@comath/comathd` test chain and smoke status capabilities.

## Phase 53: Installed Codex CLI Validation

- [x] Add service-owned installed Codex CLI validation for the `codex-cli` adapter package using `COMATH_CODEX_CLI_PROGRAM` and optional service prefix args only.
- [x] Run bounded `--version` and `--health --profile <profile>` probes with `COMATH_PROOF_AUTHORITY=none`, fail-closed missing configuration, and no Pi/model-supplied executable paths.
- [x] Add `/agent/adapter/package/validate-installed-cli` plus audit event `agent_adapter.installed_codex_cli_validated` without exposing configured executable paths.
- [x] Wire Phase 53 into the default `@comath/comathd` test chain and smoke status capabilities.

## Phase 54: Lean Declaration Parser Signature Fallback

- [x] Add a conservative Lean theorem/lemma declaration parser for target statement signatures when `#check` output is missing.
- [x] Support namespace-qualified theorem binding, multi-line binder/type headers, and report `signature_source: lean_declaration_parser` in statement-equivalence reports.
- [x] Fail closed on ambiguous declarations and comment-only substring matches.
- [x] Wire Phase 54 into the default `@comath/comathd` test chain and smoke status capabilities.

## Phase 55: Runner Cross-Machine Replay Environment Gate

- [x] Add a replay-integrity gate that compares recorded replay-run Node/platform/arch metadata with the current runner environment before re-execution.
- [x] Fail closed with `runner_reexecution_environment_mismatch` and no runner launch when snapshot replay metadata is valid but environment identity has drifted.
- [x] Add `phase55-runner-cross-machine-replay.test.mjs` and wire Phase 55 into the default `@comath/comathd` test chain.
- [x] Add `runner_cross_machine_replay_environment_gate` to smoke status capabilities and acceptance documentation.

## Phase 56: Registered Lean Logical-Equivalence Witnesses

- [x] Add `allowed_registered_logical_equivalences` to statement-equivalence checks for explicitly registered target signatures.
- [x] Require exact formal-spec/target-signature binding, `lean_kernel_checked_equivalence`, witness artifact id, valid SHA-256 witness hash, and non-empty lemma names before accepting `logically_equivalent_with_registered_lemmas`.
- [x] Fail closed when witness hashes, lemma names, or target signatures are missing or mismatched.
- [x] Add `phase56-lean-registered-logical-equivalence.test.mjs` and wire Phase 56 into the default `@comath/comathd` test chain and smoke status capabilities.

## Phase 57: Lean Theorem Template Instantiation

Goal 3 note: this phase is retained as historical fixture evidence only. Template recognition cannot be treated as production theorem recognition or proof support under the no-reinvent doctrine.

- [x] Add a third service-owned Nat identity theorem-family template, `nat_zero_add`, for the locked statement `0 + n = n`.
- [x] Classify user goals for `0 + n = n`, lock normalized problem/Lean target metadata, and generate exact candidates using `Nat.zero_add`.
- [x] Run the instantiated template through full campaign candidate generation, final clean Lean replay, statement equivalence, dependency closure, axiom profile, and claim promotion gate.
- [x] Add `phase57-ga-theorem-template-instantiation.test.mjs` and wire Phase 57 into the default `@comath/comathd` test chain and smoke status capabilities.

## Phase 58: MathProve Final-Audit External Runner

- [x] Add `runMathProveFinalAuditExternal()` as a service-owned external MathProve final-audit evidence runner.
- [x] Invoke the sibling `<MathProve-Skill>/scripts/final_audit.py` through a fixed argv template, controlled workspace, bounded timeout, and `shell:false`.
- [x] Generate CoMath-owned final-audit steps and solution paths, hash the steps, solution, replay input, script, stdout, stderr, and parsed result, and scrub host paths from archived reports.
- [x] Preserve MathProve as non-authoritative evidence: a passed final audit still returns `gate_result=failed`, carries `mathprove_final_audit_not_formal_authority`, and cannot promote `formally_checked` without CoMath proof-kernel replay evidence.
- [x] Add `phase58-mathprove-final-audit-runner.test.mjs` and wire Phase 58 into the default `@comath/comathd` test chain and smoke status capabilities.

## Phase 60: v3 Campaign Pause/Tick Contract

- [x] Add a v3 campaign pause/resume regression proving a paused `ResearchCampaign` rejects `/campaign/:id/tick` with `CAMPAIGN_PAUSED`.
- [x] Ensure rejected paused ticks do not advance `current_stage`, append `stage_runs`, or write the next stage artifact before resume.
- [x] Preserve resumability by allowing `/campaign/:id/resume` to restore `running` and continue the bounded tick sequence.
- [x] Wire `phase60-v3-campaign-pause-resume.test.mjs` into the default `@comath/comathd` test chain and expose `campaign_pause_tick_guard` in service status.

## Phase 61: v3 Candidate Manifest And Failure Aggregate Contract

- [x] Extend `candidate_manifest.json` with campaign id, workspace path, candidate state, dependencies, assumptions, artifact descriptors, replay command, and maintainability notes so each candidate can stand as a campaign-scoped audit object.
- [x] Require `decideCandidate()` to read and validate each candidate manifest before arbitration, failing closed on missing or mismatched manifest metadata.
- [x] Persist and return a campaign-scoped `FailureRouteAggregate` with failed candidate ids, clusters, hard vetoes, proof authority `none`, and repair/refutation recommendations while preserving existing JSONL failure-route memory.
- [x] Add `phase61-v3-candidate-contract.test.mjs`, update the Phase 18 hand-built candidate fixture to satisfy the v3 manifest contract, wire Phase 61 into the default `@comath/comathd` test chain, and expose `candidate_manifest_v3_contract` / `failure_route_aggregate_memory`.

## Phase 62: v3 Evidence-Weighted Decision Forest

- [x] Replace score-only candidate ordering with evidence-layered arbitration that only selects manifest-valid, hard-veto-free `candidate_kernel_checked` candidates for proof integration.
- [x] Weight kernel check, statement-equivalence claim, dependency/replay evidence, maintainability, lemma/dependency reuse, and only a capped low-weight candidate score/agreement signal.
- [x] Require bound candidate statement hashes, proof-grade `exact`/`equivalent` statement-equivalence claims, no manifest hard vetoes, and no unapproved introduced assumptions before any kernel candidate can be selected.
- [x] Route verified `candidate_refutes_step` candidates to `repair_required` theorem repair/counterexample protocol when no kernel-checked proof candidate exists.
- [x] Block skeleton/plausible/failed-only batches with an explicit recovery plan instead of selecting the highest-scored non-proof candidate.
- [x] Add `phase62-v3-decision-forest.test.mjs`, wire Phase 62 into the default `@comath/comathd` test chain, and expose `evidence_weighted_decision_forest`.

## Phase 63: v3 Native Stage-Gate Artifact Coverage

- [x] Expand the native campaign tick path from the older `context_built/planning/integration/adversarial_review` sequence into v3 stage-gate runs for `knowledge_pack`, `notation_gate`, `skeleton_gate`, `line_map_gate`, `refutation_red_team`, `integration_refactor`, `final_static_audit`, `final_global_replay`, and `memory_update`.
- [x] Persist required v3 artifacts for knowledge pack, notation, skeleton, line map, mandatory red-team, integration/refactor, final audit/replay, and final memory handoff.
- [x] Add a service-owned required-artifact guard so later stages cannot advance when a required native artifact is missing; missing artifacts now record `stage_gate_blocker.json`, set campaign `status: "blocked"`, and rewind `current_stage` to the producing gate.
- [x] Extend final replay stage-run evidence to include final replay log, static audit, axiom profile, dependency closure, statement equivalence, and replay manifest paths, then append a memory update stage-run with proof-memory, handoff, and replay snapshot artifacts.
- [x] Add `phase63-v3-stage-gate-artifact-coverage.test.mjs`, wire Phase 63 into the default `@comath/comathd` test chain, and expose `native_stage_gate_artifact_guard`.

## Phase 64: Lean Authority v2 Final Gate Hash Binding

- [x] Extend `final_replay_manifest.json` with content hashes and sizes for final replay stdout/stderr, static audit, axiom profile, dependency closure, and statement-equivalence reports.
- [x] Require `formally_checked` promotion to re-read those final replay artifact paths and reject stale, old-format, missing, or tampered replay evidence before promotion.
- [x] Add `phase64-lean-authority-v2-final-gate.test.mjs` covering old-format stale manifests and hash-bound manifests whose live replay log drifts after import.
- [x] Wire Phase 64 into the default `@comath/comathd` test chain and expose `lean_authority_v2_final_gate_hash_binding`.

## Phase 65: Failed-Route Proof Memory Retrieval

- [x] Promote failed candidate routes into typed proof-memory events with locked statement hash, route keys, artifact paths, blockers, repair hints, supersession metadata, and `proof_authority: "none"`.
- [x] Add `readProofMemoryEvents()` and `retrieveSimilarFailedRoutes()` so later obligations can retrieve prior failed routes by exact statement hash or similar theorem/proposition keys.
- [x] Emit `.comath/proof_memory/stale_or_superseded_warnings.jsonl` with `stale_fact`, `superseded_fact`, and unresolved-blocker warnings instead of silently treating prior failures as current facts.
- [x] Inject failed-route retrieval summaries and warning metadata into the service-owned `knowledge_pack` stage artifact and knowledge shard.
- [x] Add `phase65-proof-memory-retrieval.test.mjs`, wire Phase 65 into the default `@comath/comathd` test chain, and expose `proof_memory_failed_route_retrieval`.

## Phase 66: Pi Goal-Compatible Campaign UX

- [x] Fix `/cm:research --goal "<target>" --strict` parsing so Pi submits the mathematical target to `comathd` instead of treating `--goal` itself as the target.
- [x] Route `/cm:campaign final-audit <campaign>` and `/cm:campaign replay <campaign>` through the service-owned `comath.campaign.finalAudit` and `comath.campaign.replay` tools.
- [x] Preserve Pi as a thin client: host confirmation is still injected by Pi runtime for mutating campaign commands, and trusted campaign state continues to mutate only through `comathd`.
- [x] Add `phase66-goal-compatible-campaign-ux.test.mjs`, wire Phase 66 into the default `@comath/pi-extension` test chain, and verify the installed Pi/comathd session e2e still passes.

## Phase 67: v3 End-To-End Formal Campaign Slice

- [x] Add an automated service-owned formal campaign slice for `Prove in Lean that n + 0 = n for natural numbers.` from `/campaign/start` through bounded ticks to terminal `completed_formal_proof`.
- [x] Persist `.comath/campaign/<CAM>/v3_formal_campaign_slice.json` summarizing user goal intake, locked statement hash, v3 stage sequence, 8-candidate evidence-weighted arbitration, final static audit, clean replay, claim promotion, and replayable artifact bundle paths.
- [x] Bind the slice summary to the actual final replay manifest, static audit, stdout/stderr, axiom profile, dependency closure, statement-equivalence report, proof-memory events, replay snapshot, and final handoff artifacts.
- [x] Update final replay memory-stage evidence so the v3 formal campaign slice artifact is part of terminal campaign memory artifacts without removing the existing proof-memory, final-handoff, or replay-snapshot artifacts.
- [x] Add `phase67-v3-formal-campaign-slice.test.mjs`, wire Phase 67 into the default `@comath/comathd` test chain, and keep Phase 35 final replay artifact-path coverage aligned with the new v3 summary artifact.

## Phase 68: v3 Negative GA Slice Runner

- [x] Add service-owned `runV3NegativeGaSlices()` plus `POST /release/v3-negative-ga-slices` so release negative evidence is generated by `comathd`, not by a review-only checklist.
- [x] Persist `.comath/release/v3_negative_ga_slices.json` with `proof_authority: "none"`, per-slice evidence paths, claim status, gate vetoes, and `all_required_slices_passed`.
- [x] Cover the five required negative GA slices: statement drift rejection, cheating Lean artifact rejection, false-theorem refutation, all-candidate failure recovery, and snapshot replay requiring fresh hash-bound final replay before promotion.
- [x] Ensure negative promotion attempts use the normal promotion gate path so failed gates and audit records are preserved instead of relying on in-memory checks.
- [x] Add `phase68-v3-negative-ga-slices.test.mjs`, wire Phase 68 into the default `@comath/comathd` test chain, and expose `v3_negative_ga_slice_runner` in service status.

## Phase 69: v3 Terminal Vocabulary Compatibility

- [x] Add a service-owned external terminal vocabulary projection that maps trusted internal states to `formal_proof_verified`, `verified_counterexample`, `user_visible_theorem_repair_required`, `replayable_environment_blocker`, and `user_cancelled`.
- [x] Expose `campaign.external_v3_terminal_state` from campaign start/status/tick/replay/final-audit/pause/resume responses without writing the projection into persisted campaign state.
- [x] Keep internal canonical campaign states and proof gates unchanged; the compatibility field is read-only API vocabulary, not a trusted mutation path.
- [x] Teach the Pi research loop to preserve `external_v3_terminal_state` and treat projected external v3 terminal states as terminal loop outcomes.
- [x] Add `phase69-v3-terminal-vocabulary.test.mjs`, wire Phase 69 into the default `@comath/comathd` test chain, and extend Phase 22 Pi loop coverage for projection consumption.

## Phase 70: Broad Theorem Planning Slice

- [x] Replace the unsupported-goal one-line blocker at candidate generation with a service-owned fail-closed broad theorem planning/synthesis evidence package.
- [x] Persist `.comath/campaign/<CAM>/broad_synthesis_plan.json`, `broad_replay_target.json`, and `broad_synthesis_failure.json` for non-template theorem targets, bound to the existing problem lock, obligation DAG, line map, and locked statement hash.
- [x] Keep `proof_authority: "none"` and `can_promote_claim: false` on broad-planning artifacts, and leave the root claim `conjectural` until a theorem-specific Lean declaration, candidate manifest, statement-equivalence, dependency-closure, axiom-profile, and final clean replay exist.
- [x] Add `phase70-broad-theorem-planning-slice.test.mjs` and wire Phase 70 into the default `@comath/comathd` test chain.

## Phase 71: Stage-Gate Repair/Resume

- [x] Add service-owned `repairStageGateAndResume()` plus `POST /campaign/:id/repair-resume` for campaigns blocked by `MISSING_REQUIRED_STAGE_ARTIFACT`.
- [x] Require repair requests to cite the persisted `stage_gate_blocker.json` and the exact missing artifact set before a blocked campaign can return to `running`.
- [x] Keep ordinary `/campaign/:id/resume` scoped to paused campaigns; blocked campaigns now return `CAMPAIGN_REPAIR_REQUIRED` instead of bypassing stage-gate evidence.
- [x] Persist `stage_gate_repair.json` with `proof_authority: "none"` / `can_promote_claim: false`, preserve historical blockers/stage runs, and resume only to the recorded rewind target.
- [x] Add `phase71-stage-gate-repair-resume.test.mjs` and wire Phase 71 into the default `@comath/comathd` test chain.

## Phase 72: Theorem-Specific Lean Target Package

Goal 3 note: Phases 72-76 are historical bounded Nat-linear fixture material. They must not be used as current production Nat synthesis, theorem recognition, or proof promotion paths unless regenerated through Goal 3 lock/ledger/diff gates and Lean Authority v3.

- [x] Add a bounded theorem-specific Lean target package for the non-template broad-planning goal `Prove in Lean that n + n = 2 * n for natural numbers.`
- [x] Persist `.comath/campaign/<CAM>/theorem_specific_lean_project.json`, `.comath/lean/broad/<CAM>/MathResearch/Target.lean`, `FormalSpec/target.json`, `lakefile.lean`, and `lean-toolchain`.
- [x] Bind the target package to the existing problem lock, obligation DAG, line map, locked statement hash, formal spec, and replay command while keeping `proof_authority: "none"`, `can_run_clean_replay: false`, and `can_promote_claim: false`.
- [x] Keep the campaign fail-closed as `blocked_with_replayable_reason` and the root claim `conjectural` until a proof body plus Lean Authority v2 reports and final clean replay evidence exist.
- [x] Add negative statement-binding coverage so formula-containing negation/refutation/non-proof prompts cannot receive a positive `n + n = 2 * n` theorem target package.
- [x] Add `phase72-theorem-specific-lean-generation.test.mjs`, wire Phase 72 into the default `@comath/comathd` test chain, and expose `theorem_specific_lean_target_package`.

## Phase 73: Bounded Theorem-Specific Proof-Body Synthesis

- [x] Add bounded proof-body synthesis for the Phase 72 non-template target `Prove in Lean that n + n = 2 * n for natural numbers.`
- [x] Persist `.comath/campaign/<CAM>/bounded_proof_body_synthesis.json` and `bounded_proof_body_static_audit.json`, bound to the theorem-specific target package, problem lock, obligation DAG, line map, target Lean file, and locked statement hash.
- [x] Write the bounded target Lean file with `theorem C0001 (n : Nat) : n + n = 2 * n := by omega`, `#check C0001`, and `#print axioms C0001`, while keeping `proof_authority: "none"`, `can_run_clean_replay: false`, and `can_promote_claim: false`.
- [x] Keep the campaign fail-closed as `blocked_with_replayable_reason` and the root claim `conjectural`; no final replay manifest or promotion gate is produced by proof-body synthesis alone.
- [x] Keep negative/non-proof prompts from receiving the positive proof-body synthesis package.
- [x] Add `phase73-bounded-lean-proof-body-synthesis.test.mjs`, wire Phase 73 into the default `@comath/comathd` test chain, and expose `bounded_theorem_specific_proof_body_synthesis`.

## Phase 74: Bounded Lean Authority Report Preparation

- [x] Add bounded non-promotional authority-report preparation for the Phase 73 `n + n = 2 * n` proof-body candidate.
- [x] Persist `.comath/campaign/<CAM>/bounded_authority_report_preparation.json`, `bounded_authority_static_audit_preview.json`, `bounded_authority_statement_equivalence_preview.json`, `bounded_authority_dependency_closure_preview.json`, and `bounded_authority_axiom_profile_preview.json`.
- [x] Bind the preview reports to the theorem-specific target package, proof-body synthesis artifact, target Lean file, problem lock, obligation DAG, line map, formal spec, and locked statement hash.
- [x] Keep the preview reports campaign-scoped and non-authoritative with `proof_authority: "none"`, `can_run_clean_replay: false`, `can_promote_claim: false`, and `final_replay_manifest_path: null`.
- [x] Keep the campaign fail-closed as `blocked_with_replayable_reason` and the root claim `conjectural`; no `.comath/evidence/<CLAIM>/lean/final_replay_manifest.json` or promotion gate is produced by report preparation alone.
- [x] Add `phase74-bounded-authority-report-preparation.test.mjs`, wire Phase 74 into the default `@comath/comathd` test chain, and expose `bounded_lean_authority_report_preparation`.

## Phase 75: Bounded Final Clean Replay Promotion

- [x] Add a strictly gated final clean replay path for the bounded Phase 72-74 target `Prove in Lean that n + n = 2 * n for natural numbers.`
- [x] Write claim-scoped final static-audit, statement-equivalence, dependency-closure, axiom-profile, stdout/stderr, and `final_replay_manifest.json` artifacts under `.comath/evidence/<CLAIM>/lean/`.
- [x] Bind the final replay manifest to artifact hashes and the generated theorem-specific Lean package, not to campaign-scoped preview reports alone.
- [x] Promote the bounded claim to `formally_checked` only through the existing Lean Authority v2 promotion gate after clean replay and all final reports pass.
- [x] Keep negative/non-proof prompts from receiving final clean replay authority.
- [x] Add `phase75-bounded-final-clean-replay.test.mjs`, wire Phase 75 into the default `@comath/comathd` test chain, and expose `bounded_final_clean_replay_promotion`.

## Phase 76: Registered Nat Linear Identity Targets

- [x] Record the historical replacement of the single hardcoded bounded non-template target path with a service-owned registered Nat linear identity target table.
- [x] Retain `n + 0 + n = 2 * n` as a historical bounded non-template fixture that passed theorem-specific target generation, proof-body synthesis, authority-report preparation, final clean replay, and the old promotion gate.
- [x] Bind target family id and canonical proposition through formal spec, target package, proof-body artifact, authority-preparation artifact, replay manifest, and proof-route metadata.
- [x] Keep unregistered broad goals fail-closed without theorem-specific target packages or final replay authority.
- [x] Add `phase76-registered-nat-linear-targets.test.mjs`, wire Phase 76 into the default `@comath/comathd` test chain, and expose `registered_nat_linear_identity_targets`.

## Phase 77: Runner Network Sandbox Policy

- [x] Add a service-owned runner network-denial policy contract to compute-runner metadata.
- [x] Bind `COMATH_RUNNER_NETWORK=disabled` into runner reports and replay manifests.
- [x] Fail closed during replay integrity and re-execution preflight when the network-denial contract or runner environment marker is missing.
- [x] Start Python runner execution and re-execution with the same network-denial environment marker.
- [x] Add `phase77-runner-network-sandbox-policy.test.mjs`, wire Phase 77 into the default `@comath/comathd` test chain, and expose `runner_network_denial_process_env_policy`.

## Phase 78: Registered Transitive Statement-Equivalence Witnesses

- [x] Add `allowed_registered_transitive_logical_equivalences` for service-owned transitive witness chains.
- [x] Require exact chain endpoints from locked formal spec to extracted target signature.
- [x] Require every chain link to carry `lean_kernel_checked_equivalence`, witness artifact id, SHA-256 witness artifact hash, and non-empty lemma names.
- [x] Fail closed on broken endpoints, missing links, non-kernel witness kinds, missing artifact hashes, and missing lemma names.
- [x] Add `phase78-lean-transitive-equivalence.test.mjs`, wire Phase 78 into the default `@comath/comathd` test chain, and expose `lean_registered_transitive_logical_equivalence_witnesses`.

## Phase 79: Statement-Equivalence Proof-Search Plan Artifacts

- [x] Add optional `equivalence_search_plan_path` and `equivalence_search_hints` inputs to the Lean statement-equivalence gate.
- [x] Write `.comath/evidence/<CLAIM>/lean/equivalence_search_plan.json` only for unique mismatched target signatures when no exact, alias, direct registered, or transitive registered witness accepts the target.
- [x] Keep the plan artifact non-authoritative with `result: "blocked_unproved"`, `proof_authority: "none"`, `can_promote_claim: false`, exact source/target binding, safe candidate lemma names, and required next witness artifacts.
- [x] Fail closed without plan-authority emission for exact matches, accepted registered witnesses, missing/ambiguous target signatures, empty hints, and unsafe hint strings.
- [x] Add `phase79-lean-equivalence-search-plan.test.mjs`, wire Phase 79 into the default `@comath/comathd` test chain, and expose `lean_equivalence_search_plan_artifacts`.

## Phase 80: Bounded Equivalence-Search Witness Materialization

- [x] Add `materializeStatementEquivalenceSearchPlan()` for bounded materialization of a Phase 79 blocked plan into registered logical-equivalence witness metadata.
- [x] Require non-authoritative blocked plans, exact formal-spec/target binding, safe registered lemma hints, a non-empty witness artifact id, and an allowlisted bounded materialization before writing witness material.
- [x] Write `.comath/evidence/<CLAIM>/lean/equivalence_witness_materialized.json` with `proof_authority: "none"`, `can_promote_claim: false`, SHA-256 artifact binding, lemma names, justification, and required final Lean Authority v2 gates.
- [x] Fail closed for unregistered hints, tampered promotional plans, wrong targets, malformed witness metadata, and missing witness artifact ids without claim promotion.
- [x] Add `phase80-bounded-equivalence-witness-materialization.test.mjs`, wire Phase 80 into the default `@comath/comathd` test chain, and expose `lean_equivalence_witness_materialization`.

## Phase 81: Controlled Nat Linear Identity Synthesis

Goal 3 note: this phase is historical fixture evidence. Controlled Nat-linear synthesis is not a current production proof path under Goal 3 quarantine.

- [x] Record the historical service-owned controlled one-variable Nat linear identity synthesizer for safe `n`, natural-number constants, `+`, and constant-`*`-`n` terms.
- [x] Retain historical normalization of both sides to coefficient/constant form and theorem-specific Lean package generation only when the two normal forms match exactly.
- [x] Retain the historical theorem-specific Lean package, `by omega` proof-body, Lean Authority v2 report-preparation, final clean replay, and promotion gate path as fixture evidence only.
- [x] Record `synthesis_scope: "controlled_nat_linear_identity_synthesis"` and `linear_normal_form` in target/proof-body artifacts without claiming arbitrary theorem proving.
- [x] Fail closed for false identities, unsafe syntax, negative/refutation prompts, unsupported multi-variable expressions, and nonlinear expressions such as `n * n`.
- [x] Add `phase81-controlled-nat-linear-synthesis.test.mjs`, wire Phase 81 into the default `@comath/comathd` test chain, and expose `controlled_nat_linear_identity_synthesis`.

## Known Deferred Items

These items block global GA readiness until each one is implemented and validated with executable evidence.

Goal 3 Task219+ product-closure routing note: deferred items below must be interpreted against the current source, not as permission to build replacement systems or broad math-test campaigns. Before the final release-candidate audit, do not schedule broad matrix-style proof runs; use only small theorem-specific Lean/mathlib smoke checks when they directly validate product behavior. Current priority is the GA workbench loop: Pi goal intake, workspace creation, retrieval/ingestion adapters, agent workflow, Lean/Lake/mathlib replay plumbing, evidence gates, release packaging, durable operator/service transport, real-Pi UX, and OS-isolation integration. Sandbox, provider, literature, theorem-search, CAS/SMT/SAT, external Lean repo, and Pi/operator blockers require maintained external tools, thin adapters, fixed invocation, provenance binding, fail-closed gates, or replayable blockers. Do not implement CoMath-owned substitutes for Lean/Lake/mathlib, Loogle/LeanSearch/Moogle/LeanDojo, arXiv/Semantic Scholar/OpenAlex/Crossref/Unpaywall/Jina/AnySearch, SymPy/Sage/Z3/cvc5, Docker/Podman/OCI/Nix/Firejail/AppContainer, or durable transport infrastructure.

macOS is outside the current GA environment adaptation scope.

- [ ] Broad proof planning and theorem synthesis beyond the Phase 70 fail-closed planning slice, the historical Phase 72-76 registered Nat linear identity fixtures (`n + n = 2 * n`, `n + 0 + n = 2 * n`), the historical Phase 81 controlled one-variable Nat linear identity fixture, registered theorem-family fixtures (`Nat.add_zero`, `Nat.mul_zero`, `Nat.zero_add`), and exact `n + 1 = n` refutation. Phase 81 historically demonstrated a safe grammar slice such as `2 * n + 3 = n + n + 3`; it is not current production theorem proving or proof authority. Task 93 also removed the remaining `notation_gate` Nat-specific wording and records notation provenance from FormalSpecLock/problem-lock artifacts, but this is not theorem synthesis.
- [ ] Final-release-candidate Lean/mathlib breadth audit beyond the Task 86 environment-gated PM-084 real replay slice, Task 88 non-authoritative replay-attempt archive, Task 89 non-authoritative environment diagnostic archive, Task 90 final-authority provenance gate, Task 91 final replay artifact-kind/audit-provenance gate, Task 92 Pi dashboard audit-evidence semantics fix, Task 93 notation-gate formal-spec provenance cleanup, Task 94 final-authority FormalSpecLock/AssumptionLedger binding gate plus positive-matrix consumer-semantics hardening, Task 95 real replay toolchain mismatch blocker contract, Task 96 batch consumer semantics hardening, Task 97 legacy final replay promotion-gate hardening, Task 98 legacy PM-002 v1 packaging promotion-gate hardening, Task 99 Lean/Lake binary provenance gate hardening, Task100 terminal proof read-model authority-evidence gate hardening, Task110 line-map-owned native generation request plus candidate manifest binding hardening, Task111 artifact-backed live adapter Lean evidence hardening, Task112 artifact-backed statement-equivalence replay hardening, Task213 campaign-native live Mathlib replay breadth gating, Task214 campaign-native Mathlib dependency-material gating, Task215 final replay DependencyClosureV2 binding, Task216 campaign-native Mathlib provisioning diagnostics, Task217 FinalReplayManifest dependency-lock consistency hardening, Task218 campaign-native Mathlib host replay diagnostics, and Task219 campaign-native Mathlib import-graph diagnostics. Task219 source-code audit classifies this as real execution/evidence work over existing replay executor and campaign-native replay code, not as a request to build a new proof benchmark engine, theorem generator, theorem library, Lean parser, Lake import resolver, or proof-search system. Default tests must continue to fail closed without claiming Lean authority when the real Lean toolchain is not explicitly enabled, Task 87 hard-blocks injected replay callbacks from producing final Lean Authority evidence, Task 88 archives replay blockers/pass observations only as non-promotional audit evidence, Task 89 records Lean/Lake version-probe blockers without letting injected probe metadata produce final authority, Task 90 requires append-only final replay registry provenance before helper-created authority-shaped artifacts can satisfy promotion-grade Lean evidence, Task 91 requires that registry provenance be audit-bound and that submitted FinalReplayManifest v3 artifacts be `runner_output`, Task 92 ensures Pi dashboard consumers render archive/audit evidence as `audit` rather than generic `runner` evidence, Task 93 ensures notation-gate artifacts cannot imply default Nat notation or proof authority, Task 94 ensures final-authority bindings require explicit claim/task/statement-bound FormalSpecLock and AssumptionLedger material while positive-matrix representative seeds remain replayable blockers, Task 95 ensures declared `lean-toolchain` / probed Lean version mismatches become non-authoritative replayable blockers instead of thrown errors or authority-shaped replay evidence, Task 96 ensures batch positive-matrix consumers cannot surface PM-001 representative fixture or aggregate harness evidence as per-task `lean_kernel_clean_replay`, Task 97 ensures legacy `finalLeanReplaySchema` / old proof-kernel replay artifacts cannot bypass Lean Authority v3 provenance, derived binding, registry, and replay-pack requirements, Task 98 ensures legacy `comath.goal3_pm002_final_authority_packaging.v1` reports cannot satisfy `formally_checked`, Task 99 ensures promotion-grade FinalReplayManifest v3 evidence binds Lean/Lake executable binary hashes to a passing final-replay LeanRunManifest, Task100 ensures campaign/Pi `formal_proof_verified` / `formal_replay_passed` / `evidence_pack_ready` read models require an explicit `formal_replay_authority_evidence` envelope instead of raw `completed_formal_proof`, Task110 ensures native candidate generation requests are service-owned line-map outputs rather than hand-authored launch tokens, Task111 ensures `candidate_kernel_checked` / replay-project descriptor material requires verified service-owned LeanRunManifest v3 or FinalReplayManifest v3 artifact evidence rather than marker strings, Task112 ensures non-exact statement-equivalence replay evidence cannot be marker-only or id-only and must resolve to verified service-owned Lean replay manifests, Task213 ensures opt-in campaign-native Mathlib breadth evidence cannot be satisfied by `True`, default `n : Nat`, `by trivial`, `by omega`, missing Mathlib dependency/import, or positive-matrix release paths, Task214 ensures that same opt-in path also requires pinned trusted licensed mathlib dependency material with no local `Mathlib` shadowing, Task215 ensures the final clean replay dependency artifact uses `DependencyClosureV2` and binds its package revision material into FinalReplayManifest v3, Task216 ensures the opt-in path blocks before final replay allocation unless `.lake/packages/mathlib` is locally materialized and hash-recorded as non-authoritative provenance, Task217 ensures FinalReplayManifest v3 verification recomputes dependency-lock file hashes and checks V2 external revisions against `dependency_closure.json`, Task218 ensures the opt-in path writes non-authoritative service-owned Lean/Lake version, expected-toolchain, binary-hash, replay-plan, and provisioning-hash diagnostics before final replay allocation, and Task219 ensures the opt-in path writes non-authoritative service-owned `lake env lean --deps` theorem/audit probe hashes and coarse Mathlib presence before final replay allocation; any deferred release-audit proof seed still requires its own exact clean Lean/mathlib replay evidence before it can stop being a replayable blocker.
- [ ] Broad MathProve proof search and any MathProve-as-proof-authority path beyond the Phase 25 `verify_sympy.py` and Phase 58 `final_audit.py` evidence-runner bridges.
- [ ] Production Codex/Pi adapter hardening beyond the Phase 41-53 live allowlisted execution, bounded observability, cursor-based log-stream polling, SSE-compatible subscription snapshots, bounded multi-event SSE log-session responses, service-owned operator panels, scheduler-backed operator cancellation, service-owned package registry, service-configured external CLI invocation, service-configured installed Codex CLI validation, service-configured Codex API backend contract, retry/rate-limit telemetry slices, Task146 Pi/Codex lifecycle readiness review gate, Task147 Pi release consumer exposure, Task148 artifact-backed lifecycle evidence intake, Task149 direct durable-service lifecycle probe, Task150 service-owned production Codex API account/network validation probe, Task151 Pi-facing Codex API probe consumer, Task152 service-owned real-Pi install/runtime-registration probe artifact producer, Task153 Pi-facing real-Pi runtime probe consumer, Task154 read-only lifecycle operator walkthrough, Task155 bounded host-confirmed lifecycle operator controls, Task156 read-only lifecycle session recovery planning, Task157 service-owned operator-session manifest persistence, Task158 Pi-facing host-confirmed operator-session persistence consumer wiring, Task159 service-owned operator transport recovery checkpointing, Task160 Pi-facing host-confirmed operator transport recovery consumer wiring, Task161 operator-session/transport recovery hardening, Task162 service-owned bounded operator transport lease artifacts, Task163 Pi-facing host-confirmed operator transport lease consumer wiring, Task164 service-owned guided real-Pi execution evidence chaining, Task165 Pi-facing host-confirmed guided execution consumer wiring, Task166 guided-execution real-Pi host-chain binding hardening, Task167 adapter OS-isolation readiness review gate, Task168 service-owned adapter OS-isolation blocker probe artifact producer, Task169 Pi-facing host-confirmed adapter OS-isolation probe consumer wiring, Task170 service-owned configured-host OS-isolation collection contract, Task171 service-owned provider-specific sandbox-launch preflight contract, Task172 service-owned sandbox execution probe bridge, Task173 Pi-facing host-confirmed sandbox execution probe consumer wiring, Task174 comprehensive OS-isolation/Pi boundary check-debug revalidation, Task175 service-owned provider-runner contract/unavailable blocker, Task176 service-owned provider-helper execution attempt, Task177 service-owned provider-helper collection bridge to canonical evidence, Task178 service-owned provider-helper host validation, and Task179 host-validation-bound provider-helper execution: indefinite WebSocket/SSE sessions beyond bounded responses/checkpoints/leases, durable long-lived operator transport, production helper implementations beyond host-validation manifests for OCI/Nix/Firejail/Windows AppContainer, and broad cross-platform OS-enforced adapter execution remain open.
  Task180 revalidated the Task175-179 provider-helper chain, route/Pi payload boundary, readiness/public wording, and runtime cleanliness without closing the remaining production-helper, durable-transport, or broad OS-enforced execution blockers.
  Task181 adds the first configured Windows AppContainer provider-helper asset path through a service-owned helper executable env var and hash-bound runner/host-validation manifests; it does not close production helper support for other OS sandbox families, broad OS-enforced execution, canonical collection evidence, durable transport, real-Pi execution, Lean replay breadth, or GA.
  Task182 adds a configured Windows AppContainer helper execution asset/args-prefix path so the default helper execution route can spawn a host-validated configured helper and bind executable hash plus args-prefix hash/count; it still does not make helper execution, public collection route payloads, or wrapper manifests canonical OS-enforcement evidence, broad OS-enforced execution, real-Pi execution, proof authority, or GA.
  Task183 revalidates Task175-182 provider-helper/configured-helper boundaries and hardens public release wording/config smoke checks so stale Task20 GA wording, Pi consumer output-as-readiness wording, undocumented fallback helper env vars, and missing release-hardening focused suites fail the root smoke gate.
  Task184-206 (including the Task184-205 predecessor chain) extend and revalidate the provider-helper path across provider-family helper env handles, platform-contract host validation, fixed CoMath provider-helper self-test, current project/host-validation/runner/launch self-test binding, current project/helper-execution/runner/launch runtime-attestation binding before provider-helper collection can invoke canonical probe writing, a bundled CoMath provider-helper protocol asset for the no-env-helper default path, a comprehensive wrapper-readiness check-debug loop, a service-owned provider host capability probe contract for platform/tool/kernel diagnostics before helper host validation, a mandatory host-capability-to-helper-validation binding gate, Pi-facing host-confirmed consumers for host capability / helper-host-validation diagnostics, a default service-owned host capability probe for the route/no-injected-callback path, Windows AppContainer host facility / `windows_checknetisolation` diagnostics on Win32 service hosts, OCI container host facility / Docker/Podman CLI presence-hash diagnostics on service-supported Linux/Windows hosts, Nix sandbox / Firejail host facility diagnostics with executable-candidate presence-hash metadata on service-supported hosts, an explicit provider-helper collection complete-OS-enforcement blocker for hash-bound callbacks that lack complete process/filesystem/network/no-new-privileges/escape-prevention facts, a default production route provider-helper collection probe that binds persisted helper hashes into replayable incomplete-OS-enforcement blocker evidence when no provider-specific OS probe is configured, host-configured service-owned provider-helper collection probe executables whose stdout JSON must bind current project/collection/helper/runner/launch/adapter/backend/provider/helper-hash facts before complete OS-enforcement evidence can be nested under a canonical probe artifact, configured collection host-capability binding requiring current host-validation artifact plus observed provider host-capability probe artifact ids/paths/hashes, a helper release chain check-debug guard that fails closed on stale host-validation or host-capability binding mismatch before configured collection can write nested canonical evidence, a bundled provider-helper collection probe asset that makes the no-env default path execute service-owned collection binding logic while still emitting incomplete blocker evidence, a provider-tool execution witness gate requiring complete collection evidence to bind service-derived collection-probe executable/profile/argv hashes plus the current helper transcript, a provider-specific tool binding gate requiring that witness to bind the host-capability provider tool name/hash before readiness can accept nested canonical evidence, a provider-family OS-enforcement witness gate requiring complete facts to carry `provider_family_os_enforcement_witness` bound to the current provider family, host-capability artifact/tool binding, helper transcript, complete OS-enforcement facts, disabled network policy, and non-authority boundary, and a provider-family execution profile gate requiring that family witness to bind the service-derived provider-family execution kind/profile/argv hashes. They still do not ship built-in production helper binaries for OCI/Nix/Firejail/AppContainer, execute container/Nix/Firejail tools by default, inspect daemon/socket/container/store/profile/sandbox-policy state, prove OS enforcement from configuration or witness/profile metadata alone, satisfy readiness by wrapper/Pi/host-capability/default-probe/host-facility metadata or incomplete/stale helper-collection facts, provide broad cross-platform OS-enforced execution, complete real-Pi execution, affect proof authority, or certify GA.
  Task184-209 summary: Task208 provider-specific live probe execution remains the predecessor `provider_specific_live_probe_execution` gate, and Task209 adds provider-specific live probe collection binding: configured provider-helper collection stdout must bind the same service-executed `provider_specific_live_probe_execution` id/hash/tool/argv/stdout/stderr/transcript material before complete collection facts can satisfy readiness. The Task184-208 predecessor chain still does not ship production helper binaries, inspect daemon/socket/container/store/profile/sandbox-policy state, prove OS enforcement from metadata alone, complete real-Pi execution, affect proof authority, or certify GA.
  Task210 adds provider control-plane execution witness binding to the provider-helper chain: complete collection evidence must also carry `provider_control_plane_execution_witness` material bound to the current provider family execution profile, provider tool hashes, helper transcript, and provider-specific live probe execution id/hash/tool/argv/stdout/stderr/transcript material before readiness can accept nested canonical evidence. This remains provenance gating only; existing production-helper, host-inspection, durable-transport, Lean-replay, Pi-execution, and release-certification residual risks remain open.
  Task202-212 summary: Task211 revalidates the bundled/configured provider-helper collection and provider-tool/family/live-probe/control-plane witness chain, including suite discovery, route sanitization, config flags, public wording, blocker/veto wiring, no direct Pi collection/witness-chain consumer, runtime cleanliness, and missing collection-manifest fail-closed behavior. Task212 adds a Windows AppContainer production-helper profile contract so env-configured helpers and bundled provider-helper protocol assets remain distinguishable through non-secret manifest lineage fields. Deferred risks remain open for production helper binaries, host policy inspection, OS-enforcement proof, real-Pi execution, Lean proof authority, broad provider support, and release certification.
  Task220 adds service-owned AgentRun log-session binding to bounded operator transport lease creation and guided real-Pi execution consumption. Arbitrary route text, expired leases, stale/missing run ids, wrong-project or wrong-recovery runs, tampered binding hashes/cursors, secrets, and long-lived transport wording now fail closed or are canonicalized into non-authoritative route/run/cursor/body-hash provenance. This closes a lease provenance gap only; it does not provide durable long-lived transport, fully interactive end-to-end Pi execution, production helper binaries, OS-enforcement proof, Lean proof authority, broad provider support, or release certification.
  Task221 adds append-only bounded operator transport heartbeat/rebind checkpoints plus Pi consumer wiring. Heartbeats read a live Task220-bound lease, rebind current service-owned AgentRun log-session material for the requested cursor, preserve the original session/recovery/lease artifact hashes without mutation, reject static tampering, expired/wrong-chain/stale-client/non-monotonic live-log leases before writing, and accept same-route/same-run live log growth only as bounded rebind provenance. Pi lease-kind vocabulary now matches comathd. This improves bounded operator checkpointing only; durable long-lived operator transport, fully interactive real-Pi UX, production helper binaries, OS-enforcement proof, Lean proof authority, broad provider support, and release certification remain open.
  Task213-222 summary plus Task223-234 continuation (Task213-232 summary retained; Task213-233 summary retained; Task213-234 summary): Task213-219 harden the opt-in campaign-native Mathlib replay path through breadth, dependency-material, DependencyClosureV2, provisioning, dependency-lock consistency, host replay, and import-graph diagnostics; Task220-221 harden bounded operator transport leases and heartbeat/rebind checkpoints; Task222 adds an OCI/Docker/Podman production-helper profile contract that carries service-derived helper profile lineage, helper hash, Docker/Podman facility family, disabled network policy, no-new-privileges, path-free host-facility tool names, and non-authority flags through runner, host-validation, helper-execution, and collection manifests. Task223 adds a read-only interactive real-Pi checkpoint UX over existing host-confirmed lifecycle commands with hardened public sanitization for path-shaped IDs, trusted runtime roots, Pi host paths, secrets, and proof-success vocabulary. Task224 adds a service-owned guided execution terminal chain review that hash-binds runtime probe, operator session, recovery, bounded lease, heartbeat/rebind, and guided execution artifacts before release review can consume the workflow chain. Task225 adds a service-owned operator/service maintained transport contract that binds the terminal review to the current heartbeat hash plus the existing Node HTTP `GET /agent/run/<run_id>/log-session` route and Pi `fetch`/`getText` primitive with bounded replay limits. Task226 exposes that contract through a host-confirmed Pi consumer and planner checkpoint while stripping model confirmation ids and false-forcing proof/GA/durable/live/direct-Pi-write/trusted-state-mutation overclaims. Task227 adds a service-owned automatic real-Pi checkpoint-chain orchestrator that composes existing lifecycle producers and persists a non-authoritative manifest only after every checkpoint id/path/hash binds. Task228 exposes that automatic orchestration through a host-confirmed Pi consumer and read-only planner checkpoint while sanitizing nested checkpoint request/result surfaces and preserving non-authority flags. Task229 adds a service-owned operator/service transport continuity checkpoint that consumes a Task225 contract artifact, requires and verifies its hash, resumes only from `log_session_next_cursor`, and re-runs bounded AgentRun log-session reads over the same maintained Node HTTP plus Pi `fetch`/`getText` primitive. Task230 exposes that continuity checkpoint through a host-confirmed Pi consumer and read-only planner checkpoint while requiring the contract hash, stripping confirmation ids, redacting trusted runtime path echoes from public UI, and preserving non-authority flags. Task231 adds an `unattended-handoff` mode to the same read-only planner that marks prepared handoff ready only when sanitized service-owned checkpoint path/hash refs are present, blocks on missing/poisoned refs, and suppresses operator-free executor / service-evidence-created / proof / transport / GA overclaims. Task232 adds a Nix sandbox production-helper profile contract that carries service-derived helper profile lineage, helper hash, Nix sandbox facility family, disabled network policy, no-new-privileges, path-free `nix_cli` / `nix_store_cli` host-facility tool names, and non-authority flags through runner, host-validation, helper-execution, and collection manifests. Task233 revalidates the Task220-231 operator/service transport chain as check-debug coverage over existing maintained primitives without adding a new route or transport owner. Task234 adds a Firejail production-helper profile contract that carries service-derived helper profile lineage, helper hash, Firejail facility family, disabled network policy, no-new-privileges, path-free `firejail_cli` host-facility tool name, and non-authority flags through runner, host-validation, helper-execution, and collection manifests. These slices still do not fetch mathlib, complete broad release-candidate proof breadth, provide durable long-lived operator transport, run production unattended real-host workflows without prepared service-owned checkpoints, ship production helper binaries, launch containers, run Nix, run Firejail, inspect Docker/Podman daemon/socket/container state, Nix store/profile state, or Firejail profile/policy state, prove OS enforcement from metadata, affect Lean proof authority, provide broad provider support, or certify GA.
  Task213-236 summary: Task236 removes the excluded platform from current environment-adaptation docs, sample configuration, and release-hardening smoke scope. The Task235 internal regression remains historical implementation evidence only; current public scope must not advertise removed-platform helper handles, host-facility names, profile contracts, or focused release-hardening suites.
  Task213-237 summary: Task237 adds a read-only `/cm:release lifecycle-interactive-real-pi operator-review-checklist` planner mode over Task231 prepared checkpoint refs. It renders ordered manual-review items, blocks on missing/poisoned refs, ignores approval-shaped caller fields, and keeps proof/GA/durable/live/direct-Pi-write/trusted-state/service-evidence/execution flags false. It does not call `comathd`, persist a review manifest, verify artifact freshness, approve execution, or certify GA.
  Task213-238 summary: Task238 adds a campaign-native Mathlib no-download fixture preflight that composes the Task214 dependency-material gate and Task216 provisioning diagnostic before Task218/219 host/import diagnostics. It validates only pinned trusted licensed manifest material and already materialized `.lake/packages/mathlib` hashes, rejects local `Mathlib` shadowing, floating revisions, missing package material, and package symlinks, and keeps proof/GA/replay-allocation/download/Lean-Lake-execution flags false.
  Task213-239 summary: Task239 adds a service-owned unattended real-host handoff review manifest that derives canonical lifecycle artifact paths from ids, re-reads and hash-binds runtime registration, operator session, recovery, lease, heartbeat, guided execution, terminal review, maintained transport contract, automatic orchestration, and continuity artifacts, and treats Pi public prepared-checkpoint aliases/hashes only as expected values. It persists freshness/chain review evidence only and keeps operator approval, handoff execution, unattended authorization/completion, durable/live transport, direct Pi mutation, proof authority, and GA certification false.
  Task213-240 summary: Task240 exposes the Task239 service-owned unattended real-host handoff review through `comath.release.piCodexLifecycleUnattendedRealHostHandoffReview`, `/cm:release lifecycle-unattended-real-host-handoff-review`, and the read-only interactive planner checkpoint. It remains host-confirmed, strips model confirmation ids, passes prepared public path/hash expected values only, sanitizes public output, and keeps approval, execution, proof, GA, durable/live transport, and direct Pi mutation flags false.
  Task213-241 summary: Task241 adds `POST /release/pi-codex-lifecycle/unattended-real-host-execution-readiness` as a service-owned blocked readiness manifest over a current Task239 handoff review artifact. It records missing operator approval artifact, missing service-owned unattended executor, and missing durable transport while keeping approval, execution, proof, GA, durable/live transport, and direct Pi mutation flags false.
  Task213-242 summary: Task242 exposes that blocked readiness route through `comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness`, `/cm:release lifecycle-unattended-real-host-execution-readiness`, and the read-only interactive planner checkpoint after handoff review. It remains host-confirmed, strips model confirmation ids, translates public lifecycle aliases to service-canonical artifact paths only inside the request, sanitizes public output, and keeps approval, execution, proof, GA, durable/live transport, and direct Pi mutation flags false.
  Task213-243 summary: Task243 adds `POST /release/pi-codex-lifecycle/unattended-real-host-operator-approval` as a service-owned manual approval checkpoint over a current Task239 handoff review artifact. It persists append-only approval evidence and lets Task241 readiness remove only the missing-approval blocker while keeping unattended-executor, durable-transport, execution, proof, GA, durable/live transport, and direct Pi mutation flags false.
  Task213-244 summary: Task244 exposes the Task243 approval checkpoint through `comath.release.piCodexLifecycleUnattendedRealHostOperatorApproval`, `/cm:release lifecycle-unattended-real-host-operator-approval`, Pi runtime registration, and the read-only interactive planner before readiness. The Task242 readiness Pi consumer can pass a complete operator-approval id/path/hash binding to the service route, but the Pi layer remains host-confirmed and non-authoritative: no model confirmation ids, no direct `.comath` writes, no unattended execution authorization, no durable/live transport, no Lean proof authority, and no GA certification.
  Task213-245 summary: Task245 adds `POST /release/pi-codex-lifecycle/unattended-real-host-executor-contract` as a service-owned executor-prerequisite checkpoint over a current Task239 handoff review artifact. It persists append-only executor contract evidence and lets Task241 readiness remove only the missing-executor blocker while keeping durable-transport, execution, proof, GA, durable/live transport, and direct Pi mutation flags false.
  Task213-246 summary: Task246 exposes the Task245 executor contract checkpoint through `comath.release.piCodexLifecycleUnattendedRealHostExecutorContract`, `/cm:release lifecycle-unattended-real-host-executor-contract`, Pi runtime registration, and the read-only interactive planner before readiness. The Task242 readiness Pi consumer can pass a complete executor-contract id/path/hash binding to the service route, but the Pi layer remains host-confirmed and non-authoritative: no model confirmation ids, no direct `.comath` writes, no executor invocation, no unattended execution authorization, no durable/live transport, no Lean proof authority, and no GA certification.
  Task213-247 summary: Task247 adds `POST /release/pi-codex-lifecycle/unattended-real-host-durable-transport-contract` as a service-owned durable-transport prerequisite checkpoint over a current Task239 handoff review, Task243 approval artifact, Task245 executor contract, and Task229 continuity artifact. It lets readiness remove only `durable_transport_not_provided` and record prerequisite-ready evidence while keeping approval, execution, proof, GA, durable/live transport, and direct Pi mutation flags false.
  Task213-249 summary: Task249 adds a service-owned unattended real-host execution attempt gate after prerequisite-recorded readiness. It re-reads the handoff/approval/executor/durable/continuity chain, records a replayable executor-unavailable blocker when no executor command is supplied, and records bounded fixed-argv attempt results when an allowlisted command is supplied. It remains non-authoritative: no terminal unattended completion, no direct `.comath` writes by Pi, no opened durable/live transport, no Lean proof authority, no claim promotion, and no GA certification.
  Task213-250 summary: Task250 exposes the Task249 attempt/blocker route through `comath.release.piCodexLifecycleUnattendedRealHostExecutionAttempt`, `/cm:release lifecycle-unattended-real-host-execution-attempt`, Pi runtime registration, and the read-only interactive planner after readiness. It requires readiness id/path/hash, strips model confirmation ids, converts only the public readiness alias inside the service request, does not expose public `executor_command`, and keeps completion, proof, GA, durable/live transport, and direct Pi mutation flags false.
  Task213-251 summary: Task251 adds `reviewPiCodexLifecycleUnattendedRealHostExecutionAttempt()` and `POST /release/pi-codex-lifecycle/unattended-real-host-execution-attempt-review` as service-owned terminal attempt review evidence. It re-reads canonical Task249 attempt artifacts, prerequisite-chain material, and any result artifact, then classifies executor-unavailable, failed-attempt, or successful-attempt-still-non-terminal states as replayable blockers without certifying completion.
  Task213-252 summary: Task252 exposes the Task251 attempt-review route through `comath.release.piCodexLifecycleUnattendedRealHostExecutionAttemptReview`, `/cm:release lifecycle-unattended-real-host-execution-attempt-review`, Pi runtime registration, and the read-only interactive planner after the attempt. It requires attempt id/path/hash, strips model confirmation ids, converts only the public attempt alias inside the service request, does not expose public `executor_command` or caller attempt results, and keeps terminal completion, proof, GA, durable/live transport, and direct Pi mutation flags false.
  Task213-253 summary: Task253 adds `recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite()` and `POST /release/pi-codex-lifecycle/unattended-real-host-completion-certification-prerequisite` as service-owned completion-certification prerequisite evidence. It re-reads canonical Task251 review artifacts, rejects stale/promotional review evidence, and records `blocked_terminal_unattended_completion_certification_required` with completion/proof/GA/durable-live/direct-Pi flags false.
  Task213-254 summary: Task254 exposes the Task253 prerequisite route through `comath.release.piCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite`, `/cm:release lifecycle-unattended-real-host-completion-certification-prerequisite`, Pi runtime registration, and the read-only interactive planner after attempt review. It requires attempt-review id/path/hash, strips model confirmation ids, converts only the public attempt-review alias inside the service request, does not expose public `executor_command`, caller attempt results, or completion certificates, and keeps terminal completion, proof, GA, durable/live transport, and direct Pi mutation flags false.
- [ ] Full interactive Pi UX beyond the Phase 45 local install-session e2e, Phase 30 `/cm:agent` tool/command harness, Phase 26 package manifest/default export/fake Pi API registration/installed-loader smoke, Task146 fake-host/durable-service lifecycle blocker gate, Task147 `/cm:release pi-codex-lifecycle` consumer wiring, Task148 service-owned artifact-backed lifecycle evidence intake, Task149 service-owned durable `comathd` lifecycle probe, Task150 service-owned Codex API account/network validation probe, Task151 `/cm:release codex-api-probe` consumer wiring, Task152 service-owned real-Pi install/runtime-registration probe route, Task153 `/cm:release real-pi-runtime-probe` consumer wiring, Task154 `/cm:release lifecycle-walkthrough` read-only manual operator walkthrough, Task155 `/cm:release lifecycle-control` bounded operator controls, Task156 `/cm:release lifecycle-session` read-only recovery planning, Task157 `POST /release/pi-codex-lifecycle/operator-session` service-owned manifest persistence, Task158 `/cm:release lifecycle-operator-session` consumer wiring, Task159 `POST /release/pi-codex-lifecycle/operator-transport-recovery` service checkpointing, Task160 `/cm:release lifecycle-operator-transport-recovery` consumer wiring, Task162 `POST /release/pi-codex-lifecycle/operator-transport-lease` bounded service lease artifacts, Task163 `/cm:release lifecycle-operator-transport-lease` consumer wiring, Task164 `POST /release/pi-codex-lifecycle/guided-real-pi-execution` service evidence chaining, Task165 `/cm:release lifecycle-guided-real-pi-execution` consumer wiring, Task166 guided-execution host-chain binding hardening, Task169 `/cm:release agent-adapter-os-isolation-probe` consumer wiring, Task173 `/cm:release agent-adapter-os-isolation-sandbox-execution` consumer wiring, Task192 `/cm:release agent-adapter-os-isolation-provider-host-capability-probe` plus `/cm:release agent-adapter-os-isolation-provider-helper-host-validation` consumer wiring, Task220 bounded operator transport lease AgentRun log-session binding, Task221 bounded operator transport heartbeat/rebind checkpoints plus Pi consumer wiring, Task223 `/cm:release lifecycle-interactive-real-pi` read-only checkpoint planning, Task224 service-owned guided execution terminal chain review, Task225 service-owned maintained operator/service transport contract, Task226 `/cm:release lifecycle-operator-service-transport-contract` host-confirmed Pi consumer wiring, Task227 `POST /release/pi-codex-lifecycle/automatic-real-pi-execution` service-owned checkpoint-chain orchestration, Task228 `/cm:release lifecycle-automatic-real-pi-execution` host-confirmed Pi consumer wiring, Task229 service-owned operator/service transport continuity checkpoints, Task230 `/cm:release lifecycle-operator-service-transport-continuity` host-confirmed Pi consumer wiring, Task231 `/cm:release lifecycle-interactive-real-pi unattended-handoff` read-only prepared-checkpoint handoff planning, Task237 `/cm:release lifecycle-interactive-real-pi operator-review-checklist` read-only manual-review checklist planning, Task239 `POST /release/pi-codex-lifecycle/unattended-real-host-handoff-review` service-owned freshness/chain review, Task240 `/cm:release lifecycle-unattended-real-host-handoff-review` host-confirmed Pi consumer wiring, Task241 `POST /release/pi-codex-lifecycle/unattended-real-host-execution-readiness` blocked/readiness-prerequisite evidence, Task242 `/cm:release lifecycle-unattended-real-host-execution-readiness` host-confirmed Pi consumer wiring, Task243 `POST /release/pi-codex-lifecycle/unattended-real-host-operator-approval` service-owned approval checkpoint evidence, Task244 `/cm:release lifecycle-unattended-real-host-operator-approval` host-confirmed Pi consumer wiring, Task245 `POST /release/pi-codex-lifecycle/unattended-real-host-executor-contract` service-owned executor-prerequisite evidence, Task246 `/cm:release lifecycle-unattended-real-host-executor-contract` host-confirmed Pi consumer wiring, Task247 `POST /release/pi-codex-lifecycle/unattended-real-host-durable-transport-contract` service-owned durable-transport prerequisite evidence, Task248 `/cm:release lifecycle-unattended-real-host-durable-transport-contract` host-confirmed Pi consumer wiring, Task249 `POST /release/pi-codex-lifecycle/unattended-real-host-execution-attempt` service-owned attempt/blocker evidence, Task250 `/cm:release lifecycle-unattended-real-host-execution-attempt` host-confirmed Pi consumer wiring, Task251 `POST /release/pi-codex-lifecycle/unattended-real-host-execution-attempt-review` service-owned terminal attempt review evidence, Task252 `/cm:release lifecycle-unattended-real-host-execution-attempt-review` host-confirmed Pi consumer wiring, and Task253 `POST /release/pi-codex-lifecycle/unattended-real-host-completion-certification-prerequisite` service-owned completion-certification prerequisite evidence: durable long-lived operator transport and production GA execution remain open.
  Task254 update: `/cm:release lifecycle-unattended-real-host-completion-certification-prerequisite`, Pi runtime registration, and the read-only planner checkpoint after attempt review are now covered as host-confirmed consumer wiring for the Task253 prerequisite route; durable long-lived operator transport and production GA execution remain open.
  Task284 update: lifecycle readiness review now optionally binds a Task253 completion-certification prerequisite by id/path/hash. `reviewPiCodexLifecycleReadiness()` and `POST /release/pi-codex-lifecycle/review` re-read the canonical prerequisite artifact, reject stale, non-canonical, or promotional files, record the prerequisite as non-authoritative review input, and keep readiness blocked with `terminal_unattended_completion_certification_required` until real terminal completion certification exists.
  Task285 update: `comath.release.piCodexLifecycleReview` and `/cm:release pi-codex-lifecycle` now expose optional completion-prerequisite id/path/hash inputs for the Task284 service review. The Pi surface remains host-confirmed and thin-client only; it forwards the expected reference material to `comathd` without creating completion certificates, opening durable/live transport, mutating trusted Pi state, running Lean, promoting claims, or certifying GA.
  Task286 update: service-owned terminal completion certificate design evidence now exists through `recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign()` and `POST /release/pi-codex-lifecycle/unattended-real-host-terminal-completion-certificate-design`. The gate consumes a current Task253 prerequisite id/path/hash, re-reads the canonical prerequisite artifact, rejects stale/non-canonical/promotional material, and persists only a blocked design artifact plus required future evidence list; it does not create or certify a terminal completion certificate, expose executor output, open durable/live transport, mutate trusted Pi state, run Lean, promote claims, or certify GA.
  Task287 update: `comath.release.piCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign`, `/cm:release lifecycle-unattended-real-host-terminal-completion-certificate-design`, Pi runtime registration, and the read-only planner checkpoint after the Task253 prerequisite now expose the Task286 design route through host-confirmed thin-client wiring. The bridge requires prerequisite id/path/hash, strips model confirmation ids, converts only the public prerequisite alias inside the service request, does not expose public executor/result/certificate fields, and keeps terminal completion, proof, GA, durable/live transport, and direct Pi mutation flags false.
  Task288 update: service-owned terminal completion certificate evidence now exists through `recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate()` and `POST /release/pi-codex-lifecycle/unattended-real-host-terminal-completion-certificate`. The gate consumes a current Task286 design id/path/hash, re-reads the canonical design, prerequisite, attempt-review, and current attempt-result artifact bytes, rejects stale/non-canonical/tampered chains, persists an append-only certificate manifest and audit event, redacts executor stdout/stderr/result payload material, and keeps Lean/proof promotion and GA certification separate with `proof_authority=none`, `can_promote_claim=false`, and `can_certify_ga=false`.
  Task289 update: `comath.release.piCodexLifecycleUnattendedRealHostTerminalCompletionCertificate`, `/cm:release lifecycle-unattended-real-host-terminal-completion-certificate`, Pi runtime registration, and the read-only planner checkpoint after the Task286 design now expose the Task288 certificate route through host-confirmed thin-client wiring. The bridge requires design id/path/hash, strips model confirmation ids, converts only the public design alias inside the service request, does not expose public executor/result/caller-certificate fields, and keeps Lean proof, claim promotion, GA certification, durable/live transport, and direct Pi mutation authority false while preserving service-returned lifecycle certificate flags.
  Task255 update: Pi goal-mode intake now has service-owned manifest provenance for `--paper`, `--attach`, and `--workspace-ref` inputs. `/campaign/start` normalizes project-confined refs, hashes existing file inputs, records directory refs without recursive proof claims, attaches the manifest to the `initialized` campaign stage, and exposes only path/hash plus non-authority flags through Pi goal export. Remaining Pi goal-mode work is deeper ingestion/retrieval/lemma-planning automation, not trusted proof authority from attachments.
  Task256 update: Pi goal-mode `knowledge_pack` now writes a service-owned `goal_mode_research_plan.json` that consumes the Task255 intake manifest path/hash, plans maintained local-ingestion, literature-retrieval, Lean theorem-search, and lemma-planning adapter tasks, binds the plan into `knowledge_pack.json`, and keeps every planned task non-authoritative. Remaining Pi goal-mode work is executing those maintained adapters through service-owned manifests, extracting anchored evidence, generating richer lemma plans, repairing Lean skeletons, and reaching terminal proof/refutation/blocker states through Lean Authority gates.
  Task257 update: Pi goal-mode `knowledge_pack` now also writes a service-owned `goal_mode_adapter_execution_manifest.json` that consumes the Task256 research plan, binds its path/hash into `knowledge_pack.json`, preserves the Task255 intake-manifest path/hash binding, records per-task adapter run envelopes, re-checks local file hashes, blocks tampered local inputs, records directory refs without recursive proof claims, and marks network/theorem-search tasks as requiring later live provider execution. Remaining Pi goal-mode work is the actual maintained adapter execution, prompt-injection-scanned extraction, anchored evidence ingestion, theorem-search result capture, Lean skeleton repair, and terminal proof/refutation/blocker completion.
  Task258 update: Pi goal-mode `knowledge_pack` now also writes a service-owned `goal_mode_local_ingestion_evidence.json` that consumes the Task256 research plan and Task257 adapter execution manifest, binds both plus the Task255 intake manifest into the evidence chain, extracts prompt-injection-scanned line anchors for local Markdown/TeX theorem or lemma drafts, blocks injected local text, and records replayable blockers for PDF parser and external Lean repo inspection adapters. Remaining Pi goal-mode work is maintained PDF parsing, external Lean repo inspection, live literature/theorem-search execution, richer anchored evidence ingestion, Lean skeleton repair, and terminal proof/refutation/blocker completion through Lean Authority gates.
  Task259 update: Pi goal-mode `skeleton_gate` now writes a service-owned `proof/formalization_hints.json` that consumes `knowledge_pack.json` and `goal_mode_local_ingestion_evidence.json`, binds both by path/hash, converts only allowed prompt-injection-scanned extracted claim kinds into skeleton-planning hints, and records statement-drift guards. Remaining Pi goal-mode work is using these hints for richer lemma DAGs and Lean skeleton repair, plus maintained PDF parsing, external Lean repo inspection, live retrieval/theorem-search execution, and terminal proof/refutation/blocker completion through Lean Authority gates.
  Task260 update: Pi goal-mode `skeleton_gate` now writes a service-owned `proof/blueprint.json` from `proof/formalization_hints.json`, binds it into `plan.json`, `lemma_dag.json`, `line_map.json`, and `skeleton_report.md`, and keeps every blueprint step as non-authoritative planning metadata. Remaining Pi goal-mode work is using blueprint metadata for real skeleton repair/candidate orchestration, plus maintained PDF parsing, external Lean repo inspection, live retrieval/theorem-search execution, and terminal proof/refutation/blocker completion through Lean Authority gates.
  Task261 update: Pi goal-mode `line_map_gate` now writes a blueprint-bound `candidate_generation_request.json` that consumes `proof/blueprint.json` and `proof/formalization_hints.json` by path/hash, and `candidate_generation` re-checks that binding before writing `candidate_generation.json` and the eight `lemma_sprint` task cards. Remaining Pi goal-mode work is making those blueprint-bound task cards drive real Lean skeleton repair/candidate attempts, plus maintained PDF parsing, external Lean repo inspection, live retrieval/theorem-search execution, and terminal proof/refutation/blocker completion through Lean Authority gates.
  Task262 update: Pi goal-mode `candidate_generation` now materializes `lean_candidate_attempt_plan.json` and `LeanCandidate.lean` inside every blueprint-bound candidate workspace, binding `proof/Skeleton.lean`, the skeleton blueprint, blueprint step ids, and statement-boundary guards. Remaining Pi goal-mode work is running service-owned Lean checks/repair loops over those draft attempts, plus maintained PDF parsing, external Lean repo inspection, live retrieval/theorem-search execution, and terminal proof/refutation/blocker completion through Lean Authority gates.
  Task263 update: Pi goal-mode `candidate_verification` now writes a service-owned `lean_candidate_attempt_check_report.json` that binds each candidate manifest, attempt plan, draft Lean file, source skeleton hash, blueprint hash, and locked statement boundary; `sorry` drafts are routed to repair-required preflight evidence without LeanRunManifest authority. Remaining Pi goal-mode work is executing repair loops, running LeanRunner only on repaired no-sorry attempts, integrating live theorem-search/literature hints into candidate repairs, and reaching terminal proof/refutation/blocker states through Lean Authority gates.
  Task264 update: Pi goal-mode `candidate_arbitration` now routes explicit goal-mode campaigns with external refs and `repair_required` `sorry` attempts into `repair` instead of terminal-blocking, writes a service-owned `lean_candidate_attempt_repair_batch.json`, and materializes A0/A5/A8 per-candidate repair tasks. Remaining Pi goal-mode work is executing those repair tasks, producing repaired no-sorry attempts, re-running candidate verification, invoking LeanRunner only after no-sorry preflight, and continuing to terminal proof/refutation/replayable blocker through Lean Authority gates.
  Task265 update: Pi goal-mode `repair` is now executable and resumable: it consumes the repair batch, snapshots original `LeanCandidate.lean` drafts, writes no-sorry repaired drafts with explicit `comath_repair_placeholder` markers, records a repair execution manifest plus per-candidate execution manifests, and returns to `candidate_verification`. Remaining Pi goal-mode work is invoking service-owned LeanRunner on ready-for-LeanRunner attempts, routing failed Lean runs back into richer repair, and continuing to terminal proof/refutation/replayable blocker through Lean Authority gates.
  Task266 update: Pi goal-mode `candidate_verification` now separates ready-for-LeanRunner preflight from actual Lean execution, then runs service-owned LeanRunner over ready repaired attempts, writes LeanRunManifest evidence, updates candidate manifests/indexes, and emits a replayable blocker when every repaired attempt is rejected. Remaining Pi goal-mode work is using Lean stderr/stdout to drive richer repair iterations, integrating live theorem-search/literature hints into those repairs, and continuing successful candidates through arbitration, red-team, final clean replay, and terminal proof/refutation/blocker states.
  Task267 update: Pi goal-mode all-rejected LeanRunner blockers can now resume into `repair`: the next tick writes a service-owned `lean_candidate_attempt_repair_feedback_batch.json`, binds failed LeanRunManifest stdout/stderr paths and hashes, materializes a second repair batch, and then executes feedback-guided repair without invoking LeanRunner or claiming proof authority. Remaining Pi goal-mode work is applying richer theorem-search/literature/CAS hints during those repairs and carrying a LeanRunner-passing candidate through arbitration, red-team review, final clean replay packaging, and terminal proof/refutation/blocker states.
  Task268 update: Pi goal-mode feedback repair now binds a service-owned `lean_candidate_attempt_repair_hint_bundle.json` from external wheel registry descriptors, the goal-mode research plan, adapter execution manifest, local ingestion evidence, and repair feedback batch. Repair tasks/execution consume theorem-search, retrieval, computation, proof-search-backend, and external-Lean-repo hint descriptors as non-authoritative context only, fail closed on stale bundle hashes, and still cannot invoke LeanRunner, promote claims, or certify GA during repair. Remaining Pi goal-mode work is turning these bound descriptors into maintained live hint execution and carrying a LeanRunner-passing candidate through arbitration, red-team review, final clean replay packaging, and terminal proof/refutation/blocker states.
  Task269 update: Pi goal-mode feedback repair now writes `lean_candidate_attempt_repair_hint_execution.json` from the Task268 bundle, capturing service-owned stubbed adapter result summaries with request/result hashes, terms, capability metadata, and no-authority promotion vetoes. Repair tasks/execution bind `source_repair_hint_execution` and `source_repair_hint_results`, fail closed on stale execution hashes, and still perform no network/live-provider execution, LeanRunner invocation, claim promotion, or GA certification during repair. Remaining Pi goal-mode work is using these non-authoritative results to produce placeholder-free repaired candidates and carry any LeanRunner-passing candidate through arbitration, red-team review, final clean replay packaging, and terminal proof/refutation/blocker states.
  Task270 update: Pi goal-mode repair can now produce a placeholder-free candidate for bounded locked `True` theorem goals. Inline Lean theorem goals seed a real FormalSpecLock-derived target; candidate preflight ignores comment-only `sorry`, requires an actual theorem/lemma declaration, routes `sorry`, `?comath_repair_placeholder`, and Lean holes back to repair, and only marks attempts ready when those blockers are gone. Repair rewrites locked `True` theorem `sorry` bodies to `trivial`, the focused Task270 regression carries the placeholder-free attempt through LeanRunner into arbitration/red-team routing, and no FinalReplayManifest, claim promotion, or GA certification is produced. Remaining Pi goal-mode work is carrying that successful candidate through integration, final clean replay packaging, and terminal proof/refutation/blocker states while keeping broad proof-matrix breadth deferred.
  Task271 update: Pi goal-mode can now carry that bounded placeholder-free `True` candidate through arbitration, red-team review, integration, final static audit, final clean replay, FinalReplayManifest v3 packaging, ordinary promotion, and `completed_formal_proof`. Accepted candidates preserve their LeanRunner-checked draft project and materialize a separate `final_replay_project` with clean `MathResearch/Target.lean`, audit, campaign-bound FormalSpecLock/AssumptionLedger, Lake files, and replay descriptor. Remaining Pi goal-mode work is broadening beyond this tiny bounded smoke target to mathematically meaningful repairs, live provider/retrieval execution, real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task272 update: Pi goal-mode repair can now materialize placeholder-free `by rfl` candidates for locked theorem/lemma propositions that are syntactically reflexive equalities, then carry such a candidate through the same final clean replay terminal chain as Task271. The repair execution records `locked_reflexive_equality_rfl`, emits no repair placeholder, and still relies on LeanRunner plus final clean replay before any `formally_checked` claim state. Remaining work is still broader product completion: maintained live retrieval/theorem-search/CAS repair inputs, real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task273 update: Pi goal-mode repair-hint execution can now perform an opt-in live `retrieval:jina_search` call against a configured Jina Search-compatible endpoint, while default runs remain stubbed/offline. The service sends any `COMATH_JINA_API_KEY` only as an in-memory bearer header, records sanitized request/response hashes, provider status, content hash, prompt-injection scan, and no-authority vetoes, and threads the live result into repair tasks/execution without persisting secrets, emitting LeanRunManifest/FinalReplayManifest output, promoting claims, or certifying GA. Remaining work is using live retrieval/theorem-search/CAS hints for mathematically meaningful repair synthesis and completing real Pi/operator/OS-isolation release closure.
  Task274 update: Pi goal-mode repair can now consume bounded fenced Lean suggestions from opt-in live retrieval results as candidate repair material only. Repair accepts a suggestion only after a passing prompt-injection scan, exact declaration-name and normalized-statement match against the locked rejected theorem/lemma, and no-cheat filtering for `sorry`, holes, axioms, `unsafe`, `opaque`, `admit`, `run_cmd`, `elab`, `#eval`, and `set_option`; the repaired attempt still needs service-owned LeanRunner and downstream clean replay before any proof claim. LeanRunner reruns after repaired content now use Lean-file-hash-specific run ids so failed manifests remain append-only. Remaining work is broader mathematically meaningful repair synthesis, theorem-search/CAS live providers, real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task275 update: Pi goal-mode can now carry a live-retrieval-repaired candidate into final replay material while preserving repair provenance. A repaired candidate rerun that passes LeanRunner clears only the stale transient LeanRunner-rejection veto from the earlier failed attempt, and the selected candidate replay descriptor plus final replay material source bind the repair hint execution, campaign repair execution, and per-candidate repair execution by path/hash with `proof_authority=none`. Remaining work is broader theorem-search/CAS live providers, richer mathematically meaningful repair synthesis, real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task276 update: Pi goal-mode repair-hint execution can now perform an opt-in live `theorem_search:loogle` call against a configured Loogle-compatible endpoint, while default runs remain stubbed/offline. The service sends any `COMATH_LOOGLE_API_KEY` only as an in-memory bearer header, records sanitized request/response hashes, provider status/content type, response body hash, prompt-injection scan, bounded declaration results, and no-authority vetoes, and threads the live theorem-search result into repair tasks/execution without persisting secrets, emitting LeanRunManifest/FinalReplayManifest output, promoting claims, or certifying GA. Remaining work is using live theorem-search/retrieval/CAS hints for mathematically meaningful repair synthesis plus real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task277 update: Pi goal-mode repair can now consume a live `theorem_search:loogle` `And.intro` declaration hint as candidate material for the narrow locked conjunction class `True /\\ True` / `True ∧ True`, materializing `exact And.intro trivial trivial` only when the result is live, prompt-injection-scanned, non-authoritative, and same-statement bounded. The candidate still needs service-owned LeanRunner and downstream clean replay before any proof claim. Remaining work is broader mathematically meaningful repair synthesis, CAS live providers, real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task278 update: Pi goal-mode repair-hint execution can now perform an opt-in live `computation:sympy` POST against a configured SymPy-compatible endpoint, while default runs remain stubbed/offline. The service sends any `COMATH_SYMPY_API_KEY` only as an in-memory bearer header, records sanitized request/response hashes, provider status/content type, response body hash, prompt-injection scan, bounded computation report summaries, and no-authority vetoes, and threads the live computation result into repair tasks/execution without persisting secrets, emitting LeanRunManifest/FinalReplayManifest output, promoting claims, or certifying GA. Remaining work is using live computation/theorem-search/retrieval hints for mathematically meaningful repair synthesis plus real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task279 update: Pi goal-mode repair can now consume an opt-in live `computation:sympy` exact-symbolic `True` report as candidate material for a narrow closed decidable arithmetic equality class, materializing a same-name/same-statement Lean theorem/lemma with `by decide` only after prompt-injection scan pass and no-authority flags. The candidate still needs service-owned LeanRunner and downstream clean replay before any proof claim. Remaining work is broader mathematically meaningful repair synthesis, richer CAS/theorem-search classes, real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task280 update: Pi goal-mode export now carries sanitized `candidate_repair_provenance` for a live-computation-repaired candidate after final Lean clean replay passes, binding the live SymPy repair hint execution, campaign repair execution, and per-candidate repair execution by relative path/hash while keeping `proof_authority=none`, no promotion, and no host-root/secret leakage. Remaining work is broader mathematically meaningful repair synthesis, richer CAS/theorem-search classes, real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task281 update: Pi public campaign export now consumes that repair provenance without erasing its audit path/hash links. `comath.campaign.export` and `/cm:campaign export` preserve only the known no-authority `candidate_repair_provenance` reference paths while continuing to redact ordinary `.comath` runtime paths, host roots, secrets, proof-success wording, and promotion flags. Remaining work is broader mathematically meaningful repair synthesis, richer CAS/theorem-search classes, real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task282 update: Pi `/cm:research` goal-mode loop output now carries verified export traceability back into `export_descriptor` after terminal Lean clean replay authority is confirmed, including sanitized no-authority repair provenance path/hash references while keeping the descriptor non-promotional. Forged or missing export authority still withholds provenance and degrades proof terminal states to replayable blockers. Remaining work is broader mathematically meaningful repair synthesis, richer CAS/theorem-search classes, real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task283 update: Pi goal-mode repair can now consume a live `theorem_search:loogle` `Iff.intro` declaration hint as candidate material for the narrow locked iff class `True <-> True`, materializing `exact Iff.intro (fun _ => trivial) (fun _ => trivial)` only when the result is live, prompt-injection-scanned, non-authoritative, and same-statement bounded. The candidate still needs service-owned LeanRunner and downstream clean replay before any proof claim. Remaining work is broader mathematically meaningful repair synthesis, richer theorem-search/CAS classes, real Pi/operator closure, OS-isolation production helpers, and release-candidate proof breadth.
  Task290 update: service-owned operator/service transport closure review now binds the Task288 terminal completion certificate to the current Task247 durable-transport prerequisite, Task229 continuity checkpoint, and Task225 maintained transport contract by canonical path/hash before writing no-authority closure evidence. It records reviewed Node HTTP AgentRun log-session plus Pi `fetch`/`getText` primitive closure while keeping durable/live transport, proof authority, claim promotion, and GA certification false. Remaining work is a Pi consumer/planner bridge for the closure-review route, production helper integration, and final release-candidate proof breadth.
  Task291 update: `comath.release.piCodexLifecycleOperatorServiceTransportClosureReview`, `/cm:release lifecycle-operator-service-transport-closure-review`, Pi runtime registration, and the read-only planner checkpoint after the terminal completion certificate now expose the Task290 closure-review route through host-confirmed thin-client wiring. The bridge requires terminal completion certificate id/path/hash, strips model confirmation ids, converts only the terminal-certificate public alias inside the service request, does not expose public executor/result/caller-certificate fields, and keeps durable/live transport, Lean proof, claim promotion, GA certification, and direct Pi mutation authority false while preserving service-returned closure lifecycle flags.
  Task292 update: service-owned GA operational readiness review now binds the Task290 transport-closure review to the current Task167 adapter OS-isolation readiness review by canonical path/hash. The review may report release-candidate operational readiness only when OS-isolation readiness is already ready, while keeping proof authority, claim promotion, GA certification, durable/live transport, and direct Pi mutation authority false. Remaining work is Pi consumer wiring for this review, final GA certification, and release-candidate proof breadth.
  Task293 update: `comath.release.goal3GaOperationalReadinessReview`, `/cm:release goal3-ga-operational-readiness-review`, Pi runtime registration, and the read-only planner checkpoint after Task291 now expose the Task292 operational readiness route through host-confirmed thin-client wiring. The bridge requires Task290 transport-closure review id/path/hash and Task167 adapter OS-isolation review id/path/hash, strips model confirmation ids, converts only service-owned public aliases, omits caller proof/GA/executor/Lean/durable-session material, and keeps proof authority, claim promotion, GA certification, durable/live transport, and direct Pi mutation authority false while preserving service-returned readiness flags. Remaining work is final GA certification design, release-candidate proof breadth, and production OS helper closure.
  Task294 update: service-owned GA certification review now consumes the current Task292 operational readiness review by canonical path/hash, writes the existing GA acceptance diagnostic as no-authority support evidence, and fails closed with `blocked_release_candidate_ga_certification_prerequisites` while release-candidate proof breadth and the final GA certification audit remain incomplete. It keeps proof authority, claim promotion, GA certification, durable/live transport, and direct Pi mutation authority false. Remaining work is a Pi consumer for this certification-review route, final GA audit closure, release-candidate proof breadth, and production OS helper closure.
  Task295 update: `comath.release.goal3GaCertificationReview`, `/cm:release goal3-ga-certification-review`, Pi runtime registration, and the read-only planner checkpoint after Task293 now expose the Task294 certification-review precondition route through host-confirmed thin-client wiring. The bridge requires Task292 operational-readiness review id/path/hash, strips model confirmation ids, converts only the service-owned operational-readiness public alias, omits caller acceptance-report/proof-breadth/final-audit/proof-claim/GA-certificate/executor/Lean/durable-session material, and keeps proof authority, claim promotion, GA certification, durable/live transport, and direct Pi mutation authority false while preserving service-returned blocked certification-precondition flags. Remaining work is final GA audit closure, release-candidate proof breadth, and production OS helper closure.
  Task296 update: service-owned final GA audit now consumes the current Task294 certification-review id/path/hash, re-reads that canonical review plus its bound Task292 operational-readiness and Task294 acceptance-support artifacts, and writes an append-only blocked final-audit artifact. It makes final-audit evidence present but not passing: `final_ga_audit_available=true`, `final_ga_audit_passed=false`, `blocked_release_candidate_proof_breadth_incomplete`, `proof_authority=none`, `can_promote_claim=false`, `can_certify_ga=false`, and `ga_certificate_available=false`. Task297 closes the follow-up Pi consumer for this final-audit route; remaining work is release-candidate proof breadth and production OS helper closure.
  Task297 update: `comath.release.goal3FinalGaAudit`, `/cm:release goal3-final-ga-audit`, Pi runtime registration, and the read-only planner checkpoint after Task295 now expose the Task296 final-audit route through host-confirmed thin-client wiring. The bridge requires Task294 certification-review id/path/hash, strips model confirmation ids, converts only the service-owned certification-review public alias, omits caller acceptance-report/proof-breadth/final-audit/proof-claim/GA-certificate/executor/Lean/durable-session material, and keeps proof authority, claim promotion, GA certification, final-audit pass, GA-certificate, durable/live transport, and direct Pi mutation authority false while preserving service-returned blocked final-audit flags. Remaining work is release-candidate proof breadth and production OS helper closure.
  Task298 update: service-owned release-candidate proof-breadth review now derives the current 100-task positive manifest and positive-matrix batch inside `comathd`, persists append-only manifest/batch/review artifacts, ignores caller proof-breadth matrices, and records a no-authority provenance audit event. The review remains blocked with `proof_breadth_complete=false`, `clean_replay_passed_count=0`, `replayable_blocker_count=100`, `proof_authority=none`, `can_promote_claim=false`, `can_certify_ga=false`, and `ga_certification_gate_separate=true`; it does not run Lean, unblock final GA audit, promote claims, or certify GA. Remaining work is actual release-candidate proof breadth completion and production OS helper closure.
  Task299 update: PM-001 can now use task-local final-authority packaging and PM-001-inclusive tranches, removing a hard-coded 100-task proof-breadth dead end. This does not promote PM-001 or reuse the representative fixture: without PM-001 task-local Lean Authority v3 evidence, PM-001 remains `blocked_missing_final_evidence` with `proof_authority=none` and `can_promote_claim=false`. Remaining work is the actual proof-breadth closure verifier/execution and production OS helper closure.
  Task300 update: service-owned proof-breadth closure now derives the 100-task manifest, reads only canonical task-local final-authority packaging reports, blocks on missing/non-verified reports, and marks proof breadth complete only when all 100 reports carry verified Lean clean replay authority. The closure can make `final_ga_audit_unblocked=true` for proof breadth, but still cannot promote claims or certify GA. Remaining work is binding this closure into the final GA audit/certification path and production OS helper closure.
  Task301 update: final GA audit now consumes canonical Task300 proof-breadth closure id/path/hash material, blocks on missing or incomplete closure, rejects stale/tampered closure hashes, and can set `final_ga_audit_passed=true` only when complete proof breadth is bound. It still cannot promote claims, certify GA, or produce a GA certificate. Remaining work is binding passed final audit into GA certification and production OS helper closure.
  Task302 update: GA certification review now consumes canonical Task301 final-audit id/path/hash material, keeps missing or blocked final audit as blockers, and can return `ready_for_ga_certificate_gate` only when operational readiness plus passed final audit are current. It still cannot certify GA or produce a GA certificate. Remaining work is the actual certificate gate and production OS helper closure.
  Task303 update: service-owned GA certificate gate now consumes a ready Task302 certification review, re-reads the review-bound final audit by canonical id/path/hash/size, rejects blocked, stale, or mixed-provenance material, and emits an append-only GA certificate artifact. It certifies release readiness while keeping proof-claim promotion bound to ordinary Lean Authority gates. Remaining work is product-core service/release closure, especially production OS helper enforcement and any service-owned certificate consumption still needed by the GA gate; Pi/public consumers are secondary thin-client follow-through.
  Task304 update: agent-adapter OS-isolation production helper readiness now fails closed when the complete helper collection chain is sourced from a bundled provider-helper protocol asset or when collection-only source tampering disagrees with the current helper execution manifest. Readiness requires operator-configured production helper provenance, `production_helper_configured=true`, `bundled_protocol_asset=false`, a matching provider-helper `helper_execution_artifact`, and provider-family profile-contract lineage where available; helper-source material remains non-authoritative and cannot promote proof claims or certify GA by itself. Remaining work stays focused on product-core release closure before Pi/public thin consumers.
  Task305 update: GA operational readiness now consumes the Task304 production helper source binding instead of accepting legacy ready-looking OS-isolation reviews. `recordGoal3GaOperationalReadinessReview()` rejects adapter readiness material that lacks self-consistent `checks.production_helper_source`, `helper_profile_source="operator_configured_provider_helper"`, `production_helper_configured=true`, and `bundled_protocol_asset=false`, then records those fields in operational-readiness output and audit provenance. Remaining work stays product-core release closure; Pi/public consumers remain secondary.
  Task306 update: service-owned GA certificate source-bound consumption now closes the next product-core release link after Task305. `recordGoal3GaCertificateConsumptionReview()` consumes only a canonical Task303 certificate, re-reads the ready certification review, passed final GA audit, complete proof-breadth closure, and Task305 operational-readiness artifact by path/hash, and rejects any certificate chain whose operational readiness lacks source-bound production helper provenance. The resulting consumption artifact may certify release readiness but still keeps `can_promote_claim=false` and leaves proof-claim promotion to ordinary Lean Authority gates.

  Task307 update: service-owned source-bound release package generation now consumes the Task306 certificate-consumption artifact by canonical id/path/hash, rejects stale or source-less consumption material before package writes, generates sanitized source-review Markdown/HTML/JSON reports, reuses the source-review public archive assembler, runs the public archive review gate, and persists `.comath/release/goal3-source-bound-release-package/<id>/package.json`. The package is public diagnostic material only with `proof_authority="none"`, `can_promote_claim=false`, `can_certify_ga=false`, and `package_is_proof_authority=false`; Pi interaction remains secondary thin-client follow-through.

  Task308 update: service-owned source-only open-source review artifact generation now consumes the Task307 source-bound package by canonical id/path/hash, rejects stale package material, dirty source worktrees, and tracked runtime/build/cache entries before source archive writes, generates a `git archive` tar from `HEAD`, runs the public archive review gate over route and manifest surfaces, and persists `.comath/release/goal3-source-only-open-source-review-artifact/<id>/source-artifact.json`. The artifact is open-source review material only with `proof_authority="none"`, `can_promote_claim=false`, `can_certify_ga=false`, and `source_artifact_is_proof_authority=false`; Pi interaction remains secondary thin-client follow-through.

  Task309 update: service-owned source artifact presentation review generation now consumes the Task308 source-only review artifact by canonical id/path/hash, re-reads the source artifact manifest and its bound `source.tar` bytes before presentation writes, rejects stale hashes or proof-authority/GA overclaims, runs the public archive review gate over route and presentation manifest surfaces, and persists `.comath/release/goal3-source-artifact-presentation-review/<id>/presentation.json`. The presentation/download descriptor is public diagnostic material only with `proof_authority="none"`, `can_restore=false`, `can_promote_claim=false`, `can_certify_ga=false`, and `presentation_is_proof_authority=false`; Pi interaction remains secondary thin-client follow-through.

  Task310 update: service-owned source release public checklist generation now consumes the Task309 presentation review by canonical id/path/hash, re-reads the presentation manifest, its bound public archive review, and the `source.tar` bytes before checklist writes, rejects stale hashes or restorable/proof-authority overclaims, runs the public archive review gate over route and checklist manifest surfaces, and persists `.comath/release/goal3-source-release-public-checklist/<id>/checklist.json`. The checklist is public diagnostic material only with `proof_authority="none"`, `can_restore=false`, `can_promote_claim=false`, `can_certify_ga=false`, `checklist_is_proof_authority=false`, and explicit `external_notarization_status="not_configured"` / `os_immutable_storage_status="not_configured"`; Pi interaction remains secondary thin-client follow-through.

  Task311 update: service-owned source release external evidence binding now consumes the Task310 checklist by canonical id/path/hash, re-reads the checklist and bound `source.tar` bytes, binds separate operator-provided external-notarization and OS-immutable-storage evidence files by path/hash, rejects stale checklist/archive/evidence material or any evidence that claims external verification, restore, proof authority, claim promotion, or GA certification, runs the public archive review gate over route and binding manifest surfaces, and persists `.comath/release/goal3-source-release-external-evidence-binding/<id>/external-evidence-binding.json`. The binding is public diagnostic material only with `external_verification_performed=false`, `requires_future_external_verification=true`, `proof_authority="none"`, `can_restore=false`, `can_promote_claim=false`, `can_certify_ga=false`, and `binding_is_proof_authority=false`; Pi interaction remains secondary thin-client follow-through.
  Task312 source release evidence chain check-debug update: the external evidence binding gate now revalidates the Task310 checklist's public archive review manifest by canonical id/path and service-owned audit hash/size before accepting operator evidence, rejects missing or tampered Task310 public review manifests with no partial binding writes, and records the checklist public archive review artifact hash/current status in Task311 binding and audit evidence. This still leaves real external-provider verification, OS-level immutable storage, provider daemon/policy inspection, durable transport hardening, and final public/Pi consumers open.
  Task313 external provider verification update: the source-release provider verification gate now consumes the current Task311 binding by canonical id/path/hash, re-reads the Task310 public-review chain and selected operator evidence, sends a service-owned verification request to the configured provider URL, and accepts only provider responses that bind the same binding/source/evidence/receipt material while keeping `proof_authority="none"`, `can_restore=false`, `can_promote_claim=false`, and `can_certify_ga=false`. This closes the first live provider-response binding gap, while OS-level immutable storage enforcement, provider daemon/policy inspection, durable transport hardening, and final public/Pi consumers remain open.
  Task314 provider policy inspection update: the source-release provider policy inspection gate now consumes the current Task313 provider verification by canonical id/path/hash, re-checks its public-review provenance, selected operator evidence, source archive, provider response hashes, and receipt id, sends a service-owned policy-currentness request to the configured provider policy URL, and accepts only responses that bind the same Task313/source/evidence/receipt/provider material while keeping `proof_authority="none"`, `can_restore=false`, `can_promote_claim=false`, `can_certify_ga=false`, and `requires_separate_os_immutability_attestation=true`. This closes provider policy inspection beyond response binding, while real OS-level immutable storage enforcement/attestation, durable transport hardening, and final public/Pi consumers remain open.
  Task315 OS immutability attestation update: the source-release OS immutability attestation gate now consumes only current Task314 policy inspections for `os_immutable_storage`, re-checks Task314 public-review provenance, Task313 verification bytes, operator evidence, source archive, provider policy response hashes, daemon identity, and policy document hashes, then accepts only an external OS attestation response that binds the same material while keeping `proof_authority="none"`, `can_restore=false`, `can_promote_claim=false`, `can_certify_ga=false`, `co_math_os_immutability_enforced=false`, and `requires_separate_lean_authority=true`. This closes the executable OS-attestation binding gap, while durable transport hardening and final public/Pi consumers remain open.
  Task316 Pi source-release OS attestation consumer update: the Pi extension now exposes `comath.release.goal3SourceReleaseOsImmutabilityAttestation` and `/cm:release goal3-source-release-os-immutability-attestation` as a host-confirmed thin client over the Task315 service route, with matching public policy-inspection alias translation, caller proof/Lean/GA/restore/attestation material stripping, read-only planner exposure, and public sanitizer coverage for proof/restore/GA/OS-enforcement overclaims. This closes the immediate Task315 Pi consumer bridge while durable transport hardening, final release signoff, and any broader source-release UX polish remain open.
  Task317 durable transport release-signoff prerequisite update: `recordGoal3DurableTransportReleaseSignoffPrerequisite()` and `POST /release/goal3/durable-transport-release-signoff-prerequisite` now consume a current Task292 operational-readiness artifact, re-read the bound Task290 transport-closure review and its nested terminal certificate, durable-transport prerequisite contract, transport continuity, and maintained transport contract artifacts by path/hash/size, and reject stale or overclaiming nested transport material with no partial writes. The prerequisite is intentionally blocked with `durable_long_lived_transport_not_provided`; it records maintained primitive freshness without providing durable/live transport, proof authority, claim promotion, or GA certification.
  Task318 final release-signoff decision update: `recordGoal3FinalReleaseSignoffDecision()` and `POST /release/goal3/final-release-signoff-decision` now consume the Task317 durable-transport prerequisite and Task315 source-release OS attestation by canonical id/path/hash, re-read source archive, operator evidence, and policy-inspection material, and persist a blocked final signoff decision with `durable_long_lived_transport_not_provided`, `final_ga_certificate_not_bound`, `ga_release_signoff_ready=false`, `proof_authority="none"`, `can_promote_claim=false`, and `can_certify_ga=false`. This is a release-signoff blocker/decision artifact, not GA certification.
  Task319 durable transport release-signoff verification update: `recordGoal3DurableTransportReleaseSignoffVerification()` and `POST /release/goal3/durable-transport-release-signoff-verification` now consume the current Task317 prerequisite, re-read its nested transport-chain artifacts, and either persist `external_durable_transport_evidence_not_bound` or bind a service-owned maintained-external transport evidence artifact with route/client primitive and daemon/session-policy hashes. This is transport provenance for release signoff only; it does not create proof authority, build a CoMath WebSocket/SSE stack, promote claims, or certify GA.
  Task320 Task319 final release-signoff consumption update: `recordGoal3FinalReleaseSignoffDecision()` and `POST /release/goal3/final-release-signoff-decision` now accept optional Task319 durable-transport verification id/path/hash, require it to match the same Task317 prerequisite, re-check external transport freshness, and clear only the durable blocker when verified transport provenance is current. Final signoff readiness requires both verified Task319 transport and existing Task306 GA certificate consumption, while the signoff artifact remains `proof_authority="none"`, `can_promote_claim=false`, and `can_certify_ga=false`.
  Task321 final release-chain check-debug update: the Task321 focused regression now keeps Task317-320, Task306, Task315, capability exposure, phase0 smoke discovery, and public release-hardening docs synchronized. This is check-debug coverage only; it adds no new proof authority, claim promotion, CoMath-owned durable transport stack, or GA certification.
  Task322 final release signoff certification-boundary review update: `recordGoal3FinalReleaseSignoffCertificationBoundaryReview()` and `POST /release/goal3/final-release-signoff-certification-boundary-review` now consume only a current Task320 ready signoff by canonical id/path/hash, re-read its Task306 GA certificate consumption, Task319 durable transport verification, external durable transport evidence freshness, Task315 OS attestation, source archive, and operator evidence, and persist append-only review provenance. The consumed GA certificate remains the only certifying artifact; the Task322 boundary review keeps `proof_authority="none"`, `can_promote_claim=false`, `can_certify_ga=false`, `boundary_review_is_certificate=false`, and `ga_certificate_issued=false`.
  Task323 final release-candidate closure audit update: `recordGoal3FinalReleaseCandidateClosureAudit()` and `POST /release/goal3/final-release-candidate-closure-audit` now consume only a current Task322 certification-boundary review by canonical id/path/hash, then re-read the bound Task320 final signoff, Task306 certificate consumption, Task319 durable transport verification plus Task317 nested transport chain, external durable transport evidence freshness, Task315 policy-inspection/source-release OS attestation chain, source archive, and operator evidence. The closure audit records final release-candidate boundary currentness while keeping `proof_authority="none"`, `can_promote_claim=false`, `can_certify_ga=false`, `release_candidate_closure_audit_is_certificate=false`, and `ga_certificate_issued=false`.
  Task324 final release-candidate check-debug update: the Task324 focused regression keeps Task322-323, Task320/306/319/317/315 dependencies, capability exposure, phase0 smoke discovery, service route wiring, reduced-chain regression coverage, and public release-hardening docs synchronized. This is check-debug coverage only; it adds no new release route, Pi consumer, Lean replay, proof authority, claim promotion, closure certificate, or GA certification.
  Task325 Pi final release-candidate closure audit consumer update: the Pi extension now exposes `comath.release.goal3FinalReleaseCandidateClosureAudit` and `/cm:release goal3-final-release-candidate-closure-audit` as a host-confirmed thin client over the Task323 service route, with matching public Task322 certification-boundary alias translation, model confirmation stripping, caller proof/Lean/GA/proof-breadth/closure-certificate/durable-transport material stripping, read-only planner exposure, and public sanitizer coverage for proof/transport/GA/closure-certificate overclaims. This closes the immediate Task323 Pi/public consumer gap while broad proof-breadth execution remains separate release-candidate audit debt.
  Task326 proof-breadth execution bridge update: `recordGoal3ReleaseCandidateProofBreadthExecutionBridge()` and `POST /release/goal3/proof-breadth-execution-bridge` now derive the current positive-matrix state from canonical packaging reports, select the next bounded missing/blocked PM tranche, persist append-only bridge provenance, and ignore caller proof-breadth material. The bridge is execution planning only: it does not run Lean, synthesize proofs, close proof breadth, unblock final GA audit, promote claims, or certify GA.
  Task327 proof-breadth bridge check-debug update: the focused regression keeps Task326, Task298/300/301 proof-breadth boundaries, service route wiring, capability exposure, phase0 smoke discovery, and public release-hardening wording synchronized. This is check-debug coverage only; it adds no route, Pi consumer, Lean replay, proof synthesis, proof-breadth closure, final-GA-audit unblock, claim promotion, or GA certification.
  Task328 Pi proof-breadth review consumer update: `comath.release.goal3ProofBreadthReview`, `/cm:release goal3-proof-breadth-review`, runtime registration, and the read-only planner now expose Task298 as a host-confirmed thin client. The Pi layer forwards only project/actor, optional `proof_breadth_review_id`, and `requested_review_mode`, strips caller proof-breadth matrices, proof claims, Lean manifests, GA certificates, executor commands, durable transport sessions, and confirmation ids, and sanitizes public output back to blocked-review/no-authority semantics. Remaining work is Task300 proof-breadth closure public consumption, proof-breadth execution follow-through, and final-GA-audit closure-binding public inputs.
  Task329 Pi proof-breadth closure consumer update: `comath.release.goal3ProofBreadthClosure`, `/cm:release goal3-proof-breadth-closure`, runtime registration, package-test discovery, phase0 smoke discovery, and the read-only planner now expose Task300 as a host-confirmed thin client. The Pi layer forwards only project/actor, `proof_breadth_closure_id`, and `requested_closure_mode`, strips caller proof-breadth matrices, closure JSON, Task326 bridge output, proof claims, Lean manifests, GA certificates, executor commands, durable transport sessions, and confirmation ids, and sanitizes public output so service-owned closure status/counts remain visible while proof-authority wording, claim promotion, GA certification, and certificate flags stay non-authoritative. Remaining work is proof-breadth execution follow-through and final-GA-audit closure-binding public inputs.
  Task330 proof-breadth Pi closure check-debug update: the focused regression keeps Task328/329 Pi proof-breadth consumers synchronized with Task300 closure verification, Task301 final-audit closure binding, Task326 execution-planning-only semantics, capability exposure, phase0 discovery, Pi package discovery, planner ordering, and public release-hardening wording. This is check-debug coverage only; it adds no route, Pi tool, Lean replay, proof synthesis, proof-breadth execution follow-through, final-GA-audit input consumer, claim promotion, final-audit unblock, or GA certification.
  Task331 Pi final-GA-audit closure-binding consumer update: the existing `comath.release.goal3FinalGaAudit` and `/cm:release goal3-final-ga-audit` Pi surface now accepts an optional all-or-none Task300 `proof_breadth_closure_id/path/sha256` triple and forwards it to the Task301 final-audit route together with the required Task294 certification-review triple. The Pi layer translates only matching `service-owned-goal3-proof-breadth-closure/<id>/closure.json` aliases, rejects partial/mismatched closure bindings before POST, strips caller proof-breadth matrix/closure JSON/Task326 bridge/final-audit JSON/proof/Lean/GA/executor/durable-session material and confirmation ids, keeps planner/read-only/package/phase0 discovery synchronized, and publicizes only non-certifying service-owned final-audit status while proof authority, claim promotion, GA certification, certificate issuance, direct Pi mutation, and durable/live transport remain false. Remaining work is proof-breadth execution follow-through and final release-candidate audit debt.
  Task332 proof-breadth execution follow-through update: `recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough()` and `POST /release/goal3/proof-breadth-execution-follow-through` now consume only a current Task326 bridge `id/path/sha256`, hash-bind and re-read that bridge, inspect only the selected PM tasks' canonical final-authority packaging report paths, and persist append-only selected-tranche status/provenance. It can mark a selected tranche ready for a future Task300 closure recheck when all selected tasks are already verified, but it does not run Lean, synthesize proofs, write missing packaging reports, expose Pi/public authority, close global proof breadth, unblock final GA audit, promote claims, or certify GA. Remaining work is actual proof-breadth execution evidence for open PM tasks plus final release-candidate audit debt.
  Task333 proof-breadth follow-through check-debug update: the focused regression now keeps Task332 follow-through synchronized with Task326 bridge planning, Task300 closure verification, Task301 final-audit binding, capability exposure, phase0/default discovery, service route wiring, no-Pi-public-surface boundaries, and public release-hardening wording. This is check-debug coverage only; it adds no route, Pi tool, Lean replay, proof synthesis, missing packaging report writer, proof-breadth closure, final-audit unblock, claim promotion, or GA certification.
  Task334 task-local Lean Authority packaging follow-through update: `recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough()` and `POST /release/goal3/task-local-lean-authority-packaging-follow-through` now consume only a current Task326 bridge `id/path/sha256`, reject unselected PM evidence, re-run the existing project-local final-authority v3 packaging verifier for selected PM tasks, and persist append-only non-certifying provenance. The helper may write selected canonical PM packaging reports as verified or blocked according to local evidence, but it does not run Lean, trust caller success metadata, write Task300 closure or Task301 final-audit artifacts, expose Pi/public authority, close proof breadth, unblock final GA audit, promote claims, or certify GA. Remaining work is broad proof-breadth execution evidence and final release-candidate audit debt.
  Task335 selected-tranche packaging results follow-up update: `recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp()` and `POST /release/goal3/selected-tranche-packaging-results-follow-up` now consume only a current Task326 bridge `id/path/sha256` plus a current Task334 follow-through `id/path/sha256`, hash-bind both artifacts, reject Task334/bridge selected-tranche drift, re-hash only the selected canonical PM packaging reports recorded by Task334, and reuse the Task332 selected-tranche recheck witness. This records currentness for a later Task300 closure recheck only; it does not run Lean, trust Task334 summary success, inspect unselected PM tasks, write Task300 closure or Task301 final-audit artifacts, expose Pi/public authority, close proof breadth, unblock final GA audit, promote claims, or certify GA. Remaining work is broad proof-breadth execution evidence and final release-candidate audit debt.
  Task336 selected-tranche packaging results check-debug update: the focused regression now keeps Task335 synchronized with Task334 packaging writes, Task332 selected-tranche recheck witnessing, Task326 bridge planning, Task300 closure verification, Task301 final-audit binding, capability exposure, phase0/default discovery, route wiring, no-Pi-public-surface boundaries, and public release-hardening wording. This is check-debug coverage only; it adds no route, Pi tool, Lean replay, proof synthesis, packaging writer, proof-breadth closure, final-audit unblock, claim promotion, or GA certification.
  Task337 selected-tranche closure recheck update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck()` and `POST /release/goal3/selected-tranche-closure-recheck` now consume only a current Task335 selected-tranche packaging-results follow-up id/path/hash, reject stale Task335 material, re-hash the selected canonical PM packaging reports before action, and invoke the existing Task300 proof-breadth closure verifier to produce a global closure recheck artifact. The Task337 artifact binds the selected tranche to Task300 recheck output but keeps `proof_authority=none`, claim promotion false, GA certification false, no Lean execution, no Pi/public surface, and no Task301 final-audit writes. Remaining work is broad proof-breadth execution evidence across the rest of the matrix plus final release-candidate audit debt.
  Task338 selected-tranche next execution bridge update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge()` and `POST /release/goal3/selected-tranche-next-execution-bridge` now consume only a current Task337 selected-tranche closure recheck id/path/hash, reject stale Task337 or Task300 closure material, re-hash the completed selected PM packaging reports, and delegate to the existing Task326 bridge to select the next bounded missing/blocked PM tranche. The artifact keeps `proof_authority=none`, claim promotion false, GA certification false, no Lean execution, no Pi/public surface, no Task301 writes, and no selected-tranche-as-global-closure overclaim.
  Task339 selected-tranche next bridge check-debug update: the focused regression keeps Task338 synchronized with Task337 closure rechecks, Task326 bridge planning, Task300 closure verification, Task301 final-audit binding, Task334/335/336 selected-tranche packaging currentness, capability exposure, phase0/default discovery, route wiring, no-Pi-public-surface boundaries, and public release-hardening wording. This is check-debug coverage only; it adds no route, Pi tool, Lean replay, proof synthesis, packaging writer, proof-breadth closure, final-audit unblock, claim promotion, or GA certification.
  Task340 selected-tranche next packaging follow-through update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough()` and `POST /release/goal3/selected-tranche-next-packaging-follow-through` now consume only a current Task338 selected-tranche next execution bridge id/path/hash, reject stale Task338 or delegated Task326 bridge material, reject missing next bridges and selected-tranche drift, and delegate selected PM evidence to the existing Task334 task-local packaging follow-through. The artifact binds Task338, the delegated Task326 bridge, and the Task334 follow-through artifact while keeping `proof_authority=none`, no Lean execution, no Pi/public surface, no Task300/Task301 writes, no claim promotion, no GA certification, and no selected-tranche-as-global-closure overclaim.
  Task341 selected-tranche next packaging results follow-up update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp()` and `POST /release/goal3/selected-tranche-next-packaging-results-follow-up` now consume only a current Task340 selected-tranche next packaging follow-through id/path/hash, re-read and hash-bind that artifact, and reuse Task335 currentness semantics over the Task340-bound delegated Task326 bridge plus Task334 follow-through artifact. This records selected-tranche packaging-result freshness for later closure recheck only; it does not run Lean, write packaging reports, call Task300/Task301, expose Pi/public authority, close proof breadth, unblock final GA audit, promote claims, issue certificates, or certify GA.
  Task342 selected-tranche next packaging currentness check-debug update: the focused regression keeps Task340 packaging follow-through and Task341 packaging-results currentness synchronized with Task338 next-bridge selection, Task335 currentness witnessing, Task334 task-local packaging, Task326 bridge planning, Task300 closure verification, Task301 final-audit binding, capability exposure, phase0/default discovery, route wiring, no-Pi-public-surface boundaries, and public release-hardening wording. This is check-debug coverage only; it adds no route, Pi tool, Lean replay, proof synthesis, packaging writer, proof-breadth closure, final-audit unblock, claim promotion, certificate issuance, or GA certification.
  Task343 selected-tranche next closure recheck update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck()` and `POST /release/goal3/selected-tranche-next-closure-recheck` now consume only a current Task341 selected-tranche next packaging results follow-up id/path/hash, reject stale Task341 or selected PM packaging report material, and bind the selected tranche into existing selected-tranche closure recheck / Task300 aggregate closure semantics. This handoff remains non-certifying: it does not run Lean, write packaging reports, expose Pi/public authority, write Task301 final-GA-audit artifacts, close proof breadth by itself, unblock final GA audit by itself, promote claims, issue certificates, or certify GA.
  Task344 selected-tranche next closure execution bridge update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge()` and `POST /release/goal3/selected-tranche-next-closure-execution-bridge` now consume only a current Task343 selected-tranche next closure recheck id/path/hash, reject stale Task343 material, preserve Task343-bound Task300 closure and selected PM packaging-report currentness checks through Task338 semantics, and delegate to Task338/Task326 for the next bounded PM tranche. This bridge remains non-certifying: it does not run Lean, synthesize proofs, write packaging/currentness/closure/final-audit artifacts, expose Pi/public authority, close proof breadth by itself, unblock final GA audit by itself, promote claims, issue certificates, or certify GA.
  Task345 selected-tranche next closure bridge check-debug update: the focused regression keeps Task343 and Task344 synchronized with Task338 selected-tranche next execution planning, Task326 bounded execution planning, Task300 aggregate proof-breadth closure authority, Task301 final-audit binding, capability exposure, phase0/default discovery, route wiring, no-Pi-public-surface boundaries, and public release-hardening wording. This is check-debug coverage only; it adds no route, Pi tool, Lean replay, proof synthesis, packaging/currentness/closure/final-audit writer, final-audit unblock, claim promotion, certificate issuance, or GA certification.
  Task346 selected-tranche next closure packaging follow-through update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough()` and `POST /release/goal3/selected-tranche-next-closure-packaging-follow-through` now consume only a current Task344 selected-tranche next closure execution bridge id/path/hash, reject stale Task344 or delegated Task338/Task326 material, reject missing next bridges and unselected PM evidence, and delegate packaging only through the existing Task340/Task334 path. This remains non-certifying service plumbing: it does not run Lean, synthesize proofs, write Task300 closure or Task301 final-audit artifacts, expose Pi/public authority, close proof breadth by itself, unblock final GA audit, promote claims, issue certificates, or certify GA.
  Task347 selected-tranche next closure packaging results follow-up update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp()` and `POST /release/goal3/selected-tranche-next-closure-packaging-results-follow-up` now consume only a current Task346 selected-tranche next closure packaging follow-through id/path/hash, reject stale Task346 and Task340 packaging material through Task341 currentness reuse, canonical-validate Task346-embedded Task344/Task338 provenance, bind Task340/Task341 artifact references, preserve Task335 currentness transitively through Task341, and keep selected-tranche packaging results as non-certifying currentness evidence only. It does not run Lean, synthesize proofs, write Task300 closure, Task301 final-audit, or GA-certificate artifacts, expose Pi/public authority, close proof breadth by itself, unblock final GA audit, promote claims, issue certificates, or certify GA.

  Task348 selected-tranche next closure packaging/currentness check-debug update: `goal3-task348-selected-tranche-next-closure-packaging-currentness-check-debug.test.mjs` now keeps Task346/347 route/export/status/smoke/default discovery, Task346 Task344/338 binding, Task347 Task346/341 binding, Task341/335 currentness semantics, Task300/301/303 authority separation, no Pi surface, no Lean execution, and no closure/final-audit/GA-certificate write boundaries synchronized. It adds no new route, proof execution, claim promotion, certificate issuance, or GA certification.
  Task349 selected-tranche next closure packaging results closure recheck update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck()` and `POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-recheck` consume only a current Task347 selected-tranche next closure packaging results follow-up id/path/hash, revalidate Task347-embedded Task346/344/338/340/341/335/334 currentness references, and delegate selected-tranche closure recheck to existing Task343/Task300 semantics. The wrapper records append-only non-certifying provenance only; it does not run Lean, synthesize proofs, call Task326/334/340/341 producer paths directly, expose Pi/public authority, write Task301 final-audit or Task303 GA-certificate artifacts, promote claims, issue certificates, or certify GA.
  Task350 selected-tranche next closure packaging results closure execution bridge update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge()` and `POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-bridge` consume only a current Task349 selected-tranche next closure packaging results closure recheck id/path/hash and delegate next selected-tranche closure execution through existing Task344/338 bridge semantics. The wrapper records append-only non-certifying provenance only; it does not run Lean, synthesize proofs, call Task326/338 producer paths directly, expose Pi/public authority, write Task301 final-audit or Task303 GA-certificate artifacts, promote claims, issue certificates, or certify GA.
  Task351 selected-tranche next closure results-to-execution check-debug update: `goal3-task351-selected-tranche-next-closure-results-to-execution-check-debug.test.mjs` keeps Task349/350 route/export/status/smoke/default discovery, Task349's Task347-bound Task343/300 closure-recheck handoff, Task350's Task349-bound Task344/338 closure-execution handoff, Task344/338/326 execution boundaries, Task300/301/303 authority separation, no Pi surface, no Lean execution, and no closure/final-audit/GA-certificate write boundaries synchronized. It adds no route, proof execution, claim promotion, certificate issuance, or GA certification.
  Task352 selected-tranche next closure execution packaging follow-through update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough()` and `POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through` consume only a current Task350 selected-tranche next closure packaging results closure execution bridge id/path/hash and delegate packaging through existing Task346/340/334 semantics. The wrapper records append-only non-certifying provenance only; it does not run Lean, synthesize proofs, call Task326/334/338/340 producer paths directly, expose Pi/public authority, write Task300 closure, Task301 final-audit, or Task303 GA-certificate artifacts, promote claims, issue certificates, or certify GA.
  Task353 selected-tranche next closure execution packaging results follow-up update: `recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp()` and `POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up` consume only a current Task352 selected-tranche next closure execution packaging follow-through id/path/hash, validate the Task352-bound delegated Task346 artifact reference, and delegate selected-tranche packaging-results currentness through existing Task347/341/335 semantics. The wrapper records append-only non-certifying provenance only; it does not run Lean, synthesize proofs, call producer paths directly, expose Pi/public authority, write Task300 closure, Task301 final-audit, or Task303 GA-certificate artifacts, promote claims, issue certificates, or certify GA.
  Task354 selected-tranche closure execution packaging results currentness check-debug update: `goal3-task354-closure-exec-packaging-results-currentness-check-debug.test.mjs` keeps Task352/353 route/export/status/smoke/default discovery, Task352's Task350-bound Task346/340/334 packaging handoff, Task353's Task352-bound Task347/341/335 currentness handoff, Task346/347/341/335 delegated currentness boundaries, Task300/301/303 authority separation, no Pi surface, no Lean execution, and no closure/final-audit/GA-certificate write boundaries synchronized. It adds no route, proof execution, proof synthesis, claim promotion, certificate issuance, or GA certification.
- [ ] Remaining public source-review package assembly and download presentation hardening beyond Task145: future public review package consumers, richer UI ergonomics, external notarization provider verification policy inspection, and richer immutable-storage/notary consumer UX. Task140 closed the Pi-host project-relative snapshot manifest UX gap, Task141 added a service-owned source-review public archive assembly route for sanitized Markdown/HTML/JSON diagnostic reports with non-authority semantics and project-relative paths, Task142 added a service-owned public archive review gate for cross-route manifests/payloads, Task143 exposed those release/review routes through Pi tools plus `/cm:release` without direct `.comath/` writes or proof-authority wording leaks, Task144 hardened public archive review error responses for missing or non-file referenced public reports without host-path echoes, Task145 added tamper-evident notarization-policy sidecar evidence plus review-gate vetoes for missing or mismatched sidecars without claiming OS-level immutability or external notarization, Task310 closes the service-owned checklist surface, Task311 binds operator-provided external evidence to the checklist/source tar, Task313 verifies one provider response against that binding, Task314 inspects the provider policy-currentness response, Task315 binds a current external OS immutability attestation, Task316 exposes that attestation through a host-confirmed Pi consumer, and Task325 exposes the final release-candidate closure audit through a host-confirmed Pi consumer while leaving broader public UX polish open.
- [ ] Stronger runner re-execution sandboxing beyond Phase 36 provenance, Phase 55 environment drift gates, and Phase 77 service-level network-denial environment policy: OS-level isolation and kernel/firewall-enforced network denial.
- [ ] OS-level process sandboxing beyond the Phase 28 `shell:false` allowlist, timeout, cancellation, scoped-write controls, Phase 39 project-level lock primitive, and Phase 40 AgentRun scheduler lock integration.
- [ ] Richer statement equivalence beyond Phase 54 declaration parsing, Phase 37 registered aliases, Phase 56 direct registered logical-equivalence witnesses, Phase 78 registered transitive witness chains, Phase 79 blocked plan artifacts, Phase 80 bounded witness materialization, and Task112 artifact-backed equivalence replay gating: automatic proof search/execution outside registered bounded materializations, automatically discovered semantic equivalence, and broader mathematical-domain trust profiles.

## Design Documentation Goal

- [x] Complete full development plan.
- [x] Complete full goal runbook with Phase 0-17 goals.
- [x] Add end-state blueprint.
- [x] Add acceptance matrix.
- [x] Add risk register.
- [x] Add agent operating model.
- [x] Add design handoff.
- [x] Extend smoke test to check design documents and key sections.
