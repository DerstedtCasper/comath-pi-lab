# CoMath Pi Lab Production Formal Workbench Design

> Status: implementation contract for the `production-formal-workbench` worktree.
> Baseline: `30f4091 chore: baseline research alpha`; worktree branch: `production-formal-workbench`.
> This spec supersedes the old high-concurrency note in `CODEX_GOAL_RUNBOOK.md` for this run: the active budget is `rpm=4`, interpreted as the main coordinator plus at most three side agents.

## 1. Objective

CoMath Pi Lab must move from Research Alpha into a production-oriented mathematical workbench with an authoritative formal-proof boundary. The product target is not a chat transcript or a collection of loose runners. It is a local, auditable research operating layer where claims, proof attempts, computations, citations, failures, working-paper spans, and reviewer decisions are durable objects.

The production target has four hard axes:

1. **Proof authority**: `formally_checked` can only come from a Lean-kernel-checked artifact, complete dependency closure, passed audit, and a bound gate result.
2. **Working paper first**: the working paper plus margin provenance is the primary user-facing state, not a final export afterthought.
3. **Pi compatibility**: the Pi layer must adapt to the official Pi extension/tool/package API rather than the simplified Research Alpha descriptor shape.
4. **Memory correctness**: TriviumDB is a derived index behind `MathGraphIndex`, never the only source of truth.

## 2. Delta From Research Alpha

Research Alpha already provides:

- `comathd` local service skeleton;
- typed claims, artifacts, evidence, GraphPatch, workstreams, and paper margin notes;
- fail-closed promotion gate;
- bounded compute runners and MathProve mock;
- in-memory memory DB plus optional Trivium boundary;
- Pi extension descriptors and dashboard renderers;
- snapshot/replay smoke checks;
- security and mathematical-integrity reviews.

Production Beta must add:

- formal proof run contracts and Lean verifier output parsing;
- MathProve run manifests compatible with the local `mathprove-skill` evidence discipline;
- append-only provenance ledger as a truth source for claims, paper spans, proof attempts, and workstream failures;
- `MathGraphIndex` adapter over memory/Trivium with health, rebuild, and degraded-mode semantics;
- Pi official tool/manifest adapter and headless UI fallback checks;
- project session lock and serialized mutation queue around trusted state;
- runner replay re-execution checks for bounded runners where possible;
- stronger TODO, REVIEW, SECURITY_REVIEW, and MATH_INTEGRITY_REVIEW updates at every phase boundary.

## 3. External Boundary Facts

### Pi

Official Pi package resources are `extensions`, `skills`, `prompts`, and `themes`. `agent`, `resource`, and `tool` are not package-manifest top-level resource types. Tool registration uses the official shape:

```ts
pi.registerTool({
  name,
  label,
  description,
  parameters,
  execute(toolCallId, params, signal, onUpdate, ctx) {
    // ...
  }
});
```

Research Alpha descriptors are useful internal descriptors, but production Pi compatibility needs an adapter that emits official registration objects, supports headless fallback through `ctx.hasUI`, and validates package manifests.

Primary authority: `https://github.com/earendil-works/pi`.
Secondary ecosystem scan: `https://github.com/buyixian/pi-ecosystem-docs`.

### TriviumDB

TriviumDB is useful for local graph/vector/payload indexing, but current `0.7.1` native bindings and alpha status make it inappropriate as a sole truth source. Production must:

- store truth in append-only ledger and typed stores;
- use stable string IDs externally;
- keep Trivium numeric IDs hidden behind `StableIdMap`;
- serialize writes through `comathd`;
- expose health and rebuild semantics;
- degrade to memory search or another lightweight fallback.

Primary authority: `https://github.com/YoKONCy/TriviumDB`.

### MathProve And Lean

The local `mathprove-skill` demands a per-run workspace with `problem.md`, `assumptions.md`, `manifest.json`, `status.json`, per-step MAGI/SymPy/Lean/evidence files, final audit, and durable logs. CoMath must treat MathProve as evidence producer and gate runner, not as a conversational reviewer.

Production proof authority:

- `formally_checked`: Lean kernel accepted the proof artifact, no production `sorry` or `admit`, dependency closure complete, final audit passed.
- `symbolically_checked`: exact symbolic runner output with trusted audit, not float-only computation.
- `literature_supported`: exact literature artifact plus citation-condition match, not abstract memory or LLM summary.

Primary authority: local `C:/Users/derst/.codex/skills/mathprove-skill/SKILL.md` and `https://github.com/DerstedtCasper/MathProve-Skill`.

### AI Co-Mathematician

The relevant product idea from arXiv `2605.06651` is a living working paper with asynchronous workstreams, native mathematical artifacts, and margin provenance. CoMath must persist failed routes and blocked states as first-class project records.

Primary authority: `https://arxiv.org/abs/2605.06651`.

## 4. Production Data Contracts

### Formal Proof Authority

Add these contracts:

```ts
type FormalProofSystem = "lean4";
type FormalProofStatus =
  | "not_run"
  | "toolchain_missing"
  | "failed"
  | "skeleton_only"
  | "kernel_checked";

type FormalProofRun = {
  id: string;
  project_id: string;
  claim_id: string;
  system: FormalProofSystem;
  status: FormalProofStatus;
  proof_artifact_id?: string;
  log_artifact_id?: string;
  theorem_name?: string;
  toolchain_version?: string;
  dependency_hash?: string;
  contains_sorry: boolean;
  contains_admit: boolean;
  kernel_checked: boolean;
  exit_code?: number;
  vetoes: string[];
  warnings: string[];
  created_at: string;
};
```

Gate rule:

```text
formally_checked requires a FormalProofRun with:
status = kernel_checked
kernel_checked = true
contains_sorry = false
contains_admit = false
proof_artifact_id present
log_artifact_id present
same project_id and claim_id
```

### MathProve Run Manifest

Add a manifest compatible with the local skill:

```ts
type MathProveRunManifest = {
  id: string;
  project_id: string;
  claim_id: string;
  mode: "plan" | "route" | "final_audit";
  run_root: string;
  status: "created" | "running" | "failed" | "approved";
  status_json_artifact_id?: string;
  final_audit_artifact_id?: string;
  solution_artifact_id?: string;
  evidence_ids: string[];
  vetoes: string[];
  warnings: string[];
  created_at: string;
  updated_at: string;
};
```

### Provenance Ledger

Add `ProvenanceLedger` as append-only JSONL under `.comath/provenance/events.jsonl`.

Required event families:

- `claim.registered`
- `claim.gate_evaluated`
- `formal_proof.run_recorded`
- `mathprove.run_recorded`
- `runner.completed`
- `literature.condition_checked`
- `paper.span_rendered`
- `paper.margin_note_attached`
- `workstream.blocked`
- `workstream.failed`
- `index.rebuilt`

The ledger is truth-source metadata. TriviumDB indexes this ledger but never replaces it.

### Working Paper Spans

Existing margin notes are preserved, but production needs stable spans:

```ts
type PaperSpan = {
  id: string;
  project_id: string;
  paper_id: string;
  section_id: string;
  claim_id?: string;
  text_sha256: string;
  margin_note_ids: string[];
  evidence_ids: string[];
  workstream_ids: string[];
  status: "draft" | "blocked" | "reviewing" | "accepted" | "stale";
  created_at: string;
  updated_at: string;
};
```

Paper export must fail if a theorem-like span lacks an attached margin note, evidence binding, or exact status disclosure.

### MathGraphIndex

Add a typed abstraction:

```ts
interface MathGraphIndex {
  init(projectRoot: string, projectId: string): Promise<void>;
  close(): Promise<void>;
  health(): Promise<MathGraphIndexHealth>;
  upsertNode(node: MemoryNode): Promise<void>;
  link(edge: MemoryEdge): Promise<void>;
  hybridSearch(input: MemorySearchInput): Promise<MemorySearchResult[]>;
  neighbors(projectId: string, stableId: string): Promise<MemoryEdge[]>;
  rebuildFromLedger(): Promise<MathGraphIndexHealth>;
}
```

The first production implementation can wrap `ResearchMemoryDB`, but it must expose derived-index health and rebuild semantics now.

## 5. Mutation And Concurrency Model

All trusted mutations must pass through `comathd`.

Production adds:

- project session lock under `.comath/session/lock.json`;
- serialized mutation queue under `.comath/session/mutations.jsonl`;
- explicit stale-lock detection;
- read-only operations remain concurrent;
- workstreams write only their own directories until a parent process accepts a GraphPatch or gate decision.

Subagent budget for this run:

```text
rpm=4 => main coordinator + at most three side agents
```

Allowed side-agent use:

- one read-only external/API researcher;
- one disjoint implementation worker for Pi adapter;
- one disjoint implementation worker for docs/audit or index adapter;
- verification worker after implementation.

Serialized files:

- `services/comathd/src/types/schemas.ts`
- `services/comathd/src/verification/gate.ts`
- `services/comathd/src/api/server.ts`
- `services/comathd/src/security/path-policy.ts`
- root package manager files.

## 6. TDD Gates

No production code change is complete unless the relevant test was observed failing first.

Required new test files:

- `services/comathd/tests/unit/phase18-formal-proof-authority.test.mjs`
- `services/comathd/tests/unit/phase19-provenance-ledger.test.mjs`
- `services/comathd/tests/unit/phase20-math-graph-index.test.mjs`
- `services/comathd/tests/unit/phase21-session-lock.test.mjs`
- `extensions/comath-pi/tests/phase18-pi-official-adapter.test.mjs`

Each test must be added to package scripts before final verification.

## 7. Implementation Phases

### P0: Production Planning And Worktree

Definition of done:

- Research Alpha baseline committed.
- `.worktrees` ignored.
- `production-formal-workbench` worktree created.
- baseline `corepack pnpm test` passes.
- this spec and implementation plan committed.

### P1: Formal Proof Authority

Definition of done:

- formal proof schemas and JSON schema exist;
- Lean log/proof artifact parser exists;
- gate rejects `formally_checked` without a trusted formal proof run;
- mock MathProve cannot promote a claim;
- tests cover `sorry`, `admit`, missing proof artifact, mismatched claim, and successful synthetic kernel check.

### P2: Provenance Ledger And Working Paper Spans

Definition of done:

- append-only provenance ledger exists;
- paper span records are stored and linked to margin notes;
- blocked/failed workstreams produce provenance events;
- paper export checks spans as well as margin notes.

### P3: MathGraphIndex And Trivium Derived Index Semantics

Definition of done:

- `MathGraphIndex` wraps existing memory DB;
- `health()` reports backend, degraded mode, and rebuildability;
- `rebuildFromLedger()` is implemented for ledger-indexable node/edge events or returns a typed degraded report;
- Trivium remains optional and hidden behind the adapter.

### P4: Pi Official Adapter

Definition of done:

- internal descriptors convert to official Pi tool registration shape;
- package manifest validates only official resource keys;
- headless mode does not call UI methods without `ctx.hasUI`;
- Research Alpha descriptors remain usable through adapter tests.

### P5: Project Session Lock And Mutation Queue

Definition of done:

- per-project lock supports acquire/release/stale detection;
- mutation queue records operation metadata and audit IDs;
- trusted mutation helpers require queue entry;
- tests cover concurrent acquire rejection and stale lock recovery.

### P6: Docs, Audits, And Final Verification

Definition of done:

- `TODO.md`, `REVIEW.md`, `SECURITY_REVIEW.md`, and `MATH_INTEGRITY_REVIEW.md` updated;
- production retrospective under `docs/progress`;
- `corepack pnpm test` and focused optional checks pass or have explicit blockers.

## 8. Acceptance Criteria

The goal is not complete until:

- production spec and TDD plan exist;
- all P1-P6 tests pass;
- `formally_checked` remains impossible without formal proof run evidence;
- Pi official adapter tests pass;
- TriviumDB remains a derived, optional index;
- workstream failures and paper spans are persisted;
- TODO/REVIEW/audit docs reflect completed and remaining work.

