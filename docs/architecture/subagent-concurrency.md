# Subagent Concurrency

## Safe Early Parallelism

Early phases may run these in parallel only when write sets are disjoint:

- repo-architect: documentation and ADRs;
- type-schema-engineer: types, schemas, schema tests;
- security-auditor: read-only or `SECURITY_REVIEW.md`;
- math-integrity-auditor: read-only or `MATH_INTEGRITY_REVIEW.md`.

## Conflict Rule

Work is conflicting and must be serialized when two agents need the same:

- public type or schema;
- route file;
- path policy file;
- gate or claim promotion file;
- migration;
- GraphPatch apply contract;
- root package-manager file;
- tracking contract document.

## Merge Rule

The parent coordinator merges only after:

1. inspecting changed files;
2. checking boundary compliance;
3. running relevant validation;
4. updating `TODO.md`;
5. updating `REVIEW.md`.

Subagent reports are not evidence of success unless command logs or artifacts are present.

