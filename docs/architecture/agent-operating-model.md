# Agent Operating Model

## Coordinator Role

The parent coordinator owns:

- phase scope;
- merge order;
- TODO/REVIEW updates;
- validation commands;
- conflict resolution;
- final acceptance against `COMATH_PI_LAB_DEV_PLAN.md`.

The coordinator must not trust a child agent's success claim without checking files and validation evidence.

## Concurrency Budget

The current allowed concurrency budget is `rpm=1000` with reasoning effort `high` for substantial subagent work.

Use that budget to accelerate:

- read-only architecture/security/math-integrity reviews;
- independent implementation slices with disjoint write sets;
- late-stage domain/paper/dashboard work after workstream boundaries exist.

Do not use that budget to create write conflicts. A high RPM budget increases responsibility for merge discipline.

## Agent Roles

| Agent | Responsibility | Write Scope | Review Surface |
| --- | --- | --- | --- |
| repo-architect | architecture, ADRs, docs | `docs`, root docs | boundary and design consistency |
| type-schema-engineer | types, schemas, ID/hash | `services/comathd/src/types`, `schemas`, tests | schema validity |
| service-engineer | server, routes, config, path policy | `services/comathd/src/api`, `project`, `security` | service tests |
| pi-extension-engineer | Pi commands, tools, resources, renderers | `extensions`, `skills`, `prompts` | Pi API compatibility |
| memory-db-engineer | memory adapters, StableIdMap, retrieval | `services/comathd/src/memory`, `db` | adapter and fallback tests |
| verification-engineer | gates, MathProve, Lean/SymPy/Sage/SAT runners | `claim`, `verification`, `python` | gate and runner tests |
| artifact-paper-engineer | artifact store, paper, BibTeX, snapshot | `artifacts`, paper tools | artifact/paper tests |
| security-auditor | path, shell, secrets, replay, native deps | read-only or `SECURITY_REVIEW.md` | severity findings |
| math-integrity-auditor | claim promotion, proof status, paper wording | read-only or `MATH_INTEGRITY_REVIEW.md` | integrity findings |
| domain-braid-agent | braid statistics domain pack | `domain`, `skills/braid-statistics`, `python/braid` | domain pack report |

## Child Agent Output Contract

Every child result must include:

- assigned role;
- exact write scope;
- files changed or read-only confirmation;
- tests/checks run;
- blockers;
- boundary deviations;
- recommended TODO/REVIEW updates.

## Parallel Execution Rules

Parallel work is allowed only when write scopes are disjoint.

Unsafe pairings:

- `memory-db-engineer` and `service-engineer` editing the same routes;
- `verification-engineer` and claim registry editing the same gate route;
- `artifact-paper-engineer` and `security-auditor` editing path policy;
- two agents editing the same public schema or root package file.

Recommended phase-specific concurrency:

- Early: type/schema implementation, docs review, security read-only review, math-integrity read-only review.
- Middle: serialize route, path-policy, claim-gate, migration, and GraphPatch apply work.
- Late: parallelize domain pack, paper system, and dashboard renderers after core mutation gateway exists.

## Merge Protocol

1. Read child report.
2. Inspect changed files.
3. Check against allowed scope.
4. Run relevant tests.
5. Update `TODO.md`.
6. Update `REVIEW.md`.
7. Record residual risks.

## Escalation Protocol

Escalate to the human only when:

- a required dependency cannot be installed or probed after fallback is documented;
- a safety invariant conflicts with requested behavior;
- the same blocker repeats across three goal turns;
- the implementation plan is discovered to be structurally wrong.
