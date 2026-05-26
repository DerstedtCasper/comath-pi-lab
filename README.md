# CoMath Pi Lab

CoMath Pi Lab is a Pi-based, auditable, memory-native research workbench for mathematical projects. Pi is the interaction shell; `comathd` is the local single-write service; MathProve acts as an evidence producer and gate runner; TriviumDB remains an optional embedded memory backend behind an adapter.

This repository is currently **Production Formal Workbench Core, not GA**. Phase 0-17 produced the Research Alpha prototype; the current branch hardens that prototype into a local production-core workbench with claim registration, fail-closed promotion gates, artifacts/audit logs, in-memory research memory, workstreams, GraphPatch review, MathProve bridge contracts, exact/numeric compute runners, literature condition checks, working paper provenance, braid-statistics domain scaffolding, read-only Pi extension renderers, snapshot/replay verification, and formal proof authority guards.

It is **not GA** and must not be tagged or announced as GA until target-runtime evidence exists for the installed Pi runtime, MathProve workspace runner, native TriviumDB adapter, runner re-execution replay, package artifacts, DLP-grade scanning, and locking stress.

## Production-Core Runtime Baseline

- Node.js: `>=22.19.0`
- Package manager: `pnpm@11.3.0` via Corepack
- Root validation:
  - `corepack pnpm install --frozen-lockfile`
  - `corepack pnpm build`
  - `corepack pnpm typecheck`
  - `corepack pnpm test`
  - `corepack pnpm run ci`
  - `corepack pnpm release:check`

`corepack pnpm external:check` is intentionally fail-closed until reviewed target-runtime evidence is supplied through `docs/release/external-runtime-evidence.json` or `COMATH_EXTERNAL_EVIDENCE`.

`corepack pnpm release:check` is a repository readiness contract check. It is not a GA certification and does not replace installed Pi, MathProve, TriviumDB, package, DLP, replay, or locking-stress evidence.

## License

CoMath Pi Lab is open source under the [MIT License](LICENSE).

## Non-Negotiable Invariants

- No mathematical claim is promoted without evidence.
- No unreviewed workstream patch mutates the trusted graph.
- No agent writes project-runtime files outside the path policy.
- No TriviumDB write bypasses `comathd`.
- No reviewer approval is a proof.

## Canonical Documents

- [COMATH_PI_LAB_DEV_PLAN.md](COMATH_PI_LAB_DEV_PLAN.md)
- [CODEX_GOAL_RUNBOOK.md](CODEX_GOAL_RUNBOOK.md)
- [AGENTS.md](AGENTS.md)
- [TODO.md](TODO.md)
- [REVIEW.md](REVIEW.md)
- [GA Release Checklist](docs/release/GA_RELEASE_CHECKLIST.md)
- [External Runtime Validation](docs/release/EXTERNAL_RUNTIME_VALIDATION.md)
- [CI](docs/release/CI.md)

## Design Companion Documents

- [End-State Blueprint](docs/architecture/end-state-blueprint.md)
- [Acceptance Matrix](docs/architecture/acceptance-matrix.md)
- [Risk Register](docs/architecture/risk-register.md)
- [Agent Operating Model](docs/architecture/agent-operating-model.md)
- [Design Handoff](docs/progress/design-handoff.md)
