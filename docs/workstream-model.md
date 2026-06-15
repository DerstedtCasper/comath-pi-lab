# Workstream Model

CoMath uses one coordinator and eight specialist roles for parallel research work. Specialist agents may explore, draft, review, and propose graph patches, but they do not mutate trusted state directly.

## Concurrency Protocol

- Broad read-only fan-out is allowed.
- Disjoint workstream writes are allowed only in assigned runtime workspaces under `.comath/workstreams`.
- Same core file edits require serialization by the parent coordinator.
- Subagents produce reports and GraphPatch proposals only.
- Parent coordinator merges after file inspection, tests, and GraphPatch review.
- Reviewer approval is not proof.

## Write Model

Each subagent is assigned its own workstream directory. The directory may contain report material, proposed artifacts, and a `graph_patch.json` proposal. Subagents must not write trusted graph state, claim registry state, gate results, path policy, schema files, or root package-manager files unless the parent coordinator explicitly serializes that work through `comathd`.

## Merge Model

Graph changes move through:

```text
report.md -> graph_patch.json -> proposed -> under_review -> accepted -> explicit apply
```

Accepted is not applied. Explicit apply is a parent/coordinator action through `comathd`.

## Specialist Roles

- coordinator
- librarian
- computation
- proof_route
- formalization
- reviewer
- graph_builder
- security_auditor
- math_integrity_auditor

All roles have `may_mutate_trusted_state=false`. GraphPatch proposal is the only path for trusted graph changes. Do not promote claims from subagent output.
