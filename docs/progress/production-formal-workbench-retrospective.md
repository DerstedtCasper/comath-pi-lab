# Production Formal Workbench Retrospective

## Scope

Production Formal Workbench P1-P6 upgrades the Research Alpha prototype with formal proof authority, provenance-ledger records, paper spans, MathGraphIndex derived-index semantics, official Pi adapter compatibility, and project session locking.

This slice is intentionally local and auditable. It does not claim installed Pi runtime certification, target-platform native TriviumDB performance validation, a full MathProve skill workspace runner, distributed locking, or runner re-execution replay.

## Completed Slices

### P1: Formal Proof Authority

- Added `FormalProofRun` contracts and root JSON schema artifacts.
- Added append-only formal proof run storage under `.comath/evidence/formal-proof-runs.jsonl`.
- Required `formally_checked` promotion to bind to a trusted Lean4 kernel-checked proof run for the same project, claim, and proof/log artifacts.
- Split formalization, dependency closure, and proof audit into separate certification records before final claim certification.
- Kept raw proof-run append, raw gate-promoted claim writers, and raw gate-decision appliers out of the public barrel API.
- Rejected caller-supplied Lean executables as proof authority; they are recorded as fail-closed runs rather than executed.
- Rejected kernel-checked runs containing `sorry` or `admit`.
- Added MathProve run manifests while keeping MathProve as evidence producer rather than proof authority.

### P2: Provenance Ledger And Paper Spans

- Added append-only provenance ledger storage under `.comath/provenance/events.jsonl`.
- Recorded production events for formal proof runs, MathProve runs, paper spans, and index rebuilds.
- Added paper spans under `.comath/artifacts/papers/spans.json`.
- Extended paper checks so missing span-to-margin-note linkage is an integrity blocker.

### P3: MathGraphIndex

- Added `MathGraphIndex` facade over `ResearchMemoryDB`.
- Added index health semantics: backend, `truth_source=provenance-ledger`, `derived_index=true`, degraded state, rebuildability, and last rebuild summary.
- Added `rebuildFromLedger()` with `index.rebuilt` provenance recording.
- Preserved TriviumDB as optional derived index only.

### P4: Pi Official Adapter

- Added official Pi tool registration adapter for internal descriptors.
- Mapped `input_schema` to official `parameters`.
- Validated official package manifest keys: `extensions`, `skills`, `prompts`, and `themes`.
- Ensured headless contexts do not receive UI calls when `ctx.hasUI=false`.

### P5: Session Lock And Mutation Queue

- Added local project session lock at `.comath/session/lock.json`.
- Added append-only mutation queue at `.comath/session/mutations.jsonl`.
- Rejected concurrent active lock acquisition through exclusive lock-file creation.
- Required explicit stale-lock recovery, serialized recovery attempts with a recovery mutex, and owner-matching release.
- Avoided read-then-append queue ID reuse by using collision-resistant mutation queue IDs.

### P6: Documentation And Audit

- Updated tracking, review, security, mathematical-integrity, acceptance, schema, and progress documents.
- Added root JSON schema artifacts for the production contracts.
- Changed runtime `jsonSchemas` registry to load the root schema artifacts rather than placeholder object schemas.
- Kept residual risks explicit rather than folding them into completion claims.

## Verification

Fresh full-root verification completed on 2026-05-26:

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

Focused production coverage includes:

```text
node services/comathd/tests/unit/phase1-contracts.test.mjs
node services/comathd/tests/integration/phase2-project-runtime.test.mjs
node services/comathd/tests/unit/phase9-mathprove-bridge.test.mjs
node services/comathd/tests/unit/phase18-formal-proof-authority.test.mjs
node services/comathd/tests/unit/phase19-provenance-ledger.test.mjs
node services/comathd/tests/unit/phase20-math-graph-index.test.mjs
node services/comathd/tests/unit/phase21-session-lock.test.mjs
node extensions/comath-pi/tests/phase18-pi-official-adapter.test.mjs
```

## Residual Risks

- Lean kernel checking verifies formal artifacts, not informal paper prose equivalence by itself.
- MathProve full workspace execution remains future work beyond the current fail-closed bridge manifest.
- Pi official runtime compatibility still needs installed-runtime validation.
- TriviumDB remains a native target-platform dependency risk.
- Session locks are local project coordination, not distributed consensus.
- Runner re-execution replay remains future work.
