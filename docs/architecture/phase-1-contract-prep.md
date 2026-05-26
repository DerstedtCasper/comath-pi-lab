# Phase 1 Contract Preparation

Phase 1 should define contracts before service behavior exists.

## Required Contracts

- `Project`
- `MemoryNode`
- `MemoryEdge`
- `Claim`
- `Evidence`
- `Workstream`
- `ArtifactRef`
- `AuditEvent`
- `GraphPatch`
- `PathPolicyDecision`
- `RunnerPermissionEnvelope`

## Required Utilities

- `nextSequentialId(prefix, existingIds)`
- `normalizeStatement(input)`
- `statementHash(input)`
- payload hash helper for future StableIdMap entries

## Early GraphPatch Requirement

Although workstream lifecycle is Phase 7, the GraphPatch schema belongs in Phase 1 so later APIs cannot bypass the patch model.

Patch contract must include:

- provenance;
- review state;
- new nodes;
- new edges;
- updated nodes;
- conflicts;
- warnings;
- apply preconditions.

Patch contract must not include any direct claim promotion shortcut.

