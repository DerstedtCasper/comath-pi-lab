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
| `config/` | repo-architect + service-engineer | 19+ | Non-secret samples only; live credentials remain service-owned and out of Pi payloads/evidence packs. |
| `docs/architecture/ga-release-criteria.md`, `docs/architecture/threat-model.md`, `docs/architecture/adapter-contracts.md`, `docs/architecture/external-lean-supply-chain.md`, `docs/architecture/evidence-pack-policy.md` | repo-architect + security/math-integrity auditors | 19+ | Release-hardening doctrine; must match executable gates and smoke checks. |
| `docs/examples/` | repo-architect | 19+ | Public examples only; no promoted proof claims unless backed by replay evidence. |
| `.pi/agents`, `.pi/prompts` | pi-extension-engineer + repo-architect | 8+ / 19+ | Agent prompt contracts must keep `proof_authority=none`, `may_mutate_trusted_state=false`, strict JSON/schema output, locked statement hash preservation, and no vote/literature/CAS proof authority. |

Conflict rule: if two agents need to edit the same public type, schema, route, path policy, gate, migration, or root package file, serialize the work through the parent coordinator.
