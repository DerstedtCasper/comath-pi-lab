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

- [x] Add native `services/comathd/src/proof-kernel` campaign, ensemble, Lean replay, static audit, dependency closure, axiom profile, and statement-equivalence modules.
- [x] Add service-owned `ResearchCampaign` routes for start, status, next-actions, tick, final-audit, replay, pause, and resume.
- [x] Require `formally_checked` promotion to bind to a passed proof-kernel `final_replay_manifest.json` for the requested claim.
- [x] Add a positive Lean vertical slice for `Nat.add_zero`: problem lock, 8 candidate manifests, candidate audit artifacts, final clean replay, gate promotion, and replay route.
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
- [x] Keep production Pi runtime registration and real child-agent scheduling deferred; the loop is a tested thin-client product path over `comathd`.

## Phase 23: Proof-Kernel Theorem-Family Registry

- [x] Add a registered theorem-family layer for supported elementary Nat targets while keeping `C0001`, `PO-0001`, and the 8-candidate ensemble contract stable.
- [x] Add a positive Lean campaign slice for `Nat.mul_zero`: lock `n * 0 = 0`, generate family-specific candidates, run clean replay, promote the claim, and support `/campaign/:id/replay`.
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

## Known Deferred Items

These items block global GA readiness until each one is implemented and validated with executable evidence.

- [ ] Broad proof planning and theorem synthesis beyond registered theorem families (`Nat.add_zero`, `Nat.mul_zero`) and exact `n + 1 = n` refutation.
- [ ] Real MathProve execution beyond the fail-closed bridge mock and native CoMath proof-kernel slices.
- [ ] Real agent runner/scheduler that launches and rate-limits persistent Pi/Codex child agents rather than only static definitions and service-owned campaign ticks.
- [ ] Production Pi extension runtime registration, after official API assumptions are revalidated against the installed Pi version.
- [ ] Native TriviumDB performance and persistence validation on the target platform.
- [ ] Stronger runner re-execution sandboxing: OS-level isolation, network-denial enforcement, dependency lock capture, and cross-machine replay validation beyond the Phase 24 service-owned re-execution checks.
- [ ] Richer statement equivalence, Lean parser integration, and configurable trust profiles for broader mathematical domains.

## Design Documentation Goal

- [x] Complete full development plan.
- [x] Complete full goal runbook with Phase 0-17 goals.
- [x] Add end-state blueprint.
- [x] Add acceptance matrix.
- [x] Add risk register.
- [x] Add agent operating model.
- [x] Add design handoff.
- [x] Extend smoke test to check design documents and key sections.
