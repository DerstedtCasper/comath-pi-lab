# REVIEW

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
