# ADR 0004: Proof Status Gate

## Status

Accepted for Phase 0 planning.

## Decision

Mathematical status promotion must pass explicit gates. `formally_checked` can only be assigned after durable kernel-checked proof evidence and final audit.

## Consequences

- Reviewer approval and agent consensus are auxiliary signals only.
- Failed proof attempts are preserved as evidence and blockers.
- Gate code must fail closed by default.

