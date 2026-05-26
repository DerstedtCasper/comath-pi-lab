# REVIEW

## Current Product Readiness Verdict

CoMath Pi Lab is currently **Production Formal Workbench Core, not GA**.

Fresh targeted remediation has closed the highest-risk local correctness gaps identified by subagent review: gate/provenance/audit append-only ledgers no longer use read-count IDs, gate results are appended instead of rewriting JSONL, promotion and formal-proof metadata writes compare against the evaluated claim version, session locks require a `lock_id` capability token, release cleanup removes recovery sentinels after malformed lock reads, and external runtime evidence validation rejects placeholder-only signoff files.

This is sufficient for an internally validated local production-core workbench once full CI-equivalent verification passes. It is not sufficient for external GA until installed Pi runtime evidence, full MathProve workspace-runner evidence, native TriviumDB target evidence, runner re-execution replay, package/release artifacts, DLP-grade scanning, and multi-process locking stress evidence are attached and reviewed.

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

CoMath Pi Lab is now a working Research Alpha local mathematical workbench prototype with service-mediated mutation, auditable artifacts, gates, paper provenance, snapshot verification, and Pi thin-client descriptors. It is not yet a production mathematical workbench or proof authority: Lean/MathProve kernel execution, production Pi runtime registration, native TriviumDB target validation, OS/network sandboxing, multi-process locks, and runner re-execution replay remain Research Beta work.

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

Research Alpha remains an auditable local prototype. Real Lean kernel proof checking, production Pi runtime registration, native TriviumDB performance evaluation, full DLP-grade secret scanning, and runner re-execution replay are Research Beta candidates rather than completed Phase 17 capabilities.

## Production Formal Workbench Review Log

### Scope

This production formal workbench slice upgrades the Research Alpha prototype with authoritative formal proof run contracts, a provenance ledger, paper spans, derived-index semantics, official Pi adapter compatibility, and session-level mutation serialization.

The slice does not claim installed Pi runtime certification, target-platform native TriviumDB performance validation, a full MathProve skill workspace runner, distributed locking, or runner re-execution replay.

### P1-P5 Changes

- P1 Formal Proof Authority: `formally_checked` now requires a trusted Lean4 formal proof run with `status=kernel_checked`, `kernel_checked=true`, no `sorry`, no `admit`, proof/log artifacts, matching project ID, matching claim ID, and requested artifact binding. Formalization, dependency closure, and proof audit are three separate certification records; `certifyClaimForFormalProof()` only confirms all authorities are already present.
- P1 Lean Execution Boundary: caller-supplied Lean executables are rejected as proof authority; `runLeanProofCheck()` records them as fail-closed runs rather than executing them.
- P1 MathProve Manifest: the MathProve bridge remains fail-closed but now writes a durable `mathprove_run_manifest` into bridge reports, audit payloads, and provenance payloads.
- P2 Provenance Ledger And Paper Spans: formal proof runs, MathProve runs, paper span recording, and index rebuilds are represented as append-only provenance records. Paper checks now include stored span integrity and missing margin-note blockers.
- P3 MathGraphIndex: memory search is mediated by a derived index facade. Its health contract reports `truth_source=provenance-ledger` and `derived_index=true`; TriviumDB remains optional and derived.
- P4 Pi Official Adapter: internal Pi descriptors can be converted into official Pi tool registration objects with `parameters` and official `execute(toolCallId, params, signal, onUpdate, ctx)` functions. The package manifest validator only accepts `extensions`, `skills`, `prompts`, and `themes`.
- P5 Session Lock And Mutation Queue: local project mutation coordination now has `.comath/session/lock.json` and `.comath/session/mutations.jsonl`, with `wx` exclusive lock creation, active-lock rejection, stale-lock explicit recovery serialized by a recovery mutex, owner-checked release, and collision-resistant mutation queue IDs.
- Contract Surface: root JSON schema artifacts now include formal proof runs, provenance events, paper spans, session locks, mutation queue entries, MathGraphIndex health, and MathProve run manifests. Runtime `jsonSchemas` exports the actual root schema artifacts rather than placeholder object descriptors.

### Reviewer Remediation

Final read-only review found two Critical and two Important issues. The remediation changed the implementation and tests as follows:

- Raw `appendFormalProofRun` is no longer exported from the public barrel; formal proof runs are recorded through `runLeanProofCheck()`.
- Raw `applyGatePromotedClaim` is no longer exported from the public barrel; public status escalation remains through `promoteClaim()`.
- Raw `applyClaimPromotionDecision` is no longer exported from the public barrel; forged gate results cannot be applied through the package entrypoint.
- Caller-supplied Lean executables are not executed as formal authority; fake Lean-compatible executables produce `toolchain_missing` runs with a `custom lean executable not allowed` veto.
- `certifyClaimForFormalProof()` no longer manufactures `formalization_status`, `dependency_closure_status`, or `audit_state`; those are established by `certifyFormalizationFromProofRun()`, `certifyFormalProofDependencies()`, and `certifyFormalProofAudit()`.
- The promotion gate now checks both claim metadata and corresponding provenance certification events before allowing `formally_checked`.
- Session lock acquisition uses exclusive file creation, stale-lock recovery is serialized by a recovery mutex, and mutation queue IDs no longer depend on read-then-append sequential allocation.
- `jsonSchemas` is now loaded from the root schema artifacts and is tested for deep equality with `schemas/*.schema.json`.

### Focused Validation Completed During Implementation

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node services/comathd/tests/unit/phase1-contracts.test.mjs
Result: exit 0; production contract/schema coverage passed.

node services/comathd/tests/integration/phase2-project-runtime.test.mjs
Result: exit 0; project runtime layout now reserves provenance/ and session/.

node services/comathd/tests/unit/phase9-mathprove-bridge.test.mjs
Result: exit 0; MathProve bridge manifests are persisted and parseable.

node services/comathd/tests/unit/phase20-math-graph-index.test.mjs
Result: exit 0; MathGraphIndex health contract and rebuild provenance passed.

node services/comathd/tests/unit/phase4-claim-gate.test.mjs
Result: exit 0 after second reviewer remediation; public barrel rejects raw claim writer and raw gate decision applier exports.

node services/comathd/tests/unit/phase18-formal-proof-authority.test.mjs
Result: exit 0 after second reviewer remediation; covers service-resolved Lean4 execution boundary and caller-supplied executable rejection.

node services/comathd/tests/unit/phase21-session-lock.test.mjs
Result: exit 0 after second reviewer remediation; covers recovery mutex behavior, active-lock rejection, stale recovery, owner release, and distinct mutation queue IDs.
```

### Final Verification

Fresh full-root validation completed on 2026-05-26:

```text
corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0 smoke, Pi extension tests, comathd Phase 0-21 tests, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.worktrees\production-formal-workbench\.comath'
Result: False; no worktree-root runtime state was left behind.
```

### Residual Risks

Lean kernel acceptance is now a gate authority when concrete proof artifacts are checked, but informal paper prose equivalence still requires mathematical review. MathProve is still a fail-closed bridge/manifest producer until the full skill workspace runner is integrated. TriviumDB native behavior remains target-platform dependent. Pi adapter compatibility is tested at descriptor/manifest level and still needs validation against an installed official Pi runtime. Session locks coordinate local project writers; they are not a distributed lock.
