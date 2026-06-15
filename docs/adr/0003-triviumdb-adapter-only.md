# ADR 0003: TriviumDB Adapter Only

## Status

Accepted for the public architecture baseline.

## Decision

TriviumDB is treated as an optional embedded memory backend behind a `ResearchMemoryDB` adapter. It is not a direct product dependency and must not leak numeric IDs into business contracts.

## Consequences

- CI can use in-memory or lightweight fallback stores.
- Native package failures do not block the default service runtime.
- Stable string IDs remain the external API.
