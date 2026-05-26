# ADR 0003: TriviumDB Adapter Only

## Status

Accepted for Phase 0 planning.

## Decision

TriviumDB is treated as an optional embedded memory backend behind a `ResearchMemoryDB` adapter. It is not a direct Phase 0 dependency and must not leak numeric IDs into business contracts.

## Consequences

- CI can use in-memory or lightweight fallback stores.
- Native package failures do not block early phases.
- Stable string IDs remain the external API.

