# ADR 0002: Runtime State Separation

## Status

Accepted for Phase 0 planning.

## Decision

Runtime project state belongs under `.comath/` and is ignored by Git. The repository stores source code, schemas, documentation, fixtures, and examples only.

## Consequences

- Evidence and session state are not accidentally committed.
- Snapshot/replay must later define explicit export manifests.
- Tests must use fixtures or temporary directories, not real `.comath/` state.

