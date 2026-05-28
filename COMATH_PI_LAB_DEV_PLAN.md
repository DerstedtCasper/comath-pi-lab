# CoMath Pi Lab Development Plan

> Canonical design document for `D:\MATH _Studio\comath-pi-lab`.
> Source inputs: `COMATH_PI_LAB_DEV_PLAN_V2.md`, `CODEX_GOAL_RUNBOOK_COMATH_PI_LAB.md`, Pi official docs, Pi ecosystem notes, TriviumDB risk notes, MathProve-Skill, and AI co-mathematician arXiv:2605.06651 v2.

## 0. Design Status

This document defines the complete target design and implementation goals. The current repository has implemented the Phase 0-17 Research Alpha slice plus Phase 18-75 GA/v3 vertical-slice hardening under the active Goal 2 implementation line. Global GA remains unfinished until the remaining blockers in `TODO.md` are implemented and a final requirement-by-requirement audit passes.

Current repository state after Phase 75:

- Repo bootstrap, contracts, service foundation, artifact/audit kernel, claim registry, fail-closed gate, in-memory memory adapter, workstreams, GraphPatch review, MathProve bridge mock, compute runners, literature condition checks, working paper, optional TriviumDB adapter boundary, braid-statistics domain pack, read-only dashboard, snapshot/replay, Phase 17 audits, deterministic runner re-execution, the external MathProve evidence-runner bridge, AgentRun runtime-boundary contracts, and AgentRun process scheduling are implemented and verified.
- Native CoMath proof-kernel campaign routes, 8-candidate GA audit artifacts, clean Lean replay for the registered `Nat.add_zero` and `Nat.mul_zero` vertical slices, statement-drift/cheat rejection, exact `n + 1 = n` refutation, snapshot restore plus proof replay, Pi research/campaign tools, Pi 0.75.5-compatible runtime registration, auditable child-agent run persistence/write-scope/report contracts, and real absolute-realpath allowlisted child-process launching with concurrency/rpm/timeout/cancel controls, minimal environment inheritance, non-authoritative scheduler report envelopes, byte-capped logs, and process-tree termination attempts are implemented as bounded GA vertical slices.
- Full design, roadmap, agent model, risk register, acceptance matrix, runbook, TODO, REVIEW, security review, mathematical-integrity review, and Research Alpha retrospective are documented.
- Research Alpha plus Phase 18-75 is a local auditable product slice with narrow executable proof-kernel slices, optional TriviumDB target-platform evaluation, Pi package/runtime registration, local Pi/comathd install-session e2e, AgentRun scheduler/profile/adapter surfaces, service-configured Codex CLI/API adapter boundaries, conservative Lean statement-binding extensions, controlled MathProve evidence-runner bridges, fail-closed broad theorem planning evidence, stage-gate repair/resume, one bounded theorem-specific Lean target package for `n + n = 2 * n`, a bounded proof-body candidate for that target, bounded Lean Authority preview reports for that target, and a claim-scoped final clean replay/promotion path for that same bounded target. It is not a production arbitrary theorem prover.
- Arbitrary theorem synthesis beyond the Phase 70 fail-closed planning evidence and the Phase 72-75 bounded target/proof-body/report/final-replay path, broad MathProve proof search or MathProve-as-proof-authority semantics, production Codex API account/network validation, indefinite operator sessions, richer real-host Pi UX/service lifecycle management, full DLP-grade secret scanning, broad statement-equivalence proof search, and OS/network sandboxed runner replay remain later candidates.

## 1. Product Thesis

CoMath Pi Lab is a Pi-based, auditable, memory-native, multi-agent mathematical research workbench. It should behave less like a chat bot and more like a research operating layer:

- It preserves definitions, claims, failed proof routes, computations, citations, and working paper state.
- It supports parallel workstreams without allowing unreviewed agents to mutate the trusted graph.
- It treats mathematical status as an evidence-gated object, not as an LLM confidence score.
- It makes the working paper and margin provenance a primary interface, not a final export afterthought.

The system borrows workflow ideas from AI co-mathematician arXiv:2605.06651 v2: asynchronous stateful workspace, coordinator, parallel workstreams, shared artifacts, continuous review, working paper provenance, and human steering. It does not claim to reproduce DeepMind's closed system, model capability, FrontierMath results, or discovery outcomes.

## 2. Goals And Non-Goals

### 2.1 Goals

1. Build a local Pi package that gives the researcher `/cm:*` commands, tools, dashboards, and workstream UX.
2. Build `comathd`, a local single-write service that owns runtime state, artifacts, audit logs, memory adapters, claim gates, and runner orchestration.
3. Define stable, typed, schema-validated project objects before implementing behavior.
4. Preserve every mathematical claim with assumptions, dependencies, evidence, blockers, and status.
5. Keep TriviumDB behind an adapter with in-memory or lightweight fallback.
6. Connect MathProve as an evidence producer and gate runner, not as an autonomous proof oracle.
7. Make workstreams produce reports and `GraphPatch` proposals only.
8. Make working paper sections trace back to claim IDs, evidence IDs, workstreams, and margin notes.
9. Provide snapshot/replay so results are inspectable and partially reproducible.
10. Ship a first serious domain pack for braid statistics and parastatistics.

### 2.2 Non-Goals

1. Do not implement a general theorem-proving model.
2. Do not claim mathematical discovery ability beyond verified artifacts.
3. Do not make TriviumDB a hard dependency before native loading, locking, ID mapping, and fallback are tested.
4. Do not let Pi extensions write trusted DB or claim state directly.
5. Do not treat reviewer approval, agent consensus, or LLM prose as proof.
6. Do not allow arbitrary shell execution from workstreams.
7. Do not commit real `.comath/` runtime state, credentials, PDFs, or transcripts.

## 3. Non-Negotiable Invariants

```text
No mathematical claim is promoted without evidence.
No unreviewed workstream patch mutates the trusted graph.
No agent writes project-runtime files outside the path policy.
No TriviumDB write bypasses comathd.
No reviewer approval is a proof.
No failed route is deleted to make the project look cleaner.
No float-only computation becomes exact symbolic evidence.
No theorem-like paper wording hides blockers or conjectural status.
```

## 4. Source Status And Evidence Boundaries

| Source | Current use | Boundary |
| --- | --- | --- |
| `earendil-works/pi` | Pi extension package/runtime assumptions | Phase 26 validated package manifest and loader behavior against installed Pi 0.75.5; official docs remain normative for future API drift. |
| `buyixian/pi-ecosystem-docs` | Ecosystem taxonomy and package landscape | Useful for discovery, not final API authority when it drifts from official Pi docs. |
| `YoKONCy/TriviumDB` | Optional embedded memory backend candidate | Native/alpha dependency; always behind adapter and fallback until Phase 13. |
| `DerstedtCasper/MathProve-Skill` | Verification bridge and gate inspiration | Evidence producer only; no proof status without durable artifacts and final audit. |
| arXiv:2605.06651 v2 | Workflow inspiration | Architectural translation only, not capability equivalence. |

## 5. Top-Level Architecture

```text
Researcher
  -> Pi Package Layer
     - /cm:* commands
     - tools
     - text/TUI dashboard
     - resource discovery for skills/prompts/domain packs
     - permission-gate pattern
     - workstream/subagent UX
  -> comathd Local Service
     - HTTP/JSON API
     - single write gateway
     - mutation queue
     - project lock/session binding
     - path policy
     - artifact and audit kernel
     - claim registry and promotion gates
     - memory adapter owner
     - verification and compute runners
  -> Research Memory Kernel
     - ResearchMemoryDB interface
     - StableIdMap
     - claim graph
     - literature graph
     - proof attempt graph
     - failure graph
     - retrieval and context packs
  -> Verification Kernel
     - MathProve bridge
     - Lean runner
     - SymPy/Sage exact runners
     - SAT/SMT/counterexample runners
     - final audit gate
  -> Artifact Kernel
     - working paper
     - margin provenance
     - LaTeX/BibTeX
     - logs
     - snapshots
     - replay manifests
```

Trusted mutation path:

```text
Pi command/tool -> comathd client -> comathd route -> service -> adapter/artifact/audit log
```

Forbidden mutation paths:

```text
Pi extension -> TriviumDB
subagent -> trusted graph
workstream report -> claim promotion
reviewer approval -> formally_checked
LLM citation memory -> literature_supported
```

## 6. Repository Layout

Target source tree:

```text
comath-pi-lab/
  COMATH_PI_LAB_DEV_PLAN.md
  CODEX_GOAL_RUNBOOK.md
  README.md
  TODO.md
  REVIEW.md
  AGENTS.md
  SECURITY_REVIEW.md
  MATH_INTEGRITY_REVIEW.md
  package.json
  pnpm-workspace.yaml
  tsconfig.json

  docs/
    adr/
    architecture/
    integrations/
    progress/
    superpowers/

  extensions/
    comath.ts
    commands.ts
    client.ts
    widgets.ts
    renderers.ts
    permission-gates.ts
    subagents.ts
    tools/

  skills/
    math-research/
    mathprove-adapter/
    braid-statistics/

  prompts/
    coordinator.md
    onboarding.md
    workstream-literature.md
    workstream-computation.md
    workstream-proof-route.md
    workstream-formalization.md
    reviewer-proof.md
    reviewer-citation.md
    reviewer-counterexample.md
    reviewer-formalization.md
    graph-builder.md
    graph-arbiter.md
    reflection-maintainer.md
    paper-editor.md
    domain-braid-statistics.md

  services/
    comathd/
      src/
        api/
        artifacts/
        audit/
        claim/
        config/
        db/
        domain/
        literature/
        memory/
        project/
        scheduler/
        security/
        types/
        utils/
        verification/
      tests/

  python/
    mathprove_bridge.py
    exact_compute.py
    counterexample_search.py
    citation_check.py
    formula_normalize.py
    lean_log_parse.py
    braid/

  schemas/
  tests/
  examples/
```

See also:

- `docs/architecture/module-boundaries.md`
- `docs/architecture/runtime-layout.md`
- `docs/architecture/tracking-contracts.md`
- `docs/architecture/subagent-concurrency.md`
- `docs/architecture/end-state-blueprint.md`
- `docs/architecture/acceptance-matrix.md`
- `docs/architecture/risk-register.md`
- `docs/architecture/agent-operating-model.md`

## 7. Runtime Layout

Runtime state belongs under `.comath/` and is ignored by Git:

```text
.comath/
  project.yaml
  config.yaml
  lock/
    problem_lock.md
    assumptions.md
    notation.md
    goals.yaml
    domain.yaml
    human_decisions.jsonl
  db/
    research.tdb
    research.tdb.quiver
    control.sqlite
    stable_id_map.sqlite
  memory/
    graph_patches/
    builder_events.jsonl
    arbiter_events.jsonl
    reflection_reports/
    context_packs/
  claims/
  evidence/
  workstreams/
  artifacts/
  lean/
  sessions/
  snapshots/
```

Only `comathd` creates and mutates this tree.

## 8. Core Data Model

Phase 1 must define these contracts before routes or adapters:

- `Project`
- `MemoryNode`
- `MemoryEdge`
- `Claim`
- `Evidence`
- `Workstream`
- `ArtifactRef`
- `AuditEvent`
- `GraphPatch`
- `PathPolicyDecision`
- `RunnerPermissionEnvelope`
- `StableIdMapEntry`
- `GateResult`
- `CitationRecord`
- `PaperMarginNote`

Business IDs are stable strings:

```text
P-0001  Project-local project or package object
C-0001  Claim
E-0001  Evidence
WS-0001 Workstream
DEF-0001 Definition
THM-0001 Theorem reference
GP-0001 Graph patch
AR-0001 Artifact ref
GR-0001 Gate result
```

TriviumDB numeric IDs never appear in business-facing contracts.

## 9. Claim And Evidence Discipline

Claim statuses:

```ts
type ClaimStatus =
  | "draft"
  | "conjectural"
  | "literature_supported"
  | "computationally_supported"
  | "symbolically_checked"
  | "lean_skeleton"
  | "formally_checked"
  | "refuted"
  | "blocked"
  | "retracted"
  | "human_accepted";
```

Required epistemic fields:

- `status`
- `evidence_level`
- `gate_result_id`
- `dependency_closure_status`
- `formalization_status`
- `audit_state`
- `assumptions`
- `domain`
- `statement_hash`

Hard veto examples:

- `undefined_symbols`
- `unstated_domain`
- `statement_drift`
- `missing_assumptions`
- `missing_dependencies`
- `stale_logs`
- `missing_evidence`
- `lean_failed`
- `sympy_failed`
- `sage_failed`
- `float_only_exact_proof`
- `citation_condition_mismatch`
- `unaudited_final_claim`
- `unreplayable_computation`

## 10. GraphPatch Model

Every workstream proposes graph changes through `GraphPatch`:

```ts
type GraphPatchState =
  | "proposed"
  | "under_review"
  | "accepted"
  | "rejected"
  | "partially_applied"
  | "superseded";
```

A patch must include:

- `patch_id`
- `project_id`
- `source_workstream_id`
- provenance
- new nodes
- new edges
- updated nodes
- candidate conflicts
- warnings
- reviewer notes
- apply preconditions

A patch must not directly promote claims. Promotion remains a gate operation.

## 11. Research Memory

`ResearchMemoryDB` is the only memory interface used by application code:

```ts
interface ResearchMemoryDB {
  init(projectRoot: string, options: ResearchMemoryOptions): Promise<void>;
  close(): Promise<void>;
  upsertNode(node: MemoryNode): Promise<void>;
  getNode(stableId: string): Promise<MemoryNode | null>;
  link(edge: MemoryEdge): Promise<void>;
  getEdges(stableId: string): Promise<MemoryEdge[]>;
  search(input: MemorySearchInput): Promise<MemorySearchResult[]>;
  contextPack(input: ContextPackInput): Promise<ContextPack>;
  beginPatch(patch: GraphPatch): Promise<void>;
  applyPatch(patchId: string, decision: PatchDecision): Promise<void>;
  snapshot(outputPath: string): Promise<void>;
  restore(snapshotPath: string): Promise<void>;
}
```

TriviumDB constraints:

- Treat as experimental embedded backend until Phase 13.
- Node API numeric IDs require `StableIdMap`.
- Only `comathd` opens the `.tdb` file.
- FFI hooks disabled by default.
- Deletion is not default for mathematical records; prefer `retracts`, `supersedes`, `same_as`, and `blocked_by`.
- CI must have fallback memory implementation.

## 12. Verification Kernel

MathProve bridge target:

```text
python/mathprove_bridge.py
  --project-root <path>
  --claim <claim_id>
  --mode plan|route|final_audit
  --target-status <status>
```

Expected JSON shape:

```json
{
  "ok": false,
  "claim_id": "C-0001",
  "gate_result": "failed",
  "evidence": [],
  "artifacts": [],
  "vetoes": ["not_implemented"],
  "warnings": []
}
```

Default result is failure until evidence is present.

`formally_checked` requires Lean-kernel-checked proof with no non-skeleton `sorry`, `admit`, unsafe axiom bypass, or missing dependency closure.

## 13. Compute And Literature Systems

Compute runners:

- SymPy exact runner.
- Sage runner or placeholder.
- PARI/GAP bridge where appropriate.
- SAT/SMT/counterexample runner.
- Braid-specific exact scripts.

Runner constraints:

- bounded timeout;
- bounded memory;
- project-root cwd;
- no network by default;
- captured stdout/stderr;
- replay argv metadata, with no runner re-execution in Research Alpha;
- artifact hash.

Literature system:

- BibTeX import.
- PDF artifact import.
- arXiv/OpenAlex/Semantic Scholar/Zotero adapters behind interfaces.
- citation condition matching.
- exact theorem/page/section anchors when promoting `literature_supported`.

## 14. Working Paper System

The working paper is a living project state, not a pretty export. Required runtime files:

```text
.comath/artifacts/papers/main.md
.comath/artifacts/papers/main.tex
.comath/artifacts/papers/references.bib
.comath/artifacts/papers/margin_notes.json
```

Every theorem-like statement must carry:

- `claim_id`
- claim status
- evidence IDs
- source workstreams
- warnings
- blockers

Paper checks fail on:

- conjecture rendered as theorem;
- missing claim ID;
- missing evidence;
- stale citation;
- hidden blocker;
- missing BibTeX;
- status/wording mismatch.

## 15. Domain Pack: Braid Statistics And Parastatistics

The first domain pack is first-class. It should include:

- ontology for braid groups, braid words, braid representations, R-matrices, Yang-Baxter equations, Hecke algebras, tensor categories, parastatistics sectors, DHR categories, and anyon models;
- computation protocols for braid relations, YBE checks, Hecke algebra relations, fusion rules, and small counterexample search;
- Lean formalization map for elementary algebraic fragments;
- literature prompts for parastatistics, braid/tensor categories, and physical interpretation boundaries;
- domain risk flags such as `notation_drift`, `category_level_mismatch`, `semisimplicity_assumption_missing`, `q_root_of_unity_case_split`, and `physical_interpretation_overclaim`.

## 16. Security Model

Default deny:

```text
rm -rf
sudo
chmod -R
chown -R
curl | sh
wget | sh
writing outside project root
editing .env
reading ssh private keys
reading cloud credentials
executing unknown binary from artifact import
network exfiltration
TriviumDB FFI hooks
```

Security surfaces:

- path traversal;
- shell execution;
- replay safety;
- secret scanning;
- artifact import;
- native dependency loading;
- DB file locks;
- user-installed Pi packages with full system access.

## 17. Development Roadmap

### Phase 0: Repo Bootstrap

Goal: create the repository skeleton and executable tracking contract.

Deliverables:

- monorepo package files;
- canonical docs;
- `TODO.md`, `REVIEW.md`, `AGENTS.md`;
- `SECURITY_REVIEW.md`, `MATH_INTEGRITY_REVIEW.md`;
- docs, ADR, architecture, integration, progress directories;
- `services/comathd` package skeleton;
- root smoke tests.

Validation:

- `corepack pnpm install`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

### Phase 1: Contracts, IDs, Schemas

Goal: define stable objects before implementing behavior.

Deliverables:

- TypeScript contracts;
- Zod schemas;
- JSON schemas;
- stable ID generation;
- statement normalization and hash;
- GraphPatch contract;
- path policy and runner permission envelope types;
- schema tests.

Validation:

- invalid claim status rejected;
- missing `project_id` rejected;
- invalid edge label rejected;
- missing artifact `sha256` rejected;
- ID generation deterministic;
- statement normalization stable.

### Phase 2: `comathd` Foundation And Path Policy

Goal: make the local service own project runtime creation and safe path handling.

Deliverables:

- Hono or equivalent local server;
- `GET /health`;
- `POST /project/init`;
- `POST /project/open`;
- `GET /project/status`;
- runtime tree creation;
- idempotent init;
- path policy tests;
- config loader and logger.

### Phase 3: Artifact And Audit Kernel

Goal: make every durable object hashable and audit-visible.

Deliverables:

- `sha256File`;
- artifact import/register;
- safe copy into `.comath/artifacts`;
- artifact metadata;
- JSONL audit writer;
- secret scan stub;
- snapshot manifest stub.

### Phase 4: Claim Registry And Fail-Closed Gate

Goal: support claim lifecycle without allowing fake promotion.

Deliverables:

- claim register/get/update/link;
- statement hash integration;
- markdown renderer;
- promotion route;
- `runClaimPromotionGate` fails closed by default;
- direct promotion to `formally_checked` impossible;
- blocker/evidence placeholder on failed gate.

### Phase 5: Memory Adapter And StableIdMap

Goal: provide project memory without binding application code to TriviumDB.

Deliverables:

- `ResearchMemoryDB` interface;
- `InMemoryResearchMemoryDB`;
- StableIdMap abstraction;
- node upsert/get;
- edge link/query;
- simple search;
- context pack stub;
- snapshot stub;
- TriviumDB shim that fails clearly when unavailable.

### Phase 6: Pi Extension Layer

Goal: expose CoMath operations through Pi without giving Pi direct DB authority.

Deliverables:

- extension entrypoint;
- `/cm:*` commands;
- comathd client;
- tool registrations with schemas;
- resource discovery for skills/prompts/domain packs;
- permission gate stubs;
- text dashboard fallback;
- official Pi API revalidation notes.

### Phase 7: Workstreams And GraphPatch Lifecycle

Goal: support safe parallel work without trusted graph pollution.

Deliverables:

- workstream spawn/status/report/review;
- `WS-XXXX` directories;
- `spec.yaml`, `status.json`, `report.md`;
- `graph_patch.json`;
- status transitions;
- builder stub;
- no auto-apply without review.

### Phase 8: Codex/Pi Subagent Scaffolding

Goal: make parallel agent roles explicit and constrained.

Deliverables:

- `.pi/agents` definitions;
- `.pi/prompts` workflows;
- prompts for coordinator, librarian, computation, proof-route, formalization, reviewer, graph-builder, security-auditor, math-integrity-auditor;
- all subagents constrained to write only their own workstream directories;
- docs for safe parallelism.

### Phase 9: MathProve Bridge Mock

Goal: connect verification gateway shape before relying on real proof tooling.

Deliverables:

- `python/mathprove_bridge.py`;
- mock `plan`, `route`, and `final_audit`;
- structured gate result;
- veto integration;
- evidence artifacts under claim evidence path;
- fail-closed default.

### Phase 10: Compute Runners

Goal: provide bounded exact/search computations with artifact hashes, replay metadata, and stale-output checks.

Deliverables:

- SymPy exact runner;
- Sage/PARI/GAP placeholders;
- SAT/SMT/counterexample runner;
- sandbox and timeout;
- replay manifest metadata, with no runner re-execution in Research Alpha;
- output artifact hashing.

### Phase 11: Literature System

Goal: make literature evidence auditable.

Deliverables:

- BibTeX parser;
- PDF artifact import;
- citation record;
- arXiv/OpenAlex/Semantic Scholar/Zotero adapter interfaces;
- condition matching stub;
- citation reviewer prompt.

### Phase 12: Working Paper

Goal: make paper state live, provenance-rich, and overclaim-safe.

Deliverables:

- paper init/update/export/check;
- margin notes;
- claim/evidence backlinks;
- theorem wording checks;
- BibTeX integration;
- failure on overclaim.

### Phase 13: Real TriviumDB Adapter

Goal: enable TriviumDB only after fallback and capability probes exist.

Deliverables:

- native package adapter;
- platform capability probe;
- stable ID mapping;
- hybrid search;
- text index;
- graph expansion;
- adapter-boundary persistence probes;
- native snapshot/restore and performance validation deferred to Research Beta;
- CI fallback path.

### Phase 14: Braid Statistics Domain Pack

Goal: ship a serious math-physics domain package.

Deliverables:

- ontology;
- prompts;
- computation scripts;
- sample project;
- benchmark claims;
- domain-specific paper template;
- known theorem references to verify.

### Phase 15: UI Dashboard

Goal: make project state legible in Pi.

Deliverables:

- text dashboard fallback;
- TUI claim board;
- workstream board;
- evidence board;
- blocker board;
- custom renderers.

### Phase 16: Snapshot And Replay

Goal: make project state portable and partially reproducible.

Deliverables:

- full snapshot;
- replay manifests;
- restore smoke test;
- secret scan gate;
- snapshot integrity hashes.

### Phase 17: Evaluation And Audits

Goal: verify the system against safety, mathematical integrity, and research utility.

Deliverables:

- retrieval fixtures;
- mathematical safety suite;
- paper correctness suite;
- database benchmark;
- security audit;
- math integrity audit;
- research alpha retrospective.

### Phase 18: GA Proof-Kernel Vertical Slices

Goal: close the GA-critical gap between fail-closed proof metadata and executable native CoMath proof-kernel evidence for bounded vertical slices.

Deliverables:

- service-owned `ResearchCampaign` routes;
- native proof-kernel modules under `services/comathd/src/proof-kernel`;
- 8-candidate ensemble artifacts with failure-route preservation;
- clean Lean replay, static audit, dependency closure, axiom profile, and statement-equivalence gates;
- positive `Nat.add_zero` formal proof vertical slice;
- negative statement-drift, fake metadata, and cheat-construct tests;
- exact counterexample refutation path for `n + 1 = n`;
- snapshot restore followed by campaign proof replay;
- Pi `/cm:research` and `/cm:campaign` thin-client tool surfaces.

## 18. Milestones

### Research Alpha

Research Alpha is complete when:

- `comathd` can initialize/open a project.
- Claim registry works.
- Gate fails closed.
- In-memory research DB works.
- TriviumDB adapter is available or blocked with fallback.
- MathProve bridge mock works.
- Paper init/check works.
- Workstreams can be spawned and reported.
- Snapshot basic works.
- security and math-integrity reviews exist.

### GA Vertical Slice

The GA vertical slice is complete when:

- `comathd` starts and ticks a bounded `ResearchCampaign`;
- `formally_checked` requires a passed proof-kernel final replay manifest for the same claim;
- 8 candidates are generated and their manifests/audit artifacts are preserved;
- statement drift and static Lean cheats are rejected;
- one Lean theorem replay passes from a clean workspace;
- one false theorem is refuted by exact counterexample evidence;
- snapshot restore followed by proof replay passes;
- Pi exposes campaign tools without direct `.comath/` writes.

### Research Beta

Research Beta is complete when:

- real TriviumDB adapter is stable on target platform;
- generic proof planning and/or real MathProve final audit paths exist beyond the Phase 18 native proof-kernel vertical slices;
- compute runners produce replayable evidence;
- literature condition matching supports exact citation artifacts;
- working paper can export LaTeX with margin provenance.

### Domain Alpha

Domain Alpha is complete when:

- braid statistics ontology exists;
- at least five sample claims are represented;
- at least two computations are replayable;
- at least one Lean skeleton is generated;
- paper export catches overclaiming in the sample project.

## 19. Completion Criteria For The Design Goal

The design documentation goal is complete when the repository contains:

- complete development plan;
- full Codex runbook with phase goals;
- end-state blueprint;
- full phase roadmap;
- acceptance matrix;
- Research Alpha definition;
- agent operating model;
- risk register;
- design handoff;
- smoke check ensuring the above exists.

Authoritative design companion documents:

- `docs/architecture/end-state-blueprint.md`
- `docs/architecture/acceptance-matrix.md`
- `docs/architecture/risk-register.md`
- `docs/architecture/agent-operating-model.md`
- `docs/progress/design-handoff.md`
- `docs/superpowers/plans/2026-05-25-full-design-documentation.md`
