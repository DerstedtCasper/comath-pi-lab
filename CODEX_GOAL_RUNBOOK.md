# Codex Goal Runbook For CoMath Pi Lab

## 0. Operating Rule

Use goal mode only when the active phase has:

1. bounded scope;
2. allowed and forbidden files;
3. explicit definition of done;
4. validation commands;
5. stop conditions.

Never let goal mode become unbounded implementation.

## 1. Required Reading

Before every phase, read:

- `COMATH_PI_LAB_DEV_PLAN.md`
- `CODEX_GOAL_RUNBOOK.md`
- `AGENTS.md`
- `TODO.md`
- `REVIEW.md`
- `docs/architecture/module-boundaries.md`
- phase-specific architecture docs under `docs/architecture/`

## 2. Global Hard Rules

1. Do not bypass claim promotion gates.
2. Do not mark mathematical claims as proved without evidence.
3. Verification gates fail closed by default.
4. Runtime writes obey path policy.
5. Workstream and subagent outputs are reports and graph patches, not direct trusted graph mutations.
6. Preserve failed proof attempts and failed computations.
7. Keep `TODO.md` and `REVIEW.md` updated.
8. Run tests, typecheck, and build at phase boundaries where available.
9. If a dependency is unavailable, use an adapter or fallback, not fake success.
10. Stop if a security invariant would be weakened.

## 2.1 Parallelism Budget And Discipline

The current user-approved concurrency budget is `rpm=4`, with subagent reasoning effort set to `high` for substantial engineering, review, and planning tasks.

This budget permits bounded delegation, but it does not relax file ownership or safety boundaries:

- use only a few subagents at a time for read-only review, planning, audit, and disjoint implementation;
- do not let multiple subagents edit the same core file;
- do not merge a child result until the parent coordinator inspects files and runs relevant tests;
- keep Phase 0-7 mutation-heavy work mostly serialized around public contracts, path policy, routes, gates, and graph patch application;
- after Phase 8, use workstream directories and mutation gateways for isolation rather than increasing the global rate budget.

## 3. Phase Goal Template

```text
/goal Implement Phase <N>: <name> for CoMath Pi Lab.

Read:
- COMATH_PI_LAB_DEV_PLAN.md
- CODEX_GOAL_RUNBOOK.md
- AGENTS.md
- TODO.md
- REVIEW.md

Scope:
- Allowed to edit:
  - <directories/files>
- Do not edit:
  - <directories/files>

Definition of Done:
- <phase-specific bullets>
- TODO.md updated.
- REVIEW.md updated.
- Tests/typecheck/build run or documented if unavailable.

Constraints:
- Gate behavior remains fail-closed.
- No direct TriviumDB writes outside comathd adapter.
- No shell execution without sandbox/runner interface.
- No unreviewed claim promotion.
- No deletion of failed-route artifacts.

Validation:
- Run: <commands>
- Add/update tests: <tests>
- Include changed-file summary.

Stop conditions:
- Stop after this phase.
- Stop if dependency installation blocks progress; create adapter/mock and record blocker.
- Stop if a security invariant would be weakened.
```

## 4. Full Phase Goals

### Phase 0: Repo Bootstrap

Allowed:

- root package/config docs;
- docs skeleton;
- extension/schema/test placeholders;
- `services/comathd` skeleton.

Forbidden:

- TriviumDB integration;
- MathProve integration;
- claim promotion;
- runners;
- workstreams;
- Pi runtime registration.

Validation:

```text
corepack pnpm install
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
```

### Phase 1: Contracts, IDs, Schemas

Allowed:

- `services/comathd/src/types`
- `services/comathd/src/utils`
- `services/comathd/src/db/stable-id-map.ts` placeholder types only
- `schemas`
- `tests/unit/schema`
- docs that describe contracts

Definition of Done:

- Project, MemoryNode, MemoryEdge, Claim, Evidence, Workstream, ArtifactRef, AuditEvent, GraphPatch, PathPolicyDecision, RunnerPermissionEnvelope types.
- Zod schemas.
- JSON schemas.
- `nextSequentialId`.
- `normalizeStatement`.
- `statementHash`.
- tests for invalid claim status, missing project ID, invalid edge label, missing artifact hash, ID generation, statement normalization, GraphPatch non-promotion.

Validation:

```text
corepack pnpm test
corepack pnpm typecheck
```

Stop after Phase 1.

### Phase 2: `comathd` Foundation And Path Policy

Allowed:

- `services/comathd/src/index.ts`
- `services/comathd/src/api`
- `services/comathd/src/config`
- `services/comathd/src/logger.ts`
- `services/comathd/src/errors.ts`
- `services/comathd/src/security/path-policy.ts`
- `services/comathd/src/project`
- path policy and project init tests.

Definition of Done:

- local server;
- `GET /health`;
- `POST /project/init`;
- `POST /project/open`;
- `GET /project/status`;
- runtime tree creation;
- idempotent init;
- path policy denies traversal and outside-root writes.

Stop after Phase 2.

### Phase 3: Artifact And Audit Kernel

Allowed:

- `services/comathd/src/artifacts`
- `services/comathd/src/audit`
- `services/comathd/src/security/secret-scan.ts`
- artifact and audit tests.

Definition of Done:

- file hashing;
- safe artifact import;
- artifact metadata;
- audit JSONL writer;
- secret scan stub;
- snapshot manifest stub.

Stop after Phase 3.

### Phase 4: Claim Registry And Fail-Closed Gate

Allowed:

- `services/comathd/src/claim`
- `services/comathd/src/verification/gate.ts`
- `services/comathd/src/api/claim.routes.ts`
- claim and gate tests.

Definition of Done:

- claim register/get/update/link;
- statement hash;
- markdown renderer;
- promotion route exists;
- gate fails closed by default;
- direct `formally_checked` assignment impossible;
- failed gate records blocker.

Stop after Phase 4.

### Phase 5: Memory Adapter And StableIdMap

Allowed:

- `services/comathd/src/memory`
- `services/comathd/src/db/stable-id-map.ts`
- memory tests;
- context pack tests.

Definition of Done:

- `ResearchMemoryDB`;
- in-memory implementation;
- StableIdMap abstraction;
- node and edge operations;
- simple search;
- context pack stub;
- TriviumDB shim that fails clearly if unavailable.

Stop after Phase 5.

### Phase 6: Pi Extension Layer

Allowed:

- `extensions`
- `skills`
- `prompts`
- extension tests if feasible.

Definition of Done:

- extension entrypoint;
- commands registered;
- comathd client;
- tools registered with schemas;
- resource discovery for skills/prompts/domain packs;
- permission gate stubs;
- text dashboard fallback;
- Pi API assumptions rechecked against installed version.

Stop after Phase 6.

### Phase 7: Workstreams And GraphPatch Lifecycle

Allowed:

- `services/comathd/src/scheduler`
- `services/comathd/src/workstream`
- `services/comathd/src/memory/graph-patch.ts`
- `services/comathd/src/memory/builder.ts`
- workstream tests.

Definition of Done:

- spawn creates `WS-XXXX`;
- workstream directory created;
- `spec.yaml`, `status.json`, `report.md`, `graph_patch.json`;
- status transitions validated;
- patch does not auto-apply.

Stop after Phase 7.

### Phase 8: Codex/Pi Subagent Scaffolding

Allowed:

- `.pi/agents`
- `.pi/prompts`
- `extensions/subagents.ts`
- `prompts`
- `docs/workstream-model.md`
- test fixtures.

Definition of Done:

- agent definitions for coordinator, librarian, computation, proof-route, formalization, reviewer, graph-builder, security-auditor, math-integrity-auditor;
- prompts for parallel workstream execution;
- subagents constrained to own workstream directories;
- parent merges only via graph patch review.

Stop after Phase 8.

### Phase 9: MathProve Bridge Mock

Allowed:

- `python/mathprove_bridge.py`
- `services/comathd/src/verification/mathprove.ts`
- MathProve bridge tests.

Definition of Done:

- bridge CLI shape;
- `plan`, `route`, `final_audit` modes;
- mock returns fail-closed structured JSON;
- gate consumes vetoes and artifacts;
- no proof status without durable evidence.

Stop after Phase 9.

### Phase 10: Compute Runners

Allowed:

- `python/exact_compute.py`
- `python/counterexample_search.py`
- `services/comathd/src/verification/sympy.ts`
- `services/comathd/src/verification/sage.ts`
- `services/comathd/src/verification/sat.ts`
- runner tests.

Definition of Done:

- SymPy exact runner;
- Sage/SAT placeholders;
- counterexample runner;
- sandbox envelope;
- timeout;
- replay manifest metadata, without runner re-execution;
- output artifact hashing.

Stop after Phase 10.

### Phase 11: Literature System

Allowed:

- `services/comathd/src/literature`
- `python/citation_check.py`
- literature tests.

Definition of Done:

- BibTeX parser;
- PDF artifact import;
- citation record;
- arXiv/OpenAlex/Semantic Scholar/Zotero interfaces;
- condition matching stub.

Stop after Phase 11.

### Phase 12: Working Paper

Allowed:

- `services/comathd/src/artifacts/paper.ts`
- `services/comathd/src/artifacts/bibtex.ts`
- `extensions/tools/paper.ts`
- paper tests.

Definition of Done:

- paper init/update/export/check;
- margin provenance;
- claim/evidence backlinks;
- fail on overclaim;
- BibTeX integration.

Stop after Phase 12.

### Phase 13: Real TriviumDB Adapter

Allowed:

- `services/comathd/src/memory/trivium-db.ts`
- Trivium capability probe;
- Trivium tests behind optional markers.

Definition of Done:

- native import probe;
- platform/version diagnostics;
- stable ID map integration;
- hybrid search;
- graph expansion;
- adapter capability/fallback and stable-ID behavior;
- native snapshot/restore remains deferred unless optional tests are explicitly enabled;
- fallback remains active in CI.

Stop after Phase 13.

### Phase 14: Braid Statistics Domain Pack

Allowed:

- `services/comathd/src/domain/braid-statistics`
- `skills/braid-statistics`
- `prompts/domain-braid-statistics.md`
- `python/braid`
- examples.

Definition of Done:

- ontology;
- known object templates;
- computation protocols;
- Lean formalization map;
- sample project;
- domain risk flags.

Stop after Phase 14.

### Phase 15: UI Dashboard

Allowed:

- `extensions/widgets.ts`
- `extensions/renderers.ts`
- `extensions/tools/review.ts`
- dashboard tests if feasible.

Definition of Done:

- text dashboard fallback;
- claim board;
- workstream board;
- evidence board;
- blocker board;
- renderer docs.

Stop after Phase 15.

### Phase 16: Snapshot And Replay

Allowed:

- `services/comathd/src/artifacts/snapshots.ts`
- `services/comathd/src/artifacts/replay.ts`
- snapshot/replay tests.

Definition of Done:

- full snapshot;
- replay manifest;
- restore smoke test;
- secret scan gate;
- integrity hashes.

Stop after Phase 16.

### Phase 17: Evaluation And Audits

Allowed:

- `tests/evaluation`
- `SECURITY_REVIEW.md`
- `MATH_INTEGRITY_REVIEW.md`
- `docs/progress`
- benchmark fixtures.

Definition of Done:

- retrieval fixtures;
- mathematical safety suite;
- paper correctness suite;
- database benchmark;
- security audit;
- math integrity audit;
- final Research Alpha retrospective.

Stop after Phase 17.

### Phase 18: GA Proof-Kernel Vertical Slices

Allowed:

- `services/comathd/src/proof-kernel`
- proof-kernel tests under `services/comathd/tests`
- campaign routes in `services/comathd/src/api/server.ts`
- gate/schema changes required to bind final replay evidence
- Pi research/campaign command and tool descriptors under `extensions/comath-pi`
- audit, review, and progress documentation

Definition of Done:

Historical/quarantined runbook note: the Phase 18 `Nat.add_zero` and old gate-mediated `formally_checked`
criteria below are retained as fixture coverage records only. They are not a current production proof path;
current authority requires the Goal 3 Lean Authority v3 source-report, derived-binding, and final packaging gates.
Public release packaging must also keep archive semantics separate: source-review public diagnostic material is
non-authoritative (`proof_authority: none`), sanitized `public_download` snapshots have `can_restore=false` and
are not restore sources, and only explicit `internal_restore` snapshots preserve byte-for-byte runtime fidelity.

- `ResearchCampaign` start/status/next-actions/tick/final-audit/replay routes exist through `comathd`;
- `formally_checked` requires a passed proof-kernel final replay manifest for the same claim;
- positive `Nat.add_zero` campaign reaches `formal_proof_verified`;
- fake formal metadata, static Lean cheat constructs, and statement drift fail closed;
- false `n + 1 = n` campaign terminates as `verified_counterexample`;
- snapshot restore followed by campaign proof replay passes;
- Pi exposes campaign tools as thin `comathd` client calls only;
- TODO, REVIEW, security, math-integrity, and handoff docs state evidence and limits.

Stop after Phase 18 unless the user opens a new generalization goal.

## 5. Long-Running Research Alpha Goal

Use only after Phases 0-6 are complete:

```text
/goal Bring CoMath Pi Lab to Research Alpha.

Definition of Done:
- Workstreams can be spawned and reported.
- Claim registry works.
- Gate fails closed.
- In-memory research DB works.
- TriviumDB adapter is available behind interface or documented as blocked with fallback.
- MathProve bridge mock works.
- Paper init/check works.
- Snapshot basic works.
- Mathematical safety tests pass.
- SECURITY_REVIEW.md and MATH_INTEGRITY_REVIEW.md exist.

Constraints:
- Do not implement production dashboard yet.
- Do not add unsafe shell execution.
- Do not weaken gates.
- Stop if tests cannot be made to pass without weakening safety.
```

## 5.1 Phase 18 GA Vertical-Slice Goal

Use only after Phases 0-17 are complete:

Historical/quarantined runbook note: this Phase 18 vertical-slice prompt is kept as an old fixture
recipe, not as the current production proof path. Goal 3 authority requires Lean Authority v3 final
source-report and packaging evidence before any public final proof wording.
For current source-review packages, `public_download` snapshot material is public diagnostic evidence only
with `can_restore=false`; byte-for-byte restore-fidelity material must be exported as `internal_restore`.

```text
/goal Bring CoMath Pi Lab through the GA proof-kernel vertical slices.

Definition of Done:
- Native `services/comathd/src/proof-kernel` path exists.
- One elementary Lean theorem has a clean replay manifest and gate-mediated `formally_checked` promotion.
- Statement drift and cheat constructs are rejected.
- One false elementary theorem has exact counterexample evidence and `refuted` status.
- Snapshot restore then proof replay passes.
- Pi campaign tools call `comathd` and do not write `.comath/`.
- Documentation records exact tests, evidence, commits, and remaining limits.

Constraints:
- Do not claim arbitrary theorem proving.
- Do not promote by voting, reviewer approval, natural language, or MathProve bridge output alone.
- Respect global `rpm=4`; prefer local deterministic tools.
- Stop if a gate must be weakened to make a proof pass.
```

## 6. Subagent Matrix

| Agent | Role | Write scope | Output |
| --- | --- | --- | --- |
| repo-architect | architecture, ADRs, docs | `docs`, root docs | architecture review |
| type-schema-engineer | types, schemas, ID/hash | `services/comathd/src/types`, `schemas`, schema tests | type/schema report |
| service-engineer | routes, config, path policy | `services/comathd/src/api`, `project`, `security` | service report |
| pi-extension-engineer | Pi commands/tools/renderers | `extensions`, `skills`, `prompts` | Pi extension report |
| memory-db-engineer | memory adapters, StableIdMap | `services/comathd/src/memory`, `db` | memory DB report |
| verification-engineer | gates and runners | `claim`, `verification`, `python` | verification report |
| artifact-paper-engineer | artifacts, paper, snapshots | `artifacts`, paper tools | artifact/paper report |
| security-auditor | path, shell, secrets, permissions | read-only or `SECURITY_REVIEW.md` | security review |
| math-integrity-auditor | claim status and overclaim review | read-only or `MATH_INTEGRITY_REVIEW.md` | integrity review |
| domain-braid-agent | braid domain pack | domain pack paths | domain report |

## 7. Parallelism Rules

Safe early parallelism:

```text
type-schema-engineer -> services/comathd/src/types, schemas
repo-architect -> docs only
security-auditor -> read-only review
math-integrity-auditor -> read-only review
```

Recommended standing agent pool:

```text
repo-architect
type-schema-engineer
service-engineer
pi-extension-engineer
memory-db-engineer
verification-engineer
artifact-paper-engineer
security-auditor
math-integrity-auditor
domain-braid-agent
```

Early allowed parallelism:

```text
type-schema-engineer -> services/comathd/src/types, schemas
repo-architect -> docs only
security-auditor -> read-only review
math-integrity-auditor -> read-only review
```

Middle-phase cautious parallelism:

```text
memory-db-engineer and service-engineer must not edit routes at the same time
verification-engineer and claim registry work must not edit gate/promotion route at the same time
artifact-paper-engineer and security work must not edit path-policy at the same time
```

Late-phase parallelism:

```text
domain-braid-agent -> domain pack
paper engineer -> working paper
dashboard engineer -> renderers
```

Serialize if work touches:

- same public type or schema;
- same API route;
- same path policy file;
- same gate/promotion file;
- same migration;
- same GraphPatch apply contract;
- root package-manager files.

## 8. Phase Review Prompt

```text
Review the current repository against COMATH_PI_LAB_DEV_PLAN.md.

Check:
1. Did the phase complete?
2. Did TODO.md update?
3. Did REVIEW.md update?
4. Do tests/typecheck/build pass?
5. Did any gate become permissive?
6. Can a claim become formally_checked without kernel proof?
7. Can float-only computation become symbolically_checked?
8. Are path policies preserved?
9. Are failed artifacts preserved?
10. Are APIs documented or explicitly deferred?
```

## 9. Anti-Patterns

Stop and revise immediately if any change:

- returns `{ ok: true }` from an unimplemented gate;
- sets `status=formally_checked` outside final audit;
- deletes claims instead of retracting or superseding;
- writes outside project root;
- stores PDFs directly in DB;
- runs arbitrary shell from a workstream;
- uses reviewer approval as proof;
- treats LLM citation memory as source evidence;
- allows floats as exact symbolic proof;
- skips TODO/REVIEW updates.

## 10. Final Operating Rule

```text
record first,
verify second,
summarize third,
promote only after gates pass.
```

## 11. Optimized Implementation Order

Use this order unless a later architectural discovery proves it wrong:

```text
0. Repo bootstrap
1. Types / schemas / ID / statement hash
2. comathd foundation + path policy
3. Artifact + audit kernel
4. Claim registry + fail-closed gate
5. Memory adapter + StableIdMap
6. Pi extension commands/tools/resources
7. Workstream + GraphPatch
8. Codex/Pi subagent scaffolding
9. MathProve bridge mock
10. Compute runners
11. Literature system
12. Working paper
13. Real TriviumDB adapter
14. Braid statistics domain pack
15. TUI dashboard
16. Snapshot/replay
17. Evaluation + security/math integrity audit
18. GA proof-kernel vertical slices
```

Near-term engineering sequence:

1. Initialize `comath-pi-lab` with optimized `COMATH_PI_LAB_DEV_PLAN.md` and `CODEX_GOAL_RUNBOOK.md`.
2. Complete Phase 0 and Phase 1 only before service work.
3. In Phases 2-4, make `comathd`, path policy, artifact hashing, claim registry, and fail-closed gate stable before adding memory complexity.
4. In Phase 5, add `ResearchMemoryDB` and `StableIdMap`; start in-memory and keep TriviumDB optional.
5. Do not rely on heavy implementation parallelism before Phase 8; before then, use concurrency mostly for read-only review and disjoint files.
