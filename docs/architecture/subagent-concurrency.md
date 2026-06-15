# Subagent Concurrency

Subagent concurrency is a campaign search feature, not a shortcut around trusted state. Parallel work is allowed only when each worker has a distinct stage-local scope and all trusted writes flow through `comathd`.

## Safe Parallelism

Safe parallel lanes include:

- independent literature retrieval over separate sources;
- independent proof-route proposals for the same locked statement;
- independent Lean skeleton candidates under the same FormalSpecLock;
- independent review/red-team passes over already materialized candidate artifacts;
- independent adapter probes whose outputs are recorded as `proof_authority=none`.

## Conflict Rule

Work is conflicting and must be serialized when two lanes need the same:

- FormalSpecLock or AssumptionLedger mutation;
- campaign terminal-state decision;
- trusted `.comath/` runtime write;
- proof promotion request;
- dependency lock or final replay manifest;
- external adapter configuration.

## Merge Rule

The coordinator merges only after:

1. checking the locked statement hash;
2. checking assumptions and dependency declarations;
3. verifying all child outputs are non-authoritative candidates or evidence;
4. submitting accepted material through `comathd`;
5. preserving rejected routes and blockers as audit evidence.

Subagent reports are not evidence of success unless they reference durable artifacts, replay manifests, or service-owned audit records.
