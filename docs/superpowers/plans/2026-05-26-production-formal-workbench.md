# Production Formal Workbench Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development if side agents are available. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade CoMath Pi Lab from Research Alpha into a production-oriented mathematical workbench with formal proof authority, working-paper provenance, Pi official API compatibility, and derived-index memory semantics.

**Architecture:** Keep `comathd` as the only trusted mutation gateway. Add formal proof, provenance, graph index, Pi adapter, and session-lock contracts around existing Research Alpha modules instead of replacing them. TriviumDB remains optional and derived; proof authority remains fail-closed.

**Tech Stack:** TypeScript ESM, Node >=22.19, Zod schemas, JSONL stores, existing `corepack pnpm` workspace, Python bridge scripts for MathProve/Lean-facing artifacts.

---

## Chunk 1: Production Contracts And Formal Proof Authority

### Task 1: Add Formal Proof Contracts

**Files:**
- Modify: `services/comathd/src/types/schemas.ts`
- Test: `services/comathd/tests/unit/phase18-formal-proof-authority.test.mjs`
- Modify: `services/comathd/package.json`

- [ ] **Step 1: Write failing schema tests**

Add tests that import `formalProofRunSchema` and assert:

```js
formalProofRunSchema.parse(validKernelCheckedRun);
assert.throws(() => formalProofRunSchema.parse(runWithKernelCheckedAndSorry));
assert.throws(() => formalProofRunSchema.parse(runWithKernelCheckedAndNoProofArtifact));
assert.throws(() => formalProofRunSchema.parse(runWithBadStatus));
```

Run:

```powershell
node services/comathd/tests/unit/phase18-formal-proof-authority.test.mjs
```

Expected: FAIL because `formalProofRunSchema` is not exported.

- [ ] **Step 2: Implement schema**

Add:

- `formalProofSystemSchema`
- `formalProofStatusSchema`
- `formalProofRunSchema`
- `FormalProofRun` type

Kernel-checked runs must require `proof_artifact_id`, `log_artifact_id`, `kernel_checked=true`, `contains_sorry=false`, and `contains_admit=false`.

- [ ] **Step 3: Add package script entry**

Append the new test to `services/comathd/package.json` `test` script.

- [ ] **Step 4: Verify**

Run:

```powershell
node services/comathd/tests/unit/phase18-formal-proof-authority.test.mjs
corepack pnpm --filter @comath/comathd test
```

Expected: PASS.

### Task 2: Add Formal Proof Store And Gate Integration

**Files:**
- Create: `services/comathd/src/verification/formal-proof.ts`
- Modify: `services/comathd/src/verification/gate.ts`
- Test: `services/comathd/tests/unit/phase18-formal-proof-authority.test.mjs`

- [ ] **Step 1: Extend failing tests**

Add tests that:

- create a claim with `formalization_status="kernel_checked"` and audit/dependency fields set;
- attach lean evidence plus code/log artifacts;
- record no formal proof run, then attempt `formally_checked` promotion and expect veto `formally_checked requires kernel_checked formal proof run`;
- record a mismatched formal proof run and expect veto;
- record a synthetic valid formal proof run and expect the gate to allow the formal-proof-specific veto to disappear.

Run:

```powershell
node services/comathd/tests/unit/phase18-formal-proof-authority.test.mjs
```

Expected: FAIL because the store/gate integration does not exist.

- [ ] **Step 2: Implement append-only formal proof store**

`formal-proof.ts` must provide:

```ts
appendFormalProofRun(projectRoot, input): FormalProofRun
readFormalProofRuns(projectRoot, projectId?): FormalProofRun[]
hasTrustedFormalProofRun(projectRoot, projectId, claimId, artifactIds): boolean
```

Store path:

```text
.comath/evidence/formal-proof-runs.jsonl
```

All writes go through `assertPathAllowed`.

- [ ] **Step 3: Integrate gate**

In `gate.ts`, `formally_checked` must require `hasTrustedFormalProofRun(...)`.

- [ ] **Step 4: Verify**

Run focused and package tests.

### Task 3: Add MathProve Run Manifest Contract

**Files:**
- Modify: `services/comathd/src/types/schemas.ts`
- Modify: `services/comathd/src/verification/mathprove.ts`
- Test: `services/comathd/tests/unit/phase9-mathprove-bridge.test.mjs`
- Test: `services/comathd/tests/unit/phase18-formal-proof-authority.test.mjs`

- [ ] **Step 1: Write failing tests**

Assert MathProve bridge reports include a durable manifest shape with `run_root`, `status`, evidence/artifact IDs, vetoes, warnings, and timestamps.

Expected: FAIL because only the old bridge report shape exists.

- [ ] **Step 2: Implement manifest write**

Preserve the existing mock fail-closed behavior, but add a parseable `mathprove_run_manifest` object into the stored report and audit payload.

- [ ] **Step 3: Verify**

Run phase9 and phase18 tests.

## Chunk 2: Provenance Ledger And Working Paper Spans

### Task 4: Add Provenance Ledger

**Files:**
- Create: `services/comathd/src/provenance/ledger.ts`
- Modify: `services/comathd/src/types/schemas.ts`
- Test: `services/comathd/tests/unit/phase19-provenance-ledger.test.mjs`
- Modify: `services/comathd/package.json`

- [ ] **Step 1: Write failing tests**

Test append/read/filter behavior, strict schema validation, monotonically increasing IDs, and path-policy confinement.

Run:

```powershell
node services/comathd/tests/unit/phase19-provenance-ledger.test.mjs
```

Expected: FAIL because ledger module does not exist.

- [ ] **Step 2: Implement ledger**

Store path:

```text
.comath/provenance/events.jsonl
```

API:

```ts
appendProvenanceEvent(projectRoot, input)
readProvenanceEvents(projectRoot, projectId?)
```

- [ ] **Step 3: Wire key events**

Record at least:

- `formal_proof.run_recorded`
- `mathprove.run_recorded`
- `paper.span_recorded`
- `index.rebuilt`

- [ ] **Step 4: Verify**

Run phase19 and full comathd tests.

### Task 5: Add Paper Span Store

**Files:**
- Modify: `services/comathd/src/artifacts/paper.ts`
- Test: `services/comathd/tests/unit/phase19-provenance-ledger.test.mjs`

- [ ] **Step 1: Write failing span tests**

Assert rendering a claim block creates a `PaperSpan`, binds it to a margin note, records provenance, and export/check fails if a span references a missing margin note.

Expected: FAIL because spans are not stored.

- [ ] **Step 2: Implement span storage**

Store path:

```text
.comath/artifacts/papers/spans.json
```

Add:

```ts
readPaperSpans(projectRoot, projectId?)
writePaperSpans(projectRoot, spans)
```

- [ ] **Step 3: Verify**

Run phase12 and phase19 tests.

## Chunk 3: MathGraphIndex And Derived Trivium Semantics

### Task 6: Add MathGraphIndex Wrapper

**Files:**
- Create: `services/comathd/src/memory/math-graph-index.ts`
- Test: `services/comathd/tests/unit/phase20-math-graph-index.test.mjs`
- Modify: `services/comathd/package.json`

- [ ] **Step 1: Write failing tests**

Assert:

- `health()` reports backend and degraded state;
- `hybridSearch()` delegates to existing `ResearchMemoryDB.search`;
- `neighbors()` delegates to `getEdges`;
- `rebuildFromLedger()` records a degraded rebuild if no indexable events exist;
- Trivium remains hidden behind the wrapper.

Expected: FAIL because module does not exist.

- [ ] **Step 2: Implement wrapper**

Do not change existing `ResearchMemoryDB`. Add a wrapper with rebuild health and provenance event recording.

- [ ] **Step 3: Verify**

Run phase20 and phase5 tests.

## Chunk 4: Pi Official Adapter

### Task 7: Add Official Pi Tool Adapter

**Files:**
- Create: `extensions/comath-pi/src/pi-official-adapter.ts`
- Modify: `extensions/comath-pi/src/index.ts`
- Test: `extensions/comath-pi/tests/phase18-pi-official-adapter.test.mjs`
- Modify: `extensions/comath-pi/package.json`

- [ ] **Step 1: Write failing tests**

Assert:

- `createOfficialPiToolRegistrations(createComathTools())` emits `parameters`, `label`, and official `execute(toolCallId, params, signal, onUpdate, ctx)` functions;
- official package manifest only contains `extensions`, `skills`, `prompts`, and `themes`;
- old descriptor `input_schema` maps to official `parameters`;
- headless context with `hasUI=false` does not call UI methods.

Expected: FAIL because adapter does not exist.

- [ ] **Step 2: Implement adapter**

Keep Research Alpha descriptors. Add conversion helpers rather than replacing existing API.

- [ ] **Step 3: Verify**

Run extension tests.

## Chunk 5: Session Lock And Mutation Queue

### Task 8: Add Project Session Lock

**Files:**
- Create: `services/comathd/src/project/session-lock.ts`
- Test: `services/comathd/tests/unit/phase21-session-lock.test.mjs`
- Modify: `services/comathd/package.json`

- [ ] **Step 1: Write failing tests**

Assert:

- first acquire succeeds;
- second acquire fails while active;
- release by wrong owner fails;
- stale lock can be recovered;
- mutation queue appends operation records.

Expected: FAIL because module does not exist.

- [ ] **Step 2: Implement lock and queue**

Paths:

```text
.comath/session/lock.json
.comath/session/mutations.jsonl
```

API:

```ts
acquireProjectSessionLock(projectRoot, input)
releaseProjectSessionLock(projectRoot, input)
readProjectSessionLock(projectRoot)
appendMutationQueueEntry(projectRoot, input)
readMutationQueue(projectRoot, projectId?)
```

- [ ] **Step 3: Verify**

Run phase21 and project runtime tests.

## Chunk 6: Documentation, Audit, And Final Verification

### Task 9: Update Tracking Documents

**Files:**
- Modify: `TODO.md`
- Modify: `REVIEW.md`
- Modify: `SECURITY_REVIEW.md`
- Modify: `MATH_INTEGRITY_REVIEW.md`
- Create: `docs/progress/production-formal-workbench-retrospective.md`

- [ ] **Step 1: Add completed production phase records**

Record P0-P6 status, tests, remaining blockers, and external boundary facts.

- [ ] **Step 2: Add security and math-integrity deltas**

Security: session locks, Pi adapter, Trivium derived index, path policy unchanged.

Math integrity: formal proof authority, exact symbolic vs numeric, literature support, paper spans.

- [ ] **Step 3: Verify docs are included in smoke**

Update `scripts/phase0-smoke.mjs` only if it enforces required doc lists.

### Task 10: Final Verification And Commit

- [ ] **Step 1: Run full tests**

```powershell
corepack pnpm test
```

- [ ] **Step 2: Check git diff**

```powershell
git status -sb
git diff --stat
```

- [ ] **Step 3: Commit**

```powershell
git add .
git commit -m "feat: production formal workbench contracts"
```

## Subagent Schedule Under rpm=4

At any moment:

```text
slot 0: main coordinator
slot 1: Pi official adapter worker or reviewer
slot 2: MathGraphIndex/provenance reviewer
slot 3: docs/security/math-integrity reviewer
```

Disjoint write scopes:

- Pi worker: `extensions/comath-pi/src/pi-official-adapter.ts`, `extensions/comath-pi/tests/phase18-pi-official-adapter.test.mjs`, extension package script.
- Index/provenance worker: `services/comathd/src/memory/math-graph-index.ts`, `services/comathd/tests/unit/phase20-math-graph-index.test.mjs`; no gate/routes.
- Docs reviewer: review-only or docs files; no code.

Serialized main-thread files:

- `services/comathd/src/types/schemas.ts`
- `services/comathd/src/verification/gate.ts`
- `services/comathd/src/artifacts/paper.ts`
- `services/comathd/package.json`
- root package files.

Do not run two code-writing agents against the same package script concurrently.

