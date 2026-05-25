# ADR 0001: Single Mutation Gateway

## Status

Accepted for Phase 0 planning.

## Decision

All trusted project mutations will flow through `comathd`. Pi extensions, subagents, and future workstreams submit requests or graph patches; they do not directly mutate trusted memory, claims, evidence, or runtime DB files.

## Consequences

- Auditing is centralized.
- Path policy can be enforced before writes.
- Subagent output is reviewable before merge.
- Direct DB writes from Pi extensions are forbidden.

