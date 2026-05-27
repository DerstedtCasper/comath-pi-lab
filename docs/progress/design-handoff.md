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
- full target development plan;
- full Codex goal runbook;
- end-state blueprint;
- acceptance matrix;
- risk register;
- agent operating model;
- Phase 0 handoff.

Phase 0-17 Research Alpha implementation is complete, and Phase 18 adds native GA proof-kernel vertical slices. Final validation evidence is recorded in `REVIEW.md`.

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
/goal Start the next generalization phase for generic proof planning, real MathProve execution, Pi runtime registration, TriviumDB native evaluation, and runner re-execution replay.
```

Do not start generalization implementation without opening a new explicit goal. Research Alpha and Phase 18 validation evidence is recorded in `REVIEW.md`.

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
- Missing service list APIs should be reported as `degraded` read-model limitations, not bypassed from Pi extension code.
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
- Remaining generalization work: broader proof planning, real MathProve execution, production Pi registration, native TriviumDB target validation, generic runner re-execution, richer statement equivalence, and a real persistent child-agent runner.

## Verification To Run At Phase Boundary

```text
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
```
