# Module Boundaries

| Path | Owner | May write in phase | Notes |
| --- | --- | --- | --- |
| `COMATH_PI_LAB_DEV_PLAN.md`, `CODEX_GOAL_RUNBOOK.md`, `README.md` | repo-architect | 0+ | Canonical documentation. |
| `TODO.md`, `REVIEW.md` | parent coordinator | 0+ | Must be updated at phase boundary. |
| `AGENTS.md` | repo-architect | 0+ | Agent safety and scope rules. |
| `services/comathd/src/types` | type-schema-engineer | 1+ | Shared contracts; conflict zone. |
| `schemas` | type-schema-engineer | 1+ | JSON schemas and schema docs. |
| `services/comathd/src/security` | service-engineer | 2+ | Must be reviewed by security-auditor. |
| `services/comathd/src/artifacts` | artifact-paper-engineer | 3+ | Must depend on path policy. |
| `services/comathd/src/claim` | verification-engineer | 4+ | Must be serialized with gate edits. |
| `services/comathd/src/verification` | verification-engineer | 4+ | Gate defaults fail closed. |
| `services/comathd/src/memory` | memory-db-engineer | 5+ | Trivium behind adapter only. |
| `extensions` | pi-extension-engineer | 6+ | No direct DB or claim promotion writes. |
| `.comath` | comathd runtime only | runtime | Gitignored; never commit real runtime state. |

Conflict rule: if two agents need to edit the same public type, schema, route, path policy, gate, migration, or root package file, serialize the work through the parent coordinator.

